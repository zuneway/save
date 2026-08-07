import { useMemo, useState } from 'react'
import type { PeriodicPeriod } from '../types/periodic'
import { formatAmount } from '../utils/money'
import { toDateKey } from '../utils/deadline'

interface PeriodicCalendarProps {
  periods: PeriodicPeriod[]
  onSelectPeriod: (period: PeriodicPeriod) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const

const STATUS_LABEL = {
  completed: '已存入',
  missed: '待補存',
  due: '今天',
  upcoming: '即將',
} as const

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1)
}

function shiftMonth(year: number, month: number, delta: number) {
  const next = new Date(year, month + delta, 1)
  return { year: next.getFullYear(), month: next.getMonth() }
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(year, month, 1))
}

function initialMonth(periods: PeriodicPeriod[]) {
  const focus =
    periods.find((period) => period.status === 'due' || period.status === 'missed') ??
    periods.find((period) => period.status === 'upcoming') ??
    periods[0]
  if (!focus) {
    const today = new Date()
    return { year: today.getFullYear(), month: today.getMonth() }
  }
  const [year, month] = focus.date.split('-').map(Number)
  return { year, month: month - 1 }
}

export function PeriodicCalendar({ periods, onSelectPeriod }: PeriodicCalendarProps) {
  const [{ year, month }, setCursor] = useState(() => initialMonth(periods))
  const todayKey = toDateKey(new Date())

  const periodByDate = useMemo(() => {
    const map = new Map<string, PeriodicPeriod>()
    for (const period of periods) map.set(period.date, period)
    return map
  }, [periods])

  const cells = useMemo(() => {
    const first = startOfMonth(year, month)
    const startWeekday = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const result: Array<{
      key: string
      day: number | null
      dateKey: string | null
      period: PeriodicPeriod | null
      isToday: boolean
    }> = []

    for (let index = 0; index < startWeekday; index += 1) {
      result.push({
        key: `pad-${index}`,
        day: null,
        dateKey: null,
        period: null,
        isToday: false,
      })
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = toDateKey(new Date(year, month, day))
      result.push({
        key: dateKey,
        day,
        dateKey,
        period: periodByDate.get(dateKey) ?? null,
        isToday: dateKey === todayKey,
      })
    }

    return result
  }, [year, month, periodByDate, todayKey])

  const monthCounts = useMemo(() => {
    let completed = 0
    let missed = 0
    let due = 0
    let upcoming = 0
    for (const cell of cells) {
      if (!cell.period) continue
      if (cell.period.status === 'completed') completed += 1
      else if (cell.period.status === 'missed') missed += 1
      else if (cell.period.status === 'due') due += 1
      else upcoming += 1
    }
    return { completed, missed, due, upcoming }
  }, [cells])

  return (
    <div className="periodic-calendar">
      <div className="periodic-calendar-toolbar">
        <button
          type="button"
          className="button button-secondary button-compact"
          onClick={() => setCursor((current) => shiftMonth(current.year, current.month, -1))}
          aria-label="上個月"
        >
          ‹
        </button>
        <strong className="periodic-calendar-title">{monthLabel(year, month)}</strong>
        <button
          type="button"
          className="button button-secondary button-compact"
          onClick={() => setCursor((current) => shiftMonth(current.year, current.month, 1))}
          aria-label="下個月"
        >
          ›
        </button>
      </div>

      <div className="chart-legend">
        <span className="legend-item is-completed">已存入 {monthCounts.completed}</span>
        <span className="legend-item is-missed">待補存 {monthCounts.missed}</span>
        <span className="legend-item is-due">今天 {monthCounts.due}</span>
        <span className="legend-item is-upcoming">即將 {monthCounts.upcoming}</span>
      </div>

      <div className="periodic-calendar-grid" role="grid" aria-label="期程月曆">
        {WEEKDAYS.map((label) => (
          <div key={label} className="periodic-calendar-weekday" role="columnheader">
            {label}
          </div>
        ))}

        {cells.map((cell) => {
          if (cell.day == null) {
            return <div key={cell.key} className="periodic-calendar-cell is-empty" aria-hidden="true" />
          }

          const period = cell.period
          const statusClass = period ? `is-${period.status}` : 'is-idle'
          const title = period
            ? `${cell.dateKey} · ${STATUS_LABEL[period.status]} · ${formatAmount(period.amount)}`
            : cell.dateKey ?? ''

          if (!period) {
            return (
              <div
                key={cell.key}
                className={`periodic-calendar-cell ${statusClass} ${cell.isToday ? 'is-today-marker' : ''}`}
                title={title}
                role="gridcell"
              >
                <span className="periodic-calendar-day">{cell.day}</span>
              </div>
            )
          }

          return (
            <button
              key={cell.key}
              type="button"
              className={`periodic-calendar-cell is-period ${statusClass} ${cell.isToday ? 'is-today-marker' : ''}`}
              title={title}
              role="gridcell"
              onClick={() => onSelectPeriod(period)}
            >
              <span className="periodic-calendar-day">{cell.day}</span>
              <span className="periodic-calendar-dot" aria-hidden="true" />
              <span className="periodic-calendar-amount">{formatAmount(period.amount)}</span>
            </button>
          )
        })}
      </div>

      <p className="field-hint">點選有顏色的日期可存入、補存、提早存入或撤回。</p>
    </div>
  )
}
