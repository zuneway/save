import { useCallback, useEffect, useState } from 'react'
import {
  applyStoredTheme,
  loadStoredTheme,
  saveTheme,
  type ThemeId,
} from '../utils/theme'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => loadStoredTheme())

  useEffect(() => {
    applyStoredTheme()
  }, [])

  const setTheme = useCallback((next: ThemeId) => {
    saveTheme(next)
    setThemeState(next)
  }, [])

  return { theme, setTheme }
}
