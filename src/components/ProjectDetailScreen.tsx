import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  AddEntryInput,
  DetailPanelId,
  PlannedDayDepositKind,
  SavingsProject,
  UpdateRandomDepositInput,
} from '../types/savings'
import {
  ALL_DETAIL_PANEL_IDS,
  DEFAULT_DETAIL_LAYOUT,
  DETAIL_PANEL_META,
} from '../types/savings'
import {
  formatTargetDate,
  getCompletedDaysCount,
  getElapsedDays,
  getMissedDates,
  getOpenPlanDates,
  getOpenPlanTotal,
  getPlannedAmount,
  getRemainingAmount,
  getRemainingDays,
  getSuggestedPeriodAmount,
  getSavingsModeLabel,
  getTargetDate,
  getTodayDateInputValue,
  getTotalDays,
  getUpcomingIncompleteDates,
  isTodayCompleted,
} from '../utils/deadline'
import { formatAmount, parseAmount } from '../utils/money'
import { CollapsiblePanel } from './CollapsiblePanel'
import { DayStatusChart } from './DayStatusChart'
import { MilestoneCelebration } from './MilestoneCelebration'
import { NoteEditModal } from './NoteEditModal'
import { PanelBoard } from './PanelBoard'
import { ProgressRing } from './ProgressRing'
import { RandomPlanTable } from './RandomPlanTable'
import { RenameModal } from './RenameModal'

interface ProjectDetailScreenProps {
  project: SavingsProject
  onBack: () => void
  onToggleTodayComplete: () => void
  onCompletePlannedDay: (date: string, kind: PlannedDayDepositKind) => void
  onUndoEarlyDeposit: (date: string) => void
  onAddEntry: (input: AddEntryInput) => void
  onUpdateRandomDeposit: (input: UpdateRandomDepositInput) => void
  onRegenerateRandomPlan: () => void
  onUpdateDetailLayout: (layout: DetailPanelId[]) => void
  onUpdateNote: (note: string) => void
  onUpdateName: (name: string) => void
}

