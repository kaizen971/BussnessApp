import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { colors, gradients } from '../utils/colors';

const { width } = Dimensions.get('window');

const DURATION_LABELS = { days: 'jour(s)', months: 'mois', years: 'an(s)', lifetime: 'À vie' };

const TIER_CONFIG = {
  free: { icon: 'leaf-outline', gradient: ['#4a4a4a', '#2d2d2d'], label: 'Gratuit' },
  basic: { icon: 'star-outline', gradient: ['#D4AF37', '#B8941E'], label: 'Basic' },
  premium: { icon: 'diamond-outline', gradient: ['#8B5CF6', '#6D28D9'], label: 'Premium' },
};

function getDurationLabel(plan) {
  if (plan.durationType === 'lifetime') return 'À vie';
  return `${plan.duration} ${DURATION_LABELS[plan.durationType] || plan.durationType}`;
}

export const SubscriptionScreen = ({ navigation }) => {
  const { subscription, plans, loading, isPremium, refreshSubscription } = useSubscription();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentTier = isPremium ? 'premium' : subscription?.hasSubscription ? 'basic' : 'free';
  const tierCfg = TIER_CONFIG[currentTier];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Current plan card */}
        <LinearGradient colors={tierCfg.gradient} style={styles.currentPlanCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.currentPlanHeader}>
            <View style={styles.planIconWrap}>
              <Ionicons name={tierCfg.icon} size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentPlanLabel}>Votre plan actuel</Text>
              <Text style={styles.currentPlanName}>{subscription?.planLabel || tierCfg.label}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isPremium ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.15)' }]}>
              <View style={[styles.statusDot, { backgroundColor: isPremium ? '#34d399' : '#fff' }]} />
              <Text style={styles.statusText}>{isPremium ? 'Actif' : subscription?.status === 'pending_payment' ? 'En attente' : 'Inactif'}</Text>
            </View>
          </View>

          {subscription?.hasSubscription && (
            <View style={styles.currentPlanDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.detailText}>
                  {subscription.daysLeft !== null ? `${subscription.daysLeft} jours restants` : 'Illimité'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.detailText}>{subscription.maxProjects} business max</Text>
              </View>
              {subscription.endDate && (
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, {
                      width: subscription.daysLeft !== null && subscription.startDate
                        ? `${Math.max(5, Math.min(100, (subscription.daysLeft / Math.max(1, Math.ceil((new Date(subscription.endDate) - new Date(subscription.startDate)) / (1000*60*60*24)))) * 100))}%`
                        : '100%'
                    }]} />
                  </View>
                  <Text style={styles.progressLabel}>
                    Expire le {new Date(subscription.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              )}
            </View>
          )}

          {!subscription?.hasSubscription && (
            <View style={styles.currentPlanDetails}>
              <Text style={styles.noPlanText}>
                {subscription?.status === 'pending_payment'
                  ? 'Votre paiement est en cours de traitement. Vous serez notifié par email.'
                  : 'Vous n\'avez pas d\'abonnement actif. Contactez votre administrateur pour souscrire.'}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Features section */}
        {subscription?.features?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fonctionnalités incluses</Text>
            <View style={styles.featuresCard}>
              {subscription.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={styles.featureCheckWrap}>
                    <Ionicons name="checkmark" size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Plans comparison */}
        {plans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plans disponibles</Text>
            <Text style={styles.sectionSubtitle}>Comparez les offres et choisissez la plus adaptée</Text>

            {plans.map((plan, index) => {
              const tier = plan.tier || 'basic';
              const cfg = TIER_CONFIG[tier] || TIER_CONFIG.basic;
              const isCurrent = subscription?.planLabel === plan.name && isPremium;

              return (
                <View key={plan._id} style={[styles.planCard, isCurrent && styles.planCardActive]}>
                  <LinearGradient colors={cfg.gradient} style={styles.planCardHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <View style={styles.planCardHeaderContent}>
                      <View>
                        <Text style={styles.planCardName}>{plan.name}</Text>
                        {plan.description && <Text style={styles.planCardDesc}>{plan.description}</Text>}
                      </View>
                      <View style={styles.planCardPrice}>
                        <Text style={styles.priceAmount}>{plan.price}</Text>
                        <Text style={styles.priceCurrency}>€</Text>
                        <Text style={styles.pricePeriod}>/{getDurationLabel(plan)}</Text>
                      </View>
                    </View>
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#fff" />
                        <Text style={styles.currentBadgeText}>Plan actuel</Text>
                      </View>
                    )}
                  </LinearGradient>

                  <View style={styles.planCardBody}>
                    <View style={styles.planStat}>
                      <Ionicons name="business-outline" size={18} color={colors.primary} />
                      <Text style={styles.planStatText}><Text style={{ fontWeight: '700' }}>{plan.maxProjects}</Text> business max</Text>
                    </View>
                    <View style={styles.planStat}>
                      <Ionicons name="time-outline" size={18} color={colors.primary} />
                      <Text style={styles.planStatText}>{getDurationLabel(plan)} {plan.isRecurring ? '(renouvelable)' : ''}</Text>
                    </View>

                    {plan.features?.length > 0 && (
                      <View style={styles.planFeatures}>
                        {plan.features.map((f, i) => (
                          <View key={i} style={styles.planFeatureRow}>
                            <Ionicons name="checkmark-circle" size={16} color="#34d399" />
                            <Text style={styles.planFeatureText}>{f}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Contact info */}
        <View style={styles.contactCard}>
          <Ionicons name="mail-outline" size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.contactTitle}>Besoin de changer de plan ?</Text>
            <Text style={styles.contactText}>Contactez votre administrateur pour modifier ou upgrader votre abonnement.</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  currentPlanCard: { borderRadius: 20, padding: 20, marginBottom: 24 },
  currentPlanHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  currentPlanLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  currentPlanName: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  currentPlanDetails: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  detailText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  noPlanText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
  progressBarContainer: { marginTop: 8 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#34d399', borderRadius: 3 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 6, fontWeight: '500' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: colors.textLight, marginBottom: 16 },

  featuresCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  featureCheckWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(212,175,55,0.15)', justifyContent: 'center', alignItems: 'center' },
  featureText: { fontSize: 14, color: colors.text, flex: 1, fontWeight: '500' },

  planCard: { backgroundColor: colors.surface, borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  planCardActive: { borderColor: colors.primary, borderWidth: 2 },
  planCardHeader: { padding: 16 },
  planCardHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planCardName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  planCardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  planCardPrice: { flexDirection: 'row', alignItems: 'baseline' },
  priceAmount: { fontSize: 28, fontWeight: '800', color: '#fff' },
  priceCurrency: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginLeft: 2 },
  pricePeriod: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginLeft: 4 },
  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 10 },
  currentBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  planCardBody: { padding: 16 },
  planStat: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  planStatText: { fontSize: 14, color: colors.text },
  planFeatures: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  planFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  planFeatureText: { fontSize: 13, color: colors.textLight, flex: 1 },

  contactCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  contactTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  contactText: { fontSize: 12, color: colors.textLight, marginTop: 4, lineHeight: 18 },
});
