import type { SavingsProject } from '../types/savings'
import { getProjectDayStatuses } from '../utils/deadline'
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

const STATUS_LABEL = {
  completed: '已完成',
  missed: '未完成',
  today: '今天未完成',
  upcoming: '尚未開始',
} as const

export function DayStatusChart({ project }: DayStatusChartProps) {
  const days = getProjectDayStatuses(project)
  const plannedMap = new Map(
    (project.plannedDeposits ?? []).map((item) => [item.date, item.amount]),
  )
  const completedCount = days.filter((day) => day.status === 'completed').length
  const missedCount = days.filter((day) => day.status === 'missed').length
  const pendingCount = days.filter(
    (day) => day.status === 'today' || day.status === 'upcoming',
  ).length

  return (
    <div className="day-status-chart-wrap">
      <div className="chart-legend">
        <span className="legend-item is-completed">已完成 {completedCount}</span>
        <span className="legend-item is-missed">未完成 {missedCount}</span>
        <span className="legend-item is-upcoming">未到／今天 {pendingCount}</span>
      </div>

      <div className="day-status-chart" role="list" aria-label="每日完成狀態">
        {days.map((day) => {
          const planned = plannedMap.get(day.date)
          return (
            <div
              key={day.date}
              className={`day-status-cell is-${day.status}`}
              role="listitem"
              title={`${formatShortDate(day.date)} · ${STATUS_LABEL[day.status]}${planned ? ` · 計畫 ${planned}` : ''}`}
            >
              <span className="day-status-bar" aria-hidden="true" />
              <span className="day-status-date">{formatShortDate(day.date)}</span>
              <span className="day-status-label">{STATUS_LABEL[day.status]}</span>
              {project.randomDeposit?.enabled && planned != null && planned > 0 && (
                <span className="day-status-amount">{formatAmount(planned)}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
