import React from 'react'
import { View } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'

export function ToneSurface({
  colors: tones,
  style,
  children,
  start: _start,
  end: _end,
  locations: _locations,
  ...props
}) {
  const { colors } = useTheme()
  const backgroundColor = Array.isArray(tones) && tones.length > 0 ? tones[0] : colors.surface

  return (
    <View {...props} style={[{ backgroundColor }, style]}>
      {children}
    </View>
  )
}
