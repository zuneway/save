import type {
  PeriodicEndRule,
  PeriodicFrequency,
  PeriodicIntervalUnit,
  PeriodicPeriod,
  PeriodicPeriodStatus,
  PeriodicPlan,
} from '../types/periodic'
import { getTodayDateInputValue, toDateKey } from './deadline'

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return startOfDay(new Date(year, month - 1, day))
}

/** Add N calendar months, clamping to the last day of the target month. */
function addMonthsClamped(date: Date, months: number, anchorDay: number) {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(anchorDay, lastDay))
  return startOfDay(next)
}

export function resolvePeriodicInterval(
  frequency: PeriodicFrequency,
  intervalCount?: number,
  intervalUnit?: PeriodicIntervalUnit,
): { intervalCount: number; intervalUnit: PeriodicIntervalUnit } {
  if (frequency === 'daily') return { intervalCount: 1, intervalUnit: 'days' }
  if (frequency === 'weekly') return { intervalCount: 1, intervalUnit: 'weeks' }
  if (frequency === 'monthly') return { intervalCount: 1, intervalUnit: 'months' }

  const count = Math.max(1, Math.floor(intervalCount ?? 3))
  const unit: PeriodicIntervalUnit =
    intervalUnit === 'weeks' || intervalUnit === 'months' || intervalUnit === 'days'
      ? intervalUnit
      : 'days'
  return { intervalCount: count, intervalUnit: unit }
}

export function frequencyLabel(
  frequency: PeriodicFrequency,
  intervalCount?: number,
  intervalUnit?: PeriodicIntervalUnit,
) {
  if (frequency === 'daily') return '每日'
  if (frequency === 'weekly') return '每周'
  if (frequency === 'monthly') return '每月'

  const resolved = resolvePeriodicInterval('custom', intervalCount, intervalUnit)
  if (resolved.intervalUnit === 'weeks') return `每隔 ${resolved.intervalCount} 周`
  if (resolved.intervalUnit === 'months') return `每隔 ${resolved.intervalCount} 月`
  return `每隔 ${resolved.intervalCount} 日`
}

export function defaultPeriodicPlanName(
  frequency: PeriodicFrequency,
  amount: number,
  intervalCount?: number,
  intervalUnit?: PeriodicIntervalUnit,
) {
  return `${frequencyLabel(frequency, intervalCount, intervalUnit)} NT$ ${amount.toLocaleString('zh-TW')}`
}

export function endRuleSummary(endRule: PeriodicEndRule) {
  if (endRule.type === 'open') return '持續進行'
  if (endRule.type === 'periods') return `共 ${endRule.periods} 期`
  if (endRule.type === 'target') return `目標 NT$ ${endRule.targetAmount.toLocaleString('zh-TW')}`
  return `至 ${endRule.date}`
}

/** Always-derived display title; not replaced by note or custom name. */
export function periodicPlanSummary(plan: PeriodicPlan) {
  return `${frequencyLabel(plan.frequency, plan.intervalCount, plan.intervalUnit)}存入 NT$ ${plan.amount.toLocaleString('zh-TW')} · ${endRuleSummary(plan.endRule)}`
}

function usesMonthStep(plan: PeriodicPlan) {
  return (
    plan.frequency === 'monthly' ||
    (plan.frequency === 'custom' && plan.intervalUnit === 'months')
  )
}

function dayStep(plan: PeriodicPlan) {
  if (plan.frequency === 'daily') return 1
  if (plan.frequency === 'weekly') return 7
  if (plan.intervalUnit === 'weeks') return Math.max(1, plan.intervalCount) * 7
  return Math.max(1, plan.intervalCount)
}

function monthStep(plan: PeriodicPlan) {
  if (plan.frequency === 'monthly') return 1
  return Math.max(1, plan.intervalCount)
}

function nextDueDate(plan: PeriodicPlan, startDate: Date, periodIndex: number) {
  if (usesMonthStep(plan)) {
    return addMonthsClamped(startDate, periodIndex * monthStep(plan), startDate.getDate())
  }

  const next = new Date(startDate)
  next.setDate(startDate.getDate() + periodIndex * dayStep(plan))
  return startOfDay(next)
}

function maxPeriodsForOpen(plan: PeriodicPlan) {
  if (plan.frequency === 'daily') return 90
  if (plan.frequency === 'weekly') return 52
  if (plan.frequency === 'monthly') return 24

  if (plan.intervalUnit === 'months') {
    return Math.min(120, Math.max(12, Math.ceil(24 / Math.max(1, plan.intervalCount)) * 2))
  }
  if (plan.intervalUnit === 'weeks') {
    return Math.min(260, Math.max(24, Math.ceil(52 / Math.max(1, plan.intervalCount)) * 2))
  }
  const step = Math.max(1, plan.intervalCount)
  return Math.min(500, Math.max(24, Math.ceil(365 / step)))
}

function resolvePeriodLimit(plan: PeriodicPlan) {
  const { endRule, amount } = plan
  if (endRule.type === 'periods') return Math.max(1, Math.floor(endRule.periods))
  if (endRule.type === 'target') {
    return Math.max(1, Math.ceil(endRule.targetAmount / Math.max(1, amount)))
  }
  if (endRule.type === 'date') return 500
  return maxPeriodsForOpen(plan)
}

