import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'

export const USAGE_GUIDE_SEEN_KEY = 'savings-system:usage-guide-seen'

interface UsageGuideProps {
  open: boolean
  onClose: () => void
  onStartCreate?: () => void
  onOpenInstallGuide?: () => void
}

const STEPS = [
  {
    title: '歡迎使用存錢系統',
    body: '這裡幫你把存錢目標拆成每天可做到的小步驟 一點一點慢慢累積 直到完成目標',
    points: [
      '日存／周存／月存／自訂節奏，依你的步調規劃',
      '快捷一鍵存入、隨機分配與進度追蹤',
      '資料夾整理專案，登入後可加密保存資料',
    ],
  },
  {
    title: '建立存錢專案',
    body: '點右上角「＋」建立專案。可選日存、周存、月存，或自訂每幾天存一次。',
    points: ['日存／周存／月存：固定節奏', '自訂：自己決定間隔天數與次數', '建立後可用快捷鍵一鍵存入'],
  },
  {
    title: '進入專案開始存',
    body: '回到首頁後，直接點專案卡片進入。你可以標記今日完成、提早存入，或開啟隨機每日金額。',
    points: ['點選專案--進入專案詳情頁面--開始存錢', '可手動補存、提早存入', '隨機分配會自動排出每日需存入金額'],
  },
  {
    title: '用資料夾整理',
    body: '專案變多時，可用「＋」建立資料夾，再把專案拖進資料夾，或用左上角選單搬移。',
    points: ['長按／拖曳專案到資料夾', '資料夾可收合，畫面更乾淨', '想改名稱或備註可用選單'],
  },
  {
    title: '登入與隱私',
    body: '訪客可先試用；若要保護資料，右上角按「登入」註冊帳號。正式帳號資料會加密保存。',
    points: ['訪客資料未加密', '登入後可手動鎖定', '隱私頁可清除本機資料'],
  },
  {
    title: '加到手機主畫面',
    body: '把網頁加到主畫面後，就能像 App 一樣點開。詳細步驟可看安裝教學。',
    points: ['iPhone 請用 Safari', 'Android 建議用 Chrome', '安裝後資料仍在本機'],
  },
] as const

export function markUsageGuideSeen() {
  try {
    localStorage.setItem(USAGE_GUIDE_SEEN_KEY, '1')
  } catch {
    // ignore
  }
}

export function hasSeenUsageGuide() {
  try {
    return localStorage.getItem(USAGE_GUIDE_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function UsageGuide({
  open,
  onClose,
  onStartCreate,
  onOpenInstallGuide,
}: UsageGuideProps) {
  const titleId = useId()
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight' && step < STEPS.length - 1) setStep((s) => s + 1)
      if (event.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, step])

  if (!open) return null

  const finish = () => {
    markUsageGuideSeen()
    onClose()
  }

  return createPortal(
    <div className="modal-backdrop usage-guide-backdrop" onClick={finish}>
      <div
        className="modal usage-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id={titleId}>使用教學</h2>
          <button type="button" className="icon-button" onClick={finish} aria-label="關閉">
            ×
          </button>
        </header>

        <div className="usage-guide-progress" aria-hidden="true">
          {STEPS.map((item, index) => (
            <span
              key={item.title}
              className={`usage-guide-dot ${index === step ? 'is-active' : ''} ${index < step ? 'is-done' : ''}`}
            />
          ))}
        </div>

        <p className="usage-guide-step-label">
          步驟 {step + 1}／{STEPS.length}
        </p>
        <h3 className="usage-guide-title">{current.title}</h3>
        <p className="usage-guide-body">{current.body}</p>
        <ul className="usage-guide-points">
          {current.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        {isLast && onOpenInstallGuide ? (
          <button
            type="button"
            className="button button-secondary usage-guide-extra"
            onClick={() => {
              markUsageGuideSeen()
              onClose()
              onOpenInstallGuide()
            }}
          >
            查看加入主畫面步驟
          </button>
        ) : null}

        <div className="modal-actions usage-guide-actions">
          {step > 0 ? (
            <button type="button" className="button button-secondary" onClick={() => setStep((s) => s - 1)}>
              上一步
            </button>
          ) : (
            <button type="button" className="button button-secondary" onClick={finish}>
              略過
            </button>
          )}

          {isLast ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                markUsageGuideSeen()
                onClose()
                onStartCreate?.()
              }}
            >
              {onStartCreate ? '開始建立專案' : '完成'}
            </button>
          ) : (
            <button type="button" className="button button-primary" onClick={() => setStep((s) => s + 1)}>
              下一步
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
