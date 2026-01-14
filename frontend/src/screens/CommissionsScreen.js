import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../utils/colors';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import api from '../services/api';

export const CommissionsScreen = ({ navigation }) => {
  const { user, selectedProjectId } = useAuth();
  const { format: formatPrice } = useCurrency();
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'responsable' || user?.role === 'manager';

  useEffect(() => {
    loadCommissions();
  }, [selectedProjectId]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const params = { projectId: selectedProjectId || user?.projectId };
      
      // Si c'est un salarié, charger uniquement ses commissions
      if (!isAdmin) {
        params.userId = user.id;
      }

      const response = await api.get('/commissions', { params });
      setCommissions(response.data.data || []);
      setStats(response.data.stats || null);
    } catch (error) {
      console.error('Erreur chargement commissions:', error);
      Alert.alert('Erreur', 'Impossible de charger les commissions');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (id) => {
    Alert.alert(
      'Confirmation',
      'Marquer cette commission comme payée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await api.put(`/commissions/${id}/pay`);
              loadCommissions();
              Alert.alert('Succès', 'Commission marquée comme payée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de mettre à jour la commission');
            }
          },
        },
      ]
    );
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { label: 'En attente', color: colors.warning, icon: 'time' };
      case 'paid':
        return { label: 'Payée', color: colors.success, icon: 'checkmark-circle' };
      default:
        return { label: status, color: colors.textSecondary, icon: 'help-circle' };
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const renderCommissionItem = ({ item }) => {
    const statusInfo = getStatusInfo(item.status);
    const userName = item.userId?.fullName || item.userId?.username || 'Inconnu';

    return (
      <Card style={styles.commissionCard}>
        <View style={styles.commissionHeader}>
          <View style={styles.commissionUser}>
            <View style={[styles.userAvatar, { backgroundColor: colors.success + '30' }]}>
              <Ionicons name="person" size={24} color={colors.success} />
            </View>
            <View style={styles.commissionUserInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.commissionDate}>{formatDate(item.date)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.commissionDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Montant de la vente</Text>
              <Text style={styles.detailValue}>{formatPrice(item.saleAmount || 0)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Taux</Text>
              <Text style={styles.detailValue}>{item.rate}%</Text>
            </View>
          </View>
          <View style={styles.commissionAmountContainer}>
            <Text style={styles.commissionAmountLabel}>Commission</Text>
            <Text style={styles.commissionAmount}>{formatPrice(item.amount || 0)}</Text>
          </View>
        </View>

        {isAdmin && item.status === 'pending' && (
          <View style={styles.commissionActions}>
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => handleMarkAsPaid(item._id)}
            >
              <LinearGradient
                colors={[colors.success, colors.success + 'DD']}
                style={styles.payButtonGradient}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.payButtonText}>Marquer comme payée</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.surface, colors.background]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Commissions</Text>
            <Text style={styles.subtitle}>
              {isAdmin ? `${commissions.length} commission(s)` : 'Mes commissions'}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      {stats && (
        <LinearGradient
          colors={[colors.surface + '80', colors.background]}
          style={styles.statsContainer}
        >
          <LinearGradient
            colors={[colors.success + '25', colors.success + '10']}
            style={styles.statCard}
          >
            <Ionicons name="cash" size={28} color={colors.success} />
            <Text style={styles.statValue}>{formatPrice(stats.total || 0)}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </LinearGradient>
          <LinearGradient
            colors={[colors.warning + '25', colors.warning + '10']}
            style={styles.statCard}
          >
            <Ionicons name="time" size={28} color={colors.warning} />
            <Text style={styles.statValue}>{formatPrice(stats.pending || 0)}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </LinearGradient>
          <LinearGradient
            colors={[colors.primary + '25', colors.primary + '10']}
            style={styles.statCard}
          >
            <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
            <Text style={styles.statValue}>{formatPrice(stats.paid || 0)}</Text>
            <Text style={styles.statLabel}>Payées</Text>
          </LinearGradient>
        </LinearGradient>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={commissions}
          renderItem={renderCommissionItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={loadCommissions}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={80} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Aucune commission</Text>
              <Text style={styles.emptySubtext}>
                Les commissions apparaîtront après les ventes
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
  },
  commissionCard: {
    marginBottom: 15,
  },
  commissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  commissionUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commissionUserInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  commissionDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  commissionDetails: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  commissionAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commissionAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  commissionAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.success,
  },
  commissionActions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 15,
  },
  payButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
});