function getProgress(current: number, target: number) {
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${date}T00:00:00`))
}

const DEPOSIT_QUICK_AMOUNTS = [100, 200, 500, 1000, 2000] as const
const PROJECT_DETAIL_GUIDE_KEY = 'savings-system:project-detail-guide-seen'

function hasSeenProjectDetailGuide() {
  try {
    return localStorage.getItem(PROJECT_DETAIL_GUIDE_KEY) === '1'
  } catch {
    return false
  }
}

function markProjectDetailGuideSeen() {
  try {
    localStorage.setItem(PROJECT_DETAIL_GUIDE_KEY, '1')
  } catch {
    // ignore
  }
}

export function ProjectDetailScreen({
  project,
  onBack,
  onToggleTodayComplete,
  onCompletePlannedDay,
  onUndoEarlyDeposit,
  onAddEntry,
  onUpdateRandomDeposit,
  onRegenerateRandomPlan,
  onUpdateDetailLayout,
  onUpdateNote,
  onUpdateName,
}: ProjectDetailScreenProps) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [randomEnabled, setRandomEnabled] = useState(project.randomDeposit.enabled)
  const [minAmount, setMinAmount] = useState(String(project.randomDeposit.minAmount))
  const [maxAmount, setMaxAmount] = useState(String(project.randomDeposit.maxAmount))
  const [makeupDate, setMakeupDate] = useState('')
  const [earlyDate, setEarlyDate] = useState('')
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [randomDoneTipOpen, setRandomDoneTipOpen] = useState(false)
  const [firstVisitGuideOpen, setFirstVisitGuideOpen] = useState(false)
  const [celebrateGoal, setCelebrateGoal] = useState<number | null>(null)
  const prevAmountRef = useRef<number | null>(null)
  const trackedProjectIdRef = useRef(project.id)

  const layout = project.detailLayout?.length ? project.detailLayout : DEFAULT_DETAIL_LAYOUT

  useEffect(() => {
    if (hasSeenProjectDetailGuide()) return
    setFirstVisitGuideOpen(true)
  }, [project.id])

  const closeFirstVisitGuide = () => {
    markProjectDetailGuideSeen()
    setFirstVisitGuideOpen(false)
  }

  useEffect(() => {
    setRandomEnabled(project.randomDeposit.enabled)
    setMinAmount(String(project.randomDeposit.minAmount))
    setMaxAmount(String(project.randomDeposit.maxAmount))
  }, [project.id, project.randomDeposit])

  useEffect(() => {
    const current = project.currentAmount
    const target = project.targetAmount

    if (trackedProjectIdRef.current !== project.id) {
      trackedProjectIdRef.current = project.id
      prevAmountRef.current = current
      setCelebrateGoal(null)
      return
    }

    const prev = prevAmountRef.current
    prevAmountRef.current = current
    if (prev == null) return

    if (target > 0 && prev < target && current >= target) {
      setCelebrateGoal(target)
    }
  }, [project.id, project.currentAmount, project.targetAmount])

  const progress = getProgress(project.currentAmount, project.targetAmount)
  const suggestedPeriodAmount = getSuggestedPeriodAmount(project)
  const periodLabel = getSavingsModeLabel(project)
  const periodNote = `${periodLabel}快捷`
  const today = getTodayDateInputValue()
  const todayPlan = getPlannedAmount(project, today)
  const randomTodayAmount =
    project.randomDeposit.enabled && todayPlan != null && todayPlan > 0 ? todayPlan : null
  const quickPrimaryAmount =
    randomTodayAmount ?? (suggestedPeriodAmount > 0 ? suggestedPeriodAmount : null)
  const quickPrimaryLabel = randomTodayAmount != null ? '今日' : periodLabel
  const quickPrimaryNote = randomTodayAmount != null ? '今日需存入' : periodNote

  const quickDeposit = (value: number, depositNote?: string) => {
    if (value <= 0) return
    onAddEntry({
      amount: value,
      note: depositNote,
      date: getTodayDateInputValue(),
    })
    setAmount('')
    setNote('')
  }
  const totalDays = getTotalDays(project)
  const remainingDays = getRemainingDays(project)
  const completedDays = getCompletedDaysCount(project)
  const elapsedDays = getElapsedDays(project)
  const todayCompleted = isTodayCompleted(project)
  const targetDate = getTargetDate(project)
  const remainingAmount = getRemainingAmount(project)
  const openPlanTotal = getOpenPlanTotal(project)

  // After random plan is ready, keep the amount field synced to today's assigned amount.
  useEffect(() => {
    if (randomTodayAmount == null) return
    if (todayCompleted) return
    setAmount(String(randomTodayAmount))
  }, [project.id, randomTodayAmount, todayCompleted])

  const dayProgress = useMemo(() => {
    if (totalDays <= 0) return 0
    return Math.min(100, Math.round((completedDays / totalDays) * 100))
  }, [completedDays, totalDays])

  const openDaysCount = getOpenPlanDates(project).length
  const maxCoverable = project.randomDeposit.maxAmount * openDaysCount
  const minCoverable = project.randomDeposit.minAmount * openDaysCount
  const missedDates = useMemo(() => getMissedDates(project), [project])
  const upcomingDates = useMemo(() => getUpcomingIncompleteDates(project), [project])

  useEffect(() => {
    setMakeupDate((prev) => (prev && missedDates.includes(prev) ? prev : missedDates[0] ?? ''))
  }, [missedDates])

  useEffect(() => {
    setEarlyDate((prev) => (prev && upcomingDates.includes(prev) ? prev : upcomingDates[0] ?? ''))
  }, [upcomingDates])

  const availablePanels = ALL_DETAIL_PANEL_IDS.filter((id) => {
    if (layout.includes(id)) return false
    // After random allocation auto-hides deposit settings, do not allow re-adding it.
    if (id === 'deposit' && project.randomDeposit.enabled) return false
    return true
  })

  const handleAddEntry = (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = parseAmount(amount)
    if (parsed == null) return
    onAddEntry({ amount: parsed, note: note.trim() || undefined, date: today })
    setAmount('')
    setNote('')
  }

  const handleSaveRandomSettings = (event: React.FormEvent) => {
    event.preventDefault()
    const min = parseAmount(minAmount)
    const max = parseAmount(maxAmount)
    if (min == null || max == null) return

    onUpdateRandomDeposit({
      enabled: randomEnabled,
      minAmount: min,
      maxAmount: max,
      regeneratePlan: true,
    })
    if (randomEnabled) setRandomDoneTipOpen(true)
  }

  const handleRegenerateRandomPlan = () => {
    onRegenerateRandomPlan()
    setRandomDoneTipOpen(true)
  }

  const handleDepositRandomToday = () => {
    if (todayPlan == null || todayPlan <= 0) return
    if (todayPlan > remainingAmount) return

    onAddEntry({
      amount: todayPlan,
      note: '系統隨機分配',
      date: today,
    })
  }

  const handleDeletePanel = (panelId: DetailPanelId) => {
    if (layout.length <= 1) {
      window.alert('至少需要保留一個區塊。')
      return
    }
    if (!window.confirm(`確定刪除「${DETAIL_PANEL_META[panelId].title}」區塊嗎？`)) return
    onUpdateDetailLayout(layout.filter((id) => id !== panelId))
  }

  const handleAddPanel = (panelId: DetailPanelId) => {
    if (layout.includes(panelId)) return
    onUpdateDetailLayout([...layout, panelId])
    setAddMenuOpen(false)
  }

  const renderPanelBody = (panelId: DetailPanelId) => {
    switch (panelId) {
      case 'overview':
        return (
          <div className="detail-hero-inner">
            <ProgressRing progress={progress} label={`${progress}%`} sublabel="存錢進度" />
            <div className="detail-hero-stats">
              <div className="stat-card">
                <span>目前金額</span>
                <strong>{formatAmount(project.currentAmount)}</strong>
              </div>
              <div className="stat-card">
                <span>目標金額</span>
                <strong>{formatAmount(project.targetAmount)}</strong>
              </div>
              <div className="stat-card">
                <span>剩餘金額</span>
                <strong>{formatAmount(remainingAmount)}</strong>
              </div>
              <div className={`stat-card today-deposit-card ${todayCompleted ? 'is-done' : 'is-pending'}`}>
                <span>今日需要存入</span>
                <strong>
                  {todayPlan != null && todayPlan > 0 ? formatAmount(todayPlan) : '尚未分配'}
                </strong>
                <em className={`today-complete-badge ${todayCompleted ? 'is-done' : 'is-pending'}`}>
                  {todayCompleted ? '已完成' : '未完成'}
                </em>
              </div>
            </div>
          </div>
        )
      case 'dayChart':
        return <DayStatusChart project={project} />
      case 'deadline':
        return (
          <ul className="detail-list">
            <li>
              <span>目標天數</span>
              <strong>{totalDays} 天</strong>
            </li>
            <li>
              <span>目標日期</span>
              <strong>{formatTargetDate(targetDate)}</strong>
            </li>
            <li>
              <span>已進行</span>
              <strong>{elapsedDays} 天</strong>
            </li>
            <li>
              <span>剩餘天數</span>
              <strong>
                {remainingDays > 0
                  ? `${remainingDays} 天`
                  : remainingDays === 0
                    ? '今日到期'
                    : `逾期 ${Math.abs(remainingDays)} 天`}
              </strong>
            </li>
          </ul>
        )
      case 'dailyComplete':
        return (
          <>
            <div className="day-complete-row">
              <div>
                <p className={`today-status ${todayCompleted ? 'is-done' : 'is-pending'}`}>
                  今天{todayCompleted ? '已完成' : '尚未完成'}
                </p>
                <p className="field-hint">
                  完成天數 {completedDays} / {totalDays}（{dayProgress}%）
                </p>
              </div>
              <button
                type="button"
                className={`button ${todayCompleted ? 'button-secondary' : 'button-primary'}`}
                onClick={onToggleTodayComplete}
              >
                {todayCompleted ? '取消今日完成' : '標記今日完成'}
              </button>
            </div>
            <div className="mini-progress">
              <div className="progress-track" aria-hidden="true">
                <div className="progress-fill" style={{ width: `${dayProgress}%` }} />
              </div>
            </div>

            <div className="catchup-actions">
              <div className="catchup-field">
                <label className="field">
                  <span>補存入（未完成天）</span>
                  <select
                    value={makeupDate}
                    onChange={(event) => setMakeupDate(event.target.value)}
                    disabled={missedDates.length === 0}
                  >
                    {missedDates.length === 0 ? (
                      <option value="">沒有可補存的天數</option>
                    ) : (
                      missedDates.map((date) => {
                        const planned = getPlannedAmount(project, date) ?? 0
                        return (
                          <option key={date} value={date}>
                            {formatShortDate(date)}
                            {planned > 0 ? ` · ${formatAmount(planned)}` : ''}
                          </option>
                        )
                      })
                    )}
                  </select>
                </label>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={!makeupDate}
                  onClick={() => {
                    if (!makeupDate) return
                    const planned = getPlannedAmount(project, makeupDate) ?? 0
                    const depositAmount = Math.min(Math.max(0, planned), remainingAmount)
                    if (
                      !window.confirm(
                        `確定補存入 ${formatShortDate(makeupDate)}（${depositAmount > 0 ? formatAmount(depositAmount) : 'NT$0'}）嗎？`,
                      )
                    ) {
                      return
                    }
                    onCompletePlannedDay(makeupDate, 'makeup')
                  }}
                >
                  補存入
                </button>
              </div>

              <div className="catchup-field">
                <label className="field">
                  <span>提早存入（未來天）</span>
                  <select
                    value={earlyDate}
                    onChange={(event) => setEarlyDate(event.target.value)}
                    disabled={upcomingDates.length === 0}
                  >
                    {upcomingDates.length === 0 ? (
                      <option value="">沒有可提早存入的天數</option>
                    ) : (
                      upcomingDates.map((date) => {
                        const planned = getPlannedAmount(project, date) ?? 0
                        return (
                          <option key={date} value={date}>
                            {formatShortDate(date)}
                            {planned > 0 ? ` · ${formatAmount(planned)}` : ''}
                          </option>
                        )
                      })
                    )}
                  </select>
                </label>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={!earlyDate}
                  onClick={() => {
                    if (!earlyDate) return
                    const planned = getPlannedAmount(project, earlyDate) ?? 0
                    const depositAmount = Math.min(Math.max(0, planned), remainingAmount)
                    if (
                      !window.confirm(
                        `確定提早存入 ${formatShortDate(earlyDate)}（${depositAmount > 0 ? formatAmount(depositAmount) : 'NT$0'}）嗎？`,
                      )
                    ) {
                      return
                    }
                    onCompletePlannedDay(earlyDate, 'early')
                  }}
                >
                  提早存入
                </button>
              </div>
            </div>
          </>
        )
      case 'deposit':
        return (
          <>
            <div className="deposit-section">
              <h3 className="section-subtitle">隨機分配</h3>
              <form className="entry-form" onSubmit={handleSaveRandomSettings}>
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={randomEnabled}
                    onChange={(event) => setRandomEnabled(event.target.checked)}
                  />
                  <span>啟用每日隨機分配</span>
                </label>

                {randomEnabled && (
                  <>
                    <div className="range-fields">
                      <label className="field">
                        <span>最低金額</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]+"
                          value={minAmount}
                          onChange={(event) => setMinAmount(event.target.value)}
                          required
                        />
                      </label>
                      <label className="field">
                        <span>最高金額</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]+"
                          value={maxAmount}
                          onChange={(event) => setMaxAmount(event.target.value)}
                          required
                        />
                      </label>
                    </div>

                    <div className="random-actions">
                      <button type="submit" className="button button-primary">
                        儲存並重新分配
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={handleRegenerateRandomPlan}
                        disabled={!project.randomDeposit.enabled}
                      >
                        重抽剩餘天數
                      </button>
                    </div>
                  </>
                )}
              </form>

              {project.randomDeposit.enabled && (
                <div className="random-summary">
                  <p>
                    金額間距：{formatAmount(project.randomDeposit.minAmount)} ~{' '}
                    {formatAmount(project.randomDeposit.maxAmount)}
                  </p>
                  <p>剩餘金額／計畫總額：{formatAmount(remainingAmount)}</p>
                  {openPlanTotal !== remainingAmount && (
                    <p className="field-hint warning-text">
                      目前分配尚未同步，請按「儲存並重新分配」或「重抽剩餘天數」。
                    </p>
                  )}
                  {(remainingAmount < minCoverable || remainingAmount > maxCoverable) &&
                    openDaysCount > 0 && (
                      <p className="field-hint warning-text">
                        目前間距無法剛好覆蓋剩餘金額（{openDaysCount} 天可排{' '}
                        {formatAmount(minCoverable)} ~ {formatAmount(maxCoverable)}
                        ）。仍會完整分配，但單日金額可能超出間距。
                      </p>
                    )}
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={handleDepositRandomToday}
                    disabled={
                      todayPlan == null ||
                      todayPlan <= 0 ||
                      todayCompleted ||
                      todayPlan > remainingAmount
                    }
                  >
                    存入今日隨機金額
                    {todayPlan != null && todayPlan > 0 ? `（${formatAmount(todayPlan)}）` : ''}
                  </button>
                </div>
              )}
            </div>

            <div className="deposit-section">
              <h3 className="section-subtitle">手動新增存錢</h3>
              <form className="entry-form" onSubmit={handleAddEntry}>
                <label className="field">
                  <span>金額（NT$）</span>
                  <div className="quick-chip-row" role="group" aria-label="金額快捷">
                    {quickPrimaryAmount != null ? (
                      <button
                        type="button"
                        className={`quick-chip is-accent ${amount === String(quickPrimaryAmount) ? 'is-active' : ''}`}
                        onClick={() => setAmount(String(quickPrimaryAmount))}
                      >
                        {quickPrimaryLabel} {formatAmount(quickPrimaryAmount)}
                      </button>
                    ) : null}
                    {DEPOSIT_QUICK_AMOUNTS.filter((value) => value !== quickPrimaryAmount).map(
                      (value) => (
                        <button
                          key={value}
                          type="button"
                          className={`quick-chip ${amount === String(value) ? 'is-active' : ''}`}
                          onClick={() => setAmount(String(value))}
                        >
                          {value.toLocaleString('zh-TW')}
                        </button>
                      ),
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]+"
                    placeholder="例如：100"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>備註（選填）</span>
                  <input
                    type="text"
                    placeholder="例如：午餐節省"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
                <button type="submit" className="button button-primary">
                  存入並標記今日完成
                </button>
              </form>

              {quickPrimaryAmount != null ? (
                <div className="quick-deposit-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => quickDeposit(quickPrimaryAmount, quickPrimaryNote)}
                    disabled={
                      quickPrimaryAmount > remainingAmount ||
                      (randomTodayAmount != null && todayCompleted)
                    }
                  >
                    一鍵存入{quickPrimaryLabel}額（{formatAmount(quickPrimaryAmount)}）
                  </button>
                </div>
              ) : null}
            </div>
          </>
        )
      case 'randomPlanTable':
        return project.randomDeposit.enabled ? (
          <RandomPlanTable
            project={project}
            onCompletePlannedDay={onCompletePlannedDay}
            onUndoEarlyDeposit={onUndoEarlyDeposit}
          />
        ) : (
          <p className="folder-empty">請先在「存入金額設定」啟用隨機分配後查看此表。</p>
        )
      case 'entries':
        return project.entries.length === 0 ? (
          <p className="folder-empty">還沒有存錢明細，先新增一筆吧。</p>
        ) : (
          <ul className="entry-list">
            {project.entries.map((entry) => (
              <li key={entry.id} className="entry-item">
                <div>
                  <strong>{formatAmount(entry.amount)}</strong>
                  <p>{entry.note || '無備註'}</p>
                </div>
                <span>{formatShortDate(entry.date)}</span>
              </li>
            ))}
          </ul>
        )
      default:
        return null
    }
  }

  return (
    <div className="detail-screen">
      <div className="floating-dock floating-dock-left">
        <div className="island-wrap is-visible">
          <button type="button" className="island-button" onClick={onBack} aria-label="返回主頁">
            ←
          </button>
        </div>
      </div>

      <header className="detail-header">
        <div className="detail-header-top">
          <p className="eyebrow">專案詳情</p>
          <div className="detail-header-menu-wrap">
            <button
              type="button"
              className="panel-toggle"
              aria-label="專案選單"
              aria-haspopup="menu"
              aria-expanded={headerMenuOpen}
              title="更多"
              onClick={() => {
                setAddMenuOpen(false)
                setHeaderMenuOpen((open) => !open)
              }}
            >
              <span aria-hidden="true">⋯</span>
            </button>
            {headerMenuOpen && (
              <>
                <button
                  type="button"
                  className="menu-scrim"
                  aria-label="關閉選單"
                  onClick={() => setHeaderMenuOpen(false)}
                />
                <div className="detail-header-menu" role="menu">
                  <button
                    type="button"
                    className="create-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setHeaderMenuOpen(false)
                      setRenameModalOpen(true)
                    }}
                  >
                    <span className="create-menu-icon" aria-hidden="true">
                      ✎
                    </span>
                    <span>
                      <strong>更改專案名稱</strong>
                      <small>重新命名這個專案</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="create-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setHeaderMenuOpen(false)
                      setNoteModalOpen(true)
                    }}
                  >
                    <span className="create-menu-icon" aria-hidden="true">
                      📝
                    </span>
                    <span>
                      <strong>{project.note ? '編輯備註' : '新增備註'}</strong>
                      <small>{project.note ? '修改目前備註' : '為這個專案加上備註'}</small>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <h1>{project.name}</h1>
        {project.note ? <p className="entity-note">{project.note}</p> : null}

        {randomTodayAmount != null ? (
          <div className={`today-save-tip ${todayCompleted ? 'is-done' : 'is-pending'}`}>
            <div>
              <span>今日需存入金額</span>
              <strong>{formatAmount(randomTodayAmount)}</strong>
            </div>
            <em>{todayCompleted ? '今日已完成' : '請依此金額存入'}</em>
          </div>
        ) : null}

        {quickPrimaryAmount != null ? (
          <div className="plan-badge-row">
            <span className="plan-badge">{periodLabel}計畫</span>
            <button
              type="button"
              className="button button-primary button-compact"
              onClick={() => quickDeposit(quickPrimaryAmount, quickPrimaryNote)}
              disabled={
                quickPrimaryAmount > remainingAmount ||
                (randomTodayAmount != null && todayCompleted)
              }
            >
              快捷存入 {formatAmount(quickPrimaryAmount)}
            </button>
          </div>
        ) : (
          <div className="plan-badge-row">
            <span className="plan-badge is-muted">{periodLabel}計畫</span>
          </div>
        )}
      </header>

      <div className="panel-toolbar">
        <p className="field-hint">按住區塊左側 ⋮⋮ 可拖動排序</p>
        <div className="add-panel-wrap">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setAddMenuOpen((open) => !open)}
          >
            ＋ 新增區塊
          </button>
          {addMenuOpen && (
            <>
              <button
                type="button"
                className="menu-scrim"
                aria-label="關閉選單"
                onClick={() => setAddMenuOpen(false)}
              />
              <div className="add-panel-menu" role="menu">
                {availablePanels.length === 0 ? (
                  <p className="add-panel-empty">無區塊可新增</p>
                ) : (
                  availablePanels.map((panelId) => (
                    <button
                      key={panelId}
                      type="button"
                      className="create-menu-item"
                      role="menuitem"
                      onClick={() => handleAddPanel(panelId)}
                    >
                      <span>
                        <strong>{DETAIL_PANEL_META[panelId].title}</strong>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <PanelBoard
        layout={layout}
        onReorder={onUpdateDetailLayout}
        renderItem={(panelId, { dragging, onDragStart, onDragEnd }) => (
          <CollapsiblePanel
            key={panelId}
            title={DETAIL_PANEL_META[panelId].title}
            defaultOpen={
              panelId === 'dayChart' || panelId === 'randomPlanTable'
                ? false
                : panelId !== 'entries' || project.entries.length > 0
            }
            draggable
            onDelete={() => handleDeletePanel(panelId)}
            onDragStart={(event) => {
              setAddMenuOpen(false)
              onDragStart(event)
            }}
            onDragEnd={onDragEnd}
            className={dragging ? 'is-dragging-panel' : ''}
          >
            {renderPanelBody(panelId)}
          </CollapsiblePanel>
        )}
      />

      <NoteEditModal
        open={noteModalOpen}
        title={`${project.note ? '編輯' : '新增'}備註 · ${project.name}`}
        initialNote={project.note}
        onClose={() => setNoteModalOpen(false)}
        onSave={onUpdateNote}
      />
      <RenameModal
        open={renameModalOpen}
        title="更改專案名稱"
        fieldLabel="專案名稱"
        placeholder="輸入新的專案名稱"
        initialName={project.name}
        onClose={() => setRenameModalOpen(false)}
        onSave={onUpdateName}
      />

      {firstVisitGuideOpen ? (
        <div className="modal-backdrop random-tip-backdrop" onClick={closeFirstVisitGuide}>
          <div
            className="modal random-tip-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-guide-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <h2 id="project-guide-title">開始存錢</h2>
              <button
                type="button"
                className="icon-button"
                onClick={closeFirstVisitGuide}
                aria-label="關閉"
              >
                ×
              </button>
            </header>
            <p className="random-tip-lead">歡迎進入專案頁面，可以這樣開始：</p>
            <ul className="random-tip-list">
              <li>
                到「存入金額設定」輸入今日存入金額，或用快捷鍵一鍵存入
              </li>
              <li>
                也可以選擇啟用「隨機分配」，讓系統自動排出每日需存入金額
              </li>
              <li>存入後可在進度總覽查看今日是否完成</li>
            </ul>
            <div className="modal-actions">
              <button type="button" className="button button-primary" onClick={closeFirstVisitGuide}>
                開始使用
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {randomDoneTipOpen && !firstVisitGuideOpen ? (
        <div
          className="modal-backdrop random-tip-backdrop"
          onClick={() => setRandomDoneTipOpen(false)}
        >
          <div
            className="modal random-tip-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="random-tip-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <h2 id="random-tip-title">隨機分配完成</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setRandomDoneTipOpen(false)}
                aria-label="關閉"
              >
                ×
              </button>
            </header>
            <p className="random-tip-lead">隨機分配存入金額已完成</p>
            <ul className="random-tip-list">
              <li>點擊展開下方「剩餘天數存入金額表」，查看每日分配金額</li>
              <li>或點擊展開「完成狀態圖表」，查看詳細內容</li>
            </ul>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => setRandomDoneTipOpen(false)}
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <MilestoneCelebration
        goal={celebrateGoal}
        isOpenEnded={false}
        onClose={() => setCelebrateGoal(null)}
      />
    </div>
  )
}