function openHorizonDate(plan: PeriodicPlan, from: Date) {
  const horizon = startOfDay(from)
  if (plan.frequency === 'daily') {
    horizon.setDate(horizon.getDate() + 60)
  } else if (plan.frequency === 'weekly') {
    horizon.setDate(horizon.getDate() + 90)
  } else if (plan.frequency === 'monthly') {
    horizon.setMonth(horizon.getMonth() + 12)
  } else if (plan.intervalUnit === 'months') {
    horizon.setMonth(horizon.getMonth() + Math.min(36, Math.max(12, plan.intervalCount * 12)))
  } else if (plan.intervalUnit === 'weeks') {
    horizon.setDate(horizon.getDate() + Math.min(365, Math.max(90, plan.intervalCount * 7 * 12)))
  } else {
    const step = Math.max(1, plan.intervalCount)
    horizon.setDate(horizon.getDate() + Math.min(365, step * 24))
  }
  return horizon
}

export function listPeriodicDueDates(plan: PeriodicPlan, horizonDate = new Date()): string[] {
  const start = parseDateKey(plan.startDate)
  if (Number.isNaN(start.getTime())) return []

  const limit = resolvePeriodLimit(plan)
  const endCap = plan.endRule.type === 'date' ? parseDateKey(plan.endRule.date) : null
  const openHorizon = plan.endRule.type === 'open' ? openHorizonDate(plan, horizonDate) : null

  const dates: string[] = []
  for (let index = 0; index < limit; index += 1) {
    const due = nextDueDate(plan, start, index)
    if (endCap && due > endCap) break
    if (openHorizon && due > openHorizon && due > startOfDay(horizonDate)) break
    dates.push(toDateKey(due))
  }
  return dates
}

function periodStatus(date: string, completed: Set<string>, today: string): PeriodicPeriodStatus {
  if (completed.has(date)) return 'completed'
  if (date === today) return 'due'
  if (date < today) return 'missed'
  return 'upcoming'
}

export function listPeriodicPeriods(plan: PeriodicPlan, from = new Date()): PeriodicPeriod[] {
  const today = toDateKey(startOfDay(from))
  const completed = new Set(plan.completedDates)
  return listPeriodicDueDates(plan, from).map((date, index) => ({
    date,
    amount: plan.amount,
    status: periodStatus(date, completed, today),
    index: index + 1,
  }))
}

export function getPeriodicSavedAmount(plan: PeriodicPlan) {
  return plan.completedDates.length * plan.amount
}

export function getPeriodicTargetAmount(plan: PeriodicPlan): number | null {
  if (plan.endRule.type === 'target') return plan.endRule.targetAmount
  if (plan.endRule.type === 'periods') return plan.endRule.periods * plan.amount
  if (plan.endRule.type === 'date') {
    return listPeriodicDueDates(plan).length * plan.amount
  }
  return null
}

export function getNextPeriodicPeriod(plan: PeriodicPlan, from = new Date()): PeriodicPeriod | null {
  const periods = listPeriodicPeriods(plan, from)
  return (
    periods.find(
      (period) =>
        period.status === 'due' || period.status === 'missed' || period.status === 'upcoming',
    ) ?? null
  )
}

export function getPeriodicProgressPercent(plan: PeriodicPlan) {
  const target = getPeriodicTargetAmount(plan)
  if (target == null || target <= 0) return null
  return Math.min(100, Math.round((getPeriodicSavedAmount(plan) / target) * 100))
}

/** Open-ended milestones: 10萬 → 100萬 → 1000萬 … */
export function getOpenEndedMilestoneGoal(savedAmount: number) {
  let goal = 100_000
  while (savedAmount >= goal && goal <= Number.MAX_SAFE_INTEGER / 10) {
    goal *= 10
  }
  return goal
}

export function getPeriodicProgressBar(plan: PeriodicPlan): {
  saved: number
  goal: number
  percent: number
  isOpenEnded: boolean
} {
  const saved = getPeriodicSavedAmount(plan)
  if (plan.endRule.type === 'open') {
    const goal = getOpenEndedMilestoneGoal(saved)
    return {
      saved,
      goal,
      percent: Math.min(100, Math.round((saved / goal) * 100)),
      isOpenEnded: true,
    }
  }

  const goal = getPeriodicTargetAmount(plan) ?? Math.max(saved, 1)
  return {
    saved,
    goal,
    percent: Math.min(100, Math.round((saved / Math.max(1, goal)) * 100)),
    isOpenEnded: false,
  }
}

/** Goals crossed when saved moves from `prevSaved` to `nextSaved`. */
export function getReachedMilestoneGoals(
  plan: PeriodicPlan,
  prevSaved: number,
  nextSaved: number,
): number[] {
  if (nextSaved <= prevSaved) return []

  if (plan.endRule.type === 'open') {
    const reached: number[] = []
    let milestone = 100_000
    while (milestone <= nextSaved && milestone <= Number.MAX_SAFE_INTEGER / 10) {
      if (prevSaved < milestone && nextSaved >= milestone) reached.push(milestone)
      milestone *= 10
    }
    return reached
  }

  const target = getPeriodicTargetAmount(plan)
  if (target != null && target > 0 && prevSaved < target && nextSaved >= target) {
    return [target]
  }
  return []
}

export function formatPeriodicDate(dateKey: string) {
  const date = parseDateKey(dateKey)
  if (Number.isNaN(date.getTime())) return dateKey
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  })
}

export function isValidPeriodicStartDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = parseDateKey(value)
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value
}

export function defaultPeriodicStartDate() {
  return getTodayDateInputValue()
}

export function intervalUnitLabel(unit: PeriodicIntervalUnit) {
  if (unit === 'weeks') return '周'
  if (unit === 'months') return '月'
  return '日'
}
