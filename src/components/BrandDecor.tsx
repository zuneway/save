/** Soft floating star / blob decorations for a youthful brand feel. */
export function BrandDecor() {
  return (
    <div className="brand-decor" aria-hidden="true">
      <span className="brand-decor-blob brand-decor-blob-a" />
      <span className="brand-decor-blob brand-decor-blob-b" />
      <span className="brand-decor-blob brand-decor-blob-c" />
      <svg className="brand-decor-star brand-decor-star-1" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.2 13.7 9l6.8.4-5.3 4.2 1.8 6.5L12 16.4 7 20.1l1.8-6.5L3.5 9.4 10.3 9z" />
      </svg>
      <svg className="brand-decor-star brand-decor-star-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3.5 13.2 8.4l5 .5-3.8 3.1 1.2 4.8L12 14.4 8.4 16.8l1.2-4.8-3.8-3.1 5-.5z" />
      </svg>
      <svg className="brand-decor-star brand-decor-star-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.8 13.4 8l5.6.4-4.4 3.5 1.5 5.4L12 14.4 8 17.3l1.5-5.4L5 8.4 10.6 8z" />
      </svg>
      <svg className="brand-decor-star brand-decor-star-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4 13 8.2l4.3.4-3.3 2.6 1 4.1L12 13.2 8 15.3l1-4.1-3.3-2.6L10 8.2z" />
      </svg>
      <span className="brand-decor-spark brand-decor-spark-1" />
      <span className="brand-decor-spark brand-decor-spark-2" />
      <span className="brand-decor-spark brand-decor-spark-3" />
    </div>
  )
}

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <path
          d="M24 10.5 26.4 19.2l9.1.5-7.2 5.7 2.5 8.7L24 29.2l-6.8 4.9 2.5-8.7-7.2-5.7 9.1-.5z"
          fill="currentColor"
        />
      </svg>
    </span>
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
