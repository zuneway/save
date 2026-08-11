export const BACKGROUND_STORAGE_KEY = 'savings-system:background'
export const BACKGROUND_CUSTOM_KEY = 'savings-system:background-custom'

export const BACKGROUND_IDS = [
  'none',
  'night',
  'galaxy',
  'nebula',
  'aurora',
  'comet',
  'dawn',
  'ocean',
  'forest',
  'lavender',
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
        <linearGradient id="void" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stop-color="#05010f"/>
          <stop offset="35%" stop-color="#0a0620"/>
          <stop offset="70%" stop-color="#12081f"/>
          <stop offset="100%" stop-color="#1a0a18"/>
        </linearGradient>
        <radialGradient id="core" cx="58%" cy="42%" r="42%">
          <stop offset="0%" stop-color="#f0abfc" stop-opacity="0.42"/>
          <stop offset="25%" stop-color="#a78bfa" stop-opacity="0.28"/>
          <stop offset="55%" stop-color="#6366f1" stop-opacity="0.16"/>
          <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="armA" cx="28%" cy="28%" r="36%">
          <stop offset="0%" stop-color="#fb7185" stop-opacity="0.32"/>
          <stop offset="45%" stop-color="#c026d3" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#c026d3" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="armB" cx="78%" cy="22%" r="30%">
          <stop offset="0%" stop-color="#67e8f9" stop-opacity="0.26"/>
          <stop offset="50%" stop-color="#818cf8" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#818cf8" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="armC" cx="70%" cy="72%" r="38%">
          <stop offset="0%" stop-color="#f472b6" stop-opacity="0.2"/>
          <stop offset="55%" stop-color="#7c3aed" stop-opacity="0.1"/>
          <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="dust" cx="42%" cy="58%" r="48%">
          <stop offset="0%" stop-color="#e0e7ff" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#e0e7ff" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="planetGlow" cx="18%" cy="78%" r="16%">
          <stop offset="0%" stop-color="#fda4af" stop-opacity="0.35"/>
          <stop offset="60%" stop-color="#fb7185" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#fb7185" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="1800" fill="url(#void)"/>
      <rect width="1200" height="1800" fill="url(#core)"/>
      <rect width="1200" height="1800" fill="url(#armA)"/>
      <rect width="1200" height="1800" fill="url(#armB)"/>
      <rect width="1200" height="1800" fill="url(#armC)"/>
      <rect width="1200" height="1800" fill="url(#dust)"/>
      <rect width="1200" height="1800" fill="url(#planetGlow)"/>
      <ellipse cx="700" cy="760" rx="260" ry="90" fill="#c4b5fd" opacity="0.06" transform="rotate(-28 700 760)"/>
      <ellipse cx="700" cy="760" rx="180" ry="48" fill="#f5d0fe" opacity="0.08" transform="rotate(-28 700 760)"/>
      <circle cx="210" cy="1410" r="58" fill="#fda4af" opacity="0.55"/>
      <circle cx="210" cy="1410" r="46" fill="#fb7185" opacity="0.35"/>
      <circle cx="198" cy="1398" r="14" fill="#ffe4e6" opacity="0.25"/>
      <g fill="#f8fafc">
        <circle cx="48" cy="70" r="1.1" opacity="0.7"/>
        <circle cx="110" cy="140" r="2.2" opacity="0.95"/>
        <circle cx="180" cy="50" r="0.8" opacity="0.45"/>
        <circle cx="250" cy="190" r="1.5" opacity="0.8"/>
        <circle cx="320" cy="100" r="1" opacity="0.55"/>
        <circle cx="390" cy="230" r="2.6" opacity="0.98"/>
        <circle cx="470" cy="60" r="1.3" opacity="0.72"/>
        <circle cx="540" cy="170" r="1.8" opacity="0.88"/>
        <circle cx="610" cy="30" r="0.9" opacity="0.5"/>
        <circle cx="690" cy="140" r="2.1" opacity="0.92"/>
        <circle cx="760" cy="80" r="0.7" opacity="0.4"/>
        <circle cx="840" cy="200" r="1.4" opacity="0.75"/>
        <circle cx="920" cy="110" r="1.9" opacity="0.86"/>
        <circle cx="1000" cy="240" r="1.2" opacity="0.66"/>
        <circle cx="1080" cy="70" r="2.4" opacity="0.94"/>
        <circle cx="1150" cy="180" r="1" opacity="0.58"/>
        <circle cx="70" cy="300" r="1.6" opacity="0.78"/>
        <circle cx="160" cy="370" r="0.9" opacity="0.48"/>
        <circle cx="240" cy="330" r="2.3" opacity="0.93"/>
        <circle cx="340" cy="410" r="1.2" opacity="0.64"/>
        <circle cx="430" cy="350" r="1.7" opacity="0.82"/>
        <circle cx="520" cy="440" r="1" opacity="0.52"/>
        <circle cx="600" cy="320" r="2" opacity="0.9"/>
        <circle cx="690" cy="400" r="2.8" opacity="1"/>
        <circle cx="780" cy="350" r="0.8" opacity="0.44"/>
        <circle cx="870" cy="460" r="1.5" opacity="0.76"/>
        <circle cx="960" cy="380" r="1.3" opacity="0.7"/>
        <circle cx="1050" cy="480" r="1.8" opacity="0.84"/>
        <circle cx="1140" cy="420" r="1.1" opacity="0.6"/>
        <circle cx="40" cy="520" r="1.4" opacity="0.72"/>
        <circle cx="130" cy="580" r="2" opacity="0.9"/>
        <circle cx="220" cy="540" r="0.9" opacity="0.5"/>
        <circle cx="310" cy="620" r="1.6" opacity="0.8"/>
        <circle cx="410" cy="560" r="1.2" opacity="0.64"/>
        <circle cx="500" cy="660" r="2.5" opacity="0.96"/>
        <circle cx="590" cy="600" r="1" opacity="0.54"/>
        <circle cx="680" cy="680" r="1.7" opacity="0.82"/>
        <circle cx="780" cy="610" r="0.8" opacity="0.46"/>
        <circle cx="880" cy="700" r="2.1" opacity="0.9"/>
        <circle cx="980" cy="640" r="1.3" opacity="0.68"/>
        <circle cx="1080" cy="720" r="1.5" opacity="0.76"/>
        <circle cx="90" cy="780" r="1.8" opacity="0.84"/>
        <circle cx="180" cy="840" r="1.1" opacity="0.58"/>
        <circle cx="280" cy="800" r="2.2" opacity="0.92"/>
        <circle cx="380" cy="880" r="0.9" opacity="0.48"/>
        <circle cx="480" cy="820" r="1.6" opacity="0.78"/>
        <circle cx="580" cy="920" r="2.4" opacity="0.95"/>
        <circle cx="680" cy="860" r="1.2" opacity="0.62"/>
        <circle cx="780" cy="940" r="1.9" opacity="0.88"/>
        <circle cx="880" cy="880" r="1" opacity="0.52"/>
        <circle cx="980" cy="960" r="1.5" opacity="0.74"/>
        <circle cx="1100" cy="900" r="2" opacity="0.9"/>
        <circle cx="60" cy="1040" r="1.3" opacity="0.66"/>
        <circle cx="160" cy="1100" r="1.7" opacity="0.8"/>
        <circle cx="270" cy="1060" r="0.8" opacity="0.44"/>
        <circle cx="380" cy="1140" r="2.1" opacity="0.9"/>
        <circle cx="490" cy="1080" r="1.2" opacity="0.64"/>
        <circle cx="600" cy="1160" r="1.8" opacity="0.84"/>
        <circle cx="720" cy="1100" r="1" opacity="0.54"/>
        <circle cx="830" cy="1180" r="1.6" opacity="0.78"/>
        <circle cx="940" cy="1120" r="2.3" opacity="0.93"/>
        <circle cx="1050" cy="1200" r="1.1" opacity="0.6"/>
        <circle cx="1150" cy="1140" r="1.4" opacity="0.72"/>
        <circle cx="100" cy="1260" r="1.9" opacity="0.86"/>
        <circle cx="220" cy="1320" r="1.2" opacity="0.62"/>
        <circle cx="340" cy="1280" r="0.9" opacity="0.5"/>
        <circle cx="460" cy="1360" r="2" opacity="0.9"/>
        <circle cx="580" cy="1300" r="1.5" opacity="0.76"/>
        <circle cx="700" cy="1380" r="1.1" opacity="0.58"/>
        <circle cx="820" cy="1320" r="1.7" opacity="0.82"/>
        <circle cx="940" cy="1400" r="2.2" opacity="0.92"/>
        <circle cx="1060" cy="1340" r="1" opacity="0.52"/>
        <circle cx="80" cy="1480" r="1.4" opacity="0.7"/>
        <circle cx="200" cy="1540" r="1.8" opacity="0.84"/>
        <circle cx="340" cy="1500" r="1.1" opacity="0.58"/>
        <circle cx="480" cy="1580" r="1.6" opacity="0.78"/>
        <circle cx="620" cy="1520" r="2.1" opacity="0.9"/>
        <circle cx="760" cy="1600" r="0.9" opacity="0.48"/>
        <circle cx="900" cy="1540" r="1.5" opacity="0.74"/>
        <circle cx="1040" cy="1620" r="1.3" opacity="0.66"/>
        <circle cx="1160" cy="1560" r="1.9" opacity="0.86"/>
        <circle cx="140" cy="1680" r="1.2" opacity="0.64"/>
        <circle cx="300" cy="1720" r="1.7" opacity="0.8"/>
        <circle cx="460" cy="1690" r="1" opacity="0.54"/>
        <circle cx="620" cy="1740" r="1.6" opacity="0.78"/>
        <circle cx="800" cy="1700" r="2" opacity="0.9"/>
        <circle cx="960" cy="1750" r="1.3" opacity="0.68"/>
        <circle cx="1100" cy="1710" r="1.5" opacity="0.74"/>
      </g>
      <g fill="#fce7f3">
        <circle cx="300" cy="260" r="1.3" opacity="0.55"/>
        <circle cx="740" cy="520" r="1.6" opacity="0.5"/>
        <circle cx="520" cy="980" r="1.2" opacity="0.45"/>
        <circle cx="860" cy="1280" r="1.4" opacity="0.48"/>
      </g>
      <g fill="#a5f3fc">
        <circle cx="150" cy="460" r="1.1" opacity="0.5"/>
        <circle cx="980" cy="300" r="1.4" opacity="0.46"/>
        <circle cx="640" cy="1240" r="1.2" opacity="0.42"/>
      </g>
    </svg>
  `),
  galaxy: svgBackground(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="gvoid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#030012"/>
          <stop offset="100%" stop-color="#12061f"/>
        </linearGradient>
        <radialGradient id="gcore" cx="50%" cy="45%" r="28%">
          <stop offset="0%" stop-color="#fdf4ff" stop-opacity="0.55"/>
          <stop offset="30%" stop-color="#e879f9" stop-opacity="0.35"/>
          <stop offset="70%" stop-color="#6366f1" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="garm1" cx="35%" cy="40%" r="45%">
          <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="garm2" cx="68%" cy="52%" r="40%">
          <stop offset="0%" stop-color="#fb7185" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#fb7185" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="1800" fill="url(#gvoid)"/>
      <rect width="1200" height="1800" fill="url(#gcore)"/>
      <rect width="1200" height="1800" fill="url(#garm1)"/>
      <rect width="1200" height="1800" fill="url(#garm2)"/>
      <ellipse cx="600" cy="820" rx="320" ry="90" fill="#c4b5fd" opacity="0.08" transform="rotate(-32 600 820)"/>
      <ellipse cx="600" cy="820" rx="420" ry="110" fill="#f0abfc" opacity="0.05" transform="rotate(-32 600 820)"/>
      <ellipse cx="600" cy="820" rx="220" ry="55" fill="#e0e7ff" opacity="0.07" transform="rotate(-32 600 820)"/>
      <g fill="#f8fafc">
        <circle cx="80" cy="120" r="1.4" opacity="0.8"/><circle cx="200" cy="80" r="0.9" opacity="0.5"/>
        <circle cx="320" cy="180" r="2" opacity="0.9"/><circle cx="460" cy="60" r="1.2" opacity="0.65"/>
        <circle cx="600" cy="140" r="1.7" opacity="0.85"/><circle cx="740" cy="90" r="1" opacity="0.55"/>
        <circle cx="880" cy="170" r="2.2" opacity="0.95"/><circle cx="1020" cy="110" r="1.3" opacity="0.7"/>
        <circle cx="140" cy="300" r="1.5" opacity="0.75"/><circle cx="280" cy="360" r="1.1" opacity="0.6"/>
        <circle cx="420" cy="280" r="1.8" opacity="0.85"/><circle cx="700" cy="320" r="1.2" opacity="0.65"/>
        <circle cx="860" cy="380" r="2" opacity="0.9"/><circle cx="1080" cy="300" r="0.9" opacity="0.5"/>
        <circle cx="120" cy="520" r="1.6" opacity="0.8"/><circle cx="340" cy="560" r="1.2" opacity="0.62"/>
        <circle cx="520" cy="500" r="2.3" opacity="0.95"/><circle cx="780" cy="540" r="1.4" opacity="0.72"/>
        <circle cx="960" cy="600" r="1.8" opacity="0.86"/><circle cx="160" cy="760" r="1.1" opacity="0.58"/>
        <circle cx="400" cy="800" r="1.7" opacity="0.82"/><circle cx="900" cy="780" r="1.3" opacity="0.68"/>
        <circle cx="240" cy="1000" r="2" opacity="0.9"/><circle cx="560" cy="1040" r="1.2" opacity="0.64"/>
        <circle cx="800" cy="980" r="1.6" opacity="0.78"/><circle cx="1040" cy="1060" r="1" opacity="0.52"/>
        <circle cx="100" cy="1240" r="1.5" opacity="0.74"/><circle cx="360" cy="1280" r="1.9" opacity="0.88"/>
        <circle cx="640" cy="1220" r="1.1" opacity="0.6"/><circle cx="920" cy="1300" r="1.7" opacity="0.82"/>
        <circle cx="180" cy="1480" r="1.3" opacity="0.7"/><circle cx="480" cy="1520" r="2.1" opacity="0.92"/>
        <circle cx="760" cy="1460" r="1.2" opacity="0.62"/><circle cx="1060" cy="1540" r="1.5" opacity="0.76"/>
        <circle cx="300" cy="1680" r="1.4" opacity="0.72"/><circle cx="700" cy="1700" r="1.8" opacity="0.84"/>
      </g>
    </svg>
  `),
  nebula: svgBackground(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="nvoid" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stop-color="#0b0420"/>
          <stop offset="100%" stop-color="#1a0b2e"/>
        </linearGradient>
        <radialGradient id="npink" cx="40%" cy="35%" r="50%">
          <stop offset="0%" stop-color="#fb7185" stop-opacity="0.4"/>
          <stop offset="45%" stop-color="#c026d3" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#c026d3" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="ncyan" cx="70%" cy="55%" r="42%">
          <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="npurple" cx="55%" cy="70%" r="38%">
          <stop offset="0%" stop-color="#a855f7" stop-opacity="0.24"/>
          <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="1800" fill="url(#nvoid)"/>
      <rect width="1200" height="1800" fill="url(#npink)"/>
      <rect width="1200" height="1800" fill="url(#ncyan)"/>
      <rect width="1200" height="1800" fill="url(#npurple)"/>
      <g fill="#fff">
        <circle cx="100" cy="140" r="1.5" opacity="0.8"/><circle cx="260" cy="90" r="1" opacity="0.55"/>
        <circle cx="420" cy="200" r="2.1" opacity="0.92"/><circle cx="600" cy="120" r="1.3" opacity="0.7"/>
        <circle cx="780" cy="180" r="1.7" opacity="0.84"/><circle cx="960" cy="80" r="1.1" opacity="0.6"/>
        <circle cx="180" cy="360" r="1.8" opacity="0.86"/><circle cx="500" cy="400" r="1.2" opacity="0.64"/>
        <circle cx="820" cy="340" r="2" opacity="0.9"/><circle cx="1100" cy="420" r="1.4" opacity="0.72"/>
        <circle cx="120" cy="680" r="1.3" opacity="0.68"/><circle cx="400" cy="720" r="1.9" opacity="0.88"/>
        <circle cx="700" cy="660" r="1.1" opacity="0.58"/><circle cx="980" cy="740" r="1.6" opacity="0.8"/>
        <circle cx="240" cy="980" r="2.2" opacity="0.94"/><circle cx="560" cy="1020" r="1.2" opacity="0.62"/>
        <circle cx="860" cy="960" r="1.5" opacity="0.76"/><circle cx="160" cy="1280" r="1.4" opacity="0.7"/>
        <circle cx="480" cy="1320" r="1.8" opacity="0.84"/><circle cx="820" cy="1260" r="1.1" opacity="0.6"/>
        <circle cx="1080" cy="1340" r="1.7" opacity="0.82"/><circle cx="300" cy="1560" r="1.3" opacity="0.66"/>
        <circle cx="640" cy="1600" r="2" opacity="0.9"/><circle cx="980" cy="1540" r="1.2" opacity="0.64"/>
      </g>
    </svg>
  `),
  aurora: svgBackground(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="asky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#020617"/>
          <stop offset="55%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#134e4a"/>
        </linearGradient>
        <linearGradient id="aband1" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stop-color="#34d399" stop-opacity="0"/>
          <stop offset="35%" stop-color="#34d399" stop-opacity="0.35"/>
          <stop offset="70%" stop-color="#22d3ee" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="aband2" x1="0.2" y1="0" x2="0.9" y2="0.3">
          <stop offset="0%" stop-color="#67e8f9" stop-opacity="0"/>
          <stop offset="40%" stop-color="#2dd4bf" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#c084fc" stop-opacity="0.12"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="1800" fill="url(#asky)"/>
      <path d="M0 220 C200 160 360 300 560 200 C760 100 920 260 1200 180 L1200 520 C980 560 820 420 620 500 C420 580 220 460 0 520 Z" fill="url(#aband1)"/>
      <path d="M0 360 C240 280 420 440 640 340 C860 240 1040 400 1200 320 L1200 620 C1000 680 820 540 600 620 C380 700 180 580 0 640 Z" fill="url(#aband2)" opacity="0.85"/>
      <g fill="#f8fafc">
        <circle cx="90" cy="90" r="1.3" opacity="0.75"/><circle cx="220" cy="140" r="1.8" opacity="0.88"/>
        <circle cx="380" cy="70" r="1" opacity="0.55"/><circle cx="560" cy="120" r="2" opacity="0.92"/>
        <circle cx="740" cy="60" r="1.2" opacity="0.65"/><circle cx="920" cy="110" r="1.6" opacity="0.8"/>
        <circle cx="1080" cy="80" r="1.1" opacity="0.6"/><circle cx="160" cy="700" r="1.4" opacity="0.7"/>
        <circle cx="400" cy="760" r="1.7" opacity="0.84"/><circle cx="680" cy="720" r="1.2" opacity="0.64"/>
        <circle cx="940" cy="780" r="1.9" opacity="0.9"/><circle cx="240" cy="1100" r="1.3" opacity="0.68"/>
        <circle cx="520" cy="1160" r="1.5" opacity="0.76"/><circle cx="820" cy="1120" r="1.1" opacity="0.58"/>
        <circle cx="180" cy="1480" r="1.6" opacity="0.8"/><circle cx="600" cy="1520" r="2" opacity="0.9"/>
        <circle cx="980" cy="1460" r="1.3" opacity="0.66"/>
      </g>
      <path d="M0 1500 C260 1420 520 1580 800 1480 C1000 1410 1120 1540 1200 1500 L1200 1800 L0 1800 Z" fill="#0a1628" opacity="0.55"/>
    </svg>
  `),
  comet: svgBackground(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="cvoid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#020617"/>
          <stop offset="100%" stop-color="#111827"/>
        </linearGradient>
        <linearGradient id="ctail" x1="0.15" y1="0.2" x2="0.7" y2="0.55">
          <stop offset="0%" stop-color="#67e8f9" stop-opacity="0"/>
          <stop offset="45%" stop-color="#a5f3fc" stop-opacity="0.35"/>
          <stop offset="80%" stop-color="#f9a8d4" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#fda4af" stop-opacity="0.15"/>
        </linearGradient>
        <radialGradient id="chead" cx="72%" cy="28%" r="10%">
          <stop offset="0%" stop-color="#fff7ed" stop-opacity="0.95"/>
          <stop offset="40%" stop-color="#fdba74" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#fb7185" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="1800" fill="url(#cvoid)"/>
      <path d="M80 900 C260 700 420 560 620 420 C760 330 860 280 960 240 L980 280 C860 340 740 420 560 560 C380 720 220 880 60 1040 Z" fill="url(#ctail)"/>
      <rect width="1200" height="1800" fill="url(#chead)"/>
      <circle cx="920" cy="300" r="28" fill="#fffbeb" opacity="0.9"/>
      <g fill="#f8fafc">
        <circle cx="70" cy="100" r="1.2" opacity="0.7"/><circle cx="180" cy="160" r="1.8" opacity="0.88"/>
        <circle cx="320" cy="90" r="1" opacity="0.52"/><circle cx="480" cy="200" r="1.5" opacity="0.78"/>
        <circle cx="640" cy="120" r="2.1" opacity="0.92"/><circle cx="1100" cy="180" r="1.3" opacity="0.68"/>
        <circle cx="120" cy="420" r="1.4" opacity="0.72"/><circle cx="300" cy="500" r="1.7" opacity="0.84"/>
        <circle cx="520" cy="460" r="1.1" opacity="0.6"/><circle cx="200" cy="780" r="1.6" opacity="0.8"/>
        <circle cx="420" cy="840" r="1.2" opacity="0.64"/><circle cx="700" cy="900" r="1.9" opacity="0.9"/>
        <circle cx="900" cy="820" r="1.3" opacity="0.7"/><circle cx="160" cy="1120" r="1.5" opacity="0.76"/>
        <circle cx="380" cy="1180" r="1.1" opacity="0.58"/><circle cx="620" cy="1140" r="1.8" opacity="0.86"/>
        <circle cx="860" cy="1200" r="1.2" opacity="0.62"/><circle cx="1080" cy="1100" r="1.6" opacity="0.8"/>
        <circle cx="240" cy="1440" r="1.4" opacity="0.72"/><circle cx="520" cy="1500" r="2" opacity="0.9"/>
        <circle cx="800" cy="1460" r="1.3" opacity="0.66"/><circle cx="1040" cy="1520" r="1.7" opacity="0.82"/>
        <circle cx="360" cy="1680" r="1.2" opacity="0.64"/><circle cx="720" cy="1720" r="1.5" opacity="0.76"/>
      </g>
    </svg>
  `),
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: 'none',
    label: '柔和漸層',
    description: '跟隨目前色調的柔和背景',
    preview: 'linear-gradient(145deg, var(--page-base-top), var(--page-base-mid) 55%, var(--accent-soft))',
  },
  {
    id: 'night',
    label: '宇宙',
    description: '深空星河、星雲與遙遠星球',
    preview: BACKGROUND_PRESETS.night,
  },
  {
    id: 'galaxy',
    label: '銀河',
    description: '漩渦星盤與粉紫核心',
    preview: BACKGROUND_PRESETS.galaxy,
  },
  {
    id: 'nebula',
    label: '星雲',
    description: '粉紅與青藍交織的雲氣',
    preview: BACKGROUND_PRESETS.nebula,
  },
  {
    id: 'aurora',
    label: '極光',
    description: '夜空綠紫極光帶',
    preview: BACKGROUND_PRESETS.aurora,
  },
  {
    id: 'comet',
    label: '彗星',
    description: '劃過夜空的彗星尾跡',
    preview: BACKGROUND_PRESETS.comet,
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
]

const MAX_CUSTOM_EDGE = 1400
const MAX_CUSTOM_BYTES = 1_200_000

export function isBackgroundId(value: unknown): value is BackgroundId {
  return typeof value === 'string' && (BACKGROUND_IDS as readonly string[]).includes(value)
}

export function loadStoredBackground(): BackgroundId {
  try {
    const migrationKey = 'savings-system:bg-starfield-v1'
    const migrated = localStorage.getItem(migrationKey)
    const raw = localStorage.getItem(BACKGROUND_STORAGE_KEY)

    // One-time: move previous default (柔和漸層) to universe background.
    if (!migrated) {
      localStorage.setItem(migrationKey, '1')
      if (!raw || raw === 'none') {
        localStorage.setItem(BACKGROUND_STORAGE_KEY, 'night')
        return 'night'
      }
    }

    if (isBackgroundId(raw)) {
      if (raw === 'custom' && !loadCustomBackground()) return 'night'
      return raw
    }
  } catch {
    // ignore
  }
  return 'night'
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
