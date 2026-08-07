import { useMemo } from 'react'
import type { PeriodicPeriod } from '../types/periodic'
import { formatAmount } from '../utils/money'
import { formatPeriodicDate } from '../utils/periodic'

interface PeriodicRecordsProps {
  periods: PeriodicPeriod[]
  onSelectPeriod: (period: PeriodicPeriod) => void
}

const STATUS_LABEL = {
  completed: '已存入',
  missed: '待補存',
  due: '今天',
  upcoming: '即將',
} as const

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${date}T00:00:00`))
}

export function PeriodicRecords({ periods, onSelectPeriod }: PeriodicRecordsProps) {
  const records = useMemo(() => {
    const completed = periods.filter((period) => period.status === 'completed')
    const missed = periods.filter((period) => period.status === 'missed')
    const due = periods.find((period) => period.status === 'due')
    const nextUpcoming = periods.find((period) => period.status === 'upcoming')

    const extras: PeriodicPeriod[] = []
    for (const period of missed) extras.push(period)
    if (due) extras.push(due)
    else if (nextUpcoming) extras.push(nextUpcoming)

    // Completed first (newest last / chronological by date), then actionable items.
    return [...completed, ...extras].sort((left, right) =>
      left.date < right.date ? -1 : left.date > right.date ? 1 : 0,
    )
  }, [periods])

  const completedCount = records.filter((period) => period.status === 'completed').length
  const missedCount = records.filter((period) => period.status === 'missed').length
  const dueCount = records.filter((period) => period.status === 'due').length
  const upcomingCount = records.filter((period) => period.status === 'upcoming').length

  if (records.length === 0) {
    return <p className="empty-inline">尚無相關紀錄。</p>
  }

  return (
    <div className="periodic-records">
      <div className="chart-legend">
        {completedCount > 0 ? (
          <span className="legend-item is-completed">已存入 {completedCount}</span>
        ) : null}
        {missedCount > 0 ? (
          <span className="legend-item is-missed">待補存 {missedCount}</span>
        ) : null}
        {dueCount > 0 ? <span className="legend-item is-due">今天 {dueCount}</span> : null}
        {upcomingCount > 0 ? (
          <span className="legend-item is-upcoming">即將 {upcomingCount}</span>
        ) : null}
      </div>

      <div className="periodic-records-grid" role="list" aria-label="存入紀錄">
        {records.map((period) => (
          <button
            key={period.date}
            type="button"
            className={`periodic-record-cell is-${period.status}`}
            role="listitem"
            title={`${formatPeriodicDate(period.date)} · ${STATUS_LABEL[period.status]} · ${formatAmount(period.amount)}`}
            onClick={() => onSelectPeriod(period)}
          >
            <span className="periodic-record-bar" aria-hidden="true" />
            <span className="periodic-record-index">#{period.index}</span>
            <span className="periodic-record-date">{formatShortDate(period.date)}</span>
            <span className="periodic-record-status">{STATUS_LABEL[period.status]}</span>
            <span className="periodic-record-amount">{formatAmount(period.amount)}</span>
          </button>
        ))}
      </div>

      <p className="field-hint">點選格子可存入、補存、提早存入或撤回。</p>
    </div>
  )
}
