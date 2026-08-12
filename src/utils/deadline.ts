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

/**
 * Whether the current savings stage is done:
 * any completion inside the current savings period window
 * (1 day for 日存, 7 days for 周存, 30 days for 月存, N for 自訂).
 */
export function isCurrentStageCompleted(project: SavingsProject, from = new Date()) {
  if (project.currentAmount >= project.targetAmount) return true

  const today = toDateKey(startOfDay(from))
  const period = getPeriodContainingDate(project, today)
  if (!period) return (project.completedDates ?? []).includes(today)
  return isPeriodCompleted(project, period)
}

export function getCurrentStageStatus(project: SavingsProject) {
  const done = isCurrentStageCompleted(project)
  const goalReached = project.currentAmount >= project.targetAmount

  if (goalReached) {
    return { done: true as const, label: '目標已達成' }
  }

  if (project.savingsMode === 'daily') {
    return { done, label: done ? '今日已完成' : '今日未完成' }
  }
  if (project.savingsMode === 'weekly') {
    return { done, label: done ? '本週已完成' : '本週未完成' }
  }
  if (project.savingsMode === 'monthly') {
    return { done, label: done ? '本月已完成' : '本月未完成' }
  }

  const interval = getSavingsIntervalDays(project)
  return {
    done,
    label: done ? `本期已完成` : `本期未完成（每${interval}天）`,
  }
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
  // Preset rhythms always use fixed intervals (ignore stale intervalDays).
  if (project.savingsMode === 'daily') return 1
  if (project.savingsMode === 'weekly') return 7
  if (project.savingsMode === 'monthly') return 30
  if (typeof project.intervalDays === 'number' && project.intervalDays >= 1) {
    return Math.floor(project.intervalDays)
  }
  return 1
}

export function getSavingsModeLabel(project: SavingsProject) {
  if (project.savingsMode === 'daily') return '日存'
  if (project.savingsMode === 'weekly') return '周存'
  if (project.savingsMode === 'monthly') return '月存'
  const interval = getSavingsIntervalDays(project)
  return interval > 1 ? `每${interval}天` : '自訂'
}

/** Random allocation is available for all savings rhythms. */
export function supportsRandomDeposit(_project?: Pick<SavingsProject, 'savingsMode'>) {
  return true
}

export function isRandomDepositActive(project: SavingsProject) {
  return Boolean(project.randomDeposit?.enabled)
}

/** 「今日／本週／本月／本期」依存錢節奏。 */
export function getStagePeriodNoun(project: SavingsProject) {
  if (project.savingsMode === 'daily') return '今日'
  if (project.savingsMode === 'weekly') return '本週'
  if (project.savingsMode === 'monthly') return '本月'
  return '本期'
}

export function getStageDepositNeedLabel(project: SavingsProject) {
  const noun = getStagePeriodNoun(project)
  return noun === '今日' ? '今日需要存入' : `${noun}建議存入`
}

export function getCompletePanelTitle(project: SavingsProject) {
  if (project.savingsMode === 'daily') return '每日完成'
  if (project.savingsMode === 'weekly') return '每周完成'
  if (project.savingsMode === 'monthly') return '每月完成'
  return '本期完成'
}

export function getRandomDepositToggleLabel(project: SavingsProject) {
  if (project.savingsMode === 'daily') return '啟用每日隨機分配'
  if (project.savingsMode === 'weekly') return '啟用每周隨機分配'
  if (project.savingsMode === 'monthly') return '啟用每月隨機分配'
  const interval = getSavingsIntervalDays(project)
  return `啟用每${interval}天隨機分配`
}

export function getRandomPlanPanelTitle(project: SavingsProject) {
  if (project.savingsMode === 'daily') return '剩餘天數存入金額表'
  if (project.savingsMode === 'weekly') return '剩餘週次存入金額表'
  if (project.savingsMode === 'monthly') return '剩餘月份存入金額表'
  return '剩餘期數存入金額表'
}

export interface SavingsPeriod {
  index: number
  start: string
  end: string
  /** Planned amount is stored on this date key. */
  anchor: string
}

/** Split project calendar into deposit periods by savings interval. */
export function listSavingsPeriods(project: SavingsProject): SavingsPeriod[] {
  const days = getProjectDateKeys(project)
  const interval = Math.max(1, getSavingsIntervalDays(project))
  const periods: SavingsPeriod[] = []
  for (let i = 0; i < days.length; i += interval) {
    const slice = days.slice(i, i + interval)
    periods.push({
      index: periods.length + 1,
      start: slice[0],
      end: slice[slice.length - 1],
      anchor: slice[0],
    })
  }
  return periods
}

export function getPeriodContainingDate(project: SavingsProject, date: string) {
  return listSavingsPeriods(project).find((period) => period.start <= date && date <= period.end) ?? null
}

export function isPeriodCompleted(project: SavingsProject, period: SavingsPeriod) {
  const completed = new Set(project.completedDates ?? [])
  const days = getProjectDateKeys(project).filter(
    (date) => date >= period.start && date <= period.end,
  )
  return days.some((date) => completed.has(date))
}

