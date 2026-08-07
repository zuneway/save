import { useEffect, useId, useMemo, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

interface MilestoneCelebrationProps {
  goal: number | null
  isOpenEnded?: boolean
  onClose: () => void
}

const PARTICLE_COUNT = 28

export function MilestoneCelebration({
  goal,
  isOpenEnded = true,
  onClose,
}: MilestoneCelebrationProps) {
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, index) => {
        const angle = (360 / PARTICLE_COUNT) * index + (index % 3) * 8
        const distance = 90 + (index % 5) * 22
        const delay = (index % 7) * 0.03
        const size = 6 + (index % 4) * 3
        const hue = [145, 210, 45, 280, 20][index % 5]
        return { angle, distance, delay, size, hue }
      }),
    [],
  )

  useEffect(() => {
    if (goal == null) return
    const timer = window.setTimeout(() => onCloseRef.current(), 2800)
    return () => window.clearTimeout(timer)
  }, [goal])

  if (goal == null) return null

  return createPortal(
    <div className="milestone-celebration-root" role="presentation" onClick={onClose}>
      <div
        className="milestone-celebration-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="milestone-celebration-burst" aria-hidden="true">
          {particles.map((particle, index) => (
            <span
              key={index}
              className="milestone-celebration-particle"
              style={
                {
                  '--angle': `${particle.angle}deg`,
                  '--distance': `${particle.distance}px`,
                  '--delay': `${particle.delay}s`,
                  '--size': `${particle.size}px`,
                  '--hue': String(particle.hue),
                } as CSSProperties
              }
            />
          ))}
        </div>

        <p className="milestone-celebration-eyebrow">
          {isOpenEnded ? '階段達成' : '目標達成'}
        </p>
        <h2 id={titleId} className="milestone-celebration-title">
          恭喜達標！
        </h2>
        <p className="milestone-celebration-amount">{goal.toLocaleString('zh-TW')}</p>
        <p className="milestone-celebration-hint">
          {isOpenEnded ? '繼續累積，挑戰下一階目標' : '計畫目標已完成'}
        </p>
        <button type="button" className="button button-primary" onClick={onClose}>
          太棒了
        </button>
      </div>
    </div>,
    document.body,
  )
}
