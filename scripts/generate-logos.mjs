/**
 * Generate multi-size PNG logo packs under public/logos/{id}/
 * Run: node scripts/generate-logos.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outRoot = path.join(root, 'public', 'logos')

const SIZES = [
  { name: 'logo-64.png', size: 64 },
  { name: 'logo-128.png', size: 128 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
]

function svgCoin({ bg, rim, face, highlight }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${bg}"/>
  <circle cx="256" cy="256" r="176" fill="${rim}"/>
  <circle cx="256" cy="256" r="148" fill="${face}"/>
  <circle cx="256" cy="256" r="128" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="8"/>
  <text x="256" y="292" text-anchor="middle" font-family="Georgia, serif" font-size="160" font-weight="700" fill="${highlight}">$</text>
  <ellipse cx="200" cy="180" rx="36" ry="16" fill="white" opacity="0.35" transform="rotate(-30 200 180)"/>
</svg>`
}

function svgLeaf({ bg, leaf, vein, spark }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${bg}"/>
  <circle cx="256" cy="256" r="160" fill="white" opacity="0.35"/>
  <path d="M256 96 C360 160 390 280 256 416 C122 280 152 160 256 96 Z" fill="${leaf}"/>
  <path d="M256 130 L256 380" stroke="${vein}" stroke-width="10" stroke-linecap="round" opacity="0.55"/>
  <path d="M256 210 C220 230 200 260 190 300" fill="none" stroke="${vein}" stroke-width="8" stroke-linecap="round" opacity="0.45"/>
  <path d="M256 230 C292 250 312 280 322 320" fill="none" stroke="${vein}" stroke-width="8" stroke-linecap="round" opacity="0.45"/>
  <path d="M360 140 L368 158 L386 162 L372 176 L376 194 L360 184 L344 194 L348 176 L334 162 L352 158 Z" fill="${spark}"/>
</svg>`
}

function svgMoon({ bg, moon, crater, spark }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${bg}"/>
  <circle cx="256" cy="256" r="168" fill="rgba(255,255,255,0.08)"/>
  <path d="M292 120 C210 132 150 210 164 300 C178 390 270 440 350 410 C280 420 210 360 210 280 C210 190 260 130 292 120 Z" fill="${moon}"/>
  <circle cx="250" cy="250" r="18" fill="${crater}" opacity="0.35"/>
  <circle cx="280" cy="310" r="12" fill="${crater}" opacity="0.28"/>
  <path d="M380 150 L388 168 L406 172 L392 186 L396 204 L380 194 L364 204 L368 186 L354 172 L372 168 Z" fill="${spark}"/>
  <circle cx="150" cy="180" r="5" fill="white" opacity="0.8"/>
  <circle cx="170" cy="360" r="4" fill="white" opacity="0.65"/>
  <circle cx="390" cy="300" r="4" fill="white" opacity="0.7"/>
</svg>`
}

function svgWave({ bg, wave1, wave2, foam }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${bg}"/>
  <circle cx="256" cy="256" r="168" fill="white" opacity="0.28"/>
  <path d="M90 280 C150 220 210 340 270 270 C320 220 360 250 422 230 L422 400 L90 400 Z" fill="${wave1}"/>
  <path d="M90 320 C160 270 220 370 290 310 C340 270 380 300 422 280 L422 400 L90 400 Z" fill="${wave2}"/>
  <path d="M120 268 C160 240 190 280 230 255" fill="none" stroke="${foam}" stroke-width="10" stroke-linecap="round" opacity="0.8"/>
  <circle cx="360" cy="160" r="28" fill="${foam}" opacity="0.85"/>
  <circle cx="360" cy="160" r="14" fill="white" opacity="0.35"/>
</svg>`
}

function svgGem({ bg, gemA, gemB, edge }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${bg}"/>
  <circle cx="256" cy="256" r="160" fill="white" opacity="0.3"/>
  <defs>
    <linearGradient id="gem" x1="160" y1="120" x2="360" y2="400" gradientUnits="userSpaceOnUse">
      <stop stop-color="${gemA}"/>
      <stop offset="1" stop-color="${gemB}"/>
    </linearGradient>
  </defs>
  <path d="M256 96 L390 190 L330 400 L182 400 L122 190 Z" fill="url(#gem)" stroke="${edge}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M256 96 L210 190 L302 190 Z" fill="white" opacity="0.35"/>
  <path d="M210 190 L256 400 L302 190 Z" fill="white" opacity="0.12"/>
  <path d="M122 190 L210 190 L182 400 Z" fill="black" opacity="0.08"/>
</svg>`
}

const LOGOS = [
  {
    id: 'coin',
    svg: svgCoin({
      bg: '#fff8e8',
      rim: '#f59e0b',
      face: '#fbbf24',
      highlight: '#92400e',
    }),
  },
  {
    id: 'leaf',
    svg: svgLeaf({
      bg: '#ecfdf5',
      leaf: '#10b981',
      vein: '#065f46',
      spark: '#6ee7b7',
    }),
  },
  {
    id: 'moon',
    svg: svgMoon({
      bg: '#1e1b4b',
      moon: '#c4b5fd',
      crater: '#4c1d95',
      spark: '#fbbf24',
    }),
  },
  {
    id: 'wave',
    svg: svgWave({
      bg: '#e0f2fe',
      wave1: '#38bdf8',
      wave2: '#0284c7',
      foam: '#ffffff',
    }),
  },
  {
    id: 'gem',
    svg: svgGem({
      bg: '#fdf2f8',
      gemA: '#fb7185',
      gemB: '#a855f7',
      edge: '#ffffff',
    }),
  },
]

async function writePack(id, svg) {
  const dir = path.join(outRoot, id)
  await fs.mkdir(dir, { recursive: true })
  const svgPath = path.join(dir, 'source.svg')
  await fs.writeFile(svgPath, svg, 'utf8')
  const buffer = Buffer.from(svg)
  for (const { name, size } of SIZES) {
    await sharp(buffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(dir, name))
  }
  console.log(`generated logos/${id}`)
}

/** Keep the hand-crafted default star pack in sync with root public icons. */
async function syncStarPackFromRoot() {
  const starDir = path.join(outRoot, 'star')
  await fs.mkdir(starDir, { recursive: true })
  const copies = [
    'logo-64.png',
    'logo-128.png',
    'apple-touch-icon.png',
    'pwa-192x192.png',
    'pwa-512x512.png',
  ]
  for (const name of copies) {
    await fs.copyFile(path.join(root, 'public', name), path.join(starDir, name))
  }
  console.log('synced logos/star from root public icons')
}

await fs.mkdir(outRoot, { recursive: true })
await syncStarPackFromRoot()
for (const logo of LOGOS) {
  await writePack(logo.id, logo.svg)
}
console.log('done')
