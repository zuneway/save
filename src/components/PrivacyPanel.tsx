import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { isFirebaseConfigured } from '../lib/firebase'

interface PrivacyPanelProps {
  open: boolean
  signedIn: boolean
  isGuest: boolean
  username: string
  syncState?: 'idle' | 'syncing' | 'synced' | 'offline'
  onClose: () => void
  onWipeCurrentData: () => void
  onWipeAllLocalData: () => void
}

export function PrivacyPanel({
  open,
  signedIn,
  isGuest,
  username,
  syncState = 'idle',
  onClose,
  onWipeCurrentData,
  onWipeAllLocalData,
}: PrivacyPanelProps) {
  const titleId = useId()
  const cloudEnabled = isFirebaseConfigured()

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
          <h2 id={titleId}>資料與個資保護</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </header>

        <div className="privacy-body">
          <section className="privacy-section">
            <h3>目前狀態</h3>
            <p>
              {!signedIn
                ? '尚未登入'
                : isGuest
                  ? `帳號：${username}（訪客模式，僅存本機）`
                  : `帳號：${username}（正式帳號，雲端同步）`}
            </p>
            {syncLabel ? <p>{syncLabel}</p> : null}
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
                    '確定清除此裝置上所有存錢系統資料（含所有帳號、訪客、許願紀錄）？此操作無法復原。',
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
