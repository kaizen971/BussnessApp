import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../contexts/SubscriptionContext';
import { colors } from '../utils/colors';

const { width } = Dimensions.get('window');

const PREMIUM_FEATURES = [
  { icon: 'analytics-outline', label: 'Simulation Business Plan', desc: 'Simulez et planifiez votre activité' },
  { icon: 'people-outline', label: 'Gestion d\'équipe', desc: 'Gérez votre personnel et la paie' },
  { icon: 'cube-outline', label: 'Gestion de stock avancée', desc: 'Mouvements, alertes et historique' },
  { icon: 'person-outline', label: 'CRM Clients', desc: 'Gérez vos relations clients' },
  { icon: 'calendar-outline', label: 'Planning', desc: 'Organisez votre agenda professionnel' },
  { icon: 'cash-outline', label: 'Commissions', desc: 'Calcul automatique des commissions' },
];

export const PaywallScreen = ({ navigation, route }) => {
  const { featureName } = route.params || {};
  const { plans } = useSubscription();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const premiumPlan = plans.find(p => p.tier === 'premium') || plans[plans.length - 1];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          {/* Header illustration */}
          <View style={styles.headerSection}>
            <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={36} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>Fonctionnalité Premium</Text>
            <Text style={styles.subtitle}>
              {featureName
                ? `"${featureName}" est disponible avec l'abonnement Premium.`
                : 'Cette fonctionnalité nécessite un abonnement Premium.'}
            </Text>
          </View>

          {/* Features list */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>Débloquez toutes ces fonctionnalités :</Text>
            {PREMIUM_FEATURES.map((f, i) => (
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
                    /{premiumPlan.durationType === 'lifetime' ? 'à vie' : `${premiumPlan.duration} ${premiumPlan.durationType === 'months' ? 'mois' : premiumPlan.durationType}`}
                  </Text>
                </View>
              </View>
              <View style={styles.planPromoStats}>
                <View style={styles.planPromoStat}>
                  <Ionicons name="business" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.planPromoStatText}>{premiumPlan.maxProjects} business</Text>
                </View>
                <View style={styles.planPromoStat}>
                  <Ionicons name="infinite" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.planPromoStatText}>Toutes les fonctionnalités</Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Contact CTA */}
          <View style={styles.ctaSection}>
            <TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate('Subscription')}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="diamond" size={20} color="#fff" />
                <Text style={styles.ctaButtonText}>Voir mon abonnement</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>

            <Text style={styles.ctaHint}>Contactez votre administrateur pour passer au Premium</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
  backButton: { paddingVertical: 12, paddingHorizontal: 24 },
  backButtonText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  ctaHint: { fontSize: 12, color: colors.textLight, marginTop: 8, textAlign: 'center' },
});
