import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionAPI } from '../services/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { useTheme, useThemedStyles } from '../contexts/ThemeContext';
import { t, useLanguage } from '../i18n';

const { width } = Dimensions.get('window');

const getCguData = () => ({
  version: '1.0',
  updatedAt: '2025-01-01',
  title: t("Conditions Générales d'Utilisation (CGU)"),
  appName: "EAS – Entreprendre avec Succès",
  sections: [
    { id: 1, title: t('Objet'), content: t("Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités d'accès et d'utilisation de l'application mobile EAS – Entreprendre avec Succès (ci-après « l'Application »).\nL'Application permet aux utilisateurs de gérer, suivre et analyser leur activité commerciale (ventes, dépenses, stock, équipes, rentabilité, etc.).") },
    { id: 2, title: t("Éditeur de l'application"), content: t("L'Application est éditée par : SASU COD&COV") },
    { id: 3, title: t('Accès au service'), content: t("L'accès à l'Application est possible via téléchargement sur les stores (Google Play / App Store).\nL'utilisateur doit créer un compte pour accéder aux fonctionnalités.\nL'éditeur se réserve le droit de modifier, suspendre ou interrompre l'accès au service à tout moment.") },
    { id: 4, title: t('Description des services'), content: t("L'Application propose notamment les fonctionnalités suivantes :\n• Gestion des ventes\n• Suivi des dépenses\n• Gestion du stock\n• Gestion des employés et commissions\n• Calcul de la rentabilité\n• Module de simulation de business (business plan)\n• Export de données (selon abonnement)\n• Gestion multi-business\n\nLes fonctionnalités disponibles dépendent du plan d'abonnement souscrit.") },
    { id: 5, title: t('Compte utilisateur'), content: t("L'utilisateur est responsable des informations fournies lors de la création de son compte.\nIl est seul responsable de la confidentialité de ses identifiants.\nToute utilisation du compte est réputée faite par l'utilisateur.") },
    { id: 6, title: t('Abonnements et paiements'), content: t("L'Application propose plusieurs formules d'abonnement (Basic, Standard, Premium).\nLes tarifs peuvent être modifiés à tout moment.\nLes abonnements sont généralement annuels et renouvelables.\nAucun remboursement ne pourra être exigé sauf disposition légale contraire.") },
    { id: 7, title: t('Responsabilité'), content: t("L'Application est un outil d'aide à la gestion.\nL'éditeur ne garantit pas l'exactitude des résultats financiers générés, ceux-ci dépendant des données saisies par l'utilisateur.\nL'utilisateur reste seul responsable de :\n• La gestion de son activité\n• Ses décisions commerciales\n• La conformité de ses obligations légales et fiscales\n\nL'éditeur ne saurait être tenu responsable de pertes financières, erreurs de gestion ou décisions prises sur la base des données de l'Application.") },
    { id: 8, title: t('Données'), content: t("Les données saisies dans l'Application appartiennent à l'utilisateur.\nL'éditeur s'engage à mettre en œuvre des moyens raisonnables pour assurer la sécurité des données.\nToutefois, l'utilisateur est responsable de la sauvegarde de ses informations.") },
    { id: 9, title: t('Disponibilité'), content: t("L'éditeur s'efforce d'assurer un accès continu à l'Application.\nCependant, des interruptions peuvent survenir (maintenance, incident technique, réseau…).\nAucune garantie de disponibilité permanente n'est fournie.") },
    { id: 10, title: t('Utilisation conforme'), content: t("L'utilisateur s'engage à utiliser l'Application conformément à sa destination.\nIl est interdit de :\n• Utiliser l'Application à des fins frauduleuses\n• Tenter d'accéder aux systèmes de manière non autorisée\n• Porter atteinte au bon fonctionnement du service") },
    { id: 11, title: t('Propriété intellectuelle'), content: t("L'ensemble des éléments de l'Application (code, design, contenu) est protégé.\nToute reproduction, modification ou exploitation sans autorisation est interdite.") },
    { id: 12, title: t('Résiliation'), content: t("L'utilisateur peut cesser d'utiliser l'Application à tout moment.\nL'éditeur peut suspendre ou supprimer un compte en cas de non-respect des CGU.") },
    { id: 13, title: t('Évolution des CGU'), content: t("Les présentes CGU peuvent être modifiées à tout moment.\nL'utilisateur sera informé en cas de modification importante.") },
    { id: 14, title: t('Droit applicable'), content: t("Les présentes CGU sont régies par le droit applicable du pays de l'éditeur.") },
  ],
});
const DURATION_LABELS = { days: 'jour(s)', months: 'mois', years: 'an(s)', lifetime: 'À vie' };

