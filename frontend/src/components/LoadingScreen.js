import React from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'
import { useTheme, useThemedStyles } from '../contexts/ThemeContext'
import { radius, spacing, typography } from '../utils/designSystem'

const logo = require('../assets/icon/dashboard.png')

export const LoadingScreen = ({ label = 'Chargement…' }) => {
  const { colors } = useTheme()
  const styles = useThemedStyles(createStyles)

  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <View style={styles.logoFrame}>
        <Image source={logo} style={styles.logo} />
      </View>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const createStyles = (colors) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  logoFrame: {
    width: 64,
    height: 64,
    marginBottom: spacing.xl,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  label: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
})
