import type { DayStatus, PlannedDeposit, ProjectDeadline, RandomDepositSettings, SavingsProject } from '../types/savings'

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayDateInputValue() {
  return toDateKey(new Date())
}

export function getTargetDate(project: SavingsProject): Date {
  const createdAt = startOfDay(new Date(project.createdAt))

  if (project.deadline.type === 'days') {
    // Inclusive range: start day + (N - 1) => exactly N calendar days.
    const target = new Date(createdAt)
    target.setDate(target.getDate() + Math.max(1, project.deadline.days) - 1)
    return target
  }

  return startOfDay(new Date(project.deadline.date))
}

export function listDateKeys(start: Date, end: Date) {
  const keys: string[] = []
  const cursor = startOfDay(start)
  const last = startOfDay(end)

  if (cursor > last) return keys

  while (cursor <= last) {
    keys.push(toDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return keys
}

export function getProjectDateKeys(project: SavingsProject) {
  const start = startOfDay(new Date(project.createdAt))
  const end = getTargetDate(project)
  return listDateKeys(start, end)
}

export function getRemainingDays(project: SavingsProject, from = new Date()) {
  const today = startOfDay(from)
  const target = getTargetDate(project)
  const diffMs = target.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function getTotalDays(project: SavingsProject) {
  // Always match the actual calendar days used by charts / random plan table.
  return Math.max(1, getProjectDateKeys(project).length)
}

/** Inclusive count of days from today through target date. */
export function getRemainingDayCount(project: SavingsProject, from = new Date()) {
  const today = startOfDay(from)
  const target = getTargetDate(project)
  if (today > target) return 0
  return listDateKeys(today, target).length
}

export function getElapsedDays(project: SavingsProject, from = new Date()) {
  const createdAt = startOfDay(new Date(project.createdAt))
  const today = startOfDay(from)
  const diffMs = today.getTime() - createdAt.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
}

export function isTodayCompleted(project: SavingsProject, today = getTodayDateInputValue()) {
  return (project.completedDates ?? []).includes(today)
}

export function getCompletedDaysCount(project: SavingsProject) {
  return (project.completedDates ?? []).length
}

export function formatTargetDate(date: Date) {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatDeadlineSummary(project: SavingsProject) {
  const targetDate = getTargetDate(project)
  const remainingDays = getRemainingDays(project)
  const interval = getSavingsIntervalDays(project)
  const modePrefix =
    project.savingsMode === 'daily'
      ? '日存 · '
      : project.savingsMode === 'weekly'
        ? '周存 · '
        : project.savingsMode === 'monthly'
          ? '月存 · '
          : interval > 1
            ? `每 ${interval} 天 · `
            : ''

  if (project.deadline.type === 'days') {
    if (remainingDays > 0) {
      return `${modePrefix}目標 ${project.deadline.days} 天 · 還剩 ${remainingDays} 天（${formatTargetDate(targetDate)}）`
    }
    if (remainingDays === 0) {
      return `${modePrefix}目標 ${project.deadline.days} 天 · 今日到期（${formatTargetDate(targetDate)}）`
    }
    return `${modePrefix}目標 ${project.deadline.days} 天 · 已逾期 ${Math.abs(remainingDays)} 天（${formatTargetDate(targetDate)}）`
  }

  if (remainingDays > 0) {
    return `${modePrefix}目標日期 ${formatTargetDate(targetDate)} · 還剩 ${remainingDays} 天`
  }
  if (remainingDays === 0) {
    return `${modePrefix}目標日期 ${formatTargetDate(targetDate)} · 今日到期`
  }
  return `${modePrefix}目標日期 ${formatTargetDate(targetDate)} · 已逾期 ${Math.abs(remainingDays)} 天`
}

export function getSavingsIntervalDays(project: SavingsProject) {
  if (typeof project.intervalDays === 'number' && project.intervalDays >= 1) {
    return Math.floor(project.intervalDays)
  }
  if (project.savingsMode === 'daily') return 1
  if (project.savingsMode === 'weekly') return 7
  if (project.savingsMode === 'monthly') return 30
  return 1
}

export function getSavingsModeLabel(project: SavingsProject) {
  if (project.savingsMode === 'daily') return '日存'
  if (project.savingsMode === 'weekly') return '周存'
  if (project.savingsMode === 'monthly') return '月存'
  const interval = getSavingsIntervalDays(project)
  return interval > 1 ? `每${interval}天` : '自訂'
}

/** Suggested remaining period deposit for paced plans. */
export function getSuggestedPeriodAmount(project: SavingsProject) {
  if (project.periodAmount && project.periodAmount > 0) return project.periodAmount

  const remaining = Math.max(0, project.targetAmount - project.currentAmount)
  if (remaining <= 0) return 0

  const interval = getSavingsIntervalDays(project)
  const periods = Math.max(1, Math.ceil(getRemainingDayCount(project) / interval))
  return Math.ceil(remaining / periods)
}

export function isValidDeadline(deadline: ProjectDeadline) {
  if (deadline.type === 'days') {
    return Number.isInteger(deadline.days) && deadline.days >= 1
  }

  const target = startOfDay(new Date(deadline.date))
  const today = startOfDay(new Date())
  return !Number.isNaN(target.getTime()) && target >= today
}

export function getDayStatus(date: string, project: SavingsProject): DayStatus {
  const today = getTodayDateInputValue()
  if ((project.completedDates ?? []).includes(date)) return 'completed'
  if (date > today) return 'upcoming'
  if (date === today) return 'today'
  return 'missed'
}

export function getProjectDayStatuses(project: SavingsProject) {
  return getProjectDateKeys(project).map((date) => ({
    date,
    status: getDayStatus(date, project),
  }))
}

export function randomAmountInRange(minAmount: number, maxAmount: number) {
  const min = Math.min(minAmount, maxAmount)
  const max = Math.max(minAmount, maxAmount)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffleInPlace<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[items[index], items[swapIndex]] = [items[swapIndex], items[index]]
  }
  return items
}

/** Split an exact total across days (sum is always exactly `total`). */
function splitExactTotal(total: number, count: number) {
  if (count <= 0) return [] as number[]
  const budget = Math.max(0, Math.floor(total))
  const base = Math.floor(budget / count)
  let remainder = budget % count
  const amounts = Array.from({ length: count }, () => {
    const extra = remainder > 0 ? 1 : 0
    remainder -= extra
    return base + extra
  })
  return shuffleInPlace(amounts)
}

/**
 * Distribute remaining amount across all open days.
 * Hard rule: sum of all days === remaining amount (exact).
 * Soft rule: prefer each day within [min, max] when mathematically possible.
 */
export function distributeRemainingAmount(
  total: number,
  count: number,
  minAmount: number,
  maxAmount: number,
) {
  if (count <= 0) return [] as number[]

  const min = Math.max(0, Math.min(Math.floor(minAmount), Math.floor(maxAmount)))
  const max = Math.max(Math.floor(minAmount), Math.floor(maxAmount), min)
  const budget = Math.max(0, Math.floor(total))

  if (budget === 0) return Array.from({ length: count }, () => 0)

  // If remaining cannot fit into [min, max] for every day, still split exactly.
  if (budget < min * count || budget > max * count) {
    return splitExactTotal(budget, count)
  }

  // Within range: start at min, randomly add leftover until sum === budget.
  const amounts = Array.from({ length: count }, () => min)
  let leftover = budget - min * count
  const room = Array.from({ length: count }, () => max - min)

  while (leftover > 0) {
    const candidates = room
      .map((value, index) => (value > 0 ? index : -1))
      .filter((index) => index >= 0)
    if (candidates.length === 0) break

    const index = candidates[Math.floor(Math.random() * candidates.length)]
    amounts[index] += 1
    room[index] -= 1
    leftover -= 1
  }

  // Guarantee exact sum even if looping stopped early.
  const currentSum = amounts.reduce((sum, value) => sum + value, 0)
  if (currentSum !== budget) {
    return splitExactTotal(budget, count)
  }

  return shuffleInPlace(amounts)
}

export function getRemainingAmount(project: SavingsProject) {
  return Math.max(0, project.targetAmount - project.currentAmount)
}

export function getOpenPlanDates(project: SavingsProject) {
  const today = getTodayDateInputValue()
  return getProjectDateKeys(project).filter(
    (date) => date >= today && !(project.completedDates ?? []).includes(date),
  )
}

/** Past days not yet completed — for 補存入. */
export function getMissedDates(project: SavingsProject) {
  const today = getTodayDateInputValue()
  return getProjectDateKeys(project).filter(
    (date) => date < today && !(project.completedDates ?? []).includes(date),
  )
}

/** Future days not yet completed — for 提早存入. */
export function getUpcomingIncompleteDates(project: SavingsProject) {
  const today = getTodayDateInputValue()
  return getProjectDateKeys(project).filter(
    (date) => date > today && !(project.completedDates ?? []).includes(date),
  )
}

/**
 * Keep past/completed day plans; redistribute remaining budget across
 * today + future incomplete days with range + total constraints.
 * `preserveAmounts` keeps those open days fixed (e.g. today's amount on undo).
 */
export function regenerateFuturePlans(
  project: SavingsProject,
  settings: Pick<RandomDepositSettings, 'minAmount' | 'maxAmount'>,
  preserveAmounts: Record<string, number> = {},
) {
  const today = getTodayDateInputValue()
  const dateKeys = getProjectDateKeys(project)
  const existing = new Map((project.plannedDeposits ?? []).map((item) => [item.date, item.amount]))
  const openDates = dateKeys.filter(
    (date) => date >= today && !(project.completedDates ?? []).includes(date),
  )

  const fixedDates = openDates.filter((date) => preserveAmounts[date] != null)
  const flexibleDates = openDates.filter((date) => preserveAmounts[date] == null)
  const fixedSum = fixedDates.reduce((sum, date) => sum + Math.max(0, preserveAmounts[date] ?? 0), 0)
  const flexibleBudget = Math.max(0, getRemainingAmount(project) - fixedSum)

  const distributed = distributeRemainingAmount(
    flexibleBudget,
    flexibleDates.length,
    settings.minAmount,
    settings.maxAmount,
  )
  const openAmountMap = new Map<string, number>([
    ...fixedDates.map((date) => [date, Math.max(0, preserveAmounts[date] ?? 0)] as const),
    ...flexibleDates.map((date, index) => [date, distributed[index] ?? 0] as const),
  ])

  return dateKeys.map((date) => {
    if (openAmountMap.has(date)) {
      return { date, amount: openAmountMap.get(date)! } satisfies PlannedDeposit
    }

    // Past / already-completed days: keep history only (not part of open total).
    return {
      date,
      amount: existing.get(date) ?? 0,
    } satisfies PlannedDeposit
  })
}

export function getPlannedAmount(project: SavingsProject, date = getTodayDateInputValue()) {
  return (project.plannedDeposits ?? []).find((item) => item.date === date)?.amount
}

export function getOpenPlanTotal(project: SavingsProject) {
  const openDates = new Set(getOpenPlanDates(project))
  return (project.plannedDeposits ?? [])
    .filter((item) => openDates.has(item.date))
    .reduce((sum, item) => sum + item.amount, 0)
}

export const DEFAULT_RANDOM_DEPOSIT: RandomDepositSettings = {
  enabled: false,
  minAmount: 50,
  maxAmount: 200,
}
