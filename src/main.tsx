import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { applyStoredBackground } from './utils/background'
import { applyStoredTheme } from './utils/theme'
import './index.css'

applyStoredTheme()
applyStoredBackground()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
