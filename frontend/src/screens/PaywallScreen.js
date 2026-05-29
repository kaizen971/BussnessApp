import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView,
  ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useIAP } from '../contexts/IAPContext';
import { colors } from '../utils/colors';

const PREMIUM_FEATURES = [
  { icon: 'analytics-outline', label: 'Simulation Business Plan', desc: 'Simulez et planifiez votre activité' },
  { icon: 'people-outline', label: 'Gestion d\'équipe', desc: 'Gérez votre personnel et la paie' },
  { icon: 'cube-outline', label: 'Gestion de stock avancée', desc: 'Mouvements, alertes et historique' },
  { icon: 'person-outline', label: 'CRM Clients', desc: 'Gérez vos relations clients' },
  { icon: 'calendar-outline', label: 'Planning', desc: 'Organisez votre agenda professionnel' },
  { icon: 'cash-outline', label: 'Commissions', desc: 'Calcul automatique des commissions' },
];

function formatIAPPrice(product) {
  if (!product) return '';
  if (product.localizedPrice) return product.localizedPrice;
  if (product.price) return `${product.price} ${product.currency || '€'}`;
  return '';
}

function getSubscriptionPeriod(product) {
  if (!product) return '';
  const id = product.productId || '';
  if (id.includes('yearly') || id.includes('annual')) return '/an';
  if (id.includes('monthly')) return '/mois';
  return '';
}

export const PaywallScreen = ({ navigation, route }) => {
  const { featureName } = route.params || {};
  const { products, purchasing, handlePurchase, handleRestorePurchases } = useIAP();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const premiumProducts = products.filter(p => {
    const info = p.displayInfo || {};
    return info.tier === 'premium';
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          {/* Header */}
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
              <View key={i} style={styles.featureItem}>
                <LinearGradient colors={['rgba(139,92,246,0.15)', 'rgba(109,40,217,0.08)']} style={styles.featureIcon}>
                  <Ionicons name={f.icon} size={20} color="#8B5CF6" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color="#8B5CF6" />
              </View>
            ))}
          </View>

          {/* IAP Purchase options */}
          {premiumProducts.length > 0 ? (
            <View style={styles.plansSection}>
              {premiumProducts.map((product) => {
                const info = product.displayInfo || {};
                return (
                  <TouchableOpacity
                    key={product.productId}
                    style={[styles.planOption, purchasing && styles.planOptionDisabled]}
                    onPress={() => handlePurchase(product.productId)}
                    disabled={purchasing}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#8B5CF6', '#6D28D9']}
                      style={styles.planOptionGradient}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                      {info.badge && (
                        <View style={styles.planBadge}>
                          <Text style={styles.planBadgeText}>{info.badge}</Text>
                        </View>
                      )}
                      <View style={styles.planOptionContent}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.planOptionName}>{info.label || product.title}</Text>
                          <View style={styles.planOptionMeta}>
                            <Ionicons name="business" size={14} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.planOptionMetaText}>Toutes les fonctionnalités</Text>
                          </View>
                        </View>
                        <View style={styles.planOptionPriceWrap}>
                          <Text style={styles.planOptionPrice}>{formatIAPPrice(product)}</Text>
                          <Text style={styles.planOptionPeriod}>{getSubscriptionPeriod(product)}</Text>
                        </View>
                      </View>
                      {purchasing ? (
                        <ActivityIndicator color="#fff" style={{ marginTop: 12 }} />
                      ) : (
                        <View style={styles.planOptionCTA}>
                          <Text style={styles.planOptionCTAText}>S'abonner maintenant</Text>
                          <Ionicons name="arrow-forward" size={16} color="#8B5CF6" />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate('Subscription')}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="diamond" size={20} color="#fff" />
                <Text style={styles.ctaButtonText}>Voir les abonnements</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Restore + Back */}
          <View style={styles.ctaSection}>
            <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
              <Ionicons name="refresh-outline" size={16} color={colors.primary} />
              <Text style={styles.restoreButtonText}>Restaurer mes achats</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>

            <Text style={styles.ctaHint}>
              {Platform.OS === 'ios'
                ? 'Paiement via votre compte Apple. Abonnement renouvelable automatiquement. Annulable à tout moment dans les réglages.'
                : 'Paiement via Google Play. Abonnement renouvelable automatiquement.'}
            </Text>
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

  plansSection: { marginBottom: 16, gap: 12 },
  planOption: { borderRadius: 20, overflow: 'hidden' },
  planOptionDisabled: { opacity: 0.7 },
  planOptionGradient: { padding: 20, borderRadius: 20 },
  planBadge: { backgroundColor: 'rgba(52,211,153,0.25)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 10 },
  planBadgeText: { fontSize: 11, fontWeight: '700', color: '#34d399' },
  planOptionContent: { flexDirection: 'row', alignItems: 'center' },
  planOptionName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  planOptionMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  planOptionMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  planOptionPriceWrap: { alignItems: 'flex-end' },
  planOptionPrice: { fontSize: 24, fontWeight: '800', color: '#fff' },
  planOptionPeriod: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  planOptionCTA: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  planOptionCTAText: { fontSize: 15, fontWeight: '700', color: '#8B5CF6' },

  ctaButton: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  ctaButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  ctaSection: { alignItems: 'center', marginBottom: 20 },
  restoreButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 20, marginBottom: 8 },
  restoreButtonText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  backButton: { paddingVertical: 12, paddingHorizontal: 24 },
  backButtonText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  ctaHint: { fontSize: 11, color: colors.textLight, marginTop: 8, textAlign: 'center', lineHeight: 16, paddingHorizontal: 20 },
});
