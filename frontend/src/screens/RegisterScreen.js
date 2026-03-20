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

  const goToStep2 = () => {
    if (!validateStep1()) return;
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
});
