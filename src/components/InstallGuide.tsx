import { useEffect, useId, useMemo } from 'react'
import { createPortal } from 'react-dom'

interface InstallGuideProps {
  open: boolean
  onClose: () => void
}

type Platform = 'ios' | 'android' | 'desktop'

function detectPlatform(): Platform {
  const ua = navigator.userAgent || ''
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIOS) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export function InstallGuide({ open, onClose }: InstallGuideProps) {
  const titleId = useId()
  const platform = useMemo(() => detectPlatform(), [])

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
    <div className="modal-backdrop install-guide-backdrop" onClick={onClose}>
      <div
        className="modal install-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id={titleId}>加入主畫面教學</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </header>

        <p className="install-guide-intro">
          把這個網頁加到手機主畫面後，就能像一般 App 一樣點擊開啟。
        </p>

        <div className="install-guide-section">
          <h3>iPhone / iPad（Safari）</h3>
          <ol>
            <li>用 <strong>Safari</strong> 開啟本網站（其他瀏覽器可能沒有這個選項）。</li>
            <li>點下方中間的 <strong>分享</strong> 按鈕（方框加向上箭頭）。</li>
            <li>往下找到並點選 <strong>加入主畫面</strong>。</li>
            <li>名稱可保持「存錢系統」，再按右上角 <strong>加入</strong>。</li>
            <li>回到手機主畫面，點新圖示即可使用。</li>
          </ol>
        </div>

        <div className="install-guide-section">
          <h3>Android（Chrome）</h3>
          <ol>
            <li>用 <strong>Chrome</strong> 開啟本網站。</li>
            <li>點右上角 <strong>⋮</strong> 選單。</li>
            <li>選擇 <strong>安裝應用程式</strong> 或 <strong>加到主畫面</strong>。</li>
            <li>確認安裝後，主畫面會出現 App 圖示，點擊即可開啟。</li>
          </ol>
        </div>

        <div className="install-guide-tip">
          {platform === 'ios' && (
            <p>偵測到你可能使用 Apple 裝置：請務必用 Safari 操作以上步驟。</p>
          )}
          {platform === 'android' && (
            <p>偵測到你可能使用 Android：建議用 Chrome 完成安裝。</p>
          )}
          {platform === 'desktop' && (
            <p>若在電腦瀏覽，可先用手機開啟網站後再依上方步驟加入主畫面。</p>
          )}
          <p>正式帳號登入後，資料會自動同步雲端；訪客資料仍只存在這台裝置。</p>
        </div>

        <div className="modal-actions">
          <button type="button" className="button button-primary" onClick={onClose}>
            我知道了
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
