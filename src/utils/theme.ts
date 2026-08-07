export const THEME_STORAGE_KEY = 'savings-system:theme'

export const THEME_IDS = ['warm', 'cool', 'mint', 'dusk', 'midnight'] as const

export type ThemeId = (typeof THEME_IDS)[number]

export interface ThemeOption {
  id: ThemeId
  label: string
  description: string
  swatch: [string, string, string]
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'warm',
    label: '暖色調',
    description: '柔和桃橘，溫暖親切',
    swatch: ['#ffe8dc', '#e07a4d', '#4a3028'],
  },
  {
    id: 'cool',
    label: '冷色調',
    description: '清爽藍青，冷靜俐落',
    swatch: ['#e0f2fe', '#0284c7', '#0f2744'],
  },
  {
    id: 'mint',
    label: '清新綠',
    description: '薄荷青綠，清新舒適',
    swatch: ['#d1fae5', '#0f766e', '#134e4a'],
  },
  {
    id: 'dusk',
    label: '暮光紫',
    description: '淡紫暮色，柔和沉靜',
    swatch: ['#ede9fe', '#7c3aed', '#312e81'],
  },
  {
    id: 'midnight',
    label: '深夜模式',
    description: '深色介面，護眼夜間',
    swatch: ['#0f172a', '#38bdf8', '#1e293b'],
  },
]

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
}

export function loadStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeId(raw)) return raw
  } catch {
    // ignore
  }
  return 'warm'
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme === 'midnight' ? 'dark' : 'light'
}

export function saveTheme(theme: ThemeId) {
  localStorage.setItem(THEME_STORAGE_KEY, theme)
  applyTheme(theme)
}

export function applyStoredTheme() {
  applyTheme(loadStoredTheme())
}
