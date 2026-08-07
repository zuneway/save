/** How often a fixed deposit repeats. */
export type PeriodicFrequency = 'daily' | 'weekly' | 'monthly' | 'custom'

/** Unit used by custom interval (每隔幾日／周／月). */
export type PeriodicIntervalUnit = 'days' | 'weeks' | 'months'

/** When the recurring plan should stop generating periods. */
export type PeriodicEndRule =
  | { type: 'open' }
  | { type: 'periods'; periods: number }
  | { type: 'target'; targetAmount: number }
  | { type: 'date'; date: string }

export type PeriodicDetailPanelId =
  | 'overview'
  | 'checkin'
  | 'records'
  | 'schedule'
  | 'planInfo'

export const PERIODIC_DETAIL_PANEL_META: Record<PeriodicDetailPanelId, { title: string }> = {
  overview: { title: '進度總覽' },
  checkin: { title: '存入操作' },
  records: { title: '紀錄' },
  schedule: { title: '期程表' },
  planInfo: { title: '計畫資訊' },
}

/** 期程表不在預設版面，需從「新增區塊」加入。 */
export const DEFAULT_PERIODIC_DETAIL_LAYOUT: PeriodicDetailPanelId[] = [
  'overview',
  'checkin',
  'records',
  'planInfo',
]

export const ALL_PERIODIC_DETAIL_PANEL_IDS = Object.keys(
  PERIODIC_DETAIL_PANEL_META,
) as PeriodicDetailPanelId[]

export interface PeriodicPlan {
  id: string
  name: string
  note?: string
  /** Folder this plan belongs to; null = uncategorized */
  folderId: string | null
  /** Fixed amount deposited each period */
  amount: number
  frequency: PeriodicFrequency
  /** N in「每隔 N 日／周／月」；presets store 1 */
  intervalCount: number
  /** Unit for custom (and matching unit for presets) */
  intervalUnit: PeriodicIntervalUnit
  /** First due date YYYY-MM-DD */
  startDate: string
  endRule: PeriodicEndRule
  /** Due dates marked as deposited */
  completedDates: string[]
  /** Ordered visible panels on the plan detail page */
  detailLayout: PeriodicDetailPanelId[]
  createdAt: string
}

export interface CreatePeriodicPlanInput {
  /** Optional; auto-generated from frequency + amount when omitted */
  name?: string
  amount: number
  frequency: PeriodicFrequency
  intervalCount?: number
  intervalUnit?: PeriodicIntervalUnit
  startDate: string
  endRule: PeriodicEndRule
  note?: string
  folderId?: string | null
}

export type PeriodicPeriodStatus = 'completed' | 'missed' | 'due' | 'upcoming'

export interface PeriodicPeriod {
  date: string
  amount: number
  status: PeriodicPeriodStatus
  index: number
}
