const STAR_PATH =
  'M12 2.2 13.7 9l6.8.4-5.3 4.2 1.8 6.5L12 16.4 7 20.1l1.8-6.5L3.5 9.4 10.3 9z'

/** Soft floating decorations — stars are faint, varied size, scattered. */
const FLOATING_STARS = [
  { top: '7%', left: '6%', size: 34, opacity: 0.14, rotate: -18, delay: '0s', duration: '9s' },
  { top: '11%', left: '78%', size: 12, opacity: 0.1, rotate: 28, delay: '-1.4s', duration: '7.5s' },
  { top: '18%', left: '42%', size: 9, opacity: 0.08, rotate: 8, delay: '-3.2s', duration: '11s' },
  { top: '26%', left: '88%', size: 22, opacity: 0.12, rotate: -42, delay: '-2s', duration: '8.2s' },
  { top: '31%', left: '14%', size: 16, opacity: 0.09, rotate: 55, delay: '-4.1s', duration: '10s' },
  { top: '39%', left: '61%', size: 7, opacity: 0.07, rotate: -12, delay: '-0.8s', duration: '6.8s' },
  { top: '48%', left: '3%', size: 26, opacity: 0.11, rotate: 16, delay: '-5s', duration: '12s' },
  { top: '52%', left: '71%', size: 14, opacity: 0.09, rotate: -33, delay: '-2.7s', duration: '8.8s' },
  { top: '61%', left: '29%', size: 10, opacity: 0.08, rotate: 40, delay: '-6.2s', duration: '9.4s' },
  { top: '68%', left: '91%', size: 19, opacity: 0.1, rotate: -8, delay: '-1.1s', duration: '7.2s' },
  { top: '74%', left: '18%', size: 8, opacity: 0.07, rotate: 22, delay: '-3.8s', duration: '10.5s' },
  { top: '79%', left: '54%', size: 30, opacity: 0.12, rotate: -50, delay: '-4.6s', duration: '11.5s' },
  { top: '86%', left: '82%', size: 11, opacity: 0.08, rotate: 14, delay: '-2.2s', duration: '8s' },
  { top: '91%', left: '37%', size: 17, opacity: 0.09, rotate: -25, delay: '-5.5s', duration: '9.8s' },
  { top: '15%', left: '58%', size: 6, opacity: 0.06, rotate: 70, delay: '-7s', duration: '6.4s' },
] as const

const SPARKS = [
  { top: '22%', left: '33%', size: 4, delay: '0s', color: 'var(--accent)' },
  { top: '44%', left: '84%', size: 3, delay: '-1.3s', color: 'var(--success-bright)' },
  { top: '63%', left: '47%', size: 5, delay: '-2.4s', color: 'var(--warn)' },
  { top: '83%', left: '11%', size: 3, delay: '-0.6s', color: 'var(--accent)' },
  { top: '35%', left: '9%', size: 4, delay: '-3.1s', color: 'var(--success-bright)' },
] as const

export function BrandDecor() {
  return (
    <div className="brand-decor" aria-hidden="true">
      <span className="brand-decor-blob brand-decor-blob-a" />
      <span className="brand-decor-blob brand-decor-blob-b" />
      <span className="brand-decor-blob brand-decor-blob-c" />

      {FLOATING_STARS.map((star, index) => (
        <span
          key={`star-${index}`}
          className="brand-decor-star"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ transform: `rotate(${star.rotate}deg)` }}
          >
            <path d={STAR_PATH} />
          </svg>
        </span>
      ))}

      {SPARKS.map((spark, index) => (
        <span
          key={`spark-${index}`}
          className="brand-decor-spark"
          style={{
            top: spark.top,
            left: spark.left,
            width: spark.size,
            height: spark.size,
            background: spark.color,
            animationDelay: spark.delay,
            opacity: 0.28,
          }}
        />
      ))}
    </div>
  )
}

export function EmptyStarArt() {
  return (
    <div className="empty-art" aria-hidden="true">
      <svg className="empty-art-svg" viewBox="0 0 160 120" fill="none">
        <ellipse cx="80" cy="98" rx="48" ry="8" fill="var(--accent-soft)" opacity="0.75" />
        <path
          d="M80 18 88 46l29 2-23 18 8 28-24-16-24 16 8-28-23-18 29-2z"
          fill="var(--accent)"
        />
        <circle cx="34" cy="36" r="5" fill="var(--success-bright)" opacity="0.9" />
        <circle cx="128" cy="44" r="4" fill="var(--warn)" opacity="0.95" />
        <path
          d="M118 70h16M126 62v16"
          stroke="var(--accent-deep)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M28 68h12M34 62v12"
          stroke="var(--success)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
