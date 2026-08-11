import { useCallback, useEffect, useState } from 'react'
import {
  applyStoredFont,
  loadStoredFont,
  saveFont,
  type FontId,
} from '../utils/font'

export function useFont() {
  const [font, setFontState] = useState<FontId>(() => loadStoredFont())

  useEffect(() => {
    applyStoredFont()
  }, [])

  const setFont = useCallback((next: FontId) => {
    saveFont(next)
    setFontState(next)
  }, [])

  return { font, setFont }
}
