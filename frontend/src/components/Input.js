import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../contexts/ThemeContext';
import { control, radius, spacing, typography } from '../utils/designSystem';

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  icon,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, focused && styles.inputFocused, error && styles.inputError]}>
        {icon && (
          <Ionicons name={icon} size={20} color={colors.textSecondary} style={styles.icon} />
        )}
        <TextInput
          style={[styles.input, multiline && styles.multiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          secureTextEntry={isSecure}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setIsSecure(!isSecure)} style={styles.eyeIcon}>
            <Ionicons
              name={isSecure ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const createStyles = (colors) => ({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    minHeight: control.height,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xxs,
  },
});
