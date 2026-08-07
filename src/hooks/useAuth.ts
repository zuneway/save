import { useCallback, useEffect, useState } from 'react'
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth'
import type { AuthSession, AuthUser, CurrentUser } from '../types/auth'
import { GUEST_USER_ID } from '../types/auth'
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase'
import {
  extractFirebaseErrorCode,
  isCloudPermissionDenied,
  isSyntheticAuthEmail,
  isValidRecoveryEmail,
  mapFirebaseAuthError,
  normalizeRecoveryEmail,
  normalizeUsername,
  usernameToEmail,
  usernameToEmailCandidates,
} from '../utils/cloudAccount'
import { clearCloudMeta, loadCloudMeta, saveCloudMeta, type CloudMeta } from '../utils/cloudMeta'
import {
  deleteCloudUserDoc,
  deleteUsernameIndex,
  fetchCloudUserDoc,
  fetchUsernameIndex,
  saveCloudUserDoc,
  saveUsernameIndex,
} from '../utils/cloudSync'
import {
  LEGACY_PBKDF2_ITERATIONS,
  PASSWORD_MIN_LENGTH,
  PBKDF2_ITERATIONS,
  createSalt,
  deriveDataKey,
  exportDataKeyRaw,
  hashPassword,
  importDataKeyRaw,
  verifyPassword,
} from '../utils/authCrypto'
import { decryptJson, encryptJson, isEncryptedBlob, tryParseJsonObject } from '../utils/dataCrypto'

const USERS_KEY = 'savings-system:users'
const SESSION_KEY = 'savings-system:session'
const DATA_KEY_PREFIX = 'savings-system:data-key:'
const LEGACY_DATA_KEY = 'savings-system:data'
const LEGACY_DATA_KEY_SESSION = 'savings-system:data-key'

function storageDataKey(userId: string) {
  return `savings-system:data:${userId}`
}

function normalizeUser(item: unknown): { user: AuthUser; migrated: boolean } | null {
  if (typeof item !== 'object' || item === null) return null
  const raw = item as Partial<AuthUser>
  if (!raw.id || !raw.username || !raw.passwordHash || !raw.salt) return null
  if (raw.id === GUEST_USER_ID) return null

  let migrated = false
  let dataSalt = raw.dataSalt
  if (!dataSalt) {
    dataSalt = createSalt()
    migrated = true
  }

  let kdfIterations = raw.kdfIterations
  if (typeof kdfIterations !== 'number' || kdfIterations <= 0) {
    kdfIterations = LEGACY_PBKDF2_ITERATIONS
    migrated = true
  }

  let dataKeyIterations = raw.dataKeyIterations
  if (typeof dataKeyIterations !== 'number' || dataKeyIterations <= 0) {
    dataKeyIterations = PBKDF2_ITERATIONS
    migrated = true
  }

  return {
    migrated,
    user: {
      id: raw.id,
      username: raw.username,
      nickname:
        typeof raw.nickname === 'string' && raw.nickname.trim() ? raw.nickname.trim() : undefined,
      passwordHash: raw.passwordHash,
      salt: raw.salt,
      dataSalt,
      kdfIterations,
      dataKeyIterations,
      createdAt: raw.createdAt ?? new Date().toISOString(),
    },
  }
}

function loadUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    const users: AuthUser[] = []
    let migrated = false
    for (const item of parsed) {
      const normalized = normalizeUser(item)
      if (!normalized) continue
      users.push(normalized.user)
      if (normalized.migrated) migrated = true
    }
    if (migrated) saveUsers(users)
    return users
  } catch {
    return []
  }
}

function saveUsers(users: AuthUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (!parsed.userId) return null
    return {
      userId: parsed.userId,
      isGuest: parsed.isGuest === true || parsed.userId === GUEST_USER_ID,
    }
  } catch {
    return null
  }
}

function saveSession(session: AuthSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY)
    return
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

let pendingDataKey: { userId: string; key: CryptoKey } | null = null
/** While > 0, login/register is finishing — do not sign out for a missing data key. */
let authBootstrapDepth = 0

function beginAuthBootstrap() {
  authBootstrapDepth += 1
}

function endAuthBootstrap() {
  authBootstrapDepth = Math.max(0, authBootstrapDepth - 1)
}

function isAuthEmailInUse(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as { code: unknown }).code) === 'auth/email-already-in-use'
  )
}

function dataKeyStorageId(userId: string) {
  return `${DATA_KEY_PREFIX}${userId}`
}

function clearStoredDataKey(userId?: string) {
  try {
    if (userId) localStorage.removeItem(dataKeyStorageId(userId))
    else {
      const keysToRemove: string[] = []
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)
        if (key && key.startsWith(DATA_KEY_PREFIX)) keysToRemove.push(key)
      }
      for (const key of keysToRemove) localStorage.removeItem(key)
    }
    sessionStorage.removeItem(LEGACY_DATA_KEY_SESSION)
  } catch {
    // ignore
  }
}

async function persistDataKey(userId: string, key: CryptoKey) {
  try {
    const raw = await exportDataKeyRaw(key)
    localStorage.setItem(dataKeyStorageId(userId), raw)
    sessionStorage.removeItem(LEGACY_DATA_KEY_SESSION)
  } catch {
    // ignore
  }
}

async function restoreDataKey(userId: string): Promise<CryptoKey | null> {
  try {
    const raw =
      localStorage.getItem(dataKeyStorageId(userId)) ??
      sessionStorage.getItem(LEGACY_DATA_KEY_SESSION)
    if (!raw) return null
    const key = await importDataKeyRaw(raw)
    // Migrate legacy sessionStorage key into durable localStorage.
    localStorage.setItem(dataKeyStorageId(userId), raw)
    sessionStorage.removeItem(LEGACY_DATA_KEY_SESSION)
    return key
  } catch {
    clearStoredDataKey(userId)
    return null
  }
}

