import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { PeriodicDetailPanelId, PeriodicPeriod, PeriodicPlan } from '../types/periodic'
import {
  ALL_PERIODIC_DETAIL_PANEL_IDS,
  DEFAULT_PERIODIC_DETAIL_LAYOUT,
  PERIODIC_DETAIL_PANEL_META,
} from '../types/periodic'
import { formatAmount } from '../utils/money'
import {
  endRuleSummary,
  formatPeriodicDate,
  frequencyLabel,
  getNextPeriodicPeriod,
  getPeriodicProgressBar,
  getPeriodicSavedAmount,
  getPeriodicTargetAmount,
  getReachedMilestoneGoals,
  listPeriodicPeriods,
  periodicPlanSummary,
} from '../utils/periodic'
import { CollapsiblePanel } from './CollapsiblePanel'
import { MilestoneCelebration } from './MilestoneCelebration'
import { NoteEditModal } from './NoteEditModal'
import { PanelBoard } from './PanelBoard'
import { PeriodicCalendar } from './PeriodicCalendar'
import { PeriodicRecords } from './PeriodicRecords'
import { RenameModal } from './RenameModal'

interface PeriodicPlanDetailScreenProps {
  plan: PeriodicPlan
  onBack: () => void
  onTogglePeriod: (date: string) => void
  onUpdateName: (name: string) => void
  onUpdateNote: (note: string) => void
  onUpdateDetailLayout: (layout: PeriodicDetailPanelId[]) => void
  onDelete: () => void
}

type PendingAction =
  | { type: 'deposit'; date: string; amount: number; label: string }
  | { type: 'undo'; date: string; amount: number }

function overdueDismissKey(planId: string) {
  return `savings-system:periodic-overdue-dismiss:${planId}`
}

function readOverdueDismiss(planId: string) {
  try {
    return sessionStorage.getItem(overdueDismissKey(planId))
  } catch {
    return null
  }
}

function writeOverdueDismiss(planId: string, signature: string) {
  try {
    sessionStorage.setItem(overdueDismissKey(planId), signature)
  } catch {
    // ignore
  }
}

