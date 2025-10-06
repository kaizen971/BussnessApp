import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { salesAPI } from '../services/api';
import { colors } from '../utils/colors';

export const SalesScreen = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
  });

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const response = await salesAPI.getAll(user?.projectId);
      setSales(response.data);
    } catch (error) {
      console.error('Error loading sales:', error);
      Alert.alert('Erreur', 'Impossible de charger les ventes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSale = async () => {
    if (!formData.amount) {
      Alert.alert('Erreur', 'Veuillez saisir un montant');
      return;
    }

    try {
      await salesAPI.create({
        ...formData,
        amount: parseFloat(formData.amount),
        projectId: user?.projectId,
      });

      setFormData({ amount: '', description: '' });
      setModalVisible(false);
      loadSales();
      Alert.alert('Succès', 'Vente ajoutée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter la vente');
    }
  };

  const renderSaleItem = ({ item }) => (
    <Card style={styles.saleItem}>
      <View style={styles.saleHeader}>
        <View style={styles.saleIcon}>
          <Ionicons name="cash-outline" size={24} color={colors.success} />
        </View>
        <View style={styles.saleInfo}>
          <Text style={styles.saleAmount}>+{item.amount.toFixed(2)} €</Text>
          {item.description && (
            <Text style={styles.saleDescription}>{item.description}</Text>
          )}
          <Text style={styles.saleDate}>
            {new Date(item.date).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    </Card>
  );

  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total des ventes</Text>
          <Text style={styles.totalAmount}>{totalSales.toFixed(2)} €</Text>
          <Text style={styles.totalCount}>{sales.length} vente(s)</Text>
        </Card>
      </View>

      <FlatList
        data={sales}
        renderItem={renderSaleItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>Aucune vente enregistrée</Text>
          </View>
        }
      />

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle vente</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Input
              label="Montant *"
              value={formData.amount}
              onChangeText={(value) => setFormData(prev => ({ ...prev, amount: value }))}
              placeholder="0.00"
              keyboardType="numeric"
              icon="cash-outline"
            />

            <Input
              label="Description"
              value={formData.description}
              onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
              placeholder="Détails de la vente"
              icon="document-text-outline"
              multiline
            />

            <Button
              title="Ajouter la vente"
              onPress={handleAddSale}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
  },
  totalCard: {
    alignItems: 'center',
    backgroundColor: colors.success + '10',
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 4,
  },
  totalCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  saleItem: {
    marginBottom: 12,
  },
  saleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  saleInfo: {
    flex: 1,
  },
  saleAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 2,
  },
  saleDescription: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  saleDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textLight,
    marginTop: 16,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
});
