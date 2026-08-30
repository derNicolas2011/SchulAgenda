import { useEffect } from 'react'
import type { ThemePreference } from '@/domain/types'

const STORAGE_KEY = 'agenda.theme'

export function readStoredTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    /* Private Browsing o. ä. – System-Einstellung ist ein guter Default. */
  }
  return 'system'
}

export function storeTheme(theme: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* nicht kritisch */
  }
}

/** `system` setzt bewusst kein Attribut – dann greift die
 *  `prefers-color-scheme`-Regel aus tokens.css. */
export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

export function useTheme(theme: ThemePreference | undefined) {
  useEffect(() => {
    if (!theme) return
    applyTheme(theme)
    storeTheme(theme)
  }, [theme])
}
