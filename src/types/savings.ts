export type ProjectDeadline =
  | { type: 'days'; days: number }
  | { type: 'date'; date: string }

/** How often the user plans to deposit. */
export type SavingsMode = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface ProjectFolder {
  id: string
  name: string
  note?: string
  createdAt: string
}

export interface SavingsEntry {
  id: string
  date: string
  amount: number
  note?: string
  createdAt: string
}

export interface RandomDepositSettings {
  enabled: boolean
  minAmount: number
  maxAmount: number
}

export interface PlannedDeposit {
  date: string
  amount: number
}

export interface SavingsProject {
  id: string
  name: string
  note?: string
  targetAmount: number
  currentAmount: number
  createdAt: string
  deadline: ProjectDeadline
  /** daily / weekly / monthly / custom interval */
  savingsMode: SavingsMode
  /** Days between each planned deposit (1=日存, 7=周存, 30=月存, N=自訂) */
  intervalDays: number
  /** Suggested deposit per period for quick actions */
  periodAmount?: number
  folderId: string | null
  /** YYYY-MM-DD dates marked as completed check-ins */
  completedDates: string[]
  /** Detailed savings records */
  entries: SavingsEntry[]
  randomDeposit: RandomDepositSettings
  plannedDeposits: PlannedDeposit[]
  /** Ordered visible panels on the project detail page */
  detailLayout: DetailPanelId[]
}

export interface CreateProjectInput {
  name: string
  targetAmount: number
  deadline: ProjectDeadline
  savingsMode?: SavingsMode
  intervalDays?: number
  periodAmount?: number
  folderId?: string | null
  note?: string
}

export interface CreateFolderInput {
  name: string
  note?: string
}

export interface AddEntryInput {
  amount: number
  note?: string
  date?: string
}

export type PlannedDayDepositKind = 'early' | 'makeup' | 'today'

export interface UpdateRandomDepositInput {
  enabled: boolean
  minAmount: number
  maxAmount: number
  regeneratePlan?: boolean
}

export type SelectionMode = 'single' | 'multi'

export type DayStatus = 'completed' | 'missed' | 'today' | 'upcoming'

export type DetailPanelId =
  | 'overview'
  | 'dayChart'
  | 'deadline'
  | 'dailyComplete'
  | 'deposit'
  | 'randomPlanTable'
  | 'entries'

export const DETAIL_PANEL_META: Record<DetailPanelId, { title: string }> = {
  overview: { title: '存錢進度總覽' },
  dayChart: { title: '完成狀態圖表' },
  deadline: { title: '目標期限' },
  dailyComplete: { title: '每日完成' },
  deposit: { title: '存入金額設定' },
  randomPlanTable: { title: '剩餘天數存入金額表' },
  entries: { title: '詳細項目' },
}

export const DEFAULT_DETAIL_LAYOUT: DetailPanelId[] = [
  'overview',
  'deposit',
  'dailyComplete',
  'dayChart',
  'deadline',
  'randomPlanTable',
  'entries',
]

export const ALL_DETAIL_PANEL_IDS = Object.keys(DETAIL_PANEL_META) as DetailPanelId[]
