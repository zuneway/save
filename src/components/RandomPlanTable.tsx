import { useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PlannedDayDepositKind, SavingsProject } from '../types/savings'
import {
  getOpenPlanTotal,
  getPeriodLabel,
  getPlannedAmount,
  getProjectDateKeys,
  getRemainingAmount,
  getTodayDateInputValue,
  isPeriodCompleted,
  listSavingsPeriods,
} from '../utils/deadline'
import { formatAmount } from '../utils/money'

interface RandomPlanTableProps {
  project: SavingsProject
  onCompletePlannedDay: (date: string, kind: PlannedDayDepositKind, amount?: number) => void
  onUndoEarlyDeposit: (date: string) => void
}

type PendingAction =
  | { type: 'deposit'; date: string; kind: PlannedDayDepositKind; amount: number }
  | { type: 'undo'; date: string; target: 'early' | 'today' }

function formatDate(date: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${date}T00:00:00`))
}

function formatDateRange(start: string, end: string) {
  if (start === end) return formatDate(start)
  return `${formatDate(start)} ~ ${formatDate(end)}`
}

const STATUS_LABEL = {
  completed: '已完成',
  missed: '未完成',
  today: '進行中',
  upcoming: '尚未到',
} as const

const EARLY_DEPOSIT_NOTE = '提早存入'

function depositLabel(kind: PlannedDayDepositKind, isDaily: boolean) {
  if (kind === 'early') return '提早存入'
  if (kind === 'makeup') return '補存入'
  return isDaily ? '今日存入' : '本期存入'
}

function pendingTitle(pending: PendingAction, isDaily: boolean) {
  if (pending.type === 'undo') return '確認撤回'
  return `確認${depositLabel(pending.kind, isDaily)}`
}

function pendingMessage(pending: PendingAction, isDaily: boolean) {
  if (pending.type === 'undo') {
    const label = pending.target === 'today' ? (isDaily ? '今日存入' : '本期存入') : '提早存入'
    return `確定撤回 ${formatDate(pending.date)} 的${label}嗎？`
  }
  const amountText = pending.amount > 0 ? formatAmount(pending.amount) : 'NT$0'
  return `確定${depositLabel(pending.kind, isDaily)} ${formatDate(pending.date)}（${amountText}）嗎？`
}

function pendingConfirmLabel(pending: PendingAction, isDaily: boolean) {
  if (pending.type === 'undo') return '確定撤回'
  return `確定${depositLabel(pending.kind, isDaily)}`
}

export function RandomPlanTable({
  project,
  onCompletePlannedDay,
  onUndoEarlyDeposit,
}: RandomPlanTableProps) {
  const today = getTodayDateInputValue()
  const remainingAmount = getRemainingAmount(project)
  const isDaily = project.savingsMode === 'daily'
  const [pending, setPending] = useState<PendingAction | null>(null)
  const confirmTitleId = useId()

  const rows = useMemo(() => {
    const completed = new Set(project.completedDates ?? [])
    return listSavingsPeriods(project).map((period) => {
      const status = isPeriodCompleted(project, period)
        ? 'completed'
        : today > period.end
          ? 'missed'
          : today >= period.start && today <= period.end
            ? 'today'
            : 'upcoming'
      const amount = getPlannedAmount(project, period.anchor) ?? 0
      const periodDays = getProjectDateKeys(project).filter(
        (date) => date >= period.start && date <= period.end,
      )
      const completedInPeriod = periodDays.filter((date) => completed.has(date))
      const undoDate =
        completedInPeriod.find((date) => date === today) ??
        completedInPeriod[completedInPeriod.length - 1] ??
        period.anchor
      const canUndoEarly =
        status === 'completed' &&
        period.start > today &&
        project.entries.some(
          (entry) => entry.date === period.anchor && entry.note === EARLY_DEPOSIT_NOTE,
        )
      const canUndoToday = status === 'completed' && period.start <= today && period.end >= today
      return {
        index: period.index,
        label: getPeriodLabel(project, period),
        date: period.anchor,
        undoDate,
        rangeLabel: formatDateRange(period.start, period.end),
        amount,
        status,
        isCurrent: period.start <= today && today <= period.end,
        canUndoEarly,
        canUndoToday,
      } as const
    })
  }, [project, today])

  const openPlanTotal = getOpenPlanTotal(project)

  if (rows.length === 0) {
    return <p className="folder-empty">目前沒有可分配的期數。</p>
  }

  const requestDeposit = (date: string, kind: PlannedDayDepositKind, amount: number) => {
    const depositAmount = Math.min(Math.max(0, amount), remainingAmount)
    if (depositAmount <= 0) return

    // Current period: deposit immediately (same as header quick deposit).
    if (kind === 'today') {
      onCompletePlannedDay(date, kind, depositAmount)
      return
    }

    setPending({ type: 'deposit', date, kind, amount: depositAmount })
  }

  const requestUndo = (date: string, target: 'early' | 'today') => {
    setPending({ type: 'undo', date, target })
  }

  const closePending = () => setPending(null)

  const confirmPending = () => {
    if (!pending) return
    if (pending.type === 'undo') {
      onUndoEarlyDeposit(pending.date)
    } else {
      onCompletePlannedDay(pending.date, pending.kind, pending.amount)
    }
    setPending(null)
  }

  return (
    <>
      <div className="random-plan-summary">
        <p>
          開放計畫合計 {formatAmount(openPlanTotal)} · 剩餘目標 {formatAmount(remainingAmount)}
        </p>
      </div>
      <div className="table-scroll">
        <table className="random-plan-table">
          <thead>
            <tr>
              <th scope="col">期次</th>
              <th scope="col">期間</th>
              <th scope="col">金額</th>
              <th scope="col">狀態</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const canDepositNow =
                row.status === 'today' && row.amount > 0 && remainingAmount > 0
              return (
                <tr key={row.date} className={row.isCurrent ? 'is-today' : undefined}>
                  <td>{row.label}</td>
                  <td>{row.rangeLabel}</td>
                  <td className="amount-cell">
                    {row.amount > 0 ? formatAmount(row.amount) : '—'}
                  </td>
                  <td>
                    <span className={`plan-status is-${row.status}`}>
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="action-cell">
                    {row.status === 'missed' && row.amount > 0 && remainingAmount > 0 ? (
                      <button
                        type="button"
                        className="button button-secondary button-compact"
                        onClick={() => requestDeposit(row.date, 'makeup', row.amount)}
                      >
                        補存入
                      </button>
                    ) : null}
                    {canDepositNow ? (
                      <button
                        type="button"
                        className="button button-primary button-compact"
                        onClick={() => requestDeposit(row.date, 'today', row.amount)}
                      >
                        {isDaily ? '今日存入' : '本期存入'}
                      </button>
                    ) : null}
                    {row.status === 'upcoming' && row.amount > 0 && remainingAmount > 0 ? (
                      <button
                        type="button"
                        className="button button-secondary button-compact"
                        onClick={() => requestDeposit(row.date, 'early', row.amount)}
                      >
                        提早存入
                      </button>
                    ) : null}
                    {row.canUndoEarly || row.canUndoToday ? (
                      <button
                        type="button"
                        className="button button-secondary button-compact"
                        onClick={() =>
                          requestUndo(row.undoDate, row.canUndoToday ? 'today' : 'early')
                        }
                      >
                        撤回
                      </button>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pending
        ? createPortal(
            <div className="modal-backdrop" onClick={closePending} role="presentation">
              <div
                className="modal random-plan-confirm-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={confirmTitleId}
                onClick={(event) => event.stopPropagation()}
              >
                <header className="modal-header">
                  <h2 id={confirmTitleId}>{pendingTitle(pending, isDaily)}</h2>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={closePending}
                    aria-label="關閉"
                  >
                    ×
                  </button>
                </header>
                <p className="random-plan-confirm-text">{pendingMessage(pending, isDaily)}</p>
                <div className="modal-actions">
                  <button type="button" className="button button-secondary" onClick={closePending}>
                    取消
                  </button>
                  <button type="button" className="button button-primary" onClick={confirmPending}>
                    {pendingConfirmLabel(pending, isDaily)}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
