import { useCallback, useEffect, useState } from 'react'
import type { AuthSession, AuthUser, CurrentUser } from '../types/auth'
import { GUEST_USER_ID } from '../types/auth'
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

const USERS_KEY = 'savings-system:users'
const SESSION_KEY = 'savings-system:session'
const DATA_KEY_SESSION = 'savings-system:data-key'
const LEGACY_DATA_KEY = 'savings-system:data'

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

function clearStoredDataKey() {
  try {
    sessionStorage.removeItem(DATA_KEY_SESSION)
  } catch {
    // ignore storage failures
  }
}

async function persistDataKey(key: CryptoKey) {
  try {
    const raw = await exportDataKeyRaw(key)
    sessionStorage.setItem(DATA_KEY_SESSION, raw)
  } catch {
    // ignore storage failures
  }
}

async function restoreDataKey(): Promise<CryptoKey | null> {
  try {
    const raw = sessionStorage.getItem(DATA_KEY_SESSION)
    if (!raw) return null
    return await importDataKeyRaw(raw)
  } catch {
    clearStoredDataKey()
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

function isValidSession(session: AuthSession | null, users: AuthUser[]): boolean {
  if (!session) return false
  if (session.isGuest || session.userId === GUEST_USER_ID) return true
  return users.some((user) => user.id === session.userId)
}

function toCurrentUser(session: AuthSession | null, users: AuthUser[]): CurrentUser | null {
  if (!session || !isValidSession(session, users)) return null
  if (session.isGuest || session.userId === GUEST_USER_ID) {
    return { id: GUEST_USER_ID, username: '訪客', isGuest: true }
  }
  const user = users.find((item) => item.id === session.userId)
  if (!user) return null
  return { id: user.id, username: user.username, isGuest: false }
}

function validatePassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`密碼至少 ${PASSWORD_MIN_LENGTH} 個字元`)
  }
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
  const [dataCryptoKey, setDataCryptoKey] = useState<CryptoKey | null>(null)
  const [ready, setReady] = useState(false)

  const clearDataKey = useCallback(() => {
    clearStoredDataKey()
    setDataCryptoKey(null)
  }, [])

  const setUnlockedKey = useCallback(async (key: CryptoKey) => {
    await persistDataKey(key)
    setDataCryptoKey(key)
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const currentUsers = loadUsers()
      const currentSession = loadSession()
      if (cancelled) return
      setUsers(currentUsers)

      if (isValidSession(currentSession, currentUsers)) {
        setSession(currentSession)
        if (currentSession && !currentSession.isGuest && currentSession.userId !== GUEST_USER_ID) {
          const restored = await restoreDataKey()
          if (!cancelled) setDataCryptoKey(restored)
        } else {
          clearStoredDataKey()
          if (!cancelled) setDataCryptoKey(null)
        }
      } else {
        // Default every new / invalid session to guest mode.
        ensureGuestDataReady()
        const guestSession: AuthSession = { userId: GUEST_USER_ID, isGuest: true }
        saveSession(guestSession)
        clearStoredDataKey()
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
  }, [])

  const currentUser = toCurrentUser(session, users)
  const needsUnlock = Boolean(currentUser && !currentUser.isGuest && !dataCryptoKey)

  const lock = useCallback(() => {
    clearDataKey()
  }, [clearDataKey])

  const enterGuest = useCallback(() => {
    clearDataKey()
    ensureGuestDataReady()
    const nextSession: AuthSession = { userId: GUEST_USER_ID, isGuest: true }
    saveSession(nextSession)
    setSession(nextSession)
  }, [clearDataKey])

  const register = useCallback(
    async (username: string, password: string) => {
      const normalized = username.trim()
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
      await setUnlockedKey(cryptoKey)

      const nextSession: AuthSession = { userId: user.id }
      saveSession(nextSession)
      setSession(nextSession)
      return user
    },
    [setUnlockedKey],
  )

  const login = useCallback(
    async (username: string, password: string) => {
      const normalized = username.trim()
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
      await setUnlockedKey(cryptoKey)

      const nextSession: AuthSession = { userId: nextUser.id }
      saveSession(nextSession)
      setSession(nextSession)
      return nextUser
    },
    [setUnlockedKey],
  )

  const unlock = useCallback(
    async (password: string) => {
      if (!session || session.isGuest || session.userId === GUEST_USER_ID) {
        throw new Error('目前不是需要解鎖的帳號')
      }
      const existing = loadUsers()
      const user = existing.find((item) => item.id === session.userId)
      if (!user) throw new Error('找不到帳號，請重新登入')

      const ok = await verifyPassword(password, user.salt, user.passwordHash, user.kdfIterations)
      if (!ok) throw new Error('密碼錯誤')

      const nextUser = await upgradePasswordHashIfNeeded(user, password, existing, setUsers)
      const cryptoKey = await deriveDataKey(
        password,
        nextUser.dataSalt,
        nextUser.dataKeyIterations,
      )
      await setUnlockedKey(cryptoKey)
    },
    [session, setUnlockedKey],
  )

  const logout = useCallback(() => {
    clearDataKey()
    saveSession(null)
    setSession(null)
  }, [clearDataKey])

  const wipeCurrentUserData = useCallback(() => {
    if (!currentUser || currentUser.isGuest) return
    localStorage.removeItem(storageDataKey(currentUser.id))
    clearDataKey()
    saveSession(null)
    setSession(null)
  }, [clearDataKey, currentUser])

  const wipeAllLocalData = useCallback(() => {
    const keysToRemove: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key && key.startsWith('savings-system:')) keysToRemove.push(key)
    }
    for (const key of keysToRemove) localStorage.removeItem(key)
    clearDataKey()
    setUsers([])
    setSession(null)
  }, [clearDataKey])

  return {
    ready,
    users,
    currentUser,
    dataCryptoKey,
    needsUnlock,
    enterGuest,
    register,
    login,
    unlock,
    lock,
    logout,
    wipeCurrentUserData,
    wipeAllLocalData,
  }
}
