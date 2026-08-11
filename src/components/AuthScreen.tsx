import { useState } from 'react'
import { APP_NAME, APP_TAGLINE_EN } from '../config/brand'
import { PASSWORD_MIN_LENGTH } from '../utils/authCrypto'
import { isValidRecoveryEmail } from '../utils/cloudAccount'

interface AuthScreenProps {
  onLogin: (username: string, password: string) => Promise<unknown>
  onRegister: (
    username: string,
    password: string,
    recoveryEmail?: string,
  ) => Promise<unknown>
  onRequestPasswordReset: (account: string) => Promise<void>
  onEnterGuest: () => void
  onOpenInstallGuide: () => void
  onOpenPrivacy: () => void
}

type AuthMode = 'login' | 'register' | 'forgot'

export function AuthScreen({
  onLogin,
  onRegister,
  onRequestPasswordReset,
  onEnterGuest,
  onOpenInstallGuide,
  onOpenPrivacy,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [resetAccount, setResetAccount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return

    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'forgot') {
        await onRequestPasswordReset(resetAccount || username)
        setInfo(
          '若該信箱已綁定帳號，重設密碼信件已寄出。請至信箱開啟連結。重設後若無法開啟存錢資料，登入後可用「舊密碼」完成資料轉換。',
        )
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('兩次密碼不一致')
        }
        if (recoveryEmail.trim() && !isValidRecoveryEmail(recoveryEmail)) {
          throw new Error('救援信箱格式不正確，請輸入有效的電子郵件地址')
        }
        await onRegister(username, password, recoveryEmail.trim() || undefined)
      } else {
        await onLogin(username, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <header className="auth-hero">
        <p className="eyebrow">{APP_TAGLINE_EN}</p>
        <h1 className="brand-display">{APP_NAME}</h1>
        <p className="subtitle">
          把小錢存成大夢想。網頁與主畫面請登入同一個帳號，資料才會一起跟著你走。
        </p>
      </header>

      <section className="auth-card">
        {mode === 'forgot' ? (
          <>
            <h2 className="auth-forgot-title">忘記密碼</h2>
            <form className="modal-form" onSubmit={submit}>
              <label className="field">
                <span>帳號或救援信箱</span>
                <input
                  type="text"
                  autoComplete="username"
                  value={resetAccount}
                  onChange={(event) => setResetAccount(event.target.value)}
                  placeholder="輸入帳號或救援信箱"
                  required
                />
              </label>
              <p className="field-hint">
                需已設定救援信箱才能收到重設信。若尚未設定，請先用原密碼登入，到「一般設定」新增。
              </p>
              {error ? <p className="auth-error">{error}</p> : null}
              {info ? <p className="auth-success">{info}</p> : null}
              <button type="submit" className="button button-primary" disabled={busy}>
                {busy ? '處理中…' : '寄送重設密碼信'}
              </button>
            </form>
            <button
              type="button"
              className="button button-secondary auth-guest-button"
              disabled={busy}
              onClick={() => switchMode('login')}
            >
              返回登入
            </button>
          </>
        ) : (
          <>
            <div className="auth-tabs" role="tablist" aria-label="登入或註冊">
              <button
                type="button"
                className={`auth-tab ${mode === 'login' ? 'is-active' : ''}`}
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => switchMode('login')}
              >
                登入
              </button>
              <button
                type="button"
                className={`auth-tab ${mode === 'register' ? 'is-active' : ''}`}
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => switchMode('register')}
              >
                註冊
              </button>
            </div>

            <form className="modal-form" onSubmit={submit}>
              <label className="field">
                <span>帳號</span>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="輸入帳號"
                  required
                />
              </label>
              <label className="field">
                <span>密碼</span>
                <input
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    mode === 'register' ? `至少 ${PASSWORD_MIN_LENGTH} 個字元` : '輸入密碼'
                  }
                  required
                  minLength={mode === 'register' ? PASSWORD_MIN_LENGTH : 1}
                />
              </label>
              {mode === 'register' ? (
                <>
                  <label className="field">
                    <span>確認密碼</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="再輸入一次密碼"
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                    />
                  </label>
                  <label className="field">
                    <span>救援信箱（選填）</span>
                    <input
                      type="text"
                      inputMode="email"
                      autoComplete="email"
                      value={recoveryEmail}
                      onChange={(event) => setRecoveryEmail(event.target.value)}
                      placeholder="name@example.com"
                    />
                  </label>
                  <p className="field-hint">忘記密碼時可使用。也可之後在「一般設定」新增。</p>
                </>
              ) : null}

              {error ? <p className="auth-error">{error}</p> : null}
              {info ? <p className="auth-success">{info}</p> : null}

              <p className="auth-sync-hint">
                手機瀏覽器與「加到主畫面」的 App 儲存空間是分開的，兩邊都要用同一組帳號密碼登入。
              </p>

              <button type="submit" className="button button-primary" disabled={busy}>
                {busy ? '處理中…' : mode === 'login' ? '登入並同步' : '建立帳號並同步'}
              </button>
            </form>

            {mode === 'login' ? (
              <button
                type="button"
                className="auth-forgot-link"
                disabled={busy}
                onClick={() => {
                  setResetAccount(username)
                  switchMode('forgot')
                }}
              >
                忘記密碼？
              </button>
            ) : null}

            <div className="auth-divider" aria-hidden="true">
              <span>或</span>
            </div>

            <button
              type="button"
              className="button button-secondary auth-guest-button"
              disabled={busy}
              onClick={() => {
                setError(null)
                setInfo(null)
                onEnterGuest()
              }}
            >
              先以訪客試用（不同步）
            </button>
          </>
        )}
      </section>

      <div className="auth-footer-links">
        <button type="button" className="auth-install-link" onClick={onOpenPrivacy}>
          隱私權條款
        </button>
        <button type="button" className="auth-install-link" onClick={onOpenInstallGuide}>
          如何把網頁加到手機主畫面？
        </button>
      </div>
    </div>
  )
}
