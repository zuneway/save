import { useCallback, useEffect, useState } from 'react'
import {
  applyStoredLogo,
  loadStoredLogo,
  saveLogo,
  type LogoId,
} from '../utils/logo'

export function useLogo() {
  const [logo, setLogoState] = useState<LogoId>(() => loadStoredLogo())

  useEffect(() => {
    applyStoredLogo()
  }, [])

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<LogoId>).detail
      if (detail) setLogoState(detail)
      else setLogoState(loadStoredLogo())
    }
    window.addEventListener('savings-logo-change', onChange)
    return () => window.removeEventListener('savings-logo-change', onChange)
  }, [])

  const setLogo = useCallback((next: LogoId) => {
    saveLogo(next)
    setLogoState(next)
  }, [])

  return { logo, setLogo }
}
