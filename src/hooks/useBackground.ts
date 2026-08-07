import { useCallback, useEffect, useState } from 'react'
import {
  applyStoredBackground,
  compressBackgroundImage,
  loadCustomBackground,
  loadStoredBackground,
  saveBackground,
  type BackgroundId,
} from '../utils/background'

export function useBackground() {
  const [background, setBackgroundState] = useState<BackgroundId>(() => loadStoredBackground())
  const [customPreview, setCustomPreview] = useState<string | null>(() => loadCustomBackground())

  useEffect(() => {
    applyStoredBackground()
  }, [])

  const setBackground = useCallback((next: BackgroundId) => {
    saveBackground(next)
    setBackgroundState(next)
    if (next === 'custom') setCustomPreview(loadCustomBackground())
  }, [])

  const uploadBackground = useCallback(async (file: File) => {
    const dataUrl = await compressBackgroundImage(file)
    saveBackground('custom', dataUrl)
    setCustomPreview(dataUrl)
    setBackgroundState('custom')
  }, [])

  return {
    background,
    customPreview,
    setBackground,
    uploadBackground,
  }
}
