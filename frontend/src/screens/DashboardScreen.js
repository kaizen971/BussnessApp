import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/Card';
import { dashboardAPI } from '../services/api';
import { colors } from '../utils/colors';

export const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
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

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <Card style={styles.statCard} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </Card>
  );

  const QuickActionButton = ({ title, icon, color, onPress }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.userName}>{user?.fullName || user?.username}</Text>
          <Text style={styles.userRole}>{user?.role === 'admin' ? 'Administrateur' : user?.role === 'manager' ? 'Responsable' : 'Caissier'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>

      {stats && (
        <>
          <View style={styles.statsGrid}>
            <StatCard
              title="Ventes"
              value={`${stats.totalSales?.toFixed(2) || 0} €`}
              icon="cash-outline"
              color={colors.success}
            />
            <StatCard
              title="Dépenses"
              value={`${stats.totalExpenses?.toFixed(2) || 0} €`}
              icon="trending-down-outline"
              color={colors.error}
            />
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              title="Bénéfice Net"
              value={`${stats.netProfit?.toFixed(2) || 0} €`}
              icon="analytics-outline"
              color={stats.netProfit >= 0 ? colors.success : colors.error}
            />
            <StatCard
              title="Stock"
              value={`${stats.totalStock?.toFixed(2) || 0} €`}
              icon="cube-outline"
              color={colors.info}
            />
          </View>

          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Résumé</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Nombre de ventes</Text>
              <Text style={styles.summaryValue}>{stats.salesCount || 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Nombre de dépenses</Text>
              <Text style={styles.summaryValue}>{stats.expensesCount || 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Articles en stock</Text>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  userRole: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 100,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryCard: {
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
