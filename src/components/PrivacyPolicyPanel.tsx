import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

interface PrivacyPolicyPanelProps {
  open: boolean
  onClose: () => void
}

export function PrivacyPolicyPanel({ open, onClose }: PrivacyPolicyPanelProps) {
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
          <h2 id={titleId}>隱私權條款</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </header>

        <div className="privacy-body">
          <section className="privacy-section">
            <h3>適用範圍</h3>
            <p>
              本條款說明「存星」與「定期儲蓄系統」（以下合稱「本服務」）如何蒐集、使用與保護您的資料。使用本服務即表示您已閱讀並瞭解本條款。
            </p>
          </section>

          <section className="privacy-section">
            <h3>我們蒐集的資料</h3>
            <ul>
              <li>帳號資料：登入帳號、顯示暱稱、密碼相關驗證資訊，以及您選擇設定的救援信箱。</li>
              <li>服務內容：您建立的存錢專案、定期儲蓄計畫、金額、日期、備註與操作紀錄。</li>
              <li>裝置與連線狀態：用於本機儲存與雲端同步是否成功的必要狀態資訊。</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h3>資料如何使用</h3>
            <ul>
              <li>提供存錢與定期儲蓄功能，並在您登入正式帳號時進行雲端同步。</li>
              <li>協助您重設密碼（若已設定救援信箱）與管理帳號設定。</li>
              <li>不會將您的存錢內容出售給第三方，也不會用於與服務無關的廣告投放。</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h3>資料儲存與保護</h3>
            <ul>
              <li>正式帳號以雲端身分驗證登入；密碼不會以明文保存在本機。</li>
              <li>存錢與定期儲蓄資料以 AES-GCM 加密後，才寫入本機與雲端。</li>
              <li>訪客模式資料僅保存在此裝置，不會同步到雲端。</li>
              <li>請妥善保管帳號密碼；若使用共用裝置，建議登出或清除本機資料。</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h3>訪客模式特別說明</h3>
            <p>
              訪客資料只存在目前使用的瀏覽器／裝置。任何人能操作此裝置，都可能看到訪客內容。若資料較敏感，請改為註冊並登入正式帳號。
            </p>
          </section>

          <section className="privacy-section">
            <h3>您的選擇</h3>
            <ul>
              <li>可隨時在一般設定中更改暱稱、密碼與救援信箱。</li>
              <li>可清除目前帳號資料，或清除此裝置上的全部本機資料。</li>
              <li>可停止使用本服務；停止使用後，請依需要自行清除本機或帳號資料。</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h3>條款更新</h3>
            <p>
              本條款可能隨功能調整而更新。更新後會顯示於本頁；若您繼續使用本服務，即視為瞭解更新後的內容。
            </p>
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
