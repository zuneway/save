import { useCallback, useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {
  APP_VERSION,
  isNewerAppVersion,
  shouldShowReleaseNotes,
} from '../config/appVersion'

const CHECK_INTERVAL_MS = 60_000

export type RemoteVersionInfo = {
  version: string
  notes: string[]
}

function versionUrl() {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}version.json?t=${Date.now()}`
}

function normalizeNotes(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function fetchRemoteVersion(): Promise<RemoteVersionInfo | null> {
  try {
    const response = await fetch(versionUrl(), { cache: 'no-store' })
    if (!response.ok) return null
    const data = (await response.json()) as { version?: unknown; notes?: unknown }
    const version =
      typeof data.version === 'string' || typeof data.version === 'number'
        ? String(data.version)
        : null
    if (!version) return null
    return { version, notes: normalizeNotes(data.notes) }
  } catch {
    return null
  }
}

export function useAppUpdate() {
  const [versionMismatch, setVersionMismatch] = useState(false)
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null)
  const [remoteNotes, setRemoteNotes] = useState<string[]>([])

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const check = () => {
        void registration.update().catch(() => {
          // ignore offline / aborted checks
        })
      }
      check()
      window.setInterval(check, CHECK_INTERVAL_MS)
    },
  })

  const checkVersionFile = useCallback(async () => {
    const remote = await fetchRemoteVersion()
    if (!remote) return
    setRemoteVersion(remote.version)
    setRemoteNotes(remote.notes)
    if (isNewerAppVersion(remote.version, APP_VERSION)) setVersionMismatch(true)
  }, [])

  useEffect(() => {
    void checkVersionFile()
    const timer = window.setInterval(() => {
      void checkVersionFile()
    }, CHECK_INTERVAL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkVersionFile()
    }
    const onFocus = () => {
      void checkVersionFile()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [checkVersionFile])

  const updateAvailable = needRefresh || versionMismatch
  const showFeatureNotes =
    Boolean(remoteVersion) &&
    shouldShowReleaseNotes(APP_VERSION, remoteVersion ?? APP_VERSION) &&
    remoteNotes.length > 0

  const applyUpdate = useCallback(async () => {
    try {
      await updateServiceWorker(true)
    } catch {
      // fall through to hard reload
    }
    setNeedRefresh(false)
    window.location.reload()
  }, [setNeedRefresh, updateServiceWorker])

  return {
    updateAvailable,
    localVersion: APP_VERSION,
    remoteVersion,
    remoteNotes,
    showFeatureNotes,
    applyUpdate,
  }
}