/** Dates that count toward the current savings stage. */
export function getCurrentStageWindowKeys(project: SavingsProject, from = new Date()) {
  const todayKey = toDateKey(startOfDay(from))
  const period = getPeriodContainingDate(project, todayKey)
  if (!period) return [todayKey]
  return getProjectDateKeys(project).filter(
    (date) => date >= period.start && date <= period.end,
  )
}

export function getPeriodLabel(project: SavingsProject, period: SavingsPeriod) {
  if (project.savingsMode === 'daily') return `第 ${period.index} 天`
  if (project.savingsMode === 'weekly') return `第 ${period.index} 週`
  if (project.savingsMode === 'monthly') return `第 ${period.index} 月`
  return `第 ${period.index} 期`
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

export function getPeriodStatus(project: SavingsProject, period: SavingsPeriod): DayStatus {
  const today = getTodayDateInputValue()
  if (isPeriodCompleted(project, period)) return 'completed'
  if (today > period.end) return 'missed'
  if (today >= period.start && today <= period.end) return 'today'
  return 'upcoming'
}

/** Chart rows: one cell per day (日存) or per savings period (周／月／自訂). */
export function getProjectPeriodStatuses(project: SavingsProject) {
  return listSavingsPeriods(project).map((period) => ({
    period,
    label: getPeriodLabel(project, period),
    status: getPeriodStatus(project, period),
    plannedAmount: getPlannedAmount(project, period.anchor) ?? 0,
  }))
}

export function getDayChartPanelTitle(project: SavingsProject) {
  if (project.savingsMode === 'daily') return '完成狀態圖表'
  if (project.savingsMode === 'weekly') return '每周完成狀態'
  if (project.savingsMode === 'monthly') return '每月完成狀態'
  return '每期完成狀態'
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

/** Open period anchors (or open days for 日存) still needing a deposit. */
export function getOpenPlanDates(project: SavingsProject) {
  const today = getTodayDateInputValue()
  return listSavingsPeriods(project)
    .filter((period) => period.end >= today && !isPeriodCompleted(project, period))
    .map((period) => period.anchor)
}

/** Past incomplete period anchors — for 補存入. */
export function getMissedDates(project: SavingsProject) {
  const today = getTodayDateInputValue()
  return listSavingsPeriods(project)
    .filter((period) => period.end < today && !isPeriodCompleted(project, period))
    .map((period) => period.anchor)
}

/** Future incomplete period anchors — for 提早存入. */
export function getUpcomingIncompleteDates(project: SavingsProject) {
  const today = getTodayDateInputValue()
  return listSavingsPeriods(project)
    .filter((period) => period.start > today && !isPeriodCompleted(project, period))
    .map((period) => period.anchor)
}

/**
 * Keep past/completed period plans; redistribute remaining budget across
 * open periods with range + total constraints.
 * `preserveAmounts` keeps those open anchors fixed (e.g. current period on undo).
 */
export function regenerateFuturePlans(
  project: SavingsProject,
  settings: Pick<RandomDepositSettings, 'minAmount' | 'maxAmount'>,
  preserveAmounts: Record<string, number> = {},
) {
  const periods = listSavingsPeriods(project)
  const existing = new Map((project.plannedDeposits ?? []).map((item) => [item.date, item.amount]))
  const openAnchors = getOpenPlanDates(project)

  const fixedAnchors = openAnchors.filter((date) => preserveAmounts[date] != null)
  const flexibleAnchors = openAnchors.filter((date) => preserveAmounts[date] == null)
  const fixedSum = fixedAnchors.reduce(
    (sum, date) => sum + Math.max(0, preserveAmounts[date] ?? 0),
    0,
  )
  const flexibleBudget = Math.max(0, getRemainingAmount(project) - fixedSum)

  const distributed = distributeRemainingAmount(
    flexibleBudget,
    flexibleAnchors.length,
    settings.minAmount,
    settings.maxAmount,
  )
  const openAmountMap = new Map<string, number>([
    ...fixedAnchors.map((date) => [date, Math.max(0, preserveAmounts[date] ?? 0)] as const),
    ...flexibleAnchors.map((date, index) => [date, distributed[index] ?? 0] as const),
  ])

  return periods.map((period) => {
    if (openAmountMap.has(period.anchor)) {
      return { date: period.anchor, amount: openAmountMap.get(period.anchor)! } satisfies PlannedDeposit
    }

    // Past / already-completed periods: keep history only.
    return {
      date: period.anchor,
      amount: existing.get(period.anchor) ?? 0,
    } satisfies PlannedDeposit
  })
}

export function getPlannedAmount(project: SavingsProject, date = getTodayDateInputValue()) {
  const plans = project.plannedDeposits ?? []
  const interval = getSavingsIntervalDays(project)

  // Weekly / monthly / custom: always read the period anchor amount.
  if (interval > 1) {
    const period = getPeriodContainingDate(project, date)
    if (period) {
      const anchored = plans.find((item) => item.date === period.anchor)?.amount
      if (anchored != null) return anchored
    }
  }

  return plans.find((item) => item.date === date)?.amount
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

/** Default random range by savings rhythm. */
export function defaultRandomDepositForMode(
  savingsMode: SavingsProject['savingsMode'],
): RandomDepositSettings {
  if (savingsMode === 'weekly') {
    return { enabled: false, minAmount: 1, maxAmount: 200 }
  }
  return { ...DEFAULT_RANDOM_DEPOSIT }
}
