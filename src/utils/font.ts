export const FONT_STORAGE_KEY = 'savings-system:font'

export const FONT_IDS = ['modern', 'display', 'rounded', 'serif', 'soft'] as const

export type FontId = (typeof FONT_IDS)[number]

export interface FontOption {
  id: FontId
  label: string
  description: string
  sample: string
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'modern',
    label: '俐落現代',
    description: 'Outfit＋思源黑體，清楚好讀',
    sample: '慢存 Abc 123',
  },
  {
    id: 'display',
    label: '標題襯線',
    description: 'Fraunces 標題，帶一點溫度',
    sample: '慢存 Abc 123',
  },
  {
    id: 'rounded',
    label: '圓潤親和',
    description: 'Zen Maru Gothic，柔和圓體感',
    sample: '慢存 Abc 123',
  },
  {
    id: 'serif',
    label: '書卷襯線',
    description: '思源宋體，沉穩閱讀感',
    sample: '慢存 Abc 123',
  },
  {
    id: 'soft',
    label: '柔和圓體',
    description: 'Nunito＋黑體，輕鬆舒服',
    sample: '慢存 Abc 123',
  },
]

export function isFontId(value: unknown): value is FontId {
  return typeof value === 'string' && (FONT_IDS as readonly string[]).includes(value)
}

export function loadStoredFont(): FontId {
  try {
    const raw = localStorage.getItem(FONT_STORAGE_KEY)
    if (isFontId(raw)) return raw
  } catch {
    // ignore
  }
  return 'modern'
}

export function applyFont(font: FontId) {
  document.documentElement.dataset.font = font
}

export function saveFont(font: FontId) {
  localStorage.setItem(FONT_STORAGE_KEY, font)
  applyFont(font)
}

export function applyStoredFont() {
  applyFont(loadStoredFont())
}
