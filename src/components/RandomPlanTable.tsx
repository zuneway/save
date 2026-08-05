import { useMemo } from 'react'
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

export function RandomPlanTable({
  project,
  onCompletePlannedDay,
  onUndoEarlyDeposit,
}: RandomPlanTableProps) {
  const today = getTodayDateInputValue()
  const remainingAmount = getRemainingAmount(project)
  const totalDays = getTotalDays(project)

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
      return {
        index: index + 1,
        date,
        amount: amountMap.get(date) ?? 0,
        status,
        isToday: date === today,
        canUndoEarly,
      }
    })
  }, [project, today])

  const openPlanTotal = getOpenPlanTotal(project)

  if (rows.length === 0) {
    return <p className="folder-empty">目前沒有可分配的天數。</p>
  }

  const handleAction = (date: string, kind: PlannedDayDepositKind, amount: number) => {
    const label = kind === 'early' ? '提早存入' : '補存入'
    const depositAmount = Math.min(Math.max(0, amount), remainingAmount)
    const amountText = depositAmount > 0 ? formatAmount(depositAmount) : 'NT$0'
    if (!window.confirm(`確定${label} ${formatDate(date)}（${amountText}）嗎？`)) return
    onCompletePlannedDay(date, kind)
  }

  const handleUndoEarly = (date: string) => {
    if (!window.confirm(`確定撤回 ${formatDate(date)} 的提早存入嗎？`)) return
    onUndoEarlyDeposit(date)
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
                    {canMakeup ? (
                      <button
                        type="button"
                        className="button button-secondary button-compact"
                        onClick={() => handleAction(row.date, 'makeup', row.amount)}
                      >
                        補存入
                      </button>
                    ) : canEarly ? (
                      <button
                        type="button"
                        className="button button-secondary button-compact"
                        onClick={() => handleAction(row.date, 'early', row.amount)}
                      >
                        提早存入
                      </button>
                    ) : row.canUndoEarly ? (
                      <button
                        type="button"
                        className="button button-secondary button-compact"
                        onClick={() => handleUndoEarly(row.date)}
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
    </div>
  )
}
