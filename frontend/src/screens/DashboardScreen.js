import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/Card';
import { LoadingScreen } from '../components/LoadingScreen';
import { dashboardAPI } from '../services/api';
import { colors, gradients } from '../utils/colors';

export const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadDashboardData();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadDashboardData = async () => {
    if (!user?.projectId) {
      setLoading(false);
      return;
    }

    try {
      const response = await dashboardAPI.getStats(user.projectId);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const StatCard = ({ title, value, icon, color, onPress, subtitle }) => (
    <Card style={styles.statCard} onPress={onPress}>
      <LinearGradient
        colors={[color + '20', color + '08']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statGradient}
      >
        <View style={styles.statHeader}>
          <View style={[styles.statIcon, { backgroundColor: color + '30' }]}>
            <Ionicons name={icon} size={32} color={color} />
          </View>
          <View style={styles.statBadge}>
            <Ionicons name="trending-up" size={14} color={colors.success} />
          </View>
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={styles.statValue}>{value}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </LinearGradient>
    </Card>
  );

  const QuickActionButton = ({ title, icon, color, onPress }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={[color + '15', color + '05']}
        style={styles.actionGradient}
      >
        <View style={[styles.actionIcon, { backgroundColor: color + '25' }]}>
          <Ionicons name={icon} size={26} color={color} />
        </View>
        <Text style={styles.actionText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.avatarContainer}>
                <LinearGradient colors={[colors.primary, colors.accent]} style={styles.avatar}>
                  <Text style={styles.avatarText}>{(user?.fullName || user?.username)?.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.greeting}>Bonjour 👋</Text>
                <Text style={styles.userName}>{user?.fullName || user?.username}</Text>
                <View style={styles.roleContainer}>
                  <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                  <Text style={styles.userRole}>
                    {user?.role === 'admin' ? 'Administrateur' : user?.role === 'manager' ? 'Responsable' : 'Caissier'}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <View style={styles.logoutIconContainer}>
                <Ionicons name="log-out-outline" size={22} color={colors.error} />
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

      {stats && (
        <>
          <Text style={styles.sectionTitle}>Statistiques financières</Text>
          <View style={styles.statsRow}>
            <StatCard
              title="Ventes totales"
              value={`${stats.totalSales?.toFixed(2) || 0} €`}
              subtitle={`${stats.salesCount || 0} ventes`}
              icon="cash"
              color={colors.success}
            />
            <StatCard
              title="Dépenses"
              value={`${stats.totalExpenses?.toFixed(2) || 0} €`}
              subtitle={`${stats.expensesCount || 0} dépenses`}
              icon="trending-down"
              color={colors.error}
            />
          </View>

          <View style={styles.statsRow}>
            <StatCard
              title="Bénéfice Net"
              value={`${stats.netProfit?.toFixed(2) || 0} €`}
              subtitle={stats.netProfit >= 0 ? "Positif" : "Négatif"}
              icon="analytics"
              color={stats.netProfit >= 0 ? colors.success : colors.error}
            />
            <StatCard
              title="Valeur Stock"
              value={`${stats.totalStock?.toFixed(2) || 0} €`}
              subtitle={`${stats.stockItems || 0} articles`}
              icon="cube"
              color={colors.primary}
            />
          </View>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Aperçu détaillé</Text>
              <View style={styles.summaryIcon}>
                <Ionicons name="bar-chart" size={24} color={colors.primary} />
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <View style={[styles.summaryDot, { backgroundColor: colors.success }]} />
                <Text style={styles.summaryLabel}>Nombre de ventes</Text>
              </View>
              <Text style={styles.summaryValue}>{stats.salesCount || 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <View style={[styles.summaryDot, { backgroundColor: colors.error }]} />
                <Text style={styles.summaryLabel}>Nombre de dépenses</Text>
              </View>
              <Text style={styles.summaryValue}>{stats.expensesCount || 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <View style={[styles.summaryDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.summaryLabel}>Articles en stock</Text>
              </View>
              <Text style={styles.summaryValue}>{stats.stockItems || 0}</Text>
            </View>
          </Card>
        </>
      )}

      <Text style={styles.sectionTitle}>Actions rapides</Text>
      <View style={styles.actionsGrid}>
        <QuickActionButton
          title="Simulation"
          icon="calculator-outline"
          color={colors.primary}
          onPress={() => navigation.navigate('Simulation')}
        />
        <QuickActionButton
          title="Ventes"
          icon="cart-outline"
          color={colors.success}
          onPress={() => navigation.navigate('Sales')}
        />
        <QuickActionButton
          title="Dépenses"
          icon="wallet-outline"
          color={colors.error}
          onPress={() => navigation.navigate('Expenses')}
        />
        <QuickActionButton
          title="Stock"
          icon="cube-outline"
          color={colors.info}
          onPress={() => navigation.navigate('Stock')}
        />
        <QuickActionButton
          title="Clients"
          icon="people-outline"
          color={colors.accent}
          onPress={() => navigation.navigate('Customers')}
        />
        <QuickActionButton
          title="Feedback"
          icon="chatbubble-outline"
          color={colors.primary}
          onPress={() => navigation.navigate('Feedback')}
        />
      </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 28,
    marginHorizontal: -16,
  },
  headerGradient: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.background,
  },
  headerInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: colors.background,
    fontWeight: '600',
    opacity: 0.9,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.background,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: colors.background + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  userRole: {
    fontSize: 11,
    color: colors.background,
    marginLeft: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  logoutButton: {
    padding: 4,
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 0,
    minHeight: 140,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  statGradient: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  statHeader: {
    position: 'relative',
  },
  statIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.success + '30',
    borderRadius: 12,
    padding: 4,
  },
  statContent: {
    marginTop: 12,
  },
  statTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: -0.5,
  },
  statSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
    fontWeight: '500',
  },
  summaryCard: {
    marginBottom: 28,
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 0.3,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight + '50',
  },
  summaryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  actionGradient: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
