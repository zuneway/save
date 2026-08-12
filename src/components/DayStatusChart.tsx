import type { SavingsProject } from '../types/savings'
import {
  getProjectPeriodStatuses,
  isRandomDepositActive,
} from '../utils/deadline'
import { formatAmount } from '../utils/money'

interface DayStatusChartProps {
  project: SavingsProject
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function formatRange(start: string, end: string) {
  if (start === end) return formatShortDate(start)
  return `${formatShortDate(start)}–${formatShortDate(end)}`
}

const STATUS_LABEL = {
  completed: '已完成',
  missed: '未完成',
  today: '進行中',
  upcoming: '尚未開始',
} as const

export function DayStatusChart({ project }: DayStatusChartProps) {
  const rows = getProjectPeriodStatuses(project)
  const isDaily = project.savingsMode === 'daily'
  const completedCount = rows.filter((row) => row.status === 'completed').length
  const missedCount = rows.filter((row) => row.status === 'missed').length
  const pendingCount = rows.filter(
    (row) => row.status === 'today' || row.status === 'upcoming',
  ).length

  const chartLabel = isDaily
    ? '每日完成狀態'
    : project.savingsMode === 'weekly'
      ? '每周完成狀態'
      : project.savingsMode === 'monthly'
        ? '每月完成狀態'
        : '每期完成狀態'

  return (
    <div className="day-status-chart-wrap">
      <div className="chart-legend">
        <span className="legend-item is-completed">已完成 {completedCount}</span>
        <span className="legend-item is-missed">未完成 {missedCount}</span>
        <span className="legend-item is-upcoming">
          {isDaily ? '未到／今天' : '未到／進行中'} {pendingCount}
        </span>
      </div>

      <div className="day-status-chart" role="list" aria-label={chartLabel}>
        {rows.map((row) => {
          const planned = row.plannedAmount
          const range = formatRange(row.period.start, row.period.end)
          return (
            <div
              key={row.period.anchor}
              className={`day-status-cell is-${row.status}`}
              role="listitem"
              title={`${row.label} · ${range} · ${STATUS_LABEL[row.status]}${
                planned > 0 ? ` · 計畫 ${planned}` : ''
              }`}
            >
              <span className="day-status-bar" aria-hidden="true" />
              <span className="day-status-date">{isDaily ? formatShortDate(row.period.anchor) : row.label}</span>
              <span className="day-status-label">
                {isDaily ? STATUS_LABEL[row.status] : range}
              </span>
              {isRandomDepositActive(project) && planned > 0 && (
                <span className="day-status-amount">{formatAmount(planned)}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