function migrateLegacyDataIfNeeded(userId: string) {
  const userKey = storageDataKey(userId)
  if (localStorage.getItem(userKey)) return

  const legacy = localStorage.getItem(LEGACY_DATA_KEY)
  if (!legacy) return

  localStorage.setItem(userKey, legacy)
  localStorage.removeItem(LEGACY_DATA_KEY)
}

function ensureGuestDataReady() {
  const guestKey = storageDataKey(GUEST_USER_ID)
  if (localStorage.getItem(guestKey)) return
  migrateLegacyDataIfNeeded(GUEST_USER_ID)
  if (!localStorage.getItem(guestKey)) {
    localStorage.setItem(guestKey, JSON.stringify({ folders: [], projects: [] }))
  }
}

function validatePassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`密碼至少 ${PASSWORD_MIN_LENGTH} 個字元`)
  }
}

function validateNickname(nickname: string) {
  const normalized = normalizeUsername(nickname)
  if (!normalized) throw new Error('請輸入暱稱')
  if (normalized.length > 32) throw new Error('暱稱最多 32 個字元')
  if (normalized.toLowerCase() === 'guest' || normalized === '訪客') {
    throw new Error('這個暱稱不可使用')
  }
  return normalized
}

async function reencryptUserPayload(
  userId: string,
  oldKey: CryptoKey,
  newKey: CryptoKey,
): Promise<string | null> {
  const raw = localStorage.getItem(storageDataKey(userId))
  if (!raw) return null

  const object = tryParseJsonObject(raw)
  let data: { folders?: unknown; projects?: unknown }
  if (object && isEncryptedBlob(object)) {
    data = await decryptJson<{ folders?: unknown; projects?: unknown }>(oldKey, raw)
  } else {
    try {
      data = JSON.parse(raw) as { folders?: unknown; projects?: unknown }
    } catch {
      throw new Error('目前密碼錯誤，或資料無法讀取')
    }
  }

  const payload = await encryptJson(newKey, {
    folders: Array.isArray(data.folders) ? data.folders : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    updatedAt: Date.now(),
  })
  localStorage.setItem(storageDataKey(userId), payload)
  return payload
}

async function reauthenticateCloudUser(user: User, password: string) {
  const email = user.email
  if (!email) throw new Error('找不到登入帳號，請重新登入後再試')
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, password))
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error))
  }
}

async function migrateLocalAccountToCloud(
  uid: string,
  username: string,
  password: string,
  dataSalt: string,
  dataKeyIterations: number,
  cryptoKey: CryptoKey,
) {
  const existing = loadUsers()
  const localUser = existing.find(
    (item) => item.username.toLowerCase() === username.toLowerCase(),
  )
  if (!localUser) return

  const ok = await verifyPassword(
    password,
    localUser.salt,
    localUser.passwordHash,
    localUser.kdfIterations,
  )
  if (!ok) return

  const oldKey = storageDataKey(localUser.id)
  const oldRaw = localStorage.getItem(oldKey)
  if (!oldRaw) return

  const object = tryParseJsonObject(oldRaw)
  let payload: string
  if (object && isEncryptedBlob(object)) {
    try {
      const oldDataKey = await deriveDataKey(
        password,
        localUser.dataSalt,
        localUser.dataKeyIterations,
      )
      const decrypted = await decryptJson<{ folders?: unknown; projects?: unknown }>(
        oldDataKey,
        oldRaw,
      )
      payload = await encryptJson(cryptoKey, {
        folders: Array.isArray(decrypted.folders) ? decrypted.folders : [],
        projects: Array.isArray(decrypted.projects) ? decrypted.projects : [],
        updatedAt: Date.now(),
      })
    } catch {
      return
    }
  } else {
    try {
      const plain = JSON.parse(oldRaw) as { folders?: unknown; projects?: unknown }
      payload = await encryptJson(cryptoKey, {
        folders: Array.isArray(plain.folders) ? plain.folders : [],
        projects: Array.isArray(plain.projects) ? plain.projects : [],
        updatedAt: Date.now(),
      })
    } catch {
      return
    }
  }

  localStorage.setItem(storageDataKey(uid), payload)
  localStorage.removeItem(oldKey)

  const nextUsers = existing.filter((item) => item.id !== localUser.id)
  saveUsers(nextUsers)

  await saveCloudUserDoc(uid, {
    username,
    dataSalt,
    dataKeyIterations,
    payload,
    updatedAt: Date.now(),
    createdAt: localUser.createdAt,
  })
}

