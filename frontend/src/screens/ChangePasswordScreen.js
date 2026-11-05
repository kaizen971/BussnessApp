import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { authAPI } from '../services/api';
import { useTheme, useThemedStyles } from '../contexts/ThemeContext';
import { radius, spacing, typography } from '../utils/designSystem';
import { t, useLanguage } from '../i18n';

const MIN_PASSWORD_LENGTH = 6;

export const ChangePasswordScreen = ({ navigation }) => {
  useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field] || errors.submit) {
      setErrors((current) => ({ ...current, [field]: undefined, submit: undefined }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.currentPassword) {
      nextErrors.currentPassword = t('Saisissez votre mot de passe actuel.');
    }
    if (!form.newPassword) {
      nextErrors.newPassword = t('Saisissez un nouveau mot de passe.');
    } else if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      nextErrors.newPassword = t('Utilisez au moins {MIN_PASSWORD_LENGTH} caractères.', { MIN_PASSWORD_LENGTH: MIN_PASSWORD_LENGTH });
    } else if (form.newPassword === form.currentPassword) {
      nextErrors.newPassword = t('Le nouveau mot de passe doit être différent de l’ancien.');
    }
    if (!form.confirmPassword) {
      nextErrors.confirmPassword = t('Confirmez le nouveau mot de passe.');
    } else if (form.confirmPassword !== form.newPassword) {
      nextErrors.confirmPassword = t('Les mots de passe ne correspondent pas.');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await authAPI.changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
      Alert.alert(
        t('Mot de passe modifié'),
        t('Votre nouveau mot de passe est maintenant actif.'),
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      const status = error.response?.status;
      const message = status === 401
        ? t('Le mot de passe actuel est incorrect.')
        : error.response?.data?.error || t('Impossible de modifier le mot de passe. Réessayez.');
      setErrors({ submit: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>{t('Sécurisez votre compte')}</Text>
          <Text style={styles.description}>
            {t('Choisissez un mot de passe différent de l’actuel et contenant au moins {MIN_PASSWORD_LENGTH} caractères.', { MIN_PASSWORD_LENGTH: MIN_PASSWORD_LENGTH })}
          </Text>
        </View>

        <Card style={styles.formCard}>
          <Input
            label={t('Mot de passe actuel')}
            value={form.currentPassword}
            onChangeText={(value) => updateField('currentPassword', value)}
            placeholder={t('Saisissez votre mot de passe actuel')}
            secureTextEntry
            icon="key-outline"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            autoComplete="current-password"
            error={errors.currentPassword}
          />
          <Input
            label={t('Nouveau mot de passe')}
            value={form.newPassword}
            onChangeText={(value) => updateField('newPassword', value)}
            placeholder={t('Au moins {MIN_PASSWORD_LENGTH} caractères', { MIN_PASSWORD_LENGTH: MIN_PASSWORD_LENGTH })}
            secureTextEntry
            icon="lock-closed-outline"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            autoComplete="new-password"
            error={errors.newPassword}
          />
          <Input
            label={t('Confirmer le nouveau mot de passe')}
            value={form.confirmPassword}
            onChangeText={(value) => updateField('confirmPassword', value)}
            placeholder={t('Retapez le nouveau mot de passe')}
            secureTextEntry
            icon="shield-checkmark-outline"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            error={errors.confirmPassword}
          />

          {errors.submit ? (
            <View style={styles.submitError}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={styles.submitErrorText}>{errors.submit}</Text>
            </View>
          ) : null}

          <Button
            title={t('Modifier le mot de passe')}
            icon="shield-checkmark-outline"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            size="large"
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  intro: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}16`,
    borderWidth: 1,
    borderColor: `${colors.primary}35`,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: spacing.xs,
    maxWidth: 420,
  },
  formCard: {
    padding: spacing.lg,
  },
  submitError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: `${colors.error}12`,
    borderWidth: 1,
    borderColor: `${colors.error}40`,
  },
  submitErrorText: {
    flex: 1,
    ...typography.caption,
    color: colors.error,
  },
});
