import { useState } from 'react'

interface UnlockScreenProps {
  username: string
  onUnlock: (password: string) => Promise<void>
  onLogout: () => void
}

export function UnlockScreen({ username, onUnlock, onLogout }: UnlockScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      await onUnlock(password)
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '解鎖失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <header className="auth-hero">
        <p className="eyebrow">資料已鎖定</p>
        <h1>輸入密碼解鎖</h1>
        <p className="subtitle">
          帳號「{username}」的存錢資料以 AES-GCM 加密保存，需密碼才能讀取。
        </p>
      </header>

      <section className="auth-card">
        <form className="modal-form" onSubmit={submit}>
          <label className="field">
            <span>密碼</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="輸入密碼"
              required
              autoFocus
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button type="submit" className="button button-primary" disabled={busy}>
            {busy ? '解鎖中…' : '解鎖'}
          </button>
        </form>

        <button
          type="button"
          className="button button-secondary auth-guest-button"
          style={{ marginTop: 12 }}
          onClick={onLogout}
          disabled={busy}
        >
          改用其他帳號
        </button>

        <p className="auth-hint">資料已手動鎖定，輸入密碼後即可繼續使用。</p>
      </section>
    </div>
  )
}
