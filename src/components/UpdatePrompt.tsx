import { createPortal } from 'react-dom'
import { APP_VERSION_LABEL } from '../config/appVersion'
import { useAppUpdate } from '../hooks/useAppUpdate'

export function UpdatePrompt() {
  const { updateAvailable, remoteVersion, applyUpdate } = useAppUpdate()

  if (!updateAvailable) return null

  const nextLabel = remoteVersion ? `v${remoteVersion}` : '新版本'

  return createPortal(
    <div className="modal-backdrop update-prompt-backdrop" role="presentation">
      <div
        className="modal update-prompt-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="update-prompt-title"
        aria-describedby="update-prompt-desc"
      >
        <header className="modal-header">
          <h2 id="update-prompt-title">發現系統更新</h2>
        </header>
        <p id="update-prompt-desc" className="update-prompt-text">
          目前版本 {APP_VERSION_LABEL}，已有 {nextLabel} 可使用。
          請重新整理頁面，或把程式從多工畫面滑掉後重新開啟，以載入最新內容。
        </p>
        <div className="modal-actions update-prompt-actions">
          <button type="button" className="button button-primary" onClick={() => void applyUpdate()}>
            立即重新整理
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function VersionBadge() {
  return (
    <div className="version-badge" aria-label={`應用程式版本 ${APP_VERSION_LABEL}`}>
      {APP_VERSION_LABEL}
    </div>
  )
}
