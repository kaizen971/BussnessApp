import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { expensesAPI, teamPayrollAPI } from '../services/api';
import { colors } from '../utils/colors';

export const ExpensesScreen = () => {
  const { user } = useAuth();
  const { format: formatPrice } = useCurrency();
  const [expenses, setExpenses] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'recurring' ou 'payroll'
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    category: 'variable',
    description: '',
    isRecurring: false,
    recurringDay: '1',
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    loadExpenses();
    loadRecurringExpenses();
    if (isAdmin) loadPayroll();
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

  const loadRecurringExpenses = async () => {
    try {
      const response = await expensesAPI.getRecurring(user?.projectId);
      setRecurringExpenses(response.data.data || []);
    } catch (error) {
      console.error('Error loading recurring expenses:', error);
    }
  };

  const loadPayroll = async () => {
    try {
      const now = new Date();
      const response = await teamPayrollAPI.getPayroll(
        user?.projectId,
        now.getMonth() + 1,
        now.getFullYear()
      );
      setPayrollData(response.data);
    } catch (error) {
      console.error('Error loading payroll:', error);
    }
  };

  const handleAddExpense = async () => {
    if (!formData.amount) {
      Alert.alert('Erreur', 'Veuillez saisir un montant');
      return;
    }

    if (formData.isRecurring && (!formData.recurringDay || formData.recurringDay < 1 || formData.recurringDay > 28)) {
      Alert.alert('Erreur', 'Veuillez saisir un jour valide (1-28)');
      return;
    }

    try {
      const expenseData = {
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        projectId: user?.projectId,
        isRecurring: formData.isRecurring,
      };

      if (formData.isRecurring) {
        expenseData.recurringDay = parseInt(formData.recurringDay);
      }

      await expensesAPI.create(expenseData);

      setFormData({ amount: '', category: 'variable', description: '', isRecurring: false, recurringDay: '1' });
      setModalVisible(false);
      loadExpenses();
      loadRecurringExpenses();
      Alert.alert('Succès', formData.isRecurring ? 'Dépense récurrente ajoutée avec succès' : 'Dépense ajoutée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter la dépense');
    }
  };

  const handleOpenEditModal = (expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description || '',
      isRecurring: false,
      recurringDay: '1',
    });
    setModalVisible(true);
  };

  const handleUpdateExpense = async () => {
    if (!formData.amount) {
      Alert.alert('Erreur', 'Veuillez saisir un montant');
      return;
    }

    try {
      const expenseData = {
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
      };

      await expensesAPI.update(editingExpense._id, expenseData);

      setFormData({ amount: '', category: 'variable', description: '', isRecurring: false, recurringDay: '1' });
      setEditingExpense(null);
      setModalVisible(false);
      loadExpenses();
      Alert.alert('Succès', 'Dépense modifiée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier la dépense');
    }
  };

  const handleDeleteExpense = async (id) => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer cette dépense ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await expensesAPI.delete(id);
              loadExpenses();
              Alert.alert('Succès', 'Dépense supprimée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la dépense');
            }
          }
        }
      ]
    );
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingExpense(null);
    setFormData({ amount: '', category: 'variable', description: '', isRecurring: false, recurringDay: '1' });
  };

  const handleDeleteRecurring = async (id) => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer cette dépense récurrente ? Elle ne sera plus générée automatiquement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await expensesAPI.deleteRecurring(id);
              loadRecurringExpenses();
              Alert.alert('Succès', 'Dépense récurrente supprimée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la dépense récurrente');
            }
          }
        }
      ]
    );
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
              <Text style={styles.expenseAmount}>-{formatPrice(item.amount)}</Text>
              <View style={styles.badgesRow}>
                {item.parentExpenseId && (
                  <View style={[styles.categoryBadge, { backgroundColor: colors.warning + '20', marginRight: 4 }]}>
                    <Ionicons name="repeat" size={12} color={colors.warning} />
                  </View>
                )}
                <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '20' }]}>
                  <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
                    {categoryInfo.label}
                  </Text>
                </View>
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
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleOpenEditModal(item)}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteExpense(item._id)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  const renderRecurringItem = ({ item }) => {
    const categoryInfo = getCategoryInfo(item.category);

    return (
      <Card style={styles.expenseItem}>
        <View style={styles.expenseHeader}>
          <View style={[styles.expenseIcon, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="repeat" size={24} color={colors.warning} />
          </View>
          <View style={styles.expenseInfo}>
            <View style={styles.headerRow}>
              <Text style={styles.expenseAmount}>-{formatPrice(item.amount)}</Text>
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
              Tous les {item.recurringDay} du mois
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteRecurring(item._id)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const totalExpenses = (expenses && Array.isArray(expenses)) ? expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
  const totalRecurring = (recurringExpenses && Array.isArray(recurringExpenses)) ? recurringExpenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
  const totalPayroll = payrollData?.totals?.totalPayroll || 0;
  const totalCharges = totalExpenses + totalPayroll;

  const renderPayrollItem = ({ item }) => (
    <Card style={styles.expenseItem}>
      <View style={styles.expenseHeader}>
        <View style={[styles.expenseIcon, { backgroundColor: colors.warning + '20' }]}>
          <Ionicons name="person" size={24} color={colors.warning} />
        </View>
        <View style={styles.expenseInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.expenseAmount}>-{formatPrice(item.totalDue)}</Text>
            <View style={[styles.categoryBadge, { backgroundColor: colors.warning + '20' }]}>
              <Text style={[styles.categoryText, { color: colors.warning }]}>Salaire</Text>
            </View>
          </View>
          <Text style={styles.expenseDescription}>{item.user.fullName || item.user.username}</Text>
          <View style={styles.payrollDetails}>
            <Text style={styles.expenseDate}>
              {item.daysWorked}j travaillés • {item.hours.toFixed(1)}h
            </Text>
            {item.commissions > 0 && (
              <Text style={[styles.expenseDate, { color: colors.accent }]}>
                + {formatPrice(item.commissions)} commissions
              </Text>
            )}
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total des charges</Text>
          <Text style={styles.totalAmount}>{formatPrice(totalCharges)}</Text>
          <View style={styles.totalBreakdown}>
            <Text style={styles.totalBreakdownItem}>
              Dépenses: {formatPrice(totalExpenses)}
            </Text>
            {isAdmin && (
              <Text style={[styles.totalBreakdownItem, { color: colors.warning }]}>
                Masse salariale: {formatPrice(totalPayroll)}
              </Text>
            )}
          </View>
        </Card>
      </View>

      {/* Onglets */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            Dépenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recurring' && styles.activeTab]}
          onPress={() => setActiveTab('recurring')}
        >
          <Ionicons
            name="repeat"
            size={16}
            color={activeTab === 'recurring' ? colors.primary : colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'recurring' && styles.activeTabText]}>
            Récurrentes
          </Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'payroll' && styles.activeTab]}
            onPress={() => setActiveTab('payroll')}
          >
            <Ionicons
              name="people"
              size={16}
              color={activeTab === 'payroll' ? colors.warning : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.tabText, activeTab === 'payroll' && styles.activeTabText]}>
              Salaires
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'all' ? (
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
      ) : activeTab === 'recurring' ? (
        <FlatList
          data={recurringExpenses}
          renderItem={renderRecurringItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            recurringExpenses.length > 0 ? (
              <Card style={[styles.totalCard, { backgroundColor: colors.warning + '10', marginBottom: 16 }]}>
                <Text style={styles.totalLabel}>Total mensuel récurrent</Text>
                <Text style={[styles.totalAmount, { color: colors.warning }]}>{formatPrice(totalRecurring)}</Text>
                <Text style={styles.totalCount}>{recurringExpenses.length} dépense(s) récurrente(s)</Text>
              </Card>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="repeat" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>Aucune dépense récurrente</Text>
              <Text style={styles.emptySubtext}>Les dépenses récurrentes sont générées automatiquement chaque mois</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={payrollData?.employees || []}
          renderItem={renderPayrollItem}
          keyExtractor={(item) => item.user._id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            payrollData ? (
              <Card style={[styles.totalCard, { backgroundColor: colors.warning + '10', marginBottom: 16 }]}>
                <Text style={styles.totalLabel}>
                  Masse salariale — {payrollData.period?.label}
                </Text>
                <Text style={[styles.totalAmount, { color: colors.warning }]}>
                  {formatPrice(payrollData.totals?.totalPayroll || 0)}
                </Text>
                <View style={styles.payrollSummary}>
                  <Text style={styles.totalCount}>
                    Salaires: {formatPrice(payrollData.totals?.totalSalary || 0)}
                  </Text>
                  <Text style={styles.totalCount}>
                    Commissions: {formatPrice(payrollData.totals?.totalCommissions || 0)}
                  </Text>
                  <Text style={styles.totalCount}>
                    {payrollData.totals?.totalHours?.toFixed(1) || 0}h totales
                  </Text>
                </View>
              </Card>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>Aucun salaire ce mois</Text>
              <Text style={styles.emptySubtext}>Les salaires sont calculés à partir du planning complété</Text>
            </View>
          }
        />
      )}

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
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}
                </Text>
                <TouchableOpacity onPress={handleCloseModal}>
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

              {/* Option dépense récurrente - uniquement en mode création */}
              {!editingExpense && (
                <View style={styles.recurringSection}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabel}>
                      <Ionicons name="repeat" size={20} color={colors.warning} />
                      <Text style={styles.switchText}>Dépense récurrente</Text>
                    </View>
                    <Switch
                      value={formData.isRecurring}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, isRecurring: value }))}
                      trackColor={{ false: colors.border, true: colors.warning + '60' }}
                      thumbColor={formData.isRecurring ? colors.warning : colors.textLight}
                    />
                  </View>
                  {formData.isRecurring && (
                    <View style={styles.recurringOptions}>
                      <Text style={styles.recurringInfo}>
                        Cette dépense sera automatiquement créée chaque mois
                      </Text>
                      <View style={styles.dayPickerContainer}>
                        <Text style={styles.pickerLabel}>Jour du mois (1-28)</Text>
                        <View style={styles.pickerWrapper}>
                          <Picker
                            selectedValue={formData.recurringDay}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, recurringDay: value }))}
                            style={styles.picker}
                          >
                            {[...Array(28)].map((_, i) => (
                              <Picker.Item key={i + 1} label={`${i + 1}`} value={`${i + 1}`} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}

              <Button
                title={editingExpense
                  ? "Modifier la dépense"
                  : (formData.isRecurring ? "Ajouter la dépense récurrente" : "Ajouter la dépense")}
                onPress={editingExpense ? handleUpdateExpense : handleAddExpense}
              />
            </View>
          </ScrollView>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalScrollView: {
    flex: 1,
  },
  recurringSection: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: colors.warning + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  recurringOptions: {
    marginTop: 16,
  },
  recurringInfo: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  dayPickerContainer: {
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  totalBreakdown: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  totalBreakdownItem: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  payrollDetails: {
    marginTop: 2,
  },
  payrollSummary: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});
