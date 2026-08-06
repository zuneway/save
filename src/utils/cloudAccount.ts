/** Synthetic email domain for username-based Firebase Auth (not a real mailbox). */
const EMAIL_DOMAIN = 'accounts.savings-sync.app'

export function normalizeUsername(username: string): string {
  return username.trim()
}

/** Encode username into a valid email local-part (supports CJK). */
export function usernameToEmail(username: string): string {
  const normalized = normalizeUsername(username).toLowerCase()
  const bytes = new TextEncoder().encode(normalized)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const local = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${local}@${EMAIL_DOMAIN}`
}

export function mapFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''

  switch (code) {
    case 'auth/email-already-in-use':
      return '這個帳號已被使用'
    case 'auth/invalid-email':
      return '帳號格式不正確'
    case 'auth/weak-password':
      return '密碼強度不足'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return '帳號或密碼錯誤'
    case 'auth/too-many-requests':
      return '嘗試次數過多，請稍後再試'
    case 'auth/network-request-failed':
      return '網路連線失敗，請檢查網路後再試'
    default:
      if (error instanceof Error && error.message) return error.message
      return '操作失敗，請再試一次'
  }
}
