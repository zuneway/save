import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

interface PrivacyPanelProps {
  open: boolean
  signedIn: boolean
  isGuest: boolean
  username: string
  onClose: () => void
  onLock?: () => void
  onWipeCurrentData: () => void
  onWipeAllLocalData: () => void
}

export function PrivacyPanel({
  open,
  signedIn,
  isGuest,
  username,
  onClose,
  onLock,
  onWipeCurrentData,
  onWipeAllLocalData,
}: PrivacyPanelProps) {
  const titleId = useId()

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
                  ? `帳號：${username}（訪客模式，資料未加密）`
                  : `帳號：${username}（正式帳號，資料已加密）`}
            </p>
          </section>

          <section className="privacy-section">
            <h3>我們如何保護</h3>
            <ul>
              <li>正式帳號密碼以 PBKDF2（SHA-256）加鹽雜湊，不明文保存。</li>
              <li>存錢資料以 AES-GCM 加密後才寫入此裝置瀏覽器。</li>
              <li>可隨時按「鎖定」清除解密金鑰；關閉瀏覽器分頁後需重新登入解鎖。</li>
              <li>本系統無雲端帳號同步；資料預設只留在這台裝置。</li>
            </ul>
          </section>

          {signedIn && isGuest ? (
            <section className="privacy-section privacy-warn">
              <h3>訪客模式提醒</h3>
              <p>
                訪客資料以明文保存在本機，任何能操作此瀏覽器的人都可以看到。若有敏感金額或備註，請改為註冊正式帳號。
              </p>
            </section>
          ) : null}

          {signedIn && !isGuest ? (
            <section className="privacy-section">
              <h3>立即鎖定</h3>
              <p>隱藏畫面內容並清除記憶體中的解密金鑰。</p>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  onLock?.()
                  onClose()
                }}
              >
                立即鎖定
              </button>
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
                      `確定永久清除帳號「${username}」的加密存錢資料？此操作無法復原。`,
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
