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
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { salesAPI, productsAPI, customersAPI } from '../services/api';
import { colors } from '../utils/colors';

export const SalesScreen = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    customerId: '',
    quantity: '1',
    unitPrice: '',
    discount: '0',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesRes, productsRes, customersRes] = await Promise.all([
        salesAPI.getAll(user?.projectId),
        productsAPI.getAll(),
        customersAPI.getAll(user?.projectId),
      ]);
      setSales(salesRes.data || []);
      setProducts(productsRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (productId) => {
    setFormData(prev => ({ ...prev, productId }));

    // Pré-remplir le prix unitaire depuis le produit sélectionné
    const selectedProduct = products.find(p => p._id === productId);
    if (selectedProduct) {
      setFormData(prev => ({ ...prev, unitPrice: selectedProduct.unitPrice.toString() }));
    }
  };

  const handleCustomerChange = (customerId) => {
    setFormData(prev => ({ ...prev, customerId }));

    // Pré-remplir la remise depuis le niveau de fidélité du client
    const selectedCustomer = customers.find(c => c._id === customerId);
    if (selectedCustomer && selectedCustomer.discount) {
      setFormData(prev => ({ ...prev, discount: selectedCustomer.discount.toString() }));
    }
  };

  const handleAddSale = async () => {
    if (!formData.productId || !formData.quantity || !formData.unitPrice) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires');
      return;
    }

    try {
      await salesAPI.create({
        projectId: user?.projectId,
        productId: formData.productId,
        customerId: formData.customerId || undefined,
        quantity: parseInt(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        discount: parseFloat(formData.discount) || 0,
        description: formData.description,
      });

      setFormData({
        productId: '',
        customerId: '',
        quantity: '1',
        unitPrice: '',
        discount: '0',
        description: '',
      });
      setModalVisible(false);
      loadData();
      Alert.alert('Succès', 'Vente ajoutée avec succès');
    } catch (error) {
      console.error('Error adding sale:', error);
      Alert.alert('Erreur', error.response?.data?.error || 'Impossible d\'ajouter la vente');
    }
  };

  const renderSaleItem = ({ item }) => {
    // Vérifier que item existe avant d'accéder à ses propriétés
    if (!item) return null;

    const product = item.productId ? products.find(p => p._id === item.productId) : null;
    const customer = item.customerId ? customers.find(c => c._id === item.customerId) : null;

    return (
      <Card style={styles.saleItem}>
        <View style={styles.saleHeader}>
          <View style={styles.saleIcon}>
            <Ionicons name="cash-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.saleInfo}>
            <Text style={styles.saleAmount}>+{item.amount?.toFixed(2) || '0.00'} €</Text>
            {product ? (
              <Text style={styles.saleProduct}>
                {product.name} x{item.quantity || 1}
              </Text>
            ) : (
              <Text style={styles.saleProduct}>
                Produit x{item.quantity || 1}
              </Text>
            )}
            {customer && (
              <View style={styles.customerBadge}>
                <Ionicons name="person-outline" size={12} color={colors.primary} />
                <Text style={styles.customerName}>{customer.name}</Text>
              </View>
            )}
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
  };

  const totalSales = (sales && Array.isArray(sales)) ? sales.reduce((sum, sale) => sum + (sale.amount || 0), 0) : 0;
  const selectedProduct = products.find(p => p._id === formData.productId);
  const selectedCustomer = customers.find(c => c._id === formData.customerId);

  // Calcul du montant prévu
  const estimatedAmount = formData.quantity && formData.unitPrice
    ? (parseInt(formData.quantity) * parseFloat(formData.unitPrice)) - (parseFloat(formData.discount) || 0)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total des ventes</Text>
          <Text style={styles.totalAmount}>{totalSales.toFixed(2)} €</Text>
          <Text style={styles.totalCount}>{(sales && Array.isArray(sales)) ? sales.length : 0} vente(s)</Text>
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
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nouvelle vente</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.employeeInfo}>
                <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.employeeText}>
                  Vendeur: {user?.fullName || user?.username}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Produit *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.productId}
                  onValueChange={handleProductChange}
                  style={styles.picker}
                >
                  <Picker.Item label="Sélectionner un produit..." value="" />
                  {products && products.length > 0 && products.map(product => (
                    product && product._id ? (
                      <Picker.Item
                        key={product._id}
                        label={`${product.name || 'Produit'} - ${product.unitPrice || '0'}€`}
                        value={product._id}
                      />
                    ) : null
                  ))}
                </Picker>
              </View>

              {selectedProduct && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.info} />
                  <Text style={styles.infoText}>
                    Prix: {selectedProduct.unitPrice}€ | Catégorie: {selectedProduct.category || 'Aucune'}
                  </Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>Client</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.customerId}
                  onValueChange={handleCustomerChange}
                  style={styles.picker}
                >
                  <Picker.Item label="Aucun client sélectionné" value="" />
                  {customers && customers.length > 0 && customers.map(customer => (
                    customer && customer._id ? (
                      <Picker.Item
                        key={customer._id}
                        label={`${customer.name || 'Client'} - ${customer.phone || 'N/A'}`}
                        value={customer._id}
                      />
                    ) : null
                  ))}
                </Picker>
              </View>

              {selectedCustomer && (
                <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
                  <Ionicons name="star-outline" size={16} color={colors.primary} />
                  <Text style={styles.infoText}>
                    Fidélité: {selectedCustomer.loyaltyLevel || 'bronze'} |
                    {selectedCustomer.loyaltyPoints || 0} points |
                    Remise: {selectedCustomer.discount || 0}%
                  </Text>
                </View>
              )}

              <Input
                label="Quantité *"
                value={formData.quantity}
                onChangeText={(value) => setFormData(prev => ({ ...prev, quantity: value }))}
                placeholder="1"
                keyboardType="numeric"
                icon="layers-outline"
              />

              <Input
                label="Prix unitaire *"
                value={formData.unitPrice}
                onChangeText={(value) => setFormData(prev => ({ ...prev, unitPrice: value }))}
                placeholder="0.00"
                keyboardType="numeric"
                icon="cash-outline"
              />

              <Input
                label="Remise (montant)"
                value={formData.discount}
                onChangeText={(value) => setFormData(prev => ({ ...prev, discount: value }))}
                placeholder="0.00"
                keyboardType="numeric"
                icon="pricetag-outline"
              />

              <Input
                label="Description"
                value={formData.description}
                onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
                placeholder="Détails de la vente"
                icon="document-text-outline"
                multiline
              />

              {estimatedAmount > 0 && (
                <View style={styles.amountPreview}>
                  <Text style={styles.amountPreviewLabel}>Montant total estimé:</Text>
                  <Text style={styles.amountPreviewValue}>{estimatedAmount.toFixed(2)} €</Text>
                </View>
              )}

              <Button
                title="Enregistrer la vente"
                onPress={handleAddSale}
                style={styles.submitButton}
              />
            </ScrollView>
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
    backgroundColor: colors.primary + '10',
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
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
    backgroundColor: colors.primary + '20',
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
    color: colors.primary,
    marginBottom: 4,
  },
  saleProduct: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  customerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
  },
  saleDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  saleDate: {
    fontSize: 11,
    color: colors.textLight,
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  employeeText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.background,
  },
  picker: {
    height: 50,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    marginLeft: 6,
  },
  amountPreview: {
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  amountPreviewLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  amountPreviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  submitButton: {
    marginTop: 8,
  },
});
