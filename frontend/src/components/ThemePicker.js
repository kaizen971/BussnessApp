import React, { useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, useThemedStyles } from '../contexts/ThemeContext'

export function ThemePicker({ mode = 'icon' }) {
  const { theme, themes, colors, setTheme } = useTheme()
  const styles = useThemedStyles(createStyles)
  const [visible, setVisible] = useState(false)

  return (
    <>
      <TouchableOpacity
        style={mode === 'row' ? styles.rowTrigger : styles.trigger}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Changer le thème"
        activeOpacity={0.75}
      >
        {mode === 'row' ? (
          <>
            <View style={styles.rowIcon}>
              <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Apparence</Text>
              <Text style={styles.rowValue}>{theme.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </>
        ) : (
          <Ionicons name="color-palette-outline" size={21} color={colors.text} />
        )}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Apparence</Text>
                <Text style={styles.subtitle}>Thème de l’application</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={22} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {themes.map((item) => {
              const selected = item.id === theme.id
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => {
                    setTheme(item.id)
                    setVisible(false)
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.swatch, { backgroundColor: item.preview[0] }]}>
                    <View style={[styles.swatchAccent, { backgroundColor: item.preview[1] }]} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionName, selected && styles.optionNameSelected]}>{item.name}</Text>
                    <Text style={styles.optionDescription}>{item.description}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </Modal>
    </>
  )
}

const createStyles = (colors) => ({
  trigger: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderRadius: 10,
  },
  rowTrigger: {
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
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: colors.overlay,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: 18,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 14,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textLight,
    fontSize: 13,
    marginTop: 3,
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
  },
  option: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: `${colors.primary}18`,
    borderColor: `${colors.primary}55`,
  },
  swatch: {
    width: 46,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 5,
  },
  swatchAccent: {
    width: 17,
    height: 17,
    borderRadius: 9,
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
  },
  optionName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  optionNameSelected: {
    color: colors.primary,
  },
  optionDescription: {
    color: colors.textLight,
    fontSize: 12.5,
    marginTop: 3,
  },
})
