import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { APP_NAME } from '../config/brand'

export type AppSystemId = 'home' | 'periodic'

interface AccountMenuProps {
  open: boolean
  username: string
  isGuest: boolean
  activeSystem?: AppSystemId
  onClose: () => void
  onOpenSettings: () => void
  onOpenHome: () => void
  onOpenPeriodic: () => void
  onOpenUsageGuide: () => void
  onOpenPrivacy: () => void
  onLogout: () => void
  onGoToLogin: () => void
}

export function AccountMenu({
  open,
  username,
  isGuest,
  activeSystem = 'home',
  onClose,
  onOpenSettings,
  onOpenHome,
  onOpenPeriodic,
  onOpenUsageGuide,
  onOpenPrivacy,
  onLogout,
  onGoToLogin,
}: AccountMenuProps) {
  const titleId = useId()
  const firstItemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) firstItemRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="account-menu-root">
      <button type="button" className="account-menu-scrim" aria-label="關閉選單" onClick={onClose} />
      <aside
        className="account-menu-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="account-menu-header">
          <div>
            <p className="account-menu-eyebrow">帳號選單</p>
            <h2 id={titleId} className="account-menu-title">
              {username}
              {isGuest ? <span className="guest-badge">訪客</span> : null}
            </h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </header>

        <nav className="account-menu-nav" aria-label="系統選單">
          <button
            ref={firstItemRef}
            type="button"
            className={`account-menu-item ${activeSystem === 'home' ? 'is-active' : ''}`}
            onClick={() => {
              onClose()
              onOpenHome()
            }}
          >
            <span className="account-menu-item-text">
              <strong>{APP_NAME}</strong>
              <small>目標導向存錢專案</small>
            </span>
            {activeSystem === 'home' ? <span className="account-menu-current">使用中</span> : null}
          </button>

          <button
            type="button"
            className={`account-menu-item ${activeSystem === 'periodic' ? 'is-active' : ''}`}
            onClick={() => {
              onClose()
              onOpenPeriodic()
            }}
          >
            <span className="account-menu-item-text">
              <strong>定期儲蓄系統</strong>
              <small>自動規劃長期儲蓄</small>
            </span>
            {activeSystem === 'periodic' ? (
              <span className="account-menu-current">使用中</span>
            ) : null}
          </button>

          <button type="button" className="account-menu-item is-disabled" disabled>
            <span className="account-menu-item-text">
              <strong>記帳系統</strong>
              <small>記錄日常收支</small>
            </span>
            <span className="account-menu-soon">敬請期待</span>
          </button>

          <button
            type="button"
            className="account-menu-item"
            onClick={() => {
              onClose()
              onOpenSettings()
            }}
          >
            <span className="account-menu-item-text">
              <strong>一般設定</strong>
              <small>色調、背景、暱稱與密碼</small>
            </span>
          </button>

          <div className="account-menu-divider" role="separator" />

          <button
            type="button"
            className="account-menu-item"
            onClick={() => {
              onClose()
              onOpenUsageGuide()
            }}
          >
            <span className="account-menu-item-text">
              <strong>使用教學</strong>
              <small>功能說明與操作指引</small>
            </span>
          </button>

          <button
            type="button"
            className="account-menu-item"
            onClick={() => {
              onClose()
              onOpenPrivacy()
            }}
          >
            <span className="account-menu-item-text">
              <strong>隱私條款</strong>
              <small>資料保護與使用說明</small>
            </span>
          </button>

          {isGuest ? (
            <button
              type="button"
              className="account-menu-item"
              onClick={() => {
                onClose()
                onGoToLogin()
              }}
            >
              <span className="account-menu-item-text">
                <strong>登入</strong>
                <small>登入正式帳號以同步資料</small>
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="account-menu-item is-danger"
              onClick={() => {
                if (!window.confirm('確定要登出嗎？')) return
                onClose()
                onLogout()
              }}
            >
              <span className="account-menu-item-text">
                <strong>登出</strong>
                <small>結束目前帳號登入狀態</small>
              </span>
            </button>
          )}
        </nav>
      </aside>
    </div>,
    document.body,
  )
}
