import { useState } from 'react'
import { PASSWORD_MIN_LENGTH } from '../utils/authCrypto'

interface AuthScreenProps {
  onLogin: (username: string, password: string) => Promise<unknown>
  onRegister: (username: string, password: string) => Promise<unknown>
  onEnterGuest: () => void
  onOpenInstallGuide: () => void
  onOpenPrivacy: () => void
}

type AuthMode = 'login' | 'register'

export function AuthScreen({
  onLogin,
  onRegister,
  onEnterGuest,
  onOpenInstallGuide,
  onOpenPrivacy,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return

    setError(null)
    setBusy(true)
    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('兩次密碼不一致')
        }
        await onRegister(username, password)
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
        <p className="eyebrow">Savings Tracker</p>
        <h1>存錢系統</h1>
        <p className="subtitle">
          網頁版與主畫面版請登入同一個正式帳號，資料才會自動同步；訪客模式兩邊各自獨立。
        </p>
      </header>

      <section className="auth-card">
        <div className="auth-tabs" role="tablist" aria-label="登入或註冊">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'is-active' : ''}`}
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => {
              setMode('login')
              setError(null)
            }}
          >
            登入
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'register' ? 'is-active' : ''}`}
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => {
              setMode('register')
              setError(null)
            }}
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
          ) : null}

          {error ? <p className="auth-error">{error}</p> : null}

          <p className="auth-sync-hint">
            手機瀏覽器與「加到主畫面」的 App 儲存空間是分開的，兩邊都要用同一組帳號密碼登入。
          </p>

          <button type="submit" className="button button-primary" disabled={busy}>
            {busy ? '處理中…' : mode === 'login' ? '登入並同步' : '建立帳號並同步'}
          </button>
        </form>

        <div className="auth-divider" aria-hidden="true">
          <span>或</span>
        </div>

        <button
          type="button"
          className="button button-secondary auth-guest-button"
          disabled={busy}
          onClick={() => {
            setError(null)
            onEnterGuest()
          }}
        >
          先以訪客試用（不同步）
        </button>
      </section>

      <div className="auth-footer-links">
        <button type="button" className="auth-install-link" onClick={onOpenPrivacy}>
          資料與個資保護說明
        </button>
        <button type="button" className="auth-install-link" onClick={onOpenInstallGuide}>
          如何把網頁加到手機主畫面？
        </button>
      </div>
    </div>
  )
}
