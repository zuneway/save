export const GUEST_USER_ID = 'guest'

export interface AuthUser {
  id: string
  username: string
  /** Display name; falls back to username when absent */
  nickname?: string
  passwordHash: string
  /** Salt for password verification hash */
  salt: string
  /** Separate salt for AES data-key derivation */
  dataSalt: string
  /** Iterations used for passwordHash */
  kdfIterations: number
  /** Iterations used for data-key derivation (never change once set) */
  dataKeyIterations: number
  createdAt: string
}

export interface AuthSession {
  userId: string
  isGuest?: boolean
}

export interface CurrentUser {
  id: string
  /** Display name shown in the UI */
  username: string
  /** Account name used for login (may differ from display nickname) */
  loginUsername?: string
  /** Bound recovery email for password reset, if any */
  recoveryEmail?: string
  isGuest: boolean
}
