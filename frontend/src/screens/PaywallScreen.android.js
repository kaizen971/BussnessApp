import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView,
  Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { feedbackAPI } from '../services/api';
import { useTheme, useThemedStyles } from '../contexts/ThemeContext';
import { t, useLanguage } from '../i18n';

const { width } = Dimensions.get('window');

const getPremiumFeatures = () => [
  { icon: 'analytics-outline', label: t('Simulation Business Plan'), desc: t('Simulez et planifiez votre activité') },
  { icon: 'people-outline', label: t("Gestion d'équipe"), desc: t('Gérez votre personnel et la paie') },
  { icon: 'person-outline', label: t('CRM Clients'), desc: t('Gérez vos relations clients') },
  { icon: 'cash-outline', label: t('Commissions'), desc: t('Calcul automatique des commissions') },
];

export const PaywallScreen = ({ navigation, route }) => {
  useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { featureName } = route.params || {};
  const { plans } = useSubscription();
  const { user } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const premiumPlan = plans.find(p => p.tier === 'premium') || plans[plans.length - 1];

  const handleRequestPremium = async () => {
    setRequesting(true);
    try {
      const planLabel = premiumPlan ? premiumPlan.name : 'Premium';
      await feedbackAPI.create({
        type: 'other',
        // message destiné au back-office : toujours en français
        message: `Demande de passage au plan "${planLabel}"${featureName ? ` (souhaite accéder à la fonctionnalité "${featureName}")` : ''}.`,
        projectId: user?.projectId,
      });
      Alert.alert(
        t('Demande envoyée !'),
        t('Votre demande de passage au Premium a bien été transmise. Un administrateur vous contactera sous 24h.')
      );
    } catch (error) {
      Alert.alert(t('Erreur'), t("Impossible d'envoyer la demande. Veuillez réessayer."));
    } finally {
      setRequesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          {/* Header illustration */}
          <View style={styles.headerSection}>
            <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={36} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>{t('Fonctionnalité Premium')}</Text>
            <Text style={styles.subtitle}>
              {featureName
                ? t('"{featureName}" est disponible avec l\'abonnement Premium.', { featureName: featureName })
                : t('Cette fonctionnalité nécessite un abonnement Premium.')}
            </Text>
          </View>

          {/* Features list */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>{t('Débloquez toutes ces fonctionnalités :')}</Text>
            {getPremiumFeatures().map((f, i) => (
              <Animated.View
                key={i}
                style={[styles.featureItem, {
                  opacity: fadeAnim,
                  transform: [{ translateX: Animated.multiply(fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }), 1) }]
                }]}
              >
                <LinearGradient colors={['rgba(139,92,246,0.15)', 'rgba(109,40,217,0.08)']} style={styles.featureIcon}>
                  <Ionicons name={f.icon} size={20} color="#8B5CF6" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color="#8B5CF6" />
              </Animated.View>
            ))}
          </View>

          {/* Plan card */}
          {premiumPlan && (
            <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.planPromo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.planPromoHeader}>
                <View>
                  <Text style={styles.planPromoName}>{premiumPlan.name}</Text>
                  {premiumPlan.description && <Text style={styles.planPromoDesc}>{premiumPlan.description}</Text>}
                </View>
                <View style={styles.planPromoPrice}>
                  <Text style={styles.planPromoPriceAmount}>{premiumPlan.price}€</Text>
                  <Text style={styles.planPromoPricePeriod}>
                    /{premiumPlan.durationType === 'lifetime' ? t('à vie') : `${premiumPlan.duration} ${premiumPlan.durationType === 'months' ? t('mois') : premiumPlan.durationType}`}
                  </Text>
                </View>
              </View>
              <View style={styles.planPromoStats}>
                <View style={styles.planPromoStat}>
                  <Ionicons name="business" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.planPromoStatText}>{t('{count} business', { count: premiumPlan.maxProjects })}</Text>
                </View>
                <View style={styles.planPromoStat}>
                  <Ionicons name="infinite" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.planPromoStatText}>{t('Toutes les fonctionnalités')}</Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* CTA */}
          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={[styles.ctaButton, requesting && { opacity: 0.6 }]}
              onPress={handleRequestPremium}
              disabled={requesting}
            >
              <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {requesting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={20} color="#fff" />
                    <Text style={styles.ctaButtonText}>{t('Demander le Premium')}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Subscription')}>
              <Ionicons name="list-outline" size={16} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>{t('Voir tous les plans')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>{t('Retour')}</Text>
            </TouchableOpacity>

            <Text style={styles.ctaHint}>{t('Un administrateur vous contactera sous 24h')}</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingTop: 40 },

  headerSection: { alignItems: 'center', marginBottom: 32 },
  iconCircle: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textLight, textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 280 },

  featuresSection: { marginBottom: 24 },
  featuresTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  featureIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  featureLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  featureDesc: { fontSize: 11, color: colors.textLight, marginTop: 2 },

  planPromo: { borderRadius: 20, padding: 20, marginBottom: 24 },
  planPromoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planPromoName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  planPromoDesc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  planPromoPrice: { alignItems: 'flex-end' },
  planPromoPriceAmount: { fontSize: 28, fontWeight: '800', color: '#fff' },
  planPromoPricePeriod: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  planPromoStats: { flexDirection: 'row', gap: 20, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  planPromoStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planPromoStatText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  ctaSection: { alignItems: 'center', marginBottom: 20 },
  ctaButton: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  ctaButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, marginBottom: 4 },
  secondaryButtonText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  backButton: { paddingVertical: 12, paddingHorizontal: 24 },
  backButtonText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  ctaHint: { fontSize: 12, color: colors.textLight, marginTop: 8, textAlign: 'center' },
});
