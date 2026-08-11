import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { applyStoredBackground } from './utils/background'
import { applyStoredFont } from './utils/font'
import { applyStoredLogo } from './utils/logo'
import { applyStoredTheme } from './utils/theme'
import './index.css'

applyStoredTheme()
applyStoredBackground()
applyStoredLogo()
applyStoredFont()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
