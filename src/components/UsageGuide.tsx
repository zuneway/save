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
    title: '主畫面怎麼看',
    body: '主畫面集中顯示所有專案與狀態，方便一眼掌握進度。',
    points: [
      '左上角顯示目前帳號（訪客或登入帳號）',
      '專案卡片綠／紅標示該階段是否完成',
      '右上「＋」新增專案或資料夾；「功能介紹」可隨時重看',
      '右下「願」可許願回饋功能建議',
    ],
  },
  {
    title: '建立專案與資料夾',
    body: '點右上角「＋」開始建立內容。',
    points: [
      '建立專案：設定名稱、目標金額與存錢節奏',
      '可選日存、周存、月存，或自訂每幾天存一次',
      '建立資料夾：用來分類整理多個專案',
      '空白時也可直接按「建立存錢專案」開始',
    ],
  },
  {
    title: '進入專案開始存錢',
    body: '點選專案卡片進入詳情頁，開始記錄存入。',
    points: [
      '到「存入金額設定」輸入今日金額，或用快捷鍵',
      '可啟用隨機分配，系統自動排出每日需存入金額',
      '存入後可在進度總覽查看今日／本期是否完成',
      '首次進入專案會有引導提示',
    ],
  },
  {
    title: '專案頁面的區塊',
    body: '詳情頁由多個功能區塊組成，可依需求顯示。',
    points: [
      '存錢進度總覽：金額進度與今日需存入',
      '存入金額設定：手動存入、快捷鍵、隨機分配',
      '每日完成：標記今天、補存、提早存入',
      '完成狀態圖表／剩餘天數存入金額表／目標期限／詳細項目',
    ],
  },
  {
    title: '區塊收放、移動與增刪',
    body: '你可以自由調整專案頁版面，讓常用功能更好找。',
    points: [
      '點區塊左側「−／＋」可收起或展開內容',
      '按住區塊左側「⋮⋮」可拖曳排序上下位置',
      '點「＋ 新增區塊」可補回已刪除的區塊',
      '區塊右上可刪除不需要的區塊（至少保留一個）',
    ],
  },
  {
    title: '資料夾與專案整理',
    body: '專案變多時，用資料夾與選單保持整齊。',
    points: [
      '拖曳專案到資料夾，或拖到「未分類」移出',
      '資料夾標題旁可收合；左側 ⋮⋮ 可調整資料夾順序',
      '點選專案後，左上「⋯」可搬移、重新命名、備註、刪除',
      '可切換單選／多選一次操作多個專案',
    ],
  },
  {
    title: '登入、隱私與安裝',
    body: '需要保護資料或想常用時，可登入並加到主畫面。',
    points: [
      '訪客可先試用；右上「登入」可註冊正式帳號',
      '正式帳號資料會加密；可手動鎖定與清除資料',
      '「隱私」可查看保護說明',
      '可把網頁加到手機主畫面，像 App 一樣開啟',
    ],
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
          <h2 id={titleId}>功能介紹</h2>
          <button type="button" className="icon-button" onClick={finish} aria-label="關閉">
            ×
          </button>
        </header>

        <div className="usage-guide-body-scroll">
          <div className="usage-guide-progress" aria-hidden="true">
            {STEPS.map((item, index) => (
              <span
                key={item.title}
                className={`usage-guide-dot ${index === step ? 'is-active' : ''} ${index < step ? 'is-done' : ''}`}
              />
            ))}
          </div>

          <p className="usage-guide-step-label">
            {step + 1}／{STEPS.length}
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
        </div>

        <div className="modal-actions usage-guide-actions">
          {step > 0 ? (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setStep((s) => s - 1)}
            >
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
            <button
              type="button"
              className="button button-primary"
              onClick={() => setStep((s) => s + 1)}
            >
              下一步
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
