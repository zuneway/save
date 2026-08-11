import { APP_DESCRIPTION, APP_NAME } from '../config/brand'

export const LOGO_STORAGE_KEY = 'savings-system:logo'

export const LOGO_IDS = [
  'slow',
  'star',
  'spark',
  'orbit',
  'rocket',
  'heart',
  'piggy',
  'coin',
  'leaf',
  'moon',
  'wave',
  'gem',
] as const

export type LogoId = (typeof LOGO_IDS)[number]

export interface LogoOption {
  id: LogoId
  label: string
  description: string
}

export const LOGO_OPTIONS: LogoOption[] = [
  { id: 'slow', label: '慢慢蝸牛', description: '品牌預設，慢慢累積' },
  { id: 'star', label: '星星', description: '粉紅星星，閃亮目標' },
  { id: 'spark', label: '宇宙火花', description: '星河閃光，夢想發光' },
  { id: 'orbit', label: '環繞星球', description: '行星軌道，持續前進' },
  { id: 'rocket', label: '小火箭', description: '衝向目標，加速存錢' },
  { id: 'heart', label: '心願幣', description: '把心意存進目標' },
  { id: 'piggy', label: '小豬撲滿', description: '經典存錢意象' },
  { id: 'coin', label: '金幣', description: '金黃錢幣，積少成多' },
  { id: 'leaf', label: '綠葉', description: '成長綠意，穩健存錢' },
  { id: 'moon', label: '月光', description: '夜色月亮，安靜累積' },
  { id: 'wave', label: '海浪', description: '藍海水波，持續推進' },
  { id: 'gem', label: '寶石', description: '粉紫寶石，夢想閃亮' },
]

const LOGO_FILE = {
  mark: 'logo-128.png',
  favicon: 'pwa-192x192.png',
  apple: 'apple-touch-icon.png',
  pwa192: 'pwa-192x192.png',
  pwa512: 'pwa-512x512.png',
} as const

let manifestObjectUrl: string | null = null

export function isLogoId(value: unknown): value is LogoId {
  return typeof value === 'string' && (LOGO_IDS as readonly string[]).includes(value)
}

export function loadStoredLogo(): LogoId {
  try {
    const raw = localStorage.getItem(LOGO_STORAGE_KEY)
    if (isLogoId(raw)) return raw
  } catch {
    // ignore
  }
  return 'slow'
}

export function logoPublicPath(id: LogoId, file: string) {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}logos/${id}/${file}`
}

export function logoMarkUrl(id: LogoId) {
  return logoPublicPath(id, LOGO_FILE.mark)
}

export function logoPreviewUrl(id: LogoId) {
  return logoPublicPath(id, LOGO_FILE.mark)
}

function logoAbsoluteUrl(id: LogoId, file: string) {
  return new URL(logoPublicPath(id, file), window.location.origin).href
}

function upsertLink(rel: string, href: string, attrs: Record<string, string> = {}) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.appendChild(link)
  }
  for (const [key, value] of Object.entries(attrs)) {
    link.setAttribute(key, value)
  }
  link.href = href
}

function applyDocumentIcons(id: LogoId) {
  upsertLink('icon', logoAbsoluteUrl(id, LOGO_FILE.favicon), { type: 'image/png' })
  upsertLink('apple-touch-icon', logoAbsoluteUrl(id, LOGO_FILE.apple))

  const manifest = {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    theme_color: '#ff5c7a',
    background_color: '#fff5f8',
    display: 'standalone',
    orientation: 'portrait-primary',
    lang: 'zh-Hant',
    start_url: new URL(import.meta.env.BASE_URL || './', window.location.href).href,
    scope: new URL(import.meta.env.BASE_URL || './', window.location.href).href,
    icons: [
      {
        src: logoAbsoluteUrl(id, LOGO_FILE.pwa192),
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: logoAbsoluteUrl(id, LOGO_FILE.pwa512),
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: logoAbsoluteUrl(id, LOGO_FILE.pwa512),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }

  if (manifestObjectUrl) {
    URL.revokeObjectURL(manifestObjectUrl)
    manifestObjectUrl = null
  }
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
  manifestObjectUrl = URL.createObjectURL(blob)
  upsertLink('manifest', manifestObjectUrl)
}

export function applyLogo(id: LogoId) {
  document.documentElement.dataset.logo = id
  applyDocumentIcons(id)
  window.dispatchEvent(new CustomEvent('savings-logo-change', { detail: id }))
}

export function saveLogo(id: LogoId) {
  localStorage.setItem(LOGO_STORAGE_KEY, id)
  applyLogo(id)
}

export function applyStoredLogo() {
  applyLogo(loadStoredLogo())
}