export function PeriodicPlanDetailScreen({
  plan,
  onBack,
  onTogglePeriod,
  onUpdateName,
  onUpdateNote,
  onUpdateDetailLayout,
  onDelete,
}: PeriodicPlanDetailScreenProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [makeupDate, setMakeupDate] = useState('')
  const [earlyDate, setEarlyDate] = useState('')
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [celebrateGoal, setCelebrateGoal] = useState<number | null>(null)
  const confirmTitleId = useId()
  const prevSavedRef = useRef<number | null>(null)
  const trackedPlanIdRef = useRef(plan.id)

  const layout = plan.detailLayout?.length
    ? plan.detailLayout
    : DEFAULT_PERIODIC_DETAIL_LAYOUT

  const periods = useMemo(() => listPeriodicPeriods(plan), [plan])
  const nextPeriod = useMemo(() => getNextPeriodicPeriod(plan), [plan])
  const saved = getPeriodicSavedAmount(plan)
  const target = getPeriodicTargetAmount(plan)
  const progressBar = getPeriodicProgressBar(plan)

  useEffect(() => {
    if (trackedPlanIdRef.current !== plan.id) {
      trackedPlanIdRef.current = plan.id
      prevSavedRef.current = saved
      setCelebrateGoal(null)
      return
    }

    const prevSaved = prevSavedRef.current
    prevSavedRef.current = saved
    if (prevSaved == null) return

    const reached = getReachedMilestoneGoals(plan, prevSaved, saved)
    if (reached.length > 0) {
      setCelebrateGoal(reached[reached.length - 1] ?? null)
    }
  }, [plan, saved])
  const missedPeriods = useMemo(
    () => periods.filter((period) => period.status === 'missed'),
    [periods],
  )
  const upcomingPeriods = useMemo(
    () => periods.filter((period) => period.status === 'upcoming'),
    [periods],
  )
  const duePeriod = useMemo(
    () => periods.find((period) => period.status === 'due') ?? null,
    [periods],
  )

  const completedCount = periods.filter((period) => period.status === 'completed').length
  const missedCount = missedPeriods.length
  const isOpenEnded = plan.endRule.type === 'open'
  const availablePanels = ALL_PERIODIC_DETAIL_PANEL_IDS.filter((id) => !layout.includes(id))
  const missedSignature = useMemo(
    () => missedPeriods.map((period) => period.date).join(','),
    [missedPeriods],
  )
  const [overdueDismissedSig, setOverdueDismissedSig] = useState<string | null>(() =>
    readOverdueDismiss(plan.id),
  )
  const overdueTopDismissed =
    missedSignature !== '' && overdueDismissedSig === missedSignature
  const showOverdueTop = missedCount > 0 && !duePeriod && !overdueTopDismissed
  const needsDepositNow = duePeriod != null || showOverdueTop
  const [pinCheckinTop, setPinCheckinTop] = useState(true)

  useEffect(() => {
    setOverdueDismissedSig(readOverdueDismiss(plan.id))
    setPinCheckinTop(true)
  }, [plan.id])

  useEffect(() => {
    if (needsDepositNow) setPinCheckinTop(true)
  }, [needsDepositNow, duePeriod?.date, missedSignature])

  const displayLayout = useMemo((): PeriodicDetailPanelId[] => {
    if (!pinCheckinTop || !needsDepositNow || !layout.includes('checkin')) return layout
    if (layout[0] === 'checkin') return layout
    return ['checkin', ...layout.filter((id) => id !== 'checkin')]
  }, [layout, needsDepositNow, pinCheckinTop])

  const dismissOverdueTop = () => {
    writeOverdueDismiss(plan.id, missedSignature)
    setOverdueDismissedSig(missedSignature)
    setPinCheckinTop(false)
  }

  useEffect(() => {
    if (missedPeriods.length === 0) {
      setMakeupDate('')
      return
    }
    setMakeupDate((current) =>
      missedPeriods.some((period) => period.date === current)
        ? current
        : missedPeriods[0].date,
    )
  }, [missedPeriods])

  useEffect(() => {
    if (upcomingPeriods.length === 0) {
      setEarlyDate('')
      return
    }
    setEarlyDate((current) =>
      upcomingPeriods.some((period) => period.date === current)
        ? current
        : upcomingPeriods[0].date,
    )
  }, [upcomingPeriods])

  const requestDeposit = (date: string, amount: number, label: string) => {
    setPending({ type: 'deposit', date, amount, label })
  }

  const requestUndo = (date: string, amount: number) => {
    setPending({ type: 'undo', date, amount })
  }

  const handleSelectPeriod = (period: PeriodicPeriod) => {
    if (period.status === 'completed') {
      requestUndo(period.date, period.amount)
      return
    }
    if (period.status === 'due') {
      requestDeposit(period.date, period.amount, '今日存入')
      return
    }
    if (period.status === 'missed') {
      requestDeposit(period.date, period.amount, '補存入')
      return
    }
    requestDeposit(period.date, period.amount, '提早存入')
  }

  const closePending = () => setPending(null)

  const confirmPending = () => {
    if (!pending) return
    onTogglePeriod(pending.date)
    setPending(null)
  }

  const handleDeletePanel = (panelId: PeriodicDetailPanelId) => {
    if (layout.length <= 1) {
      window.alert('至少需要保留一個區塊。')
      return
    }
    if (!window.confirm(`確定刪除「${PERIODIC_DETAIL_PANEL_META[panelId].title}」區塊嗎？`)) {
      return
    }
    onUpdateDetailLayout(layout.filter((id) => id !== panelId))
  }

  const handleAddPanel = (panelId: PeriodicDetailPanelId) => {
    if (layout.includes(panelId)) return
    const planInfoIndex = layout.indexOf('planInfo')
    if (panelId !== 'planInfo' && planInfoIndex >= 0) {
      const next = [...layout]
      next.splice(planInfoIndex, 0, panelId)
      onUpdateDetailLayout(next)
    } else {
      onUpdateDetailLayout([...layout, panelId])
    }
    setAddMenuOpen(false)
  }

  const renderPanelBody = (panelId: PeriodicDetailPanelId) => {
    switch (panelId) {
      case 'overview':
        return (
          <>
            <div className="detail-hero-stats">
              <div className="stat-card">
                <span>已存入</span>
                <strong>{formatAmount(saved)}</strong>
              </div>
              <div className="stat-card">
                <span>{isOpenEnded ? '階段目標' : '目標'}</span>
                <strong>
                  {isOpenEnded
                    ? formatAmount(progressBar.goal)
                    : target != null
                      ? formatAmount(target)
                      : formatAmount(progressBar.goal)}
                </strong>
              </div>
              <div className="stat-card">
                <span>進度</span>
                <strong>{progressBar.percent}%</strong>
              </div>
              <div className="stat-card">
                <span>{isOpenEnded ? '已完成期數' : '待補存'}</span>
                <strong>{isOpenEnded ? `${completedCount} 期` : `${missedCount} 期`}</strong>
              </div>
            </div>

            <div className="periodic-progress-block">
              <div className="periodic-progress-meta">
                <span>
                  {formatAmount(progressBar.saved)} / {formatAmount(progressBar.goal)}
                </span>
                <span>{progressBar.percent}%</span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressBar.percent}
                aria-label={isOpenEnded ? '階段進度' : '存錢進度'}
              >
                <div className="progress-fill" style={{ width: `${progressBar.percent}%` }} />
              </div>
              {isOpenEnded ? (
                <p className="field-hint">
                  以 {progressBar.goal.toLocaleString('zh-TW')} 為階段目標，達成後自動往下一階推進。
                </p>
              ) : null}
            </div>

            {nextPeriod ? (
              <div className="periodic-next-callout">
                <div>
                  <span className="stat-label">下一筆</span>
                  <strong>
                    {formatPeriodicDate(nextPeriod.date)} · {formatAmount(nextPeriod.amount)}
                  </strong>
                  {nextPeriod.status === 'missed' ? (
                    <p className="field-hint">已逾期，請到「存入操作」補存。</p>
                  ) : nextPeriod.status === 'due' ? (
                    <p className="field-hint">今天到期。</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="field-hint">此計畫已無待存期程。</p>
            )}
          </>
        )

      case 'checkin':
        return (
          <>
            {duePeriod ? (
              <div className="day-complete-row">
                <div>
                  <p className="today-status is-pending">今天尚未存入</p>
                  <p className="field-hint">
                    {formatPeriodicDate(duePeriod.date)} · {formatAmount(duePeriod.amount)}
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() =>
                    requestDeposit(duePeriod.date, duePeriod.amount, '今日存入')
                  }
                >
                  標記已存入
                </button>
              </div>
            ) : (
              <p className="field-hint">今天沒有到期期數，或今日已完成。</p>
            )}

            <div className="catchup-actions">
              {missedPeriods.length > 0 ? (
                <div className="catchup-field">
                  <label className="field">
                    <span>補存入（逾期未完成）</span>
                    <select
                      value={makeupDate}
                      onChange={(event) => setMakeupDate(event.target.value)}
                    >
                      {missedPeriods.map((period) => (
                        <option key={period.date} value={period.date}>
                          #{period.index} · {formatPeriodicDate(period.date)} ·{' '}
                          {formatAmount(period.amount)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={!makeupDate}
                    onClick={() => {
                      const period = missedPeriods.find((item) => item.date === makeupDate)
                      if (!period) return
                      requestDeposit(period.date, period.amount, '補存入')
                    }}
                  >
                    補存入
                  </button>
                </div>
              ) : null}

              {upcomingPeriods.length > 0 ? (
                <div className="catchup-field">
                  <label className="field">
                    <span>提早存入（未來期）</span>
                    <select
                      value={earlyDate}
                      onChange={(event) => setEarlyDate(event.target.value)}
                    >
                      {upcomingPeriods.map((period) => (
                        <option key={period.date} value={period.date}>
                          #{period.index} · {formatPeriodicDate(period.date)} ·{' '}
                          {formatAmount(period.amount)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={!earlyDate}
                    onClick={() => {
                      const period = upcomingPeriods.find((item) => item.date === earlyDate)
                      if (!period) return
                      requestDeposit(period.date, period.amount, '提早存入')
                    }}
                  >
                    提早存入
                  </button>
                </div>
              ) : null}

              {missedPeriods.length === 0 && upcomingPeriods.length === 0 && !duePeriod ? (
                <p className="field-hint">目前沒有可操作的期數。</p>
              ) : null}
            </div>
          </>
        )

      case 'records':
        return <PeriodicRecords periods={periods} onSelectPeriod={handleSelectPeriod} />

      case 'schedule':
        return periods.length === 0 ? (
          <p className="empty-inline">目前沒有期程。</p>
        ) : (
          <PeriodicCalendar periods={periods} onSelectPeriod={handleSelectPeriod} />
        )

      case 'planInfo':
        return (
          <ul className="detail-list">
            <li>
              <span>頻率</span>
              <strong>
                {frequencyLabel(plan.frequency, plan.intervalCount, plan.intervalUnit)}
              </strong>
            </li>
            <li>
              <span>每期金額</span>
              <strong>{formatAmount(plan.amount)}</strong>
            </li>
            <li>
              <span>開始日期</span>
              <strong>{formatPeriodicDate(plan.startDate)}</strong>
            </li>
            <li>
              <span>結束方式</span>
              <strong>{endRuleSummary(plan.endRule)}</strong>
            </li>
            <li>
              <span>已完成</span>
              <strong>{completedCount} 期</strong>
            </li>
          </ul>
        )

      default:
        return null
    }
  }

  return (
    <div className="detail-screen periodic-detail-screen">
      <div className="floating-dock floating-dock-left">
        <div className="island-wrap is-visible">
          <button type="button" className="island-button" onClick={onBack} aria-label="返回">
            ←
          </button>
        </div>
      </div>

      <header className="detail-header">
        <div className="detail-header-top">
          <p className="eyebrow">定期儲蓄</p>
          <div className="detail-header-menu-wrap">
            <button
              type="button"
              className="panel-toggle"
              aria-label="計畫選單"
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
            {headerMenuOpen ? (
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
                      setRenameOpen(true)
                    }}
                  >
                    <span>
                      <strong>更改計畫名稱</strong>
                      <small>重新命名這個計畫</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="create-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setHeaderMenuOpen(false)
                      setNoteOpen(true)
                    }}
                  >
                    <span>
                      <strong>{plan.note ? '編輯備註' : '新增備註'}</strong>
                      <small>{plan.note ? '修改目前備註' : '為這個計畫加上備註'}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="create-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setHeaderMenuOpen(false)
                      if (window.confirm(`確定刪除「${plan.name}」？此操作無法復原。`)) {
                        onDelete()
                      }
                    }}
                  >
                    <span>
                      <strong>刪除計畫</strong>
                      <small>移除這個定期儲蓄</small>
                    </span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
        <h1>{plan.name}</h1>
        {plan.note?.trim() ? (
          <p className="entity-note">{plan.note}</p>
        ) : (
          <p className="subtitle">{periodicPlanSummary(plan)}</p>
        )}
      </header>

      {duePeriod ? (
        <div className="deposit-priority-bar">
          <div>
            <span className="deposit-priority-label">今天要存入</span>
            <strong>
              {formatPeriodicDate(duePeriod.date)} · {formatAmount(duePeriod.amount)}
            </strong>
          </div>
          <button
            type="button"
            className="button button-primary"
            onClick={() => requestDeposit(duePeriod.date, duePeriod.amount, '今日存入')}
          >
            標記已存入
          </button>
        </div>
      ) : showOverdueTop ? (
        <div className="deposit-priority-bar is-overdue">
          <div>
            <span className="deposit-priority-label">有逾期待補存</span>
            <strong>
              {formatPeriodicDate(missedPeriods[0].date)} ·{' '}
              {formatAmount(missedPeriods[0].amount)}
              {missedCount > 1 ? ` 等 ${missedCount} 期` : ''}
            </strong>
          </div>
          <div className="deposit-priority-actions">
            <button type="button" className="button button-secondary" onClick={dismissOverdueTop}>
              知道了
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                const period = missedPeriods[0]
                if (!period) return
                requestDeposit(period.date, period.amount, '補存入')
              }}
            >
              補存入
            </button>
          </div>
        </div>
      ) : null}

      <div className="panel-toolbar">
        <p className="field-hint">按住區塊左側 ⋮⋮ 可拖動排序</p>
        <div className="add-panel-wrap">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setHeaderMenuOpen(false)
              setAddMenuOpen((open) => !open)
            }}
          >
            ＋ 新增區塊
          </button>
          {addMenuOpen ? (
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
                        <strong>{PERIODIC_DETAIL_PANEL_META[panelId].title}</strong>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <PanelBoard
        layout={displayLayout}
        onReorder={(next) => {
          setPinCheckinTop(false)
          onUpdateDetailLayout(next)
        }}
        renderItem={(panelId, { dragging, onDragStart, onDragEnd }) => (
          <CollapsiblePanel
            key={panelId}
            title={PERIODIC_DETAIL_PANEL_META[panelId].title}
            defaultOpen={
              needsDepositNow
                ? panelId === 'checkin' || panelId === 'overview' || panelId === 'records'
                : panelId === 'overview' || panelId === 'checkin' || panelId === 'records'
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

      <RenameModal
        open={renameOpen}
        title="重新命名計畫"
        fieldLabel="計畫名稱"
        initialName={plan.name}
        onClose={() => setRenameOpen(false)}
        onSave={onUpdateName}
      />
      <NoteEditModal
        open={noteOpen}
        title="編輯備註"
        initialNote={plan.note ?? ''}
        onClose={() => setNoteOpen(false)}
        onSave={onUpdateNote}
      />

      {pending ? (
        <div className="modal-backdrop" onClick={closePending} role="presentation">
          <div
            className="modal random-plan-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <h2 id={confirmTitleId}>
                {pending.type === 'undo' ? '確認撤回' : `確認${pending.label}`}
              </h2>
              <button
                type="button"
                className="icon-button"
                onClick={closePending}
                aria-label="關閉"
              >
                ×
              </button>
            </header>
            <p className="random-plan-confirm-text">
              {pending.type === 'undo'
                ? `確定撤回 ${formatPeriodicDate(pending.date)} 的存入（${formatAmount(pending.amount)}）嗎？`
                : `確定${pending.label} ${formatPeriodicDate(pending.date)}（${formatAmount(pending.amount)}）嗎？`}
            </p>
            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={closePending}>
                取消
              </button>
              <button type="button" className="button button-primary" onClick={confirmPending}>
                {pending.type === 'undo' ? '確定撤回' : `確定${pending.label}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <MilestoneCelebration
        goal={celebrateGoal}
        isOpenEnded={isOpenEnded}
        onClose={() => setCelebrateGoal(null)}
      />
    </div>
  )
}
