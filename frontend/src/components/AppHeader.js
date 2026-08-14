import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, useThemedStyles } from '../contexts/ThemeContext'
import { control, radius, spacing } from '../utils/designSystem'

export function AppHeader({ title, subtitle, onBack, rightIcon, onRightPress, rightLabel }) {
  const { colors } = useTheme()
  const styles = useThemedStyles(createStyles)

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </TouchableOpacity>
        ) : <View style={styles.sidePlaceholder} />}

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        {rightIcon && onRightPress ? (
          <TouchableOpacity
            style={[styles.iconButton, styles.primaryButton]}
            onPress={onRightPress}
            accessibilityRole="button"
            accessibilityLabel={rightLabel || title}
          >
            <Ionicons name={rightIcon} size={21} color={colors.onPrimary} />
          </TouchableOpacity>
        ) : <View style={styles.sidePlaceholder} />}
      </View>
    </View>
  )
}

const createStyles = (colors) => ({
  header: {
    paddingTop: 52,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    minHeight: control.iconSize,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: control.iconSize,
    height: control.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sidePlaceholder: {
    width: control.iconSize,
    height: control.iconSize,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textLight,
    fontSize: 12,
    marginTop: 2,
  },
})