async function ensureCloudProfile(
  firebaseUser: User,
  username: string,
  password: string,
  options?: { migrateLocal?: boolean },
): Promise<{ meta: CloudMeta; cryptoKey: CryptoKey }> {
  let existing: Awaited<ReturnType<typeof fetchCloudUserDoc>> = null
  try {
    existing = await fetchCloudUserDoc(firebaseUser.uid)
  } catch (error) {
    // Rules not published yet — continue with local profile so login still works.
    if (!isCloudPermissionDenied(error)) throw error
  }

  const authRecoveryEmail =
    firebaseUser.email && !isSyntheticAuthEmail(firebaseUser.email)
      ? normalizeRecoveryEmail(firebaseUser.email)
      : undefined

  if (existing) {
    const cryptoKey = await deriveDataKey(
      password,
      existing.dataSalt,
      existing.dataKeyIterations,
    )
    const displayName = existing.username || username
    const meta: CloudMeta = {
      uid: firebaseUser.uid,
      username: displayName,
      loginUsername: existing.loginUsername || displayName || username,
      recoveryEmail: existing.recoveryEmail || authRecoveryEmail,
      dataSalt: existing.dataSalt,
      dataKeyIterations: existing.dataKeyIterations,
      createdAt: existing.createdAt,
    }
    saveCloudMeta(meta)
    if (existing.payload) {
      localStorage.setItem(storageDataKey(firebaseUser.uid), existing.payload)
    }
    return { meta, cryptoKey }
  }

  const cached = loadCloudMeta(firebaseUser.uid)
  if (cached?.dataSalt) {
    const cryptoKey = await deriveDataKey(
      password,
      cached.dataSalt,
      cached.dataKeyIterations || PBKDF2_ITERATIONS,
    )
    const meta: CloudMeta = {
      ...cached,
      username: cached.username || username,
      loginUsername: cached.loginUsername || cached.username || username,
      recoveryEmail: cached.recoveryEmail || authRecoveryEmail,
    }
    saveCloudMeta(meta)
    try {
      const localPayload = localStorage.getItem(storageDataKey(firebaseUser.uid))
      await saveCloudUserDoc(firebaseUser.uid, {
        username: meta.username,
        loginUsername: meta.loginUsername,
        recoveryEmail: meta.recoveryEmail,
        dataSalt: meta.dataSalt,
        dataKeyIterations: meta.dataKeyIterations,
        payload:
          localPayload ??
          (await encryptJson(cryptoKey, { folders: [], projects: [], updatedAt: Date.now() })),
        updatedAt: Date.now(),
        createdAt: meta.createdAt,
      })
    } catch (error) {
      if (!isCloudPermissionDenied(error)) throw error
    }
    return { meta, cryptoKey }
  }

  const dataSalt = createSalt()
  const cryptoKey = await deriveDataKey(password, dataSalt, PBKDF2_ITERATIONS)
  const payload = await encryptJson(cryptoKey, {
    folders: [],
    projects: [],
    updatedAt: Date.now(),
  })
  const createdAt = new Date().toISOString()
  const meta: CloudMeta = {
    uid: firebaseUser.uid,
    username,
    loginUsername: username,
    recoveryEmail: authRecoveryEmail,
    dataSalt,
    dataKeyIterations: PBKDF2_ITERATIONS,
    createdAt,
  }

  // Always persist locally first so a Firestore rules outage cannot block login.
  saveCloudMeta(meta)
  localStorage.setItem(storageDataKey(firebaseUser.uid), payload)

  try {
    await saveCloudUserDoc(firebaseUser.uid, {
      username,
      loginUsername: username,
      recoveryEmail: authRecoveryEmail,
      dataSalt,
      dataKeyIterations: PBKDF2_ITERATIONS,
      payload,
      updatedAt: Date.now(),
      createdAt,
    })
  } catch (error) {
    if (!isCloudPermissionDenied(error)) throw error
  }

  if (options?.migrateLocal !== false) {
    try {
      await migrateLocalAccountToCloud(
        firebaseUser.uid,
        username,
        password,
        dataSalt,
        PBKDF2_ITERATIONS,
        cryptoKey,
      )
    } catch (error) {
      if (!isCloudPermissionDenied(error)) throw error
    }
  }

  return { meta, cryptoKey }
}

async function upgradePasswordHashIfNeeded(
  user: AuthUser,
  password: string,
  existing: AuthUser[],
  setUsers: (users: AuthUser[]) => void,
) {
  if (user.kdfIterations === PBKDF2_ITERATIONS) return user

  const nextSalt = createSalt()
  const nextHash = await hashPassword(password, nextSalt, PBKDF2_ITERATIONS)
  const nextUser: AuthUser = {
    ...user,
    salt: nextSalt,
    passwordHash: nextHash,
    kdfIterations: PBKDF2_ITERATIONS,
  }
  const nextUsers = existing.map((item) => (item.id === user.id ? nextUser : item))
  saveUsers(nextUsers)
  setUsers(nextUsers)
  return nextUser
}

