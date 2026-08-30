import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { applyTheme, readStoredTheme } from './app/theme'
import './styles/index.css'

// Theme vor dem ersten Paint setzen, damit es nicht kurz aufblitzt.
applyTheme(readStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
