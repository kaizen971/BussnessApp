import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { StyleSheet } from 'react-native'
import { defaultTheme, themeOptions, themes } from '../utils/colors'
import { normalizeStyleSheet } from '../utils/designSystem'

const STORAGE_KEY = '@eas_theme'
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(defaultTheme.id)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedThemeId) => {
        if (storedThemeId && themes[storedThemeId]) setThemeId(storedThemeId)
      })
      .catch(() => {})
  }, [])

  const setTheme = (nextThemeId) => {
    if (!themes[nextThemeId]) return
    setThemeId(nextThemeId)
    AsyncStorage.setItem(STORAGE_KEY, nextThemeId).catch(() => {})
  }

  const theme = themes[themeId] || defaultTheme
  const value = useMemo(() => ({
    theme,
    themes: themeOptions,
    colors: theme.colors,
    gradients: theme.gradients,
    isDark: theme.isDark !== false,
    setTheme,
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme doit être utilisé dans ThemeProvider')
  return context
}

export function useThemedStyles(createStyles) {
  const { colors } = useTheme()
  return useMemo(
    () => StyleSheet.create(normalizeStyleSheet(createStyles(colors), colors)),
    [colors, createStyles],
  )
}
