import React from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, useThemedStyles } from '../contexts/ThemeContext'
import { control, radius, spacing, typography } from '../utils/designSystem'

export function SearchField({ value, onChangeText, placeholder = 'Rechercher…', style }) {
  const { colors } = useTheme()
  const styles = useThemedStyles(createStyles)

  return (
    <View style={[styles.searchField, style]}>
      <Ionicons name="search-outline" size={19} color={colors.textLight} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        returnKeyType="search"
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />
      {value ? (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
        >
          <Ionicons name="close-circle" size={19} color={colors.textLight} />
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export function EmptyState({ icon, title, description, actionLabel, onAction, compact = false }) {
  const { colors } = useTheme()
  const styles = useThemedStyles(createStyles)

  return (
    <View style={[styles.emptyState, compact && styles.emptyStateCompact]}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction} accessibilityRole="button">
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export function SegmentedControl({ options, value, onChange, style }) {
  const { colors } = useTheme()
  const styles = useThemedStyles(createStyles)

  return (
    <View style={[styles.segments, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.segment, selected && styles.segmentSelected]}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            {option.icon ? <Ionicons name={option.icon} size={16} color={selected ? colors.onPrimary : colors.textLight} /> : null}
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]} numberOfLines={1}>{option.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export function FloatingActionButton({ icon = 'add', label, onPress, bottom = 24, color }) {
  const { colors } = useTheme()
  const styles = useThemedStyles(createStyles)

  return (
    <TouchableOpacity
      style={[styles.floatingAction, { bottom, backgroundColor: color || colors.primary }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={24} color={colors.onPrimary} />
    </TouchableOpacity>
  )
}

const createStyles = (colors) => ({
  searchField: {
    minHeight: control.height,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    color: colors.text,
    fontSize: 15,
  },
  clearButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyStateCompact: {
    minHeight: 160,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: `${colors.primary}14`,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.sectionTitle,
    color: colors.text,
    textAlign: 'center',
  },
  emptyDescription: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  emptyAction: {
    minHeight: control.compactHeight,
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emptyActionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  segments: {
    minHeight: 44,
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  segmentSelected: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: colors.onPrimary,
  },
  floatingAction: {
    position: 'absolute',
    right: spacing.md,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
})
