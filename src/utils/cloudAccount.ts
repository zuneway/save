/** Synthetic email domain for username-based Firebase Auth (not a real mailbox). */
const EMAIL_DOMAIN = 'accounts.savings-sync.app'

export function normalizeUsername(username: string): string {
  return username.trim()
}

export function normalizeRecoveryEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidRecoveryEmail(email: string): boolean {
  const normalized = normalizeRecoveryEmail(email)
  // Practical check; Firebase will still validate on write.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && !normalized.endsWith(`@${EMAIL_DOMAIN}`)
}

export function isSyntheticAuthEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return normalizeRecoveryEmail(email).endsWith(`@${EMAIL_DOMAIN}`)
}

/**
 * Encode username into a valid email local-part (supports CJK).
 * Local-part is lowercased because Firebase Auth lowercases emails.
 */
export function usernameToEmail(username: string): string {
  const normalized = normalizeUsername(username).toLowerCase()
  const bytes = new TextEncoder().encode(normalized)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const local = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
    .toLowerCase()
  return `${local}@${EMAIL_DOMAIN}`
}

/** Candidates for login across older mixed-case encodings. */
export function usernameToEmailCandidates(username: string): string[] {
  const normalized = normalizeUsername(username).toLowerCase()
  const bytes = new TextEncoder().encode(normalized)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const mixed = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const lower = mixed.toLowerCase()
  return [...new Set([`${lower}@${EMAIL_DOMAIN}`, `${mixed}@${EMAIL_DOMAIN}`])]
}

export function extractFirebaseErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code).trim()
    if (code) return code
  }
  const message = error instanceof Error ? error.message : String(error ?? '')
  const authMatch = message.match(/\((auth\/[a-z0-9-]+)\)/i)
  if (authMatch?.[1]) return authMatch[1].toLowerCase()
  // Firestore often surfaces only the English message in the browser.
  if (/missing or insufficient permissions/i.test(message)) return 'permission-denied'
  return ''
}

export function isCloudPermissionDenied(error: unknown): boolean {
  const code = extractFirebaseErrorCode(error)
  return code === 'permission-denied' || code === 'firestore/permission-denied'
}

export function mapFirebaseAuthError(error: unknown): string {
  const code = extractFirebaseErrorCode(error)

  switch (code) {
    case 'auth/email-already-in-use':
      return '這個帳號或信箱已被使用'
    case 'auth/invalid-email':
      return '救援信箱格式不正確，請輸入有效的電子郵件地址'
    case 'auth/requires-recent-login':
      return '為了安全請先重新登入後再試'
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return '密碼強度不足，請使用更長或更複雜的密碼'
    case 'auth/missing-password':
      return '請輸入密碼'
    case 'auth/missing-email':
      return '請輸入帳號'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return '帳號或密碼錯誤'
    case 'auth/user-disabled':
      return '此帳號已被停用，請聯絡管理員'
    case 'auth/too-many-requests':
      return '嘗試次數過多，請稍後再試'
    case 'auth/network-request-failed':
      return '網路連線失敗，請檢查網路後再試'
    case 'auth/operation-not-allowed':
      return '目前無法使用帳號密碼登入，請聯絡管理員檢查設定'
    case 'auth/unauthorized-domain':
      return '此網站網域尚未授權，請聯絡管理員'
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return '雲端設定有誤，請聯絡管理員'
    case 'auth/configuration-not-found':
      return '雲端登入尚未完成設定，請聯絡管理員'
    case 'auth/admin-restricted-operation':
      return '此操作已被限制，請聯絡管理員'
    case 'auth/internal-error':
      return '伺服器暫時異常，請稍後再試'
    case 'auth/user-token-expired':
    case 'auth/invalid-user-token':
      return '登入已過期，請重新登入'
    case 'permission-denied':
    case 'firestore/permission-denied':
      return '雲端資料庫權限尚未設定完成，請確認 Firestore 規則已發布後再試'
    case 'unavailable':
    case 'firestore/unavailable':
      return '雲端服務暫時無法使用，請稍後再試'
    default: {
      const message = error instanceof Error ? error.message.trim() : ''
      // Never surface raw English Firebase messages to users.
      if (message && !/firebase|auth\/|firestore|error \(|permissions/i.test(message)) {
        return message
      }
      return '操作失敗，請再試一次'
    }
  }
}
