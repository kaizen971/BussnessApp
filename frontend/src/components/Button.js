import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../contexts/ThemeContext';
import { control, radius, spacing } from '../utils/designSystem';

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 6,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const buttonStyles = [
    styles.button,
    styles[variant],
    variant !== 'primary' && styles[size],
    disabled && styles.disabled,
    style
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle
  ];

  const renderButtonContent = () => {
    const content = loading ? (
      <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : variant === 'outline' || variant === 'ghost' ? colors.primary : '#fff'} />
    ) : (
      <>
        {icon && iconPosition === 'left' && <Ionicons name={icon} size={18} color={variant === 'primary' ? colors.onPrimary : variant === 'danger' ? '#fff' : colors.primary} />}
        <Text style={textStyles}>{title}</Text>
        {icon && iconPosition === 'right' && <Ionicons name={icon} size={18} color={variant === 'primary' ? colors.onPrimary : variant === 'danger' ? '#fff' : colors.primary} />}
      </>
    );

    if (variant === 'primary') {
      return (
        <View style={[styles.gradientButton, styles[size]]}>
          {content}
        </View>
      );
    }

    return content;
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      <TouchableOpacity
        style={[buttonStyles, variant === 'primary' && styles.primaryWrapper]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        {renderButtonContent()}
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (colors) => ({
  button: {
    minHeight: control.height,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  primary: {
    overflow: 'hidden',
  },
  primaryWrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  gradientButton: {
    width: '100%',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  secondary: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  small: {
    minHeight: control.compactHeight,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  large: {
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  text: {
    fontWeight: '600',
  },
  primaryText: {
    color: colors.onPrimary,
  },
  secondaryText: {
    color: colors.text,
  },
  outlineText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },
  dangerText: {
    color: '#fff',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});
