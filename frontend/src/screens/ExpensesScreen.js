import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { expensesAPI } from '../services/api';
import { colors } from '../utils/colors';

export const ExpensesScreen = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category: 'variable',
    description: '',
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const response = await expensesAPI.getAll(user?.projectId);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error loading expenses:', error);
      Alert.alert('Erreur', 'Impossible de charger les dépenses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!formData.amount) {
      Alert.alert('Erreur', 'Veuillez saisir un montant');
      return;
    }

    try {
      await expensesAPI.create({
        ...formData,
        amount: parseFloat(formData.amount),
        projectId: user?.projectId,
      });

      setFormData({ amount: '', category: 'variable', description: '' });
      setModalVisible(false);
      loadExpenses();
      Alert.alert('Succès', 'Dépense ajoutée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter la dépense');
    }
  };

  const getCategoryInfo = (category) => {
    switch (category) {
      case 'purchase':
        return { label: 'Achat', color: colors.error, icon: 'cart-outline' };
      case 'variable':
        return { label: 'Variable', color: colors.accent, icon: 'trending-up-outline' };
      case 'fixed':
        return { label: 'Fixe', color: colors.info, icon: 'lock-closed-outline' };
      default:
        return { label: 'Autre', color: colors.textSecondary, icon: 'wallet-outline' };
    }
  };

  const renderExpenseItem = ({ item }) => {
    const categoryInfo = getCategoryInfo(item.category);

    return (
      <Card style={styles.expenseItem}>
        <View style={styles.expenseHeader}>
          <View style={[styles.expenseIcon, { backgroundColor: categoryInfo.color + '20' }]}>
            <Ionicons name={categoryInfo.icon} size={24} color={categoryInfo.color} />
          </View>
          <View style={styles.expenseInfo}>
            <View style={styles.headerRow}>
              <Text style={styles.expenseAmount}>-{item.amount.toFixed(2)} €</Text>
              <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '20' }]}>
                <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
                  {categoryInfo.label}
                </Text>
              </View>
            </View>
            {item.description && (
              <Text style={styles.expenseDescription}>{item.description}</Text>
            )}
            <Text style={styles.expenseDate}>
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
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total des dépenses</Text>
          <Text style={styles.totalAmount}>{totalExpenses.toFixed(2)} €</Text>
          <Text style={styles.totalCount}>{expenses.length} dépense(s)</Text>
        </Card>
      </View>

      <FlatList
        data={expenses}
        renderItem={renderExpenseItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>Aucune dépense enregistrée</Text>
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
              <Text style={styles.modalTitle}>Nouvelle dépense</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Catégorie *</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  style={styles.picker}
                >
                  <Picker.Item label="Achat" value="purchase" />
                  <Picker.Item label="Variable" value="variable" />
                  <Picker.Item label="Fixe" value="fixed" />
                </Picker>
              </View>
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
              placeholder="Détails de la dépense"
              icon="document-text-outline"
              multiline
            />

            <Button
              title="Ajouter la dépense"
              onPress={handleAddExpense}
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
    backgroundColor: colors.error + '10',
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.error,
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
  expenseItem: {
    marginBottom: 12,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expenseDescription: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  expenseDate: {
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
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.error,
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
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
});
