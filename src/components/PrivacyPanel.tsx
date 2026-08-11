import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBackground } from '../hooks/useBackground'
import { useTheme } from '../hooks/useTheme'
import { isFirebaseConfigured } from '../lib/firebase'
import { PASSWORD_MIN_LENGTH } from '../utils/authCrypto'
import { BACKGROUND_OPTIONS } from '../utils/background'
import { isValidRecoveryEmail } from '../utils/cloudAccount'
import { THEME_OPTIONS } from '../utils/theme'

interface PrivacyPanelProps {
  open: boolean
  signedIn: boolean
  isGuest: boolean
  username: string
  loginUsername?: string
  recoveryEmail?: string
  syncState?: 'idle' | 'syncing' | 'synced' | 'offline'
  onClose: () => void
  onUpdateNickname: (nickname: string) => Promise<void>
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>
  onUpdateRecoveryEmail: (currentPassword: string, email: string) => Promise<void>
  onWipeCurrentData: () => void
  onWipeAllLocalData: () => void
}

export function PrivacyPanel({
  open,
  signedIn,
  isGuest,
  username,
  loginUsername,
  recoveryEmail,
  syncState = 'idle',
  onClose,
  onUpdateNickname,
  onChangePassword,
  onUpdateRecoveryEmail,
  onWipeCurrentData,
  onWipeAllLocalData,
}: PrivacyPanelProps) {
  const titleId = useId()
  const themeSectionId = useId()
  const backgroundSectionId = useId()
  const cloudEnabled = isFirebaseConfigured()
  const canEditAccount = signedIn && !isGuest
  const { theme, setTheme } = useTheme()
  const { background, customPreview, setBackground, uploadBackground } = useBackground()
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  const [backgroundBusy, setBackgroundBusy] = useState(false)
  const [backgroundError, setBackgroundError] = useState<string | null>(null)
  const [themeOpen, setThemeOpen] = useState(false)
  const [backgroundOpen, setBackgroundOpen] = useState(false)

  const [nickname, setNickname] = useState(username)
  const [nicknameBusy, setNicknameBusy] = useState(false)
  const [nicknameMsg, setNicknameMsg] = useState<string | null>(null)
  const [nicknameError, setNicknameError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [recoveryInput, setRecoveryInput] = useState(recoveryEmail ?? '')
  const [recoveryPassword, setRecoveryPassword] = useState('')
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNickname(username)
    setNicknameMsg(null)
    setNicknameError(null)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordMsg(null)
    setPasswordError(null)
    setRecoveryInput(recoveryEmail ?? '')
    setRecoveryPassword('')
    setRecoveryMsg(null)
    setRecoveryError(null)
    setBackgroundError(null)
    setThemeOpen(false)
    setBackgroundOpen(false)
  }, [open, username, recoveryEmail])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const syncLabel =
    !signedIn || isGuest
      ? null
      : syncState === 'syncing'
        ? '同步中…'
        : syncState === 'offline'
          ? '雲端暫時連不上，已先存在本機'
          : syncState === 'synced'
            ? '已同步到雲端'
            : cloudEnabled
              ? '雲端同步已啟用'
              : '雲端尚未設定'

  const accountLoginName = loginUsername || username

  const submitNickname = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canEditAccount || nicknameBusy) return
    setNicknameMsg(null)
    setNicknameError(null)
    setNicknameBusy(true)
    try {
      await onUpdateNickname(nickname)
      setNicknameMsg('暱稱已更新')
    } catch (error) {
      setNicknameError(error instanceof Error ? error.message : '更新暱稱失敗')
    } finally {
      setNicknameBusy(false)
    }
  }

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canEditAccount || passwordBusy) return
    setPasswordMsg(null)
    setPasswordError(null)
    if (newPassword !== confirmPassword) {
      setPasswordError('兩次新密碼不一致')
      return
    }
    setPasswordBusy(true)
    try {
      await onChangePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMsg('密碼已更新；其他裝置請使用新密碼重新登入')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : '更改密碼失敗')
    } finally {
      setPasswordBusy(false)
    }
  }

  const submitRecoveryEmail = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canEditAccount || recoveryBusy) return
    setRecoveryMsg(null)
    setRecoveryError(null)
    if (!isValidRecoveryEmail(recoveryInput)) {
      setRecoveryError('救援信箱格式不正確，請輸入有效的電子郵件地址')
      return
    }
    setRecoveryBusy(true)
    try {
      await onUpdateRecoveryEmail(recoveryPassword, recoveryInput)
      setRecoveryPassword('')
      setRecoveryMsg(
        recoveryEmail ? '救援信箱已更新' : `救援信箱已新增（${recoveryInput.trim()}），可用於忘記密碼`,
      )
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : '更新救援信箱失敗')
    } finally {
      setRecoveryBusy(false)
    }
  }

  return createPortal(
    <div className="modal-backdrop privacy-backdrop" onClick={onClose}>
      <div
        className="modal privacy-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id={titleId}>一般設定</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </header>

        <div className="privacy-body">
          <section className="privacy-section">
            <h3>更改暱稱</h3>
            {canEditAccount ? (
              <form className="modal-form settings-form" onSubmit={submitNickname}>
                <label className="field">
                  <span>暱稱</span>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="顯示在左上角的名稱"
                    maxLength={32}
                    required
                    disabled={nicknameBusy}
                  />
                </label>
                {cloudEnabled ? (
                  <p className="field-hint">僅變更顯示名稱；登入仍請使用「{accountLoginName}」。</p>
                ) : (
                  <p className="field-hint">暱稱會顯示在左上角帳號列。</p>
                )}
                {nicknameError ? <p className="settings-form-error">{nicknameError}</p> : null}
                {nicknameMsg ? <p className="settings-form-success">{nicknameMsg}</p> : null}
                <button
                  type="submit"
                  className="button button-secondary"
                  disabled={nicknameBusy || nickname.trim() === username}
                >
                  {nicknameBusy ? '更新中…' : '儲存暱稱'}
                </button>
              </form>
            ) : (
              <p>{signedIn ? '訪客模式無法更改暱稱，請先登入正式帳號。' : '請先登入後再更改暱稱。'}</p>
            )}
          </section>

          <section className="privacy-section">
            <h3>更改密碼</h3>
            {canEditAccount ? (
              <form className="modal-form settings-form" onSubmit={submitPassword}>
                <label className="field">
                  <span>目前密碼</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="輸入目前密碼"
                    required
                    disabled={passwordBusy}
                  />
                </label>
                <label className="field">
                  <span>新密碼</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder={`至少 ${PASSWORD_MIN_LENGTH} 個字元`}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    disabled={passwordBusy}
                  />
                </label>
                <label className="field">
                  <span>確認新密碼</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="再輸入一次新密碼"
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    disabled={passwordBusy}
                  />
                </label>
                {passwordError ? <p className="settings-form-error">{passwordError}</p> : null}
                {passwordMsg ? <p className="settings-form-success">{passwordMsg}</p> : null}
                <button type="submit" className="button button-secondary" disabled={passwordBusy}>
                  {passwordBusy ? '更新中…' : '更新密碼'}
                </button>
              </form>
            ) : (
              <p>{signedIn ? '訪客模式無法更改密碼，請先登入正式帳號。' : '請先登入後再更改密碼。'}</p>
            )}
          </section>

          <section className={`privacy-section settings-collapse ${themeOpen ? '' : 'is-collapsed'}`}>
            <button
              type="button"
              className="settings-collapse-header"
              aria-expanded={themeOpen}
              aria-controls={themeSectionId}
              onClick={() => setThemeOpen((value) => !value)}
            >
              <span className="panel-toggle" aria-hidden="true">
                <span>{themeOpen ? '−' : '＋'}</span>
              </span>
              <span className="settings-collapse-title">
                <span className="settings-collapse-heading">更改色調</span>
                <span className="field-hint">
                  目前：{THEME_OPTIONS.find((item) => item.id === theme)?.label ?? theme}
                </span>
              </span>
            </button>
            {themeOpen ? (
              <div id={themeSectionId} className="settings-collapse-body">
                <p className="field-hint">選擇介面色調；會保存在此裝置。</p>
                <div className="theme-picker" role="radiogroup" aria-label="介面色調">
                  {THEME_OPTIONS.map((option) => {
                    const selected = theme === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`theme-option ${selected ? 'is-selected' : ''}`}
                        onClick={() => setTheme(option.id)}
                      >
                        <span className="theme-swatch" aria-hidden="true">
                          <i style={{ background: option.swatch[0] }} />
                          <i style={{ background: option.swatch[1] }} />
                          <i style={{ background: option.swatch[2] }} />
                        </span>
                        <span className="theme-option-text">
                          <strong>{option.label}</strong>
                          <small>{option.description}</small>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </section>

          <section
            className={`privacy-section settings-collapse ${backgroundOpen ? '' : 'is-collapsed'}`}
          >
            <button
              type="button"
              className="settings-collapse-header"
              aria-expanded={backgroundOpen}
              aria-controls={backgroundSectionId}
              onClick={() => setBackgroundOpen((value) => !value)}
            >
              <span className="panel-toggle" aria-hidden="true">
                <span>{backgroundOpen ? '−' : '＋'}</span>
              </span>
              <span className="settings-collapse-title">
                <span className="settings-collapse-heading">背景圖片</span>
                <span className="field-hint">
                  目前：
                  {background === 'custom'
                    ? '自訂圖片'
                    : (BACKGROUND_OPTIONS.find((item) => item.id === background)?.label ??
                      background)}
                </span>
              </span>
            </button>
            {backgroundOpen ? (
              <div id={backgroundSectionId} className="settings-collapse-body">
                <p className="field-hint">選擇內建風景，或上傳自己的圖片；會保存在此裝置。</p>
                <div className="background-picker" role="radiogroup" aria-label="背景圖片">
                  {BACKGROUND_OPTIONS.map((option) => {
                    const selected = background === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`background-option ${selected ? 'is-selected' : ''}`}
                        onClick={() => {
                          setBackgroundError(null)
                          setBackground(option.id)
                        }}
                      >
                        <span
                          className="background-thumb"
                          style={{ backgroundImage: option.preview }}
                          aria-hidden="true"
                        />
                        <span className="theme-option-text">
                          <strong>{option.label}</strong>
                          <small>{option.description}</small>
                        </span>
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={background === 'custom'}
                    className={`background-option ${background === 'custom' ? 'is-selected' : ''}`}
                    onClick={() => {
                      setBackgroundError(null)
                      if (customPreview) {
                        setBackground('custom')
                        return
                      }
                      backgroundInputRef.current?.click()
                    }}
                  >
                    <span
                      className={`background-thumb ${customPreview ? '' : 'is-empty'}`}
                      style={
                        customPreview
                          ? { backgroundImage: `url("${customPreview}")` }
                          : undefined
                      }
                      aria-hidden="true"
                    >
                      {customPreview ? null : <span>上傳</span>}
                    </span>
                    <span className="theme-option-text">
                      <strong>自訂圖片</strong>
                      <small>{customPreview ? '使用已上傳的背景' : '從相簿或檔案選擇圖片'}</small>
                    </span>
                  </button>
                </div>
                <div className="background-actions">
                  <input
                    ref={backgroundInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ''
                      if (!file) return
                      setBackgroundError(null)
                      setBackgroundBusy(true)
                      void uploadBackground(file)
                        .catch((error) => {
                          setBackgroundError(
                            error instanceof Error ? error.message : '上傳背景失敗',
                          )
                        })
                        .finally(() => setBackgroundBusy(false))
                    }}
                  />
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={backgroundBusy}
                    onClick={() => backgroundInputRef.current?.click()}
                  >
                    {backgroundBusy ? '處理中…' : customPreview ? '更換上傳圖片' : '上傳圖片'}
                  </button>
                </div>
                {backgroundError ? <p className="settings-form-error">{backgroundError}</p> : null}
              </div>
            ) : null}
          </section>

          <section className="privacy-section">
            <h3>目前狀態</h3>
            <p>
              {!signedIn
                ? '尚未登入'
                : isGuest
                  ? `帳號：${username}（訪客模式，僅存本機）`
                  : `暱稱：${username}（正式帳號，雲端同步）`}
            </p>
            {canEditAccount && accountLoginName ? (
              <p>登入帳號：{accountLoginName}</p>
            ) : null}
            {syncLabel ? <p>{syncLabel}</p> : null}
          </section>

          <section className="privacy-section">
            <h3>救援信箱</h3>
            {canEditAccount && cloudEnabled ? (
              <form className="modal-form settings-form" onSubmit={submitRecoveryEmail}>
                <p className="field-hint">
                  {recoveryEmail
                    ? `目前救援信箱：${recoveryEmail}`
                    : '尚未設定。設定後可用於「忘記密碼」重設。'}
                </p>
                <label className="field">
                  <span>{recoveryEmail ? '新的救援信箱' : '救援信箱'}</span>
                  <input
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    value={recoveryInput}
                    onChange={(event) => {
                      setRecoveryInput(event.target.value)
                      if (recoveryError) setRecoveryError(null)
                    }}
                    placeholder="name@example.com"
                    required
                    disabled={recoveryBusy}
                  />
                </label>
                <label className="field">
                  <span>目前密碼（確認身分）</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={recoveryPassword}
                    onChange={(event) => setRecoveryPassword(event.target.value)}
                    placeholder="輸入目前密碼"
                    required
                    disabled={recoveryBusy}
                  />
                </label>
                {recoveryError ? <p className="settings-form-error">{recoveryError}</p> : null}
                {recoveryMsg ? <p className="settings-form-success">{recoveryMsg}</p> : null}
                <button type="submit" className="button button-secondary" disabled={recoveryBusy}>
                  {recoveryBusy ? '更新中…' : recoveryEmail ? '更改救援信箱' : '新增救援信箱'}
                </button>
              </form>
            ) : (
              <p>
                {!signedIn
                  ? '請先登入後再設定救援信箱。'
                  : isGuest
                    ? '訪客模式無法設定救援信箱，請先登入正式帳號。'
                    : '雲端尚未設定，無法使用救援信箱。'}
              </p>
            )}
          </section>

          <section className="privacy-section">
            <h3>雲端同步</h3>
            {isGuest ? (
              <p>
                訪客資料只存在這台裝置。註冊／登入正式帳號後，存錢資料會自動同步到雲端，網頁與手機登入同一帳號即可共用。
              </p>
            ) : cloudEnabled ? (
              <p>
                正式帳號的資料會自動上傳雲端並在各裝置同步。請在每台裝置用同一組帳號密碼登入。
              </p>
            ) : (
              <p className="privacy-warn">
                雲端服務尚未完成設定。目前資料仍保存在本機；設定完成並重新部署後即可自動同步。
              </p>
            )}
          </section>

          <section className="privacy-section">
            <h3>我們如何保護</h3>
            <ul>
              <li>正式帳號以雲端身分驗證登入；密碼不會明文保存在本機。</li>
              <li>存錢資料以 AES-GCM 加密後才寫入本機與雲端。</li>
              <li>登入後可直接使用，不必再另外輸入密碼解鎖。</li>
              <li>訪客模式資料不同步雲端。</li>
            </ul>
          </section>

          {signedIn && isGuest ? (
            <section className="privacy-section privacy-warn">
              <h3>訪客模式提醒</h3>
              <p>
                訪客資料保存在本機，任何能操作此瀏覽器的人都可以看到。若有敏感金額或備註，請改為註冊正式帳號以啟用雲端同步。
              </p>
            </section>
          ) : null}

          <section className="privacy-section privacy-danger">
            <h3>清除資料</h3>
            <p>清除後無法復原。請確認後再執行。</p>
            {signedIn && !isGuest ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  if (
                    window.confirm(
                      `確定永久清除帳號「${username}」的存錢資料（含雲端）？此操作無法復原。`,
                    )
                  ) {
                    onWipeCurrentData()
                    onClose()
                  }
                }}
              >
                清除目前帳號資料並登出
              </button>
            ) : null}
            <button
              type="button"
              className="button button-danger"
              onClick={() => {
                if (
                  window.confirm(
                    '確定清除此裝置上所有存星資料（含所有帳號、訪客、許願紀錄）？此操作無法復原。',
                  )
                ) {
                  onWipeAllLocalData()
                  onClose()
                }
              }}
            >
              清除此裝置全部資料
            </button>
          </section>
        </div>

        <div className="modal-actions">
          <button type="button" className="button button-primary" onClick={onClose}>
            關閉
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
