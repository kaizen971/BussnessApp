import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme, useThemedStyles } from '../contexts/ThemeContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { t, useLanguage } from '../i18n';

// Affiché à la place de l'app quand l'essai / l'abonnement du business est terminé.
// Le compte reste connectable : l'admin peut s'abonner, actualiser, se déconnecter ou supprimer
// son compte (exigences App Review) ; un employé est invité à contacter son responsable.

const periodLabel = (offer) => {
  if (offer.durationType === 'lifetime') return t('à vie');
  if (offer.duration === 1) return { days: t('jour'), months: t('mois'), years: t('an') }[offer.durationType] || offer.durationType;
  return `${offer.duration} ${{ days: t('jour(s)'), months: t('mois'), years: t('an(s)') }[offer.durationType] || offer.durationType}`;
};

export const SubscriptionLockedScreen = ({ navigation }) => {
  useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, logout, deleteAccount } = useAuth();
  const { access, refreshSubscription } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isOwner = access?.isOwner === true;
  const offer = access?.offer;
  // Sur iOS, l'abonnement passe par l'App Store : pas de lien de paiement externe dans l'app
  const canPayByCard = Platform.OS !== 'ios' && !!offer?.payUrl;

  const title = !isOwner
    ? t('Accès suspendu')
    : access?.reason === 'trial_expired'
      ? t('Votre période d\'essai est terminée')
      : access?.reason === 'subscription_suspended'
        ? t('Votre abonnement est suspendu')
        : t('Votre abonnement a expiré');

  const message = isOwner
    ? t('Toutes vos données sont conservées. Choisissez un abonnement pour retrouver l\'accès à votre business.')
    : t('L\'abonnement de votre business a expiré. Contactez votre responsable pour le renouveler.');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSubscription();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePayByCard = async () => {
    try {
      await Linking.openURL(offer.payUrl);
    } catch (e) {
      Alert.alert(t('Erreur'), t('Impossible d\'ouvrir la page de paiement.'));
    }
  };

  const handleDelete = async () => {
    if (!password) {
      Alert.alert(t('Erreur'), t('Veuillez saisir votre mot de passe pour confirmer.'));
      return;
    }
    setDeleting(true);
    const result = await deleteAccount(password);
    setDeleting(false);
    if (!result?.success) {
      Alert.alert(t('Erreur'), result?.error || t('Impossible de supprimer le compte.'));
      return;
    }
    setDeleteVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrap}>
          <Ionicons name={isOwner ? 'time-outline' : 'lock-closed-outline'} size={40} color={colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {!!(user?.fullName || user?.username) && (
          <Text style={styles.account}>{user.fullName || user.username}</Text>
        )}
        <Text style={styles.message}>{message}</Text>

        {isOwner && offer && (
          <View style={styles.offerCard}>
            <Text style={styles.offerLabel}>{t('Offre recommandée')}</Text>
            <Text style={styles.offerName}>{offer.name}</Text>
            <Text style={styles.offerPrice}>
              {offer.price} {offer.currency === 'EUR' ? '€' : offer.currency}
              <Text style={styles.offerPeriod}> / {periodLabel(offer)}</Text>
            </Text>
            {!!offer.maxProjects && (
              <Text style={styles.offerMeta}>{t('Jusqu\'à {count} business', { count: offer.maxProjects })}</Text>
            )}
          </View>
        )}

        {isOwner && canPayByCard && (
          <Button
            title={t('Payer par carte')}
            icon="card-outline"
            onPress={handlePayByCard}
            style={styles.button}
          />
        )}
        {isOwner && (
          <Button
            title={t('Voir les abonnements')}
            icon="diamond-outline"
            variant={canPayByCard ? 'outline' : 'primary'}
            onPress={() => navigation.navigate('Subscription')}
            style={styles.button}
          />
        )}
        <Button
          title={isOwner ? t('J\'ai payé : actualiser') : t('Actualiser')}
          icon="refresh-outline"
          variant="outline"
          loading={refreshing}
          onPress={handleRefresh}
          style={styles.button}
        />
        {isOwner && canPayByCard && (
          <Text style={styles.hint}>{t('Après le paiement, revenez dans l\'application : l\'accès est rétabli automatiquement.')}</Text>
        )}

        <Button
          title={t('Se déconnecter')}
          icon="log-out-outline"
          variant="ghost"
          onPress={logout}
          style={styles.button}
        />
        {isOwner && (
          <Button
            title={t('Supprimer mon compte')}
            variant="ghost"
            onPress={() => { setPassword(''); setDeleteVisible(true); }}
            textStyle={{ color: colors.error }}
            style={styles.deleteButton}
          />
        )}
      </ScrollView>

      <Modal visible={deleteVisible} transparent animationType="fade" onRequestClose={() => setDeleteVisible(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('Supprimer votre compte ?')}</Text>
            <Text style={styles.modalText}>
              {t('Votre compte et votre profil seront supprimés définitivement. Les projets, ventes, plannings et autres données de l\'entreprise seront conservés.')}
            </Text>
            <Input
              label={t('Saisissez votre mot de passe pour confirmer :')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('Votre mot de passe')}
              secureTextEntry
              autoCapitalize="none"
            />
            <Button
              title={t('Supprimer définitivement')}
              variant="danger"
              loading={deleting}
              onPress={handleDelete}
              style={styles.button}
            />
            <Button
              title={t('Annuler')}
              variant="ghost"
              onPress={() => setDeleteVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 56,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}18`,
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  account: {
    color: colors.textLight,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  message: {
    color: colors.textSecondary || colors.textLight,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 24,
  },
  offerCard: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    backgroundColor: colors.surface,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  offerLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  offerName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },
  offerPrice: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  offerPeriod: {
    color: colors.textLight,
    fontSize: 15,
    fontWeight: '500',
  },
  offerMeta: {
    color: colors.textLight,
    fontSize: 13,
    marginTop: 4,
  },
  button: {
    marginTop: 10,
  },
  hint: {
    color: colors.textLight,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  deleteButton: {
    marginTop: 4,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: colors.overlay || 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalText: {
    color: colors.textLight,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
});
