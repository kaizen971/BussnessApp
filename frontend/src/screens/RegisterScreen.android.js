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
import { colors, gradients } from '../utils/colors';

const { width } = Dimensions.get('window');

const CGU_DATA = {
  version: '1.0',
  updatedAt: '2025-01-01',
  title: "Conditions Générales d'Utilisation (CGU)",
  appName: "EAS – Entreprendre avec Succès",
  sections: [
    { id: 1, title: "Objet", content: "Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités d'accès et d'utilisation de l'application mobile EAS – Entreprendre avec Succès (ci-après « l'Application »).\nL'Application permet aux utilisateurs de gérer, suivre et analyser leur activité commerciale (ventes, dépenses, stock, équipes, rentabilité, etc.)." },
    { id: 2, title: "Éditeur de l'application", content: "L'Application est éditée par : SASU COD&COV" },
    { id: 3, title: "Accès au service", content: "L'accès à l'Application est possible via téléchargement sur les stores (Google Play / App Store).\nL'utilisateur doit créer un compte pour accéder aux fonctionnalités.\nL'éditeur se réserve le droit de modifier, suspendre ou interrompre l'accès au service à tout moment." },
    { id: 4, title: "Description des services", content: "L'Application propose notamment les fonctionnalités suivantes :\n• Gestion des ventes\n• Suivi des dépenses\n• Gestion du stock\n• Gestion des employés et commissions\n• Calcul de la rentabilité\n• Module de simulation de business (business plan)\n• Export de données (selon abonnement)\n• Gestion multi-business\n\nLes fonctionnalités disponibles dépendent du plan d'abonnement souscrit." },
    { id: 5, title: "Compte utilisateur", content: "L'utilisateur est responsable des informations fournies lors de la création de son compte.\nIl est seul responsable de la confidentialité de ses identifiants.\nToute utilisation du compte est réputée faite par l'utilisateur." },
    { id: 6, title: "Abonnements et paiements", content: "L'Application propose plusieurs formules d'abonnement (Basic, Standard, Premium).\nLes tarifs peuvent être modifiés à tout moment.\nLes abonnements sont généralement annuels et renouvelables.\nAucun remboursement ne pourra être exigé sauf disposition légale contraire." },
    { id: 7, title: "Responsabilité", content: "L'Application est un outil d'aide à la gestion.\nL'éditeur ne garantit pas l'exactitude des résultats financiers générés, ceux-ci dépendant des données saisies par l'utilisateur.\nL'utilisateur reste seul responsable de :\n• La gestion de son activité\n• Ses décisions commerciales\n• La conformité de ses obligations légales et fiscales\n\nL'éditeur ne saurait être tenu responsable de pertes financières, erreurs de gestion ou décisions prises sur la base des données de l'Application." },
    { id: 8, title: "Données", content: "Les données saisies dans l'Application appartiennent à l'utilisateur.\nL'éditeur s'engage à mettre en œuvre des moyens raisonnables pour assurer la sécurité des données.\nToutefois, l'utilisateur est responsable de la sauvegarde de ses informations." },
    { id: 9, title: "Disponibilité", content: "L'éditeur s'efforce d'assurer un accès continu à l'Application.\nCependant, des interruptions peuvent survenir (maintenance, incident technique, réseau…).\nAucune garantie de disponibilité permanente n'est fournie." },
    { id: 10, title: "Utilisation conforme", content: "L'utilisateur s'engage à utiliser l'Application conformément à sa destination.\nIl est interdit de :\n• Utiliser l'Application à des fins frauduleuses\n• Tenter d'accéder aux systèmes de manière non autorisée\n• Porter atteinte au bon fonctionnement du service" },
    { id: 11, title: "Propriété intellectuelle", content: "L'ensemble des éléments de l'Application (code, design, contenu) est protégé.\nToute reproduction, modification ou exploitation sans autorisation est interdite." },
    { id: 12, title: "Résiliation", content: "L'utilisateur peut cesser d'utiliser l'Application à tout moment.\nL'éditeur peut suspendre ou supprimer un compte en cas de non-respect des CGU." },
    { id: 13, title: "Évolution des CGU", content: "Les présentes CGU peuvent être modifiées à tout moment.\nL'utilisateur sera informé en cas de modification importante." },
    { id: 14, title: "Droit applicable", content: "Les présentes CGU sont régies par le droit applicable du pays de l'éditeur." },
  ],
};
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
  if (plan.durationType === 'lifetime') return 'À vie';
  return `${plan.duration} ${DURATION_LABELS[plan.durationType] || plan.durationType}`;
}

