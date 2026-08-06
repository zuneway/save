import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { downloadBackup, importLocalBackup, parseBackupJson } from '../utils/backup'

interface PrivacyPanelProps {
  open: boolean
  signedIn: boolean
  isGuest: boolean
  username: string
  onClose: () => void
  onLock?: () => void
  onWipeCurrentData: () => void
  onWipeAllLocalData: () => void
  onBackupImported?: () => void
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
  onBackupImported,
}: PrivacyPanelProps) {
  const titleId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setBackupMessage(null)
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleExport = () => {
    try {
      downloadBackup()
      setBackupMessage('已下載備份檔。請把檔案傳到手機後，在手機版按「匯入備份」。')
    } catch {
      setBackupMessage('匯出失敗，請再試一次。')
    }
  }

  const handleImportFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const backup = parseBackupJson(text)
      const count = Object.keys(backup.entries).length
      if (
        !window.confirm(
          `確定匯入備份？將寫入 ${count} 筆本機資料（含帳號與存錢內容），並請重新登入。同名帳號資料會被備份覆蓋。`,
        )
      ) {
        return
      }
      importLocalBackup(backup)
      setBackupMessage('匯入完成，即將重新載入…')
      onBackupImported?.()
      window.setTimeout(() => {
        window.location.reload()
      }, 400)
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : '匯入失敗')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
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

          <section className="privacy-section privacy-warn">
            <h3>為什麼網頁與手機帳號沒連動？</h3>
            <p>
              資料存在「目前這個瀏覽器／裝置」的本機空間，沒有雲端同步。電腦網頁與手機 App
              （或不同瀏覽器）彼此獨立，所以帳號不會自動相同。
            </p>
            <p>若要兩邊使用同一組帳號與資料，請用下方「匯出備份 → 傳到另一台 → 匯入備份」。</p>
          </section>

          <section className="privacy-section">
            <h3>帳號資料備份（網頁 ↔ 手機）</h3>
            <p>匯出後可用檔案傳輸、雲端硬碟或 Instant Hotspot 傳到另一台裝置再匯入。</p>
            <button type="button" className="button button-secondary" onClick={handleExport}>
              匯出備份檔
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              匯入備份檔
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                void handleImportFile(event.target.files?.[0] ?? null)
              }}
            />
            {backupMessage ? <p className="privacy-backup-msg">{backupMessage}</p> : null}
          </section>

          <section className="privacy-section">
            <h3>我們如何保護</h3>
            <ul>
              <li>正式帳號密碼以 PBKDF2（SHA-256）加鹽雜湊，不明文保存。</li>
              <li>存錢資料以 AES-GCM 加密後才寫入此裝置瀏覽器。</li>
              <li>可隨時按「鎖定」清除解密金鑰；關閉瀏覽器分頁後需重新登入解鎖。</li>
              <li>本系統無雲端帳號同步；跨裝置請用備份匯出／匯入。</li>
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
