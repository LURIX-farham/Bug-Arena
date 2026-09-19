import { createContext } from 'react'

export const ThemeContext = createContext(null)

export const THEME_STORAGE_KEY = 'bug-arena:theme'
export const THEMES = Object.freeze({ DARK: 'dark', LIGHT: 'light' })
