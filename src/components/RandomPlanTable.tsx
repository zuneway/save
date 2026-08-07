import { useId, useMemo, useState } from 'react'
import type { PlannedDayDepositKind, SavingsProject } from '../types/savings'
import {
  getDayStatus,
  getOpenPlanTotal,
  getProjectDateKeys,
  getRemainingAmount,
  getTodayDateInputValue,
  getTotalDays,
} from '../utils/deadline'
import { formatAmount } from '../utils/money'

interface RandomPlanTableProps {
  project: SavingsProject
  onCompletePlannedDay: (date: string, kind: PlannedDayDepositKind) => void
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

const STATUS_LABEL = {
  completed: '已完成',
  missed: '未完成',
  today: '今天',
  upcoming: '尚未到',
} as const

const EARLY_DEPOSIT_NOTE = '提早存入'

function depositLabel(kind: PlannedDayDepositKind) {
  if (kind === 'early') return '提早存入'
  if (kind === 'makeup') return '補存入'
  return '今日存入'
}

function pendingTitle(pending: PendingAction) {
  if (pending.type === 'undo') return '確認撤回'
  return `確認${depositLabel(pending.kind)}`
}

function pendingMessage(pending: PendingAction) {
  if (pending.type === 'undo') {
    const label = pending.target === 'today' ? '今日存入' : '提早存入'
    return `確定撤回 ${formatDate(pending.date)} 的${label}嗎？`
  }
  const amountText = pending.amount > 0 ? formatAmount(pending.amount) : 'NT$0'
  return `確定${depositLabel(pending.kind)} ${formatDate(pending.date)}（${amountText}）嗎？`
}

function pendingConfirmLabel(pending: PendingAction) {
  if (pending.type === 'undo') return '確定撤回'
  return `確定${depositLabel(pending.kind)}`
}

export function RandomPlanTable({
  project,
  onCompletePlannedDay,
  onUndoEarlyDeposit,
}: RandomPlanTableProps) {
  const today = getTodayDateInputValue()
  const remainingAmount = getRemainingAmount(project)
  const totalDays = getTotalDays(project)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const confirmTitleId = useId()

  const rows = useMemo(() => {
    const amountMap = new Map(
      (project.plannedDeposits ?? []).map((item) => [item.date, item.amount]),
    )
    return getProjectDateKeys(project).map((date, index) => {
      const status = getDayStatus(date, project)
      const canUndoEarly =
        status === 'completed' &&
        date > today &&
        project.entries.some(
          (entry) => entry.date === date && entry.note === EARLY_DEPOSIT_NOTE,
        )
      // Today completed → allow撤回 (same idea as early-deposit undo).
      const canUndoToday = status === 'completed' && date === today
      return {
        index: index + 1,
        date,
        amount: amountMap.get(date) ?? 0,
        status,
        isToday: date === today,
        canUndoEarly,
        canUndoToday,
      }
    })
  }, [project, today])

  const openPlanTotal = getOpenPlanTotal(project)

  if (rows.length === 0) {
    return <p className="folder-empty">目前沒有可分配的天數。</p>
  }

  const requestDeposit = (date: string, kind: PlannedDayDepositKind, amount: number) => {
    const depositAmount = Math.min(Math.max(0, amount), remainingAmount)
    setPending({ type: 'deposit', date, kind, amount: depositAmount })
  }

  const requestUndo = (date: string, target: 'early' | 'today') => {
    setPending({ type: 'undo', date, target })
  }

  const closePending = () => setPending(null)

  const confirmPending = () => {
    if (!pending) return
    if (pending.type === 'deposit') {
      onCompletePlannedDay(pending.date, pending.kind)
    } else {
      onUndoEarlyDeposit(pending.date)
    }
    setPending(null)
  }

  return (
    <div className="random-plan-table-wrap">
      <div className="random-plan-table-meta">
        <span>目標天數：{totalDays} 天</span>
        <span>
          已存金額／剩餘金額合計：{formatAmount(project.currentAmount)}／
          {formatAmount(remainingAmount)}
        </span>
      </div>

      <div className="table-scroll">
        <table className="random-plan-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">日期</th>
              <th scope="col">狀態</th>
              <th scope="col">當天應存金額</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const canToday = row.status === 'today'
              const canMakeup = row.status === 'missed'
              const canEarly = row.status === 'upcoming'

              return (
                <tr key={row.date} className={row.isToday ? 'is-today' : undefined}>
                  <td>{row.index}</td>
                  <td>{formatDate(row.date)}</td>
                  <td>{STATUS_LABEL[row.status]}</td>
                  <td className="amount-cell">
                    {row.amount > 0 ? formatAmount(row.amount) : '—'}
                  </td>
                  <td className="action-cell">
                    {canToday ? (
                      <button
                        type="button"
                        className="button button-primary button-compact"
                        onClick={() => requestDeposit(row.date, 'today', row.amount)}
                      >
                        今日存入
                      </button>
                    ) : row.canUndoToday ? (
                      <button
                        type="button"
                        className="button button-secondary button-compact"
                        onClick={() => requestUndo(row.date, 'today')}
                      >
                        撤回
                      </button>
                    ) : canMakeup ? (
                      <button
                        type="button"
                        className="button button-secondary button-compact"
                        onClick={() => requestDeposit(row.date, 'makeup', row.amount)}
                      >
                        補存入
                      </button>
                    ) : canEarly ? (
                      <button
                        type="button"
                        className="button button-secondary button-compact"
                        onClick={() => requestDeposit(row.date, 'early', row.amount)}
                      >
                        提早存入
                      </button>
                    ) : row.canUndoEarly ? (
                      <button
                        type="button"
                        className="button button-secondary button-compact"
                        onClick={() => requestUndo(row.date, 'early')}
                      >
                        撤回
                      </button>
                    ) : (
                      <span className="action-placeholder">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>未完成天數合計（= 剩餘金額）</td>
              <td className="amount-cell">{formatAmount(openPlanTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

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
              <h2 id={confirmTitleId}>{pendingTitle(pending)}</h2>
              <button
                type="button"
                className="icon-button"
                onClick={closePending}
                aria-label="關閉"
              >
                ×
              </button>
            </header>
            <p className="random-plan-confirm-text">{pendingMessage(pending)}</p>
            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={closePending}>
                取消
              </button>
              <button type="button" className="button button-primary" onClick={confirmPending}>
                {pendingConfirmLabel(pending)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
