import { useCallback, useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { APP_VERSION } from '../config/appVersion'

const CHECK_INTERVAL_MS = 60_000

function versionUrl() {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}version.json?t=${Date.now()}`
}

async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const response = await fetch(versionUrl(), { cache: 'no-store' })
    if (!response.ok) return null
    const data = (await response.json()) as { version?: unknown }
    return typeof data.version === 'string' || typeof data.version === 'number'
      ? String(data.version)
      : null
  } catch {
    return null
  }
}

export function useAppUpdate() {
  const [versionMismatch, setVersionMismatch] = useState(false)
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null)

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
    setRemoteVersion(remote)
    if (remote !== APP_VERSION) setVersionMismatch(true)
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
    applyUpdate,
  }
}