export const RegisterScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
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
      Alert.alert('Erreur', 'Impossible de charger les plans. Veuillez réessayer.');
    } finally {
      setLoadingPlans(false);
    }
  };

  const validateStep1 = () => {
    const { username, email, password, confirmPassword, fullName } = formData;

    if (!username || !email || !password || !fullName) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    return true;
  };

  const openCGU = () => {
    setCguData(CGU_DATA);
    setCguModalVisible(true);
  };

  const goToStep2 = () => {
    if (!validateStep1()) return;
    if (!cguAccepted) {
      Alert.alert('CGU requises', 'Vous devez accepter les Conditions Générales d\'Utilisation pour continuer.');
      return;
    }
    fetchPlans();
    animateTransition(2);
  };

  const handleRegister = async () => {
    if (!selectedPlanId) {
      Alert.alert('Erreur', 'Veuillez choisir un plan d\'accompagnement');
      return;
    }

    setLoading(true);
    const { username, email, password, fullName } = formData;
    const result = await register({ username, email, password, fullName, selectedPlanId });
    setLoading(false);

    if (result.success) {
      if (result.autoActivated) {
        Alert.alert(
          'Essai activé !',
          result.message || 'Votre compte essai est actif. Vous êtes connecté automatiquement.'
        );
        return;
      }
      setRegistrationSuccess(true);
      animateTransition(3);
    } else {
      let errorMessage = result.error;
      if (result.code) errorMessage += `\n\nCode: ${result.code}`;
      if (result.field) errorMessage += `\nChamp concerné: ${result.field}`;
      if (result.details) errorMessage += `\n\nDétails techniques: ${result.details}`;
      Alert.alert('Erreur d\'inscription', errorMessage);
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
        label="Nom complet"
        value={formData.fullName}
        onChangeText={(value) => updateField('fullName', value)}
        placeholder="Entrez votre nom complet"
        icon="person-outline"
      />
      <Input
        label="Nom d'utilisateur"
        value={formData.username}
        onChangeText={(value) => updateField('username', value)}
        placeholder="Choisissez un nom d'utilisateur"
        icon="at-outline"
        autoCapitalize="none"
      />
      <Input
        label="Email"
        value={formData.email}
        onChangeText={(value) => updateField('email', value)}
        placeholder="votre.email@exemple.com"
        icon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input
        label="Mot de passe"
        value={formData.password}
        onChangeText={(value) => updateField('password', value)}
        placeholder="Minimum 6 caractères"
        icon="lock-closed-outline"
        secureTextEntry
      />
      <Input
        label="Confirmer le mot de passe"
        value={formData.confirmPassword}
        onChangeText={(value) => updateField('confirmPassword', value)}
        placeholder="Retapez votre mot de passe"
        icon="lock-closed-outline"
        secureTextEntry
      />
      <TouchableOpacity
        style={styles.cguRow}
        onPress={() => setCguAccepted(!cguAccepted)}
        activeOpacity={0.7}
      >
        <View style={[styles.cguCheckbox, cguAccepted && styles.cguCheckboxChecked]}>
          {cguAccepted && <Ionicons name="checkmark" size={14} color="#000" />}
        </View>
        <Text style={styles.cguText}>
          J'accepte les{' '}
          <Text style={styles.cguLink} onPress={openCGU}>
            Conditions Générales d'Utilisation
          </Text>
        </Text>
      </TouchableOpacity>

      <Button
        title="Suivant - Choisir un plan"
        onPress={goToStep2}
        style={styles.registerButton}
      />
      <Button
        title="Retour à la connexion"
        onPress={() => navigation.goBack()}
        variant="ghost"
        style={styles.backButton}
      />
    </Card>
  );

  const renderPlanCard = (plan) => {
    const tier = getTier(plan);
    const isSelected = selectedPlanId === plan._id;
    const gradient = TIER_GRADIENTS[tier] || TIER_GRADIENTS.basic;
    const icon = TIER_ICONS[tier] || 'star-outline';

    return (
      <TouchableOpacity
        key={plan._id}
        activeOpacity={0.8}
        onPress={() => setSelectedPlanId(plan._id)}
        style={[styles.planCard, isSelected && styles.planCardSelected]}
      >
        {isSelected && (
          <View style={styles.planCheckBadge}>
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          </View>
        )}

        <LinearGradient
          colors={isSelected ? gradient : ['#2D2D2D', '#1A1A1A']}
          style={styles.planCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.planHeader}>
            <View style={styles.planIconWrap}>
              <Ionicons name={icon} size={22} color={isSelected ? '#fff' : colors.primary} />
            </View>
            <View style={styles.planPriceWrap}>
              <Text style={styles.planPrice}>{plan.price}</Text>
              <Text style={styles.planCurrency}>€</Text>
            </View>
          </View>

          <Text style={styles.planName}>{plan.name}</Text>

          <View style={styles.planMeta}>
            <View style={styles.planMetaItem}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.planMetaText}>{getDurationLabel(plan)}</Text>
            </View>
            {plan.isRecurring && (
              <View style={[styles.planBadge, isSelected && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.planBadgeText}>récurrent</Text>
              </View>
            )}
          </View>

          <View style={styles.planMetaItem}>
            <Ionicons name="business-outline" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.planMetaText}>{plan.maxProjects} business max</Text>
          </View>

          {plan.features && plan.features.length > 0 && (
            <View style={styles.planFeatures}>
              {plan.features.map((feature, idx) => (
                <View key={idx} style={styles.planFeatureRow}>
                  <Ionicons name="checkmark-circle" size={14} color={isSelected ? '#34d399' : colors.primary} />
                  <Text style={styles.planFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderStep2 = () => (
    <View>
      <Card style={styles.planSectionCard}>
        <View style={styles.planSectionHeader}>
          <Ionicons name="pricetags-outline" size={24} color={colors.primary} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.planSectionTitle}>Plan d'accompagnement</Text>
            <Text style={styles.planSectionSubtitle}>Choisissez le plan adapté à vos besoins</Text>
          </View>
        </View>
      </Card>

      {loadingPlans ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des plans...</Text>
        </View>
      ) : plans.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.textLight} />
          <Text style={styles.emptyText}>Aucun plan disponible pour le moment</Text>
          <Button title="Réessayer" onPress={fetchPlans} variant="ghost" />
        </Card>
      ) : (
        plans.map(renderPlanCard)
      )}

      <Card style={styles.step2ButtonsCard}>
        <TouchableOpacity
          style={[styles.validateBtn, !selectedPlanId && styles.validateBtnDisabled]}
          onPress={handleRegister}
          disabled={!selectedPlanId || loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={selectedPlanId ? [colors.primary, colors.primaryDark] : ['#555', '#444']}
            style={styles.validateBtnGradient}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color={selectedPlanId ? '#000' : '#999'} />
                <Text style={[styles.validateBtnText, !selectedPlanId && styles.validateBtnTextDisabled]}>
                  Valider l'inscription
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => animateTransition(1)}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>Retour</Text>
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
      <Text style={styles.successTitle}>Inscription réussie !</Text>
      <Text style={styles.successSubtitle}>
        Votre demande a bien été enregistrée. Un administrateur vous contactera prochainement pour finaliser votre accompagnement et activer votre compte.
      </Text>

      <Card style={styles.successInfoCard}>
        <View style={styles.successInfoRow}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <Text style={styles.successInfoText}>Un email a été envoyé à notre équipe</Text>
        </View>
        <View style={styles.successInfoRow}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text style={styles.successInfoText}>Délai de réponse : sous 24h</Text>
        </View>
        <View style={styles.successInfoRow}>
          <Ionicons name="call-outline" size={20} color={colors.primary} />
          <Text style={styles.successInfoText}>Nous vous contacterons par email ou téléphone</Text>
        </View>
      </Card>

      <Button
        title="Retour à la connexion"
        onPress={() => navigation.goBack()}
        style={styles.successButton}
      />
    </View>
  );

  const stepTitles = {
    1: { title: 'Créer un compte', subtitle: 'Rejoignez EAS dès aujourd\'hui' },
    2: { title: 'Choisir votre plan', subtitle: 'Sélectionnez l\'offre qui vous convient' },
    3: { title: '', subtitle: '' },
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={gradients.primary} style={styles.gradient}>
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
                  size={50}
                  color="#fff"
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
      </LinearGradient>
      <Modal visible={cguModalVisible} animationType="slide" transparent>
        <View style={styles.cguModalOverlay}>
          <View style={styles.cguModalContent}>
            <View style={styles.cguModalHeader}>
              <Text style={styles.cguModalTitle}>
                {cguData?.title || "Conditions Générales d'Utilisation"}
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
                        Dernière mise à jour : {cguData.updatedAt}
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
                <Text style={styles.cguDeclineBtnText}>Refuser</Text>
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
                  <Ionicons name="checkmark-circle" size={18} color="#000" />
                  <Text style={styles.cguAcceptBtnText}>Accepter</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  stepDotCurrent: {
    backgroundColor: '#fff',
    transform: [{ scale: 1.1 }],
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  stepDotTextActive: {
    color: colors.primary,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: 'rgba(255,255,255,0.6)',
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
    color: '#000',
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  cguModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    color: '#000',
  },
});
