import { useEffect, useMemo, useState } from 'react'

import { ThemeContext, THEME_STORAGE_KEY, THEMES } from './ThemeContext'

function getInitialTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === THEMES.LIGHT || stored === THEMES.DARK) return stored

    // Respect the OS preference on first visit, but default to DARK to preserve
    // the original Bug Arena look the user already knows.
    if (typeof window.matchMedia === 'function') {
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
      if (prefersLight) return THEMES.LIGHT
    }
  } catch {
    // Storage or matchMedia might be unavailable — fall through to default.
  }
  return THEMES.DARK
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Ignore storage failures — the UI should still work.
    }
    const root = document.documentElement
    root.dataset.theme = theme
    root.style.colorScheme = theme
  }, [theme])

  const value = useMemo(() => ({
    theme,
    setTheme,
    isDark: theme === THEMES.DARK,
    isLight: theme === THEMES.LIGHT,
    toggleTheme: () => setTheme((current) => (current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK)),
    themes: [THEMES.DARK, THEMES.LIGHT],
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeProvider
