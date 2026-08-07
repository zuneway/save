export const BACKGROUND_STORAGE_KEY = 'savings-system:background'
export const BACKGROUND_CUSTOM_KEY = 'savings-system:background-custom'

export const BACKGROUND_IDS = [
  'none',
  'dawn',
  'ocean',
  'forest',
  'lavender',
  'night',
  'custom',
] as const

export type BackgroundId = (typeof BACKGROUND_IDS)[number]

export interface BackgroundOption {
  id: Exclude<BackgroundId, 'custom'>
  label: string
  description: string
  preview: string
}

/** Compact SVG scenes used as offline background presets. */
function svgBackground(svg: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg.trim())}")`
}

export const BACKGROUND_PRESETS: Record<Exclude<BackgroundId, 'none' | 'custom'>, string> = {
  dawn: svgBackground(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffd6a8"/>
          <stop offset="45%" stop-color="#ffb38a"/>
          <stop offset="100%" stop-color="#f7e7de"/>
        </linearGradient>
        <radialGradient id="sun" cx="70%" cy="28%" r="28%">
          <stop offset="0%" stop-color="#fff4cc" stop-opacity="0.95"/>
          <stop offset="55%" stop-color="#ffb070" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#ffb070" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="1800" fill="url(#sky)"/>
      <rect width="1200" height="1800" fill="url(#sun)"/>
      <path d="M0 1180 C220 1080 420 1260 620 1185 C820 1110 980 1240 1200 1160 L1200 1800 L0 1800 Z" fill="#e8b89a" opacity="0.35"/>
      <path d="M0 1280 C260 1200 480 1380 740 1285 C980 1200 1080 1360 1200 1300 L1200 1800 L0 1800 Z" fill="#d99578" opacity="0.45"/>
      <path d="M0 1420 C300 1340 560 1520 820 1410 C1020 1330 1120 1490 1200 1440 L1200 1800 L0 1800 Z" fill="#c8785c" opacity="0.5"/>
    </svg>
  `),
  ocean: svgBackground(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d9efff"/>
          <stop offset="40%" stop-color="#8ecae6"/>
          <stop offset="100%" stop-color="#023e8a"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="1800" fill="url(#sky)"/>
      <path d="M0 820 C180 760 360 900 540 820 C720 740 900 880 1200 800 L1200 1800 L0 1800 Z" fill="#48cae4" opacity="0.45"/>
      <path d="M0 980 C220 920 420 1080 660 980 C900 880 1040 1060 1200 980 L1200 1800 L0 1800 Z" fill="#0096c7" opacity="0.5"/>
      <path d="M0 1180 C260 1100 500 1280 760 1180 C980 1100 1100 1260 1200 1200 L1200 1800 L0 1800 Z" fill="#0077b6" opacity="0.55"/>
      <circle cx="920" cy="320" r="70" fill="#fff8e7" opacity="0.85"/>
    </svg>
  `),
  forest: svgBackground(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d8f3dc"/>
          <stop offset="50%" stop-color="#95d5b2"/>
          <stop offset="100%" stop-color="#1b4332"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="1800" fill="url(#sky)"/>
      <ellipse cx="200" cy="1100" rx="220" ry="360" fill="#2d6a4f" opacity="0.7"/>
      <ellipse cx="480" cy="1180" rx="260" ry="420" fill="#1b4332" opacity="0.75"/>
      <ellipse cx="780" cy="1120" rx="240" ry="380" fill="#40916c" opacity="0.7"/>
      <ellipse cx="1040" cy="1200" rx="220" ry="400" fill="#081c15" opacity="0.72"/>
      <rect y="1400" width="1200" height="400" fill="#081c15" opacity="0.55"/>
    </svg>
  `),
  lavender: svgBackground(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ede9fe"/>
          <stop offset="45%" stop-color="#c4b5fd"/>
          <stop offset="100%" stop-color="#5b21b6"/>
        </linearGradient>
        <radialGradient id="glow" cx="30%" cy="25%" r="35%">
          <stop offset="0%" stop-color="#fae8ff" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#fae8ff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="1800" fill="url(#sky)"/>
      <rect width="1200" height="1800" fill="url(#glow)"/>
      <path d="M0 1200 C240 1120 420 1320 660 1210 C900 1100 1040 1300 1200 1220 L1200 1800 L0 1800 Z" fill="#7c3aed" opacity="0.35"/>
      <path d="M0 1380 C280 1300 520 1500 800 1380 C1000 1300 1120 1480 1200 1420 L1200 1800 L0 1800 Z" fill="#4c1d95" opacity="0.45"/>
    </svg>
  `),
  night: svgBackground(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#020617"/>
          <stop offset="55%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="1800" fill="url(#sky)"/>
      <circle cx="180" cy="220" r="2" fill="#e2e8f0"/>
      <circle cx="320" cy="160" r="1.5" fill="#e2e8f0"/>
      <circle cx="520" cy="280" r="2" fill="#e2e8f0"/>
      <circle cx="740" cy="140" r="1.5" fill="#e2e8f0"/>
      <circle cx="910" cy="240" r="2.2" fill="#e2e8f0"/>
      <circle cx="1040" cy="180" r="1.4" fill="#e2e8f0"/>
      <circle cx="430" cy="360" r="1.3" fill="#e2e8f0"/>
      <circle cx="860" cy="420" r="1.6" fill="#e2e8f0"/>
      <circle cx="980" cy="360" r="55" fill="#f8fafc" opacity="0.85"/>
      <circle cx="955" cy="345" r="48" fill="#020617"/>
      <path d="M0 1280 C260 1200 480 1380 760 1270 C980 1180 1100 1360 1200 1300 L1200 1800 L0 1800 Z" fill="#020617" opacity="0.85"/>
    </svg>
  `),
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: 'none',
    label: '預設漸層',
    description: '跟隨目前色調的柔和背景',
    preview: 'linear-gradient(145deg, var(--page-base-top), var(--page-base-mid) 55%, var(--accent-soft))',
  },
  {
    id: 'dawn',
    label: '晨曦山丘',
    description: '溫暖日出與柔和山線',
    preview: BACKGROUND_PRESETS.dawn,
  },
  {
    id: 'ocean',
    label: '海岸藍',
    description: '清爽海面與天空',
    preview: BACKGROUND_PRESETS.ocean,
  },
  {
    id: 'forest',
    label: '林間綠',
    description: '層疊樹影與青綠光感',
    preview: BACKGROUND_PRESETS.forest,
  },
  {
    id: 'lavender',
    label: '薰衣草田',
    description: '淡紫暮色風景',
    preview: BACKGROUND_PRESETS.lavender,
  },
  {
    id: 'night',
    label: '星夜',
    description: '深夜星空與月光',
    preview: BACKGROUND_PRESETS.night,
  },
]

const MAX_CUSTOM_EDGE = 1400
const MAX_CUSTOM_BYTES = 1_200_000

export function isBackgroundId(value: unknown): value is BackgroundId {
  return typeof value === 'string' && (BACKGROUND_IDS as readonly string[]).includes(value)
}

export function loadStoredBackground(): BackgroundId {
  try {
    const raw = localStorage.getItem(BACKGROUND_STORAGE_KEY)
    if (isBackgroundId(raw)) {
      if (raw === 'custom' && !loadCustomBackground()) return 'none'
      return raw
    }
  } catch {
    // ignore
  }
  return 'none'
}

export function loadCustomBackground(): string | null {
  try {
    const raw = localStorage.getItem(BACKGROUND_CUSTOM_KEY)
    if (raw && raw.startsWith('data:image/')) return raw
  } catch {
    // ignore
  }
  return null
}

export function applyBackground(id: BackgroundId, customDataUrl?: string | null) {
  const root = document.documentElement
  root.dataset.bg = id

  if (id === 'custom') {
    const dataUrl = customDataUrl ?? loadCustomBackground()
    if (dataUrl) {
      root.style.setProperty('--page-bg-image', `url("${dataUrl}")`)
      return
    }
    root.dataset.bg = 'none'
    root.style.removeProperty('--page-bg-image')
    return
  }

  if (id === 'none') {
    root.style.removeProperty('--page-bg-image')
    return
  }

  root.style.setProperty('--page-bg-image', BACKGROUND_PRESETS[id])
}

export function saveBackground(id: BackgroundId, customDataUrl?: string | null) {
  if (id === 'custom') {
    const dataUrl = customDataUrl ?? loadCustomBackground()
    if (!dataUrl) throw new Error('請先上傳背景圖片')
    localStorage.setItem(BACKGROUND_CUSTOM_KEY, dataUrl)
    localStorage.setItem(BACKGROUND_STORAGE_KEY, 'custom')
    applyBackground('custom', dataUrl)
    return
  }

  localStorage.setItem(BACKGROUND_STORAGE_KEY, id)
  applyBackground(id)
}

export function clearCustomBackground() {
  localStorage.removeItem(BACKGROUND_CUSTOM_KEY)
  if (loadStoredBackground() === 'custom') {
    localStorage.setItem(BACKGROUND_STORAGE_KEY, 'none')
    applyBackground('none')
  }
}

export function applyStoredBackground() {
  applyBackground(loadStoredBackground(), loadCustomBackground())
}

export async function compressBackgroundImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('請選擇圖片檔案')
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('圖片太大，請選擇 12MB 以內的檔案')
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_CUSTOM_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('無法處理圖片，請換一張再試')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let quality = 0.82
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrl.length > MAX_CUSTOM_BYTES && quality > 0.45) {
    quality -= 0.08
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }

  if (dataUrl.length > MAX_CUSTOM_BYTES) {
    throw new Error('圖片仍太大，請改用較小的圖片')
  }

  return dataUrl
}
