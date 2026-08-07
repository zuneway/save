import { createPortal } from 'react-dom'
import { APP_VERSION_LABEL } from '../config/appVersion'
import { useAppUpdate } from '../hooks/useAppUpdate'
import { useWhatsNew } from '../hooks/useWhatsNew'

function ReleaseNotesList({ notes }: { notes: string[] }) {
  return (
    <ul className="release-notes-list">
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  )
}

export function UpdatePrompt() {
  const { updateAvailable, remoteVersion, remoteNotes, showFeatureNotes, applyUpdate } =
    useAppUpdate()

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
          <h2 id="update-prompt-title">
            {showFeatureNotes ? '發現功能更新' : '發現系統更新'}
          </h2>
        </header>
        <div id="update-prompt-desc" className="update-prompt-body">
          <p className="update-prompt-text">
            目前版本 {APP_VERSION_LABEL}，已有 {nextLabel} 可使用。
            {showFeatureNotes
              ? '本次更新內容：'
              : '請重新整理頁面，或把程式從多工畫面滑掉後重新開啟，以載入最新內容。'}
          </p>
          {showFeatureNotes ? <ReleaseNotesList notes={remoteNotes} /> : null}
          {showFeatureNotes ? (
            <p className="update-prompt-hint">
              請重新整理以載入最新內容；也可把程式從多工畫面滑掉後重新開啟。
            </p>
          ) : null}
        </div>
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

/** Shown once after the user lands on a new major/minor build. */
export function WhatsNewPrompt() {
  const { open, notes, version, dismiss } = useWhatsNew()

  if (!open) return null

  return createPortal(
    <div className="modal-backdrop update-prompt-backdrop" role="presentation">
      <div
        className="modal update-prompt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        aria-describedby="whats-new-desc"
      >
        <header className="modal-header">
          <h2 id="whats-new-title">更新說明 v{version}</h2>
        </header>
        <div id="whats-new-desc" className="update-prompt-body">
          <p className="update-prompt-text">本次大／中版本新增：</p>
          <ReleaseNotesList notes={notes} />
        </div>
        <div className="modal-actions update-prompt-actions">
          <button type="button" className="button button-primary" onClick={dismiss}>
            知道了
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
