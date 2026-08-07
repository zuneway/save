import { useState, type ReactNode } from 'react'

export const SAVINGS_HOME_TIPS_KEY = 'savings-system:home-tips-seen'
export const PERIODIC_HOME_TIPS_KEY = 'savings-system:periodic-home-tips-seen'

interface HomeTipsProps {
  storageKey: string
  children: ReactNode
}

function hasSeenTips(storageKey: string) {
  try {
    return localStorage.getItem(storageKey) === '1'
  } catch {
    return false
  }
}

function markTipsSeen(storageKey: string) {
  try {
    localStorage.setItem(storageKey, '1')
  } catch {
    // ignore
  }
}

export function HomeTips({ storageKey, children }: HomeTipsProps) {
  const [seen, setSeen] = useState(() => hasSeenTips(storageKey))

  if (seen) return null

  return (
    <div className="home-tips">
      <p className="home-tips-text">{children}</p>
      <button
        type="button"
        className="button button-secondary button-compact home-tips-dismiss"
        onClick={() => {
          markTipsSeen(storageKey)
          setSeen(true)
        }}
      >
        知道了
      </button>
    </div>
  )
}