const TIER_ICONS = {
  free: 'leaf-outline',
  basic: 'star-outline',
  premium: 'diamond-outline',
};

const TIER_GRADIENTS = {
  free: ['#4a4a4a', '#2d2d2d'],
  basic: ['#D4AF37', '#B8941E'],
  premium: ['#8B5CF6', '#6D28D9'],
};

function getTier(plan) {
  if (plan.price === 0) return 'free';
  if (plan.tier === 'basic') return 'basic';
  if (plan.tier === 'premium') return 'premium';
  return 'basic';
}

function getDurationLabel(plan) {
  if (plan.durationType === 'lifetime') return t('À vie');
  return `${plan.duration} ${t(DURATION_LABELS[plan.durationType] || plan.durationType)}`;
}

export const RegisterScreen = ({ navigation }) => {
  useLanguage();
  const { colors, gradients } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    partnerCode: '',
  });
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [cguModalVisible, setCguModalVisible] = useState(false);
  const [cguData, setCguData] = useState(null);
  const { register } = useAuth();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (nextStep) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const response = await subscriptionAPI.getPlans();
      setPlans(response.data || []);
    } catch (error) {
      console.error('Erreur chargement plans:', error);
      Alert.alert(t('Erreur'), t('Impossible de charger les plans. Veuillez réessayer.'));
    } finally {
      setLoadingPlans(false);
    }
  };

  const validateStep1 = () => {
    const { username, email, password, confirmPassword, fullName } = formData;

    if (!username || !email || !password || !fullName) {
      Alert.alert(t('Erreur'), t('Veuillez remplir tous les champs'));
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('Erreur'), t('Les mots de passe ne correspondent pas'));
      return false;
    }

    if (password.length < 6) {
      Alert.alert(t('Erreur'), t('Le mot de passe doit contenir au moins 6 caractères'));
      return false;
    }

    const partnerCode = formData.partnerCode.replace(/\s+/g, '');
    if (partnerCode && !/^[A-Za-z0-9_-]{2,32}$/.test(partnerCode)) {
      Alert.alert(t('Erreur'), t('Code partenaire invalide (lettres, chiffres, - ou _ ; 2 à 32 caractères)'));
      return false;
    }

    return true;
  };

  const openCGU = () => {
    setCguData(getCguData());
    setCguModalVisible(true);
  };

  const goToStep2 = () => {
    if (!validateStep1()) return;
    if (!cguAccepted) {
      Alert.alert(t('CGU requises'), t("Vous devez accepter les Conditions Générales d'Utilisation pour continuer."));
      return;
    }
    fetchPlans();
    animateTransition(2);
  };

  const handleRegister = async () => {
    setLoading(true);
    const { username, email, password, fullName } = formData;
    const partnerCode = formData.partnerCode.replace(/\s+/g, '').toUpperCase() || undefined;
    const result = await register({ username, email, password, fullName, partnerCode, selectedPlanId: selectedPlanId || undefined });
    setLoading(false);

    if (result.success) {
      if (result.autoActivated) {
        Alert.alert(
          t('Compte créé !'),
          result.message || t('Votre compte est actif. Vous êtes connecté automatiquement.')
        );
        return;
      }
      setRegistrationSuccess(true);
      animateTransition(3);
    } else {
      let errorMessage = result.error;
      if (result.code) errorMessage += t('\n\nCode: {code}', { code: result.code });
      if (result.field) errorMessage += t('\nChamp concerné: {field}', { field: result.field });
      if (result.details) errorMessage += t('\n\nDétails techniques: {details}', { details: result.details });
      Alert.alert(t("Erreur d'inscription"), errorMessage);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={styles.stepRow}>
          <View style={[
            styles.stepDot,
            step >= s && styles.stepDotActive,
            step === s && styles.stepDotCurrent,
          ]}>
            {step > s ? (
              <Ionicons name="checkmark" size={14} color="#fff" />
            ) : (
              <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>{s}</Text>
            )}
          </View>
          {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <Card style={styles.registerCard}>
      <Input
        label={t('Nom complet')}
        value={formData.fullName}
        onChangeText={(value) => updateField('fullName', value)}
        placeholder={t('Entrez votre nom complet')}
        icon="person-outline"
      />
      <Input
        label={t("Nom d'utilisateur")}
        value={formData.username}
        onChangeText={(value) => updateField('username', value)}
        placeholder={t("Choisissez un nom d'utilisateur")}
        icon="at-outline"
        autoCapitalize="none"
      />
      <Input
        label={t('Email')}
        value={formData.email}
        onChangeText={(value) => updateField('email', value)}
        placeholder="votre.email@exemple.com"
        icon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input
        label={t('Mot de passe')}
        value={formData.password}
        onChangeText={(value) => updateField('password', value)}
        placeholder={t('Minimum 6 caractères')}
        icon="lock-closed-outline"
        secureTextEntry
      />
      <Input
        label={t('Confirmer le mot de passe')}
        value={formData.confirmPassword}
        onChangeText={(value) => updateField('confirmPassword', value)}
        placeholder={t('Retapez votre mot de passe')}
        icon="lock-closed-outline"
        secureTextEntry
      />
      <Input
        label={t('Code promo / Code partenaire (facultatif)')}
        value={formData.partnerCode}
        onChangeText={(value) => updateField('partnerCode', value.toUpperCase())}
        placeholder={t('Ex : EAS-PARTENAIRE')}
        icon="pricetag-outline"
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={styles.cguRow}
        onPress={() => setCguAccepted(!cguAccepted)}
        activeOpacity={0.7}
      >
        <View style={[styles.cguCheckbox, cguAccepted && styles.cguCheckboxChecked]}>
          {cguAccepted && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
        </View>
        <Text style={styles.cguText}>
          {t("J'accepte les")}{' '}
          <Text style={styles.cguLink} onPress={openCGU}>
            {t("Conditions Générales d'Utilisation")}
          </Text>
        </Text>
      </TouchableOpacity>

      <Button
        title={t('Suivant - Choisir un plan')}
        onPress={goToStep2}
        style={styles.registerButton}
      />
      <Button
        title={t('Retour à la connexion')}
        onPress={() => navigation.goBack()}
        variant="ghost"
        style={styles.backButton}
      />
    </Card>
  );

  const renderStep2 = () => (
    <View>
      <Card style={styles.planSectionCard}>
        <View style={styles.planSectionHeader}>
          <Ionicons name="rocket-outline" size={24} color={colors.primary} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.planSectionTitle}>{t("Fonctionnalités de l'app")}</Text>
            <Text style={styles.planSectionSubtitle}>
              {t("Découvrez tout ce que EAS peut faire pour vous. Vous pourrez souscrire un abonnement après l'inscription.")}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.planCard}>
        <LinearGradient
          colors={['#D4AF37', '#B8941E']}
          style={styles.planCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.planHeader}>
            <View style={styles.planIconWrap}>
              <Ionicons name="star-outline" size={22} color="#fff" />
            </View>
          </View>
          <Text style={styles.planName}>{t('Gestion commerciale')}</Text>
          <View style={styles.planFeatures}>
            <View style={styles.planFeatureRow}>
              <Ionicons name="checkmark-circle" size={14} color="#34d399" />
              <Text style={styles.planFeatureText}>{t('Gestion des ventes et dépenses')}</Text>
            </View>
            <View style={styles.planFeatureRow}>
              <Ionicons name="checkmark-circle" size={14} color="#34d399" />
              <Text style={styles.planFeatureText}>{t('Suivi de stock et produits')}</Text>
            </View>
            <View style={styles.planFeatureRow}>
              <Ionicons name="checkmark-circle" size={14} color="#34d399" />
              <Text style={styles.planFeatureText}>{t('Tableau de bord et statistiques')}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.planCard}>
        <LinearGradient
          colors={['#8B5CF6', '#6D28D9']}
          style={styles.planCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.planHeader}>
            <View style={styles.planIconWrap}>
              <Ionicons name="diamond-outline" size={22} color="#fff" />
            </View>
          </View>
          <Text style={styles.planName}>{t('Premium')}</Text>
          <View style={styles.planFeatures}>
            <View style={styles.planFeatureRow}>
              <Ionicons name="checkmark-circle" size={14} color="#34d399" />
              <Text style={styles.planFeatureText}>{t('Simulation Business Plan')}</Text>
            </View>
            <View style={styles.planFeatureRow}>
              <Ionicons name="checkmark-circle" size={14} color="#34d399" />
              <Text style={styles.planFeatureText}>{t("Gestion d'équipe et paie")}</Text>
            </View>
            <View style={styles.planFeatureRow}>
              <Ionicons name="checkmark-circle" size={14} color="#34d399" />
              <Text style={styles.planFeatureText}>{t('CRM Clients, Planning, Commissions')}</Text>
            </View>
            <View style={styles.planFeatureRow}>
              <Ionicons name="checkmark-circle" size={14} color="#34d399" />
              <Text style={styles.planFeatureText}>{t('Multi-business')}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <Card style={styles.step2ButtonsCard}>
        <TouchableOpacity
          style={styles.validateBtn}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.validateBtnGradient}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color={colors.onPrimary} />
                <Text style={styles.validateBtnText}>{t('Créer mon compte')}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => animateTransition(1)}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>{t('Retour')}</Text>
        </TouchableOpacity>
      </Card>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconWrap}>
        <LinearGradient colors={gradients.primary} style={styles.successIconGradient}>
          <Ionicons name="checkmark" size={50} color="#fff" />
        </LinearGradient>
      </View>
      <Text style={styles.successTitle}>{t('Inscription réussie !')}</Text>
      <Text style={styles.successSubtitle}>
        {t('Votre demande a bien été enregistrée. Un administrateur vous contactera prochainement pour finaliser votre accompagnement et activer votre compte.')}
      </Text>

      <Card style={styles.successInfoCard}>
        <View style={styles.successInfoRow}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <Text style={styles.successInfoText}>{t('Un email a été envoyé à notre équipe')}</Text>
        </View>
        <View style={styles.successInfoRow}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text style={styles.successInfoText}>{t('Délai de réponse : sous 24h')}</Text>
        </View>
        <View style={styles.successInfoRow}>
          <Ionicons name="call-outline" size={20} color={colors.primary} />
          <Text style={styles.successInfoText}>{t('Nous vous contacterons par email ou téléphone')}</Text>
        </View>
      </Card>

      <Button
        title={t('Retour à la connexion')}
        onPress={() => navigation.goBack()}
        style={styles.successButton}
      />
    </View>
  );

  const stepTitles = {
    1: { title: t('Créer un compte'), subtitle: t("Rejoignez EAS dès aujourd'hui") },
    2: { title: t('Choisir votre plan'), subtitle: t("Sélectionnez l'offre qui vous convient") },
    3: { title: '', subtitle: '' },
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.background}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step < 3 && (
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={step === 1 ? 'person-add-outline' : 'pricetags-outline'}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.title}>{stepTitles[step].title}</Text>
              <Text style={styles.subtitle}>{stepTitles[step].subtitle}</Text>
              {renderStepIndicator()}
            </View>
          )}

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </Animated.View>
        </ScrollView>
      </View>
      <Modal visible={cguModalVisible} animationType="slide" transparent>
        <View style={styles.cguModalOverlay}>
          <View style={styles.cguModalContent}>
            <View style={styles.cguModalHeader}>
              <Text style={styles.cguModalTitle}>
                {cguData?.title || t("Conditions Générales d'Utilisation")}
              </Text>
              <TouchableOpacity onPress={() => setCguModalVisible(false)} style={styles.cguModalClose}>
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.cguScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.cguScrollContent}
              >
                {cguData && (
                  <>
                    <Text style={styles.cguAppName}>{cguData.appName}</Text>
                    {cguData.sections.map((section) => (
                      <View key={section.id} style={styles.cguSection}>
                        <Text style={styles.cguSectionTitle}>
                          {section.id}. {section.title}
                        </Text>
                        <Text style={styles.cguSectionContent}>{section.content}</Text>
                      </View>
                    ))}
                    {cguData.updatedAt && (
                      <Text style={styles.cguUpdatedAt}>
                        {t('Dernière mise à jour : {updatedAt}', { updatedAt: cguData.updatedAt })}
                      </Text>
                    )}
                  </>
                )}
              </ScrollView>

            <View style={styles.cguModalActions}>
              <TouchableOpacity
                style={styles.cguDeclineBtn}
                onPress={() => {
                  setCguAccepted(false);
                  setCguModalVisible(false);
                }}
              >
                <Text style={styles.cguDeclineBtnText}>{t('Refuser')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cguAcceptBtn}
                onPress={() => {
                  setCguAccepted(true);
                  setCguModalVisible(false);
                }}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.cguAcceptBtnGradient}
                >
                  <Ionicons name="checkmark-circle" size={18} color={colors.onPrimary} />
                  <Text style={styles.cguAcceptBtnText}>{t('Accepter')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors) => ({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 16,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary + '55',
  },
  stepDotCurrent: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.1 }],
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textLight,
  },
  stepDotTextActive: {
    color: colors.onPrimary,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },

  // Cards
  registerCard: {
    marginBottom: 24,
  },
  registerButton: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 12,
  },

  // Plan section
  planSectionCard: {
    marginBottom: 16,
    padding: 16,
  },
  planSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  planSectionSubtitle: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },

  // Plan cards
  planCard: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: colors.primary,
  },
  planCardGradient: {
    padding: 20,
    borderRadius: 14,
  },
  planCheckBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 24,
    height: 24,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planPriceWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  planCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    marginLeft: 2,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  planMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  planMetaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 6,
  },
  planBadge: {
    backgroundColor: 'rgba(212,175,55,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  planBadgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  planFeatures: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  planFeatureText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
  },

  // Step 2 buttons
  step2ButtonsCard: {
    marginTop: 16,
    marginBottom: 20,
    padding: 16,
  },
  validateBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  validateBtnDisabled: {
    opacity: 0.5,
  },
  validateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
    borderRadius: 14,
  },
  validateBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  validateBtnTextDisabled: {
    color: '#999',
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Loading
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textLight,
    marginTop: 12,
    fontSize: 14,
  },

  // Empty
  emptyCard: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    color: colors.textLight,
    fontSize: 14,
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },

  // Success (Step 3)
  successContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  successIconWrap: {
    marginBottom: 24,
  },
  successIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
    marginBottom: 24,
  },
  successInfoCard: {
    width: '100%',
    padding: 20,
    marginBottom: 24,
  },
  successInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  successInfoText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  successButton: {
    width: '100%',
  },

  // CGU checkbox
  cguRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  cguCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  cguCheckboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cguText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cguLink: {
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // CGU Modal
  cguModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  cguModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flex: 1,
    maxHeight: '88%',
    borderTopWidth: 2,
    borderColor: colors.primary + '40',
  },
  cguModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cguModalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  cguModalClose: {
    padding: 4,
  },
  cguLoading: {
    padding: 60,
    alignItems: 'center',
  },
  cguLoadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  cguScroll: {
    flex: 1,
  },
  cguScrollContent: {
    padding: 20,
    paddingBottom: 10,
  },
  cguAppName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  cguSection: {
    marginBottom: 20,
  },
  cguSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  cguSectionContent: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cguUpdatedAt: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  cguModalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cguDeclineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cguDeclineBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cguAcceptBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cguAcceptBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: 12,
  },
  cguAcceptBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
