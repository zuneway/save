import { useCallback, useEffect, useState } from 'react'
import {
  APP_RELEASE_NOTES,
  APP_VERSION,
  shouldShowReleaseNotes,
} from '../config/appVersion'

const LAST_SEEN_VERSION_KEY = 'savings-system:last-seen-version'

function readLastSeenVersion(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_VERSION_KEY)
  } catch {
    return null
  }
}

function writeLastSeenVersion(version: string) {
  try {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, version)
  } catch {
    // ignore quota / private mode
  }
}

/**
 * After a major/minor bump lands in the running app, show release notes once.
 * Patch bumps and first visit only record the version silently.
 */
export function useWhatsNew() {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<string[]>([])

  useEffect(() => {
    const lastSeen = readLastSeenVersion()
    if (lastSeen === APP_VERSION) return

    // No stored version yet: treat as coming from the first public release (1.0.0)
    // so major/minor landings still show notes; pure first-open of 1.0.x stays quiet.
    const previous = lastSeen ?? '1.0.0'

    if (shouldShowReleaseNotes(previous, APP_VERSION) && APP_RELEASE_NOTES.length > 0) {
      setNotes(APP_RELEASE_NOTES)
      setOpen(true)
      return
    }

    writeLastSeenVersion(APP_VERSION)
  }, [])

  const dismiss = useCallback(() => {
    writeLastSeenVersion(APP_VERSION)
    setOpen(false)
  }, [])

  return { open, notes, version: APP_VERSION, dismiss }
}
