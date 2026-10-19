import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, useThemedStyles } from '../contexts/ThemeContext'
import { LANGUAGES, useI18n } from '../i18n'

// mode="row"     : ligne de réglage (écran Plus)
// mode="compact" : petit sélecteur FR | EN (écrans de connexion / inscription)
export function LanguagePicker({ mode = 'row', style }) {
  const { colors } = useTheme()
  const styles = useThemedStyles(createStyles)
  const { language, setLanguage, t } = useI18n()

  const segments = (
    <View style={[styles.segments, mode === 'compact' && styles.segmentsCompact]}>
      {LANGUAGES.map((lang) => {
        const selected = lang.code === language
        return (
          <TouchableOpacity
            key={lang.code}
            style={[styles.segment, mode === 'compact' && styles.segmentCompact, selected && styles.segmentSelected]}
            onPress={() => setLanguage(lang.code)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={lang.label}
            activeOpacity={0.75}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{lang.short}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )

  if (mode === 'compact') {
    return <View style={style}>{segments}</View>
  }

  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]

  return (
    <View style={[styles.row, style]}>
      <View style={styles.rowIcon}>
        <Ionicons name="language-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{t('Langue')}</Text>
        <Text style={styles.rowValue}>{current.label}</Text>
      </View>
      {segments}
    </View>
  )
}

const createStyles = (colors) => ({
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: `${colors.primary}18`,
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowValue: {
    color: colors.textLight,
    fontSize: 12,
    marginTop: 2,
  },
  segments: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentsCompact: {
    alignSelf: 'flex-end',
  },
  segment: {
    minWidth: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  segmentCompact: {
    minWidth: 40,
    height: 30,
  },
  segmentSelected: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textLight,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextSelected: {
    color: colors.onPrimary,
  },
})
