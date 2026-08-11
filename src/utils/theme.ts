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
    label: '星光粉',
    description: '珊瑚粉與薄荷，年輕溫暖',
    swatch: ['#fff5f8', '#ff5c7a', '#2c2438'],
  },
  {
    id: 'cool',
    label: '天空藍',
    description: '清爽藍青，輕盈俐落',
    swatch: ['#e0f2fe', '#0ea5e9', '#0f2744'],
  },
  {
    id: 'mint',
    label: '薄荷绿',
    description: '清新綠意，舒服放鬆',
    swatch: ['#d1fae5', '#10b981', '#134e4a'],
  },
  {
    id: 'dusk',
    label: '暮光紫',
    description: '柔紫粉調，略帶潮流',
    swatch: ['#f3e8ff', '#a855f7', '#3b2066'],
  },
  {
    id: 'midnight',
    label: '深夜模式',
    description: '深色介面，護眼夜間',
    swatch: ['#0f172a', '#fb7185', '#1e293b'],
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
