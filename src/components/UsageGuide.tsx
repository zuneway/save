import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'

export const USAGE_GUIDE_SEEN_KEY = 'savings-system:usage-guide-seen'
export const PERIODIC_USAGE_GUIDE_SEEN_KEY = 'savings-system:periodic-usage-guide-seen'

export type UsageGuideVariant = 'savings' | 'periodic'

interface UsageGuideProps {
  open: boolean
  variant?: UsageGuideVariant
  onClose: () => void
  onStartCreate?: () => void
  onOpenInstallGuide?: () => void
}

const SAVINGS_STEPS = [
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
      '點擊左上角帳號可開啟選單（存錢系統、定期儲蓄、一般設定）',
      '專案卡片綠／紅標示該階段是否完成',
      '右上「＋」新增專案或資料夾；左上帳號選單可開啟使用教學',
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
      '右上「＋」可建立資料夾；資料夾 ⋯ 可重新命名、備註或刪除（專案會移到未分類）',
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
      '正式帳號資料會加密並自動雲端同步',
      '正式帳號登入後，資料會自動同步到雲端，網頁與手機共用同一組帳號',
      '可把網頁加到手機主畫面，像 App 一樣開啟',
    ],
  },
] as const

const PERIODIC_STEPS = [
  {
    title: '歡迎使用定期儲蓄',
    body: '用固定金額、固定節奏長期累積，適合發薪日轉帳或日常定期存入。',
    points: [
      '與「存錢系統」的目標專案分開管理',
      '建立後自動排出期程，到期提醒你存入',
      '可選持續進行，或設定期數／目標金額／結束日',
    ],
  },
  {
    title: '建立定期計畫',
    body: '點右上「＋」建立一筆定期儲蓄。',
    points: [
      '選擇頻率：每日／每周／每月，或自訂每隔幾日／幾周／幾月',
      '設定每期存入金額與開始日期',
      '結束方式可選持續進行、固定期數、目標金額或結束日期',
      '名稱會依頻率與金額自動產生，之後仍可更改；備註為選填',
    ],
  },
  {
    title: '主畫面怎麼看',
    body: '列表顯示所有定期計畫與近期待辦。',
    points: [
      '上方總覽可見進行中計畫、已存總額與待處理筆數',
      '右上「＋」可建立計畫或資料夾；資料夾 ⋯ 可刪除（計畫會移到未分類）',
      '拖曳計畫即可整理分類；選取後左上「⋯」可搬移資料夾或刪除',
      '左上帳號選單的「使用教學」可隨時重看本說明',
    ],
  },
  {
    title: '到期時怎麼存入',
    body: '進入計畫詳情後，到期當天會把存入操作放在最上面。',
    points: [
      '今天到期：最上方可直接「標記已存入」',
      '有逾期：最上方提示補存；可按「知道了」收起置頂',
      '也可提早存入未來期，或撤回已標記的存入',
      '「紀錄」與「期程表」可點選各期進行操作',
    ],
  },
  {
    title: '詳情頁區塊',
    body: '詳情頁由多個區塊組成，版面可自己調整。',
    points: [
      '進度總覽：已存入、階段／目標進度',
      '存入操作：今日存入、補存、提早存入',
      '紀錄：已完成、逾期與即將到來的期數',
      '期程表可從「＋ 新增區塊」加入；計畫資訊固定可查頻率與金額',
    ],
  },
  {
    title: '區塊收放與排序',
    body: '讓常用功能留在最順手的位置。',
    points: [
      '點區塊左側「−／＋」可收起或展開',
      '按住左側「⋮⋮」拖曳調整上下順序',
      '「＋ 新增區塊」可加回已刪除的區塊',
      '到期時「存入操作」會暫時排到最前，方便立刻完成',
    ],
  },
  {
    title: '持續進行與達標慶祝',
    body: '沒有結束日時，會以階段目標一路往上累積。',
    points: [
      '階段目標由 10 萬起，達成後自動推進下一階',
      '每次跨過階段目標會播放慶祝動畫',
      '有固定目標金額的計畫，達標時也會慶祝',
      '可隨時在選單重新命名、編輯備註或刪除計畫',
    ],
  },
] as const

function stepsFor(variant: UsageGuideVariant) {
  return variant === 'periodic' ? PERIODIC_STEPS : SAVINGS_STEPS
}

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

export function markPeriodicUsageGuideSeen() {
  try {
    localStorage.setItem(PERIODIC_USAGE_GUIDE_SEEN_KEY, '1')
  } catch {
    // ignore
  }
}

export function hasSeenPeriodicUsageGuide() {
  try {
    return localStorage.getItem(PERIODIC_USAGE_GUIDE_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function UsageGuide({
  open,
  variant = 'savings',
  onClose,
  onStartCreate,
  onOpenInstallGuide,
}: UsageGuideProps) {
  const titleId = useId()
  const steps = stepsFor(variant)
  const [step, setStep] = useState(0)
  const current = steps[step]
  const isLast = step === steps.length - 1
  const guideTitle = variant === 'periodic' ? '定期儲蓄使用教學' : '使用教學'
  const finishLabel = variant === 'periodic' ? '開始建立計畫' : '開始建立專案'

  const markSeen = () => {
    if (variant === 'periodic') markPeriodicUsageGuideSeen()
    else markUsageGuideSeen()
  }

  useEffect(() => {
    if (open) setStep(0)
  }, [open, variant])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight' && step < steps.length - 1) setStep((s) => s + 1)
      if (event.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, step, steps.length])

  if (!open || !current) return null

  const finish = () => {
    markSeen()
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
          <h2 id={titleId}>{guideTitle}</h2>
          <button type="button" className="icon-button" onClick={finish} aria-label="關閉">
            ×
          </button>
        </header>

        <div className="usage-guide-body-scroll">
          <div className="usage-guide-progress" aria-hidden="true">
            {steps.map((item, index) => (
              <span
                key={item.title}
                className={`usage-guide-dot ${index === step ? 'is-active' : ''} ${index < step ? 'is-done' : ''}`}
              />
            ))}
          </div>

          <p className="usage-guide-step-label">
            {step + 1}／{steps.length}
          </p>
          <h3 className="usage-guide-title">{current.title}</h3>
          <p className="usage-guide-body">{current.body}</p>
          <ul className="usage-guide-points">
            {current.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          {isLast && variant === 'savings' && onOpenInstallGuide ? (
            <button
              type="button"
              className="button button-secondary usage-guide-extra"
              onClick={() => {
                markSeen()
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
                markSeen()
                onClose()
                onStartCreate?.()
              }}
            >
              {onStartCreate ? finishLabel : '完成'}
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
