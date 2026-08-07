import { useCallback, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import type { AuthSession, AuthUser, CurrentUser } from '../types/auth'
import { GUEST_USER_ID } from '../types/auth'
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase'
import {
  mapFirebaseAuthError,
  normalizeUsername,
  usernameToEmail,
} from '../utils/cloudAccount'
import { clearCloudMeta, loadCloudMeta, saveCloudMeta, type CloudMeta } from '../utils/cloudMeta'
import { deleteCloudUserDoc, fetchCloudUserDoc, saveCloudUserDoc } from '../utils/cloudSync'
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
  const existing = await fetchCloudUserDoc(firebaseUser.uid)
  if (existing) {
    const cryptoKey = await deriveDataKey(
      password,
      existing.dataSalt,
      existing.dataKeyIterations,
    )
    const meta: CloudMeta = {
      uid: firebaseUser.uid,
      username: existing.username || username,
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
    dataSalt,
    dataKeyIterations: PBKDF2_ITERATIONS,
    createdAt,
  }
  await saveCloudUserDoc(firebaseUser.uid, {
    username,
    dataSalt,
    dataKeyIterations: PBKDF2_ITERATIONS,
    payload,
    updatedAt: Date.now(),
    createdAt,
  })
  saveCloudMeta(meta)
  localStorage.setItem(storageDataKey(firebaseUser.uid), payload)

  if (options?.migrateLocal !== false) {
    await migrateLocalAccountToCloud(
      firebaseUser.uid,
      username,
      password,
      dataSalt,
      PBKDF2_ITERATIONS,
      cryptoKey,
    )
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
          if (!restored) {
            const maxAttempts = authBootstrapDepth > 0 ? 80 : 30
            for (let attempt = 0; attempt < maxAttempts && !restored; attempt += 1) {
              await new Promise((resolve) => window.setTimeout(resolve, 50))
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
    if (!session) return null
    if (session.isGuest || session.userId === GUEST_USER_ID) {
      return { id: GUEST_USER_ID, username: '訪客', isGuest: true }
    }
    // Registered account without data key should not stay "half logged in".
    if (!dataCryptoKey) return null
    if (isFirebaseConfigured()) {
      return {
        id: session.userId,
        username: cloudUsername ?? loadCloudMeta(session.userId)?.username ?? '使用者',
        isGuest: false,
      }
    }
    const user = users.find((item) => item.id === session.userId)
    if (!user) return null
    return { id: user.id, username: user.username, isGuest: false }
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
    },
    [setUnlockedKey],
  )

  const registerCloud = useCallback(
    async (username: string, password: string) => {
      const normalized = normalizeUsername(username)
      if (!normalized) throw new Error('請輸入帳號')
      validatePassword(password)
      if (normalized.toLowerCase() === 'guest' || normalized === '訪客') {
        throw new Error('這個帳號名稱不可使用')
      }

      beginAuthBootstrap()
      try {
        const auth = getFirebaseAuth()
        try {
          const credential = await createUserWithEmailAndPassword(
            auth,
            usernameToEmail(normalized),
            password,
          )
          await updateProfile(credential.user, { displayName: normalized })
          await completeCloudSession(credential.user, normalized, password)
        } catch (error) {
          // First attempt may have created Auth user then failed mid-setup.
          // Resume with the same password instead of a false "already used".
          if (!isAuthEmailInUse(error)) throw new Error(mapFirebaseAuthError(error))

          try {
            const credential = await signInWithEmailAndPassword(
              auth,
              usernameToEmail(normalized),
              password,
            )
            await completeCloudSession(credential.user, normalized, password)
          } catch {
            throw new Error('這個帳號已被使用')
          }
        }
      } finally {
        endAuthBootstrap()
      }
    },
    [completeCloudSession],
  )

  const loginCloud = useCallback(
    async (username: string, password: string) => {
      const normalized = normalizeUsername(username)
      if (!normalized) throw new Error('請輸入帳號')
      validatePassword(password)

      beginAuthBootstrap()
      try {
        const auth = getFirebaseAuth()
        const credential = await signInWithEmailAndPassword(
          auth,
          usernameToEmail(normalized),
          password,
        )
        await completeCloudSession(credential.user, normalized, password)
      } catch (error) {
        throw new Error(mapFirebaseAuthError(error))
      } finally {
        endAuthBootstrap()
      }
    },
    [completeCloudSession],
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
    async (username: string, password: string) => {
      if (isFirebaseConfigured()) return registerCloud(username, password)
      return registerLocal(username, password)
    },
    [registerCloud, registerLocal],
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