export function useAuth() {
  const [users, setUsers] = useState<AuthUser[]>(() => loadUsers())
  const [session, setSession] = useState<AuthSession | null>(() => loadSession())
  const [cloudUsername, setCloudUsername] = useState<string | null>(null)
  const [dataCryptoKey, setDataCryptoKey] = useState<CryptoKey | null>(null)
  const [ready, setReady] = useState(false)
  const [accountEpoch, setAccountEpoch] = useState(0)

  const clearDataKey = useCallback((userId?: string) => {
    clearStoredDataKey(userId)
    setDataCryptoKey(null)
  }, [])

  const setUnlockedKey = useCallback(async (userId: string, key: CryptoKey) => {
    pendingDataKey = { userId, key }
    await persistDataKey(userId, key)
    setDataCryptoKey(key)
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!isFirebaseConfigured()) {
      void (async () => {
        const currentUsers = loadUsers()
        const currentSession = loadSession()
        if (cancelled) return
        setUsers(currentUsers)

        const valid =
          currentSession &&
          (currentSession.isGuest ||
            currentSession.userId === GUEST_USER_ID ||
            currentUsers.some((user) => user.id === currentSession.userId))

        if (valid && currentSession) {
          if (!currentSession.isGuest && currentSession.userId !== GUEST_USER_ID) {
            const restored = await restoreDataKey(currentSession.userId)
            if (!restored) {
              // Missing durable key → require login again instead of unlock screen.
              clearStoredDataKey(currentSession.userId)
              saveSession(null)
              if (!cancelled) {
                setSession(null)
                setDataCryptoKey(null)
                setReady(true)
              }
              return
            }
            if (!cancelled) {
              setSession(currentSession)
              setDataCryptoKey(restored)
            }
          } else {
            if (!cancelled) {
              setSession(currentSession)
              setDataCryptoKey(null)
            }
          }
        } else {
          ensureGuestDataReady()
          const guestSession: AuthSession = { userId: GUEST_USER_ID, isGuest: true }
          saveSession(guestSession)
          if (!cancelled) {
            setSession(guestSession)
            setDataCryptoKey(null)
          }
        }
        if (!cancelled) setReady(true)
      })()
      return () => {
        cancelled = true
      }
    }

    const auth = getFirebaseAuth()
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      void (async () => {
        if (cancelled) return

        if (firebaseUser) {
          // Always refresh cloud profile/payload so web and home-screen PWA stay aligned.
          let meta = loadCloudMeta(firebaseUser.uid)
          try {
            const doc = await fetchCloudUserDoc(firebaseUser.uid)
            if (doc) {
              meta = {
                uid: firebaseUser.uid,
                username: doc.username,
                loginUsername: doc.loginUsername || meta?.loginUsername || doc.username,
                recoveryEmail:
                  doc.recoveryEmail ||
                  meta?.recoveryEmail ||
                  (firebaseUser.email && !isSyntheticAuthEmail(firebaseUser.email)
                    ? normalizeRecoveryEmail(firebaseUser.email)
                    : undefined),
                dataSalt: doc.dataSalt,
                dataKeyIterations: doc.dataKeyIterations,
                createdAt: doc.createdAt,
              }
              saveCloudMeta(meta)
              if (doc.payload) {
                localStorage.setItem(storageDataKey(firebaseUser.uid), doc.payload)
              }
            }
          } catch {
            // Offline: keep cached meta/payload.
          }

          const username =
            meta?.username ||
            firebaseUser.displayName ||
            firebaseUser.email?.split('@')[0] ||
            '使用者'

          let restored =
            (await restoreDataKey(firebaseUser.uid)) ??
            (pendingDataKey?.userId === firebaseUser.uid ? pendingDataKey.key : null)

          // Login/register may still be writing the durable key; wait before giving up.
          // While bootstrap is active, keep waiting (PBKDF2 + Firestore can exceed a few seconds).
          if (!restored) {
            const graceAttempts = 30
            let attempts = 0
            while (!restored) {
              const bootstrapping = authBootstrapDepth > 0
              if (!bootstrapping && attempts >= graceAttempts) break
              await new Promise((resolve) => window.setTimeout(resolve, 50))
              attempts += 1
              restored =
                (await restoreDataKey(firebaseUser.uid)) ??
                (pendingDataKey?.userId === firebaseUser.uid ? pendingDataKey.key : null)
            }
          }

          if (!restored) {
            // register/login still owns the flow — let it finish without signing out.
            if (authBootstrapDepth > 0) return

            try {
              await signOut(getFirebaseAuth())
            } catch {
              // ignore
            }
            clearStoredDataKey(firebaseUser.uid)
            saveSession(null)
            if (!cancelled) {
              setCloudUsername(null)
              setSession(null)
              setDataCryptoKey(null)
              setReady(true)
            }
            return
          }
          pendingDataKey = null

          setCloudUsername(username)
          const nextSession: AuthSession = { userId: firebaseUser.uid, isGuest: false }
          saveSession(nextSession)
          setSession(nextSession)
          if (!cancelled) setDataCryptoKey(restored)
          if (!cancelled) setReady(true)
          return
        }

        // Cloud mode: do not auto-enter guest. Show login so both web/PWA can use same account.
        setCloudUsername(null)
        const currentSession = loadSession()
        if (currentSession?.isGuest || currentSession?.userId === GUEST_USER_ID) {
          ensureGuestDataReady()
          const guestSession: AuthSession = { userId: GUEST_USER_ID, isGuest: true }
          saveSession(guestSession)
          if (!cancelled) {
            setSession(guestSession)
            setDataCryptoKey(null)
            setReady(true)
          }
          return
        }

        saveSession(null)
        if (!cancelled) {
          setSession(null)
          setDataCryptoKey(null)
          setReady(true)
        }
      })()
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  const currentUser: CurrentUser | null = (() => {
    void accountEpoch
    if (!session) return null
    if (session.isGuest || session.userId === GUEST_USER_ID) {
      return { id: GUEST_USER_ID, username: '訪客', isGuest: true }
    }
    // Registered account without data key should not stay "half logged in".
    if (!dataCryptoKey) return null
    if (isFirebaseConfigured()) {
      const meta = loadCloudMeta(session.userId)
      const displayName = cloudUsername ?? meta?.username ?? '使用者'
      return {
        id: session.userId,
        username: displayName,
        loginUsername: meta?.loginUsername || displayName,
        recoveryEmail: meta?.recoveryEmail,
        isGuest: false,
      }
    }
    const user = users.find((item) => item.id === session.userId)
    if (!user) return null
    return {
      id: user.id,
      username: user.nickname || user.username,
      loginUsername: user.username,
      isGuest: false,
    }
  })()

  const enterGuest = useCallback(async () => {
    clearDataKey(session?.userId)
    if (isFirebaseConfigured()) {
      try {
        await signOut(getFirebaseAuth())
      } catch {
        // ignore
      }
    }
    ensureGuestDataReady()
    const nextSession: AuthSession = { userId: GUEST_USER_ID, isGuest: true }
    saveSession(nextSession)
    setCloudUsername(null)
    setSession(nextSession)
  }, [clearDataKey, session?.userId])

  const completeCloudSession = useCallback(
    async (firebaseUser: User, username: string, password: string) => {
      const { cryptoKey, meta } = await ensureCloudProfile(firebaseUser, username, password)
      await setUnlockedKey(firebaseUser.uid, cryptoKey)
      setCloudUsername(meta.username)
      const nextSession: AuthSession = { userId: firebaseUser.uid, isGuest: false }
      saveSession(nextSession)
      setSession(nextSession)
      setReady(true)
    },
    [setUnlockedKey],
  )

  const signInWithUsernamePassword = useCallback(async (username: string, password: string) => {
    const auth = getFirebaseAuth()
    const emails = usernameToEmailCandidates(username)
    try {
      const indexed = await fetchUsernameIndex(username)
      if (indexed?.email && !emails.includes(indexed.email)) {
        emails.unshift(indexed.email)
      }
    } catch {
      // Index optional when offline / rules lag.
    }

    let lastError: unknown = null
    for (const email of emails) {
      try {
        return await signInWithEmailAndPassword(auth, email, password)
      } catch (error) {
        lastError = error
        const code = extractFirebaseErrorCode(error)
        // Wrong password on an existing identity should stop; missing identity may be legacy email.
        if (code === 'auth/wrong-password') throw error
        if (
          code !== 'auth/user-not-found' &&
          code !== 'auth/invalid-credential' &&
          code !== 'auth/invalid-login-credentials'
        ) {
          throw error
        }
      }
    }
    throw lastError ?? new Error('帳號或密碼錯誤')
  }, [])

  const registerCloud = useCallback(
    async (username: string, password: string, recoveryEmail?: string) => {
      const normalized = normalizeUsername(username)
      if (!normalized) throw new Error('請輸入帳號')
      validatePassword(password)
      if (normalized.toLowerCase() === 'guest' || normalized === '訪客') {
        throw new Error('這個帳號名稱不可使用')
      }

      const trimmedRecovery = recoveryEmail?.trim() ? normalizeRecoveryEmail(recoveryEmail) : ''
      if (trimmedRecovery && !isValidRecoveryEmail(trimmedRecovery)) {
        throw new Error('救援信箱格式不正確')
      }

      const authEmail = trimmedRecovery || usernameToEmail(normalized)

      beginAuthBootstrap()
      try {
        const auth = getFirebaseAuth()
        try {
          const existingIndex = await fetchUsernameIndex(normalized)
          if (existingIndex) throw new Error('這個帳號已被使用')
        } catch (error) {
          if (error instanceof Error && error.message === '這個帳號已被使用') throw error
          // Ignore index read failures (permissions / offline).
        }

        try {
          const credential = await createUserWithEmailAndPassword(auth, authEmail, password)
          await updateProfile(credential.user, { displayName: normalized })
          await completeCloudSession(credential.user, normalized, password)
          try {
            await saveUsernameIndex(normalized, {
              uid: credential.user.uid,
              email: authEmail,
            })
            if (trimmedRecovery) {
              const meta = loadCloudMeta(credential.user.uid)
              if (meta) {
                const nextMeta: CloudMeta = { ...meta, recoveryEmail: trimmedRecovery }
                saveCloudMeta(nextMeta)
                const localPayload = localStorage.getItem(storageDataKey(credential.user.uid))
                if (localPayload) {
                  await saveCloudUserDoc(credential.user.uid, {
                    username: nextMeta.username,
                    loginUsername: nextMeta.loginUsername || normalized,
                    recoveryEmail: trimmedRecovery,
                    dataSalt: nextMeta.dataSalt,
                    dataKeyIterations: nextMeta.dataKeyIterations,
                    payload: localPayload,
                    updatedAt: Date.now(),
                    createdAt: nextMeta.createdAt,
                  })
                }
              }
            }
          } catch (error) {
            if (!isCloudPermissionDenied(error)) {
              // Account is usable even if index write fails; login may need synthetic/recovery path.
              console.warn('Failed to persist username index / recovery email', error)
            }
          }
        } catch (error) {
          // First attempt may have created Auth user then failed mid-setup.
          // Resume with the same password instead of a false "already used".
          if (!isAuthEmailInUse(error)) throw new Error(mapFirebaseAuthError(error))

          try {
            const credential = await signInWithUsernamePassword(normalized, password)
            await completeCloudSession(credential.user, normalized, password)
          } catch {
            throw new Error('這個帳號已被使用')
          }
        }
      } finally {
        endAuthBootstrap()
      }
    },
    [completeCloudSession, signInWithUsernamePassword],
  )

  const loginCloud = useCallback(
    async (username: string, password: string) => {
      const normalized = normalizeUsername(username)
      if (!normalized) throw new Error('請輸入帳號')
      if (!password) throw new Error('請輸入密碼')

      beginAuthBootstrap()
      try {
        const credential = await signInWithUsernamePassword(normalized, password)
        await completeCloudSession(credential.user, normalized, password)
      } catch (error) {
        throw new Error(mapFirebaseAuthError(error))
      } finally {
        endAuthBootstrap()
      }
    },
    [completeCloudSession, signInWithUsernamePassword],
  )

  const registerLocal = useCallback(
    async (username: string, password: string) => {
      const normalized = normalizeUsername(username)
      if (!normalized) throw new Error('請輸入帳號')
      validatePassword(password)
      if (normalized.toLowerCase() === 'guest' || normalized === '訪客') {
        throw new Error('這個帳號名稱不可使用')
      }

      const existing = loadUsers()
      if (existing.some((user) => user.username.toLowerCase() === normalized.toLowerCase())) {
        throw new Error('這個帳號已被使用')
      }

      const salt = createSalt()
      const dataSalt = createSalt()
      const passwordHash = await hashPassword(password, salt, PBKDF2_ITERATIONS)
      const user: AuthUser = {
        id: crypto.randomUUID(),
        username: normalized,
        passwordHash,
        salt,
        dataSalt,
        kdfIterations: PBKDF2_ITERATIONS,
        dataKeyIterations: PBKDF2_ITERATIONS,
        createdAt: new Date().toISOString(),
      }

      const nextUsers = [...existing, user]
      saveUsers(nextUsers)
      setUsers(nextUsers)

      if (existing.length === 0) {
        migrateLegacyDataIfNeeded(user.id)
      } else if (!localStorage.getItem(storageDataKey(user.id))) {
        localStorage.setItem(
          storageDataKey(user.id),
          JSON.stringify({ folders: [], projects: [] }),
        )
      }

      const cryptoKey = await deriveDataKey(password, user.dataSalt, user.dataKeyIterations)
      await setUnlockedKey(user.id, cryptoKey)

      const nextSession: AuthSession = { userId: user.id }
      saveSession(nextSession)
      setSession(nextSession)
      return user
    },
    [setUnlockedKey],
  )

  const loginLocal = useCallback(
    async (username: string, password: string) => {
      const normalized = normalizeUsername(username)
      const existing = loadUsers()
      const user = existing.find(
        (item) => item.username.toLowerCase() === normalized.toLowerCase(),
      )
      if (!user) throw new Error('帳號或密碼錯誤')

      const ok = await verifyPassword(password, user.salt, user.passwordHash, user.kdfIterations)
      if (!ok) throw new Error('帳號或密碼錯誤')

      const nextUser = await upgradePasswordHashIfNeeded(user, password, existing, setUsers)
      const cryptoKey = await deriveDataKey(
        password,
        nextUser.dataSalt,
        nextUser.dataKeyIterations,
      )
      await setUnlockedKey(nextUser.id, cryptoKey)

      const nextSession: AuthSession = { userId: nextUser.id }
      saveSession(nextSession)
      setSession(nextSession)
      return nextUser
    },
    [setUnlockedKey],
  )

  const register = useCallback(
    async (username: string, password: string, recoveryEmail?: string) => {
      if (isFirebaseConfigured()) return registerCloud(username, password, recoveryEmail)
      if (recoveryEmail?.trim()) {
        throw new Error('本機模式無法使用救援信箱，請改用以雲端同步的正式站台註冊')
      }
      return registerLocal(username, password)
    },
    [registerCloud, registerLocal],
  )

  const requestPasswordReset = useCallback(async (account: string) => {
    if (!isFirebaseConfigured()) {
      throw new Error('目前無法使用忘記密碼，請確認雲端同步已啟用')
    }
    const trimmed = account.trim()
    if (!trimmed) throw new Error('請輸入帳號或救援信箱')

    const auth = getFirebaseAuth()
    let email = ''

    if (trimmed.includes('@')) {
      email = normalizeRecoveryEmail(trimmed)
      if (!isValidRecoveryEmail(email)) {
        throw new Error('請輸入有效的救援信箱')
      }
    } else {
      const normalized = normalizeUsername(trimmed)
      if (!normalized) throw new Error('請輸入帳號或救援信箱')
      let indexed: Awaited<ReturnType<typeof fetchUsernameIndex>> = null
      try {
        indexed = await fetchUsernameIndex(normalized)
      } catch {
        throw new Error('無法查詢帳號，請稍後再試或改填救援信箱')
      }
      if (!indexed?.email || isSyntheticAuthEmail(indexed.email)) {
        throw new Error(
          '此帳號尚未設定救援信箱。請先用原密碼登入，到「一般設定」新增救援信箱後再使用忘記密碼。',
        )
      }
      email = indexed.email
    }

    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      const code = extractFirebaseErrorCode(error)
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-login-credentials'
      ) {
        throw new Error('查無此信箱')
      }
      throw new Error(mapFirebaseAuthError(error))
    }
  }, [])

  const updateRecoveryEmail = useCallback(
    async (currentPassword: string, nextEmail: string) => {
      if (!currentUser || currentUser.isGuest) {
        throw new Error('訪客模式無法設定救援信箱，請先登入正式帳號')
      }
      if (!isFirebaseConfigured()) {
        throw new Error('雲端尚未設定，無法使用救援信箱')
      }
      if (!currentPassword) throw new Error('請輸入目前密碼')
      const email = normalizeRecoveryEmail(nextEmail)
      if (!isValidRecoveryEmail(email)) {
        throw new Error('救援信箱格式不正確，請輸入有效的電子郵件地址')
      }

      const auth = getFirebaseAuth()
      const firebaseUser = auth.currentUser
      if (!firebaseUser || firebaseUser.uid !== currentUser.id) {
        throw new Error('登入狀態已失效，請重新登入')
      }
      const meta = loadCloudMeta(firebaseUser.uid)
      if (!meta) throw new Error('找不到帳號資料，請重新登入')
      if (meta.recoveryEmail && meta.recoveryEmail === email) return

      try {
        await reauthenticateCloudUser(firebaseUser, currentPassword)
      } catch (error) {
        const mapped = error instanceof Error ? error.message : mapFirebaseAuthError(error)
        if (mapped === '目前無法使用帳號密碼登入，請聯絡管理員檢查設定') {
          throw new Error('查無此信箱')
        }
        throw error instanceof Error ? error : new Error(mapped)
      }

      try {
        await updateEmail(firebaseUser, email)
      } catch (error) {
        const code = extractFirebaseErrorCode(error)
        if (code === 'auth/invalid-email') {
          throw new Error('救援信箱格式不正確，請輸入有效的電子郵件地址')
        }
        if (code === 'auth/operation-not-allowed' || code === 'auth/user-not-found') {
          throw new Error('查無此信箱')
        }
        const mapped = mapFirebaseAuthError(error)
        if (mapped === '目前無法使用帳號密碼登入，請聯絡管理員檢查設定') {
          throw new Error('查無此信箱')
        }
        throw new Error(mapped)
      }

      const loginName = meta.loginUsername || meta.username
      const localPayload = localStorage.getItem(storageDataKey(firebaseUser.uid))
      const nextMeta: CloudMeta = { ...meta, recoveryEmail: email }
      saveCloudMeta(nextMeta)

      try {
        await saveUsernameIndex(loginName, { uid: firebaseUser.uid, email })
        await saveCloudUserDoc(firebaseUser.uid, {
          username: meta.username,
          loginUsername: loginName,
          recoveryEmail: email,
          dataSalt: meta.dataSalt,
          dataKeyIterations: meta.dataKeyIterations,
          payload:
            localPayload ??
            (await encryptJson(
              dataCryptoKey ??
                (await deriveDataKey(currentPassword, meta.dataSalt, meta.dataKeyIterations)),
              { folders: [], projects: [], updatedAt: Date.now() },
            )),
          updatedAt: Date.now(),
          createdAt: meta.createdAt,
        })
      } catch (error) {
        if (!isCloudPermissionDenied(error)) throw new Error(mapFirebaseAuthError(error))
      }
      setAccountEpoch((value) => value + 1)
    },
    [currentUser, dataCryptoKey],
  )

  const repairDataAfterPasswordReset = useCallback(
    async (oldPassword: string, currentPassword: string) => {
      if (!currentUser || currentUser.isGuest) {
        throw new Error('請先登入正式帳號')
      }
      if (!oldPassword || !currentPassword) throw new Error('請輸入舊密碼與目前密碼')
      validatePassword(currentPassword)
      if (oldPassword === currentPassword) {
        throw new Error('舊密碼與目前密碼相同，無需轉換')
      }

      const meta = loadCloudMeta(currentUser.id)
      if (!meta) throw new Error('找不到帳號資料，請重新登入')

      let oldKey: CryptoKey
      try {
        oldKey = await deriveDataKey(oldPassword, meta.dataSalt, meta.dataKeyIterations)
        const raw = localStorage.getItem(storageDataKey(currentUser.id))
        if (raw) {
          const object = tryParseJsonObject(raw)
          if (object && isEncryptedBlob(object)) {
            await decryptJson(oldKey, raw)
          }
        }
      } catch {
        throw new Error('舊密碼錯誤，無法解開資料')
      }

      if (isFirebaseConfigured()) {
        const auth = getFirebaseAuth()
        const firebaseUser = auth.currentUser
        if (!firebaseUser || firebaseUser.uid !== currentUser.id) {
          throw new Error('登入狀態已失效，請重新登入')
        }
        await reauthenticateCloudUser(firebaseUser, currentPassword)
      }

      const newKey = await deriveDataKey(currentPassword, meta.dataSalt, meta.dataKeyIterations)
      const payload = await reencryptUserPayload(currentUser.id, oldKey, newKey)
      if (payload && isFirebaseConfigured()) {
        try {
          await saveCloudUserDoc(currentUser.id, {
            username: meta.username,
            loginUsername: meta.loginUsername || meta.username,
            recoveryEmail: meta.recoveryEmail,
            dataSalt: meta.dataSalt,
            dataKeyIterations: meta.dataKeyIterations,
            payload,
            updatedAt: Date.now(),
            createdAt: meta.createdAt,
          })
        } catch (error) {
          if (!isCloudPermissionDenied(error)) throw new Error(mapFirebaseAuthError(error))
        }
      }
      await setUnlockedKey(currentUser.id, newKey)
    },
    [currentUser, setUnlockedKey],
  )

  const login = useCallback(
    async (username: string, password: string) => {
      if (isFirebaseConfigured()) {
        try {
          return await loginCloud(username, password)
        } catch (cloudError) {
          const normalized = normalizeUsername(username)
          const existing = loadUsers()
          const localUser = existing.find(
            (item) => item.username.toLowerCase() === normalized.toLowerCase(),
          )
          if (!localUser) throw cloudError
          const ok = await verifyPassword(
            password,
            localUser.salt,
            localUser.passwordHash,
            localUser.kdfIterations,
          )
          if (!ok) throw cloudError
          // Local account exists → create matching cloud account and migrate.
          return registerCloud(username, password)
        }
      }
      return loginLocal(username, password)
    },
    [loginCloud, loginLocal, registerCloud],
  )

  const logout = useCallback(async () => {
    clearDataKey(session?.userId)
    if (isFirebaseConfigured()) {
      try {
        await signOut(getFirebaseAuth())
      } catch {
        // ignore
      }
    }
    saveSession(null)
    setCloudUsername(null)
    setSession(null)
  }, [clearDataKey, session?.userId])

  const wipeCurrentUserData = useCallback(async () => {
    if (!currentUser || currentUser.isGuest) return
    localStorage.removeItem(storageDataKey(currentUser.id))
    clearCloudMeta(currentUser.id)
    if (isFirebaseConfigured()) {
      try {
        const loginName = currentUser.loginUsername || currentUser.username
        await deleteUsernameIndex(loginName)
        await deleteCloudUserDoc(currentUser.id)
        await signOut(getFirebaseAuth())
      } catch {
        // ignore
      }
    }
    clearDataKey(currentUser.id)
    saveSession(null)
    setCloudUsername(null)
    setSession(null)
  }, [clearDataKey, currentUser])

  const wipeAllLocalData = useCallback(async () => {
    if (isFirebaseConfigured() && currentUser && !currentUser.isGuest) {
      try {
        await deleteCloudUserDoc(currentUser.id)
        await signOut(getFirebaseAuth())
      } catch {
        // ignore
      }
    }
    const keysToRemove: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key && key.startsWith('savings-system:')) keysToRemove.push(key)
    }
    for (const key of keysToRemove) localStorage.removeItem(key)
    clearDataKey()
    setUsers([])
    setCloudUsername(null)
    setSession(null)
  }, [clearDataKey, currentUser])

  const updateNickname = useCallback(
    async (nickname: string) => {
      if (!currentUser || currentUser.isGuest) {
        throw new Error('訪客模式無法更改暱稱，請先登入正式帳號')
      }
      const normalized = validateNickname(nickname)
      if (normalized === currentUser.username) return

      if (isFirebaseConfigured()) {
        const auth = getFirebaseAuth()
        const firebaseUser = auth.currentUser
        if (!firebaseUser || firebaseUser.uid !== currentUser.id) {
          throw new Error('登入狀態已失效，請重新登入')
        }
        if (!dataCryptoKey) throw new Error('登入狀態已失效，請重新登入')

        const meta = loadCloudMeta(firebaseUser.uid)
        if (!meta) throw new Error('找不到帳號資料，請重新登入')

        try {
          await updateProfile(firebaseUser, { displayName: normalized })
        } catch (error) {
          throw new Error(mapFirebaseAuthError(error))
        }

        const nextMeta: CloudMeta = {
          ...meta,
          username: normalized,
          loginUsername: meta.loginUsername || meta.username,
        }
        saveCloudMeta(nextMeta)

        const localPayload = localStorage.getItem(storageDataKey(firebaseUser.uid))
        try {
          await saveCloudUserDoc(firebaseUser.uid, {
            username: normalized,
            loginUsername: nextMeta.loginUsername,
            recoveryEmail: nextMeta.recoveryEmail,
            dataSalt: nextMeta.dataSalt,
            dataKeyIterations: nextMeta.dataKeyIterations,
            payload:
              localPayload ??
              (await encryptJson(dataCryptoKey, {
                folders: [],
                projects: [],
                updatedAt: Date.now(),
              })),
            updatedAt: Date.now(),
            createdAt: nextMeta.createdAt,
          })
        } catch (error) {
          if (!isCloudPermissionDenied(error)) throw new Error(mapFirebaseAuthError(error))
        }

        setCloudUsername(normalized)
        return
      }

      const existing = loadUsers()
      const user = existing.find((item) => item.id === currentUser.id)
      if (!user) throw new Error('找不到帳號資料，請重新登入')

      const nextUser: AuthUser = { ...user, nickname: normalized }
      const nextUsers = existing.map((item) => (item.id === user.id ? nextUser : item))
      saveUsers(nextUsers)
      setUsers(nextUsers)
    },
    [currentUser, dataCryptoKey],
  )

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!currentUser || currentUser.isGuest) {
        throw new Error('訪客模式無法更改密碼，請先登入正式帳號')
      }
      if (!currentPassword) throw new Error('請輸入目前密碼')
      validatePassword(newPassword)
      if (currentPassword === newPassword) {
        throw new Error('新密碼不可與目前密碼相同')
      }
      if (!dataCryptoKey) throw new Error('登入狀態已失效，請重新登入')

      if (isFirebaseConfigured()) {
        const auth = getFirebaseAuth()
        const firebaseUser = auth.currentUser
        if (!firebaseUser || firebaseUser.uid !== currentUser.id) {
          throw new Error('登入狀態已失效，請重新登入')
        }
        const meta = loadCloudMeta(firebaseUser.uid)
        if (!meta) throw new Error('找不到帳號資料，請重新登入')

        let oldKey: CryptoKey
        try {
          oldKey = await deriveDataKey(currentPassword, meta.dataSalt, meta.dataKeyIterations)
          const raw = localStorage.getItem(storageDataKey(firebaseUser.uid))
          if (raw) {
            const object = tryParseJsonObject(raw)
            if (object && isEncryptedBlob(object)) {
              await decryptJson(oldKey, raw)
            }
          }
        } catch {
          throw new Error('目前密碼錯誤')
        }

        await reauthenticateCloudUser(firebaseUser, currentPassword)

        try {
          await updatePassword(firebaseUser, newPassword)
        } catch (error) {
          throw new Error(mapFirebaseAuthError(error))
        }

        const newKey = await deriveDataKey(newPassword, meta.dataSalt, meta.dataKeyIterations)
        const payload = await reencryptUserPayload(firebaseUser.uid, oldKey, newKey)
        if (payload) {
          try {
            await saveCloudUserDoc(firebaseUser.uid, {
              username: meta.username,
              loginUsername: meta.loginUsername || meta.username,
              recoveryEmail: meta.recoveryEmail,
              dataSalt: meta.dataSalt,
              dataKeyIterations: meta.dataKeyIterations,
              payload,
              updatedAt: Date.now(),
              createdAt: meta.createdAt,
            })
          } catch (error) {
            if (!isCloudPermissionDenied(error)) throw new Error(mapFirebaseAuthError(error))
          }
        }
        await setUnlockedKey(firebaseUser.uid, newKey)
        return
      }

      const existing = loadUsers()
      const user = existing.find((item) => item.id === currentUser.id)
      if (!user) throw new Error('找不到帳號資料，請重新登入')

      const ok = await verifyPassword(
        currentPassword,
        user.salt,
        user.passwordHash,
        user.kdfIterations,
      )
      if (!ok) throw new Error('目前密碼錯誤')

      const oldKey = await deriveDataKey(
        currentPassword,
        user.dataSalt,
        user.dataKeyIterations,
      )
      const newSalt = createSalt()
      const newHash = await hashPassword(newPassword, newSalt, PBKDF2_ITERATIONS)
      const nextUser: AuthUser = {
        ...user,
        salt: newSalt,
        passwordHash: newHash,
        kdfIterations: PBKDF2_ITERATIONS,
      }
      const newKey = await deriveDataKey(newPassword, nextUser.dataSalt, nextUser.dataKeyIterations)
      await reencryptUserPayload(user.id, oldKey, newKey)

      const nextUsers = existing.map((item) => (item.id === user.id ? nextUser : item))
      saveUsers(nextUsers)
      setUsers(nextUsers)
      await setUnlockedKey(user.id, newKey)
    },
    [currentUser, dataCryptoKey, setUnlockedKey],
  )

  return {
    ready,
    users,
    currentUser,
    dataCryptoKey,
    cloudEnabled: isFirebaseConfigured(),
    enterGuest: () => {
      void enterGuest()
    },
    register,
    login,
    requestPasswordReset,
    updateRecoveryEmail,
    repairDataAfterPasswordReset,
    updateNickname,
    changePassword,
    logout: () => {
      void logout()
    },
    wipeCurrentUserData: () => {
      void wipeCurrentUserData()
    },
    wipeAllLocalData: () => {
      void wipeAllLocalData()
    },
  }
}
