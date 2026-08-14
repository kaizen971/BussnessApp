import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, useThemedStyles } from '../contexts/ThemeContext'
import { control, radius, spacing } from '../utils/designSystem'
import { monthKey, monthLabel, shiftMonth, startOfMonth } from '../utils/monthPeriod'

export function MonthNavigator({ value, onChange, minimumDate, maximumDate = new Date(), style }) {
  const { colors } = useTheme()
  const styles = useThemedStyles(createStyles)
  const selected = startOfMonth(value)
  const minimum = minimumDate ? startOfMonth(minimumDate) : null
  const maximum = startOfMonth(maximumDate)
  const previous = shiftMonth(selected, -1)
  const next = shiftMonth(selected, 1)
  const previousDisabled = minimum ? monthKey(previous) < monthKey(minimum) : false
  const nextDisabled = monthKey(next) > monthKey(maximum)

  const changeMonth = (date, disabled) => {
    if (!disabled) onChange(date)
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.arrowButton, previousDisabled && styles.arrowButtonDisabled]}
        onPress={() => changeMonth(previous, previousDisabled)}
        disabled={previousDisabled}
        accessibilityRole="button"
        accessibilityLabel="Mois précédent"
        accessibilityState={{ disabled: previousDisabled }}
      >
        <Ionicons name="chevron-back" size={20} color={previousDisabled ? colors.textLight : colors.text} />
      </TouchableOpacity>

      <View style={styles.labelContainer}>
        <Ionicons name="calendar-outline" size={17} color={colors.primary} />
        <Text style={styles.label} numberOfLines={1}>{monthLabel(selected)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.arrowButton, nextDisabled && styles.arrowButtonDisabled]}
        onPress={() => changeMonth(next, nextDisabled)}
        disabled={nextDisabled}
        accessibilityRole="button"
        accessibilityLabel="Mois suivant"
        accessibilityState={{ disabled: nextDisabled }}
      >
        <Ionicons name="chevron-forward" size={20} color={nextDisabled ? colors.textLight : colors.text} />
      </TouchableOpacity>
    </View>
  )
}

const createStyles = (colors) => ({
  container: {
    minHeight: control.height,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
  arrowButton: {
    width: control.height,
    height: control.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButtonDisabled: {
    opacity: 0.35,
  },
  labelContainer: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  label: {
    minWidth: 0,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
})
