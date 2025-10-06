import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  Modal,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
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
  const [cart, setCart] = useState([]); // Panier pour stocker les ventes avant validation
  const [formData, setFormData] = useState({
    customerId: '',
  });
  const [flashingProduct, setFlashingProduct] = useState(null);
  const flashAnim = useRef(new Animated.Value(1)).current;
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Log pour déboguer le projectId
    console.log('SalesScreen - User data:', {
      userId: user?._id,
      username: user?.username,
      projectId: user?.projectId,
      hasProjectId: !!user?.projectId,
      userObject: user
    });
    loadData();
    // Configuration audio pour iOS

  }, []);

  const loadData = async () => {
    try {
      const [salesRes, productsRes, customersRes] = await Promise.all([
        salesAPI.getAll(user?.projectId),
        productsAPI.getAll(user?.projectId),
        customersAPI.getAll(user?.projectId),
      ]);
      setSales(salesRes.data || []);
      setProducts(productsRes?.data?.data || []);
      setCustomers(customersRes?.data?.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour jouer un son
  const playSound = async (soundType) => {
    try {

      await sound.playAsync();
      // Décharger le son après la lecture
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Error playing sound:', error);
      // Ne pas bloquer l'application si le son ne peut pas être joué
    }
  };

  // Ajouter un produit au panier avec animation
  const handleAddToCart = (productId) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.productId === productId);

    if (existingItem) {
      // Augmenter la quantité
      setCart(cart.map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Ajouter nouveau produit au panier
      setCart([...cart, {
        productId: product._id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.unitPrice,
        discount: 0,
      }]);
    }

    // Animation visuelle et son
    setFlashingProduct(productId);
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFlashingProduct(null);
    });

    playSound('add');
  };

  // Modifier la quantité d'un produit dans le panier
  const updateCartItemQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: parseInt(quantity) || 1 }
        : item
    ));
  };

  // Retirer un produit du panier
  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
    playSound('error');
  };

  // Vider le panier avec confirmation
  const handleClearCart = () => {
    Alert.alert(
      'Vider le panier',
      `Êtes-vous sûr de vouloir supprimer les ${cart.length} produit(s) du panier ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: () => {
            setCart([]);
            playSound('error');
          }
        }
      ]
    );
  };

  // Valider toutes les ventes du panier
  const handleValidateCart = async () => {
    if (cart.length === 0) {
      Alert.alert('Panier vide', 'Ajoutez des produits avant de valider');
      return;
    }

    setSubmitting(true);
    try {
      // Créer toutes les ventes en parallèle
      await Promise.all(
        cart.map(item =>
          salesAPI.create({
            projectId: user?.projectId,
            productId: item.productId,
            customerId: formData.customerId || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            description: '',
          })
        )
      );

      playSound('success');
      setCart([]);
      setFormData({ customerId: '' });
      setModalVisible(false);
      await loadData();
      Alert.alert('Succès', `${cart.length} vente(s) enregistrée(s) avec succès`);
    } catch (error) {
      console.error('Error adding sales:', error);
      playSound('error');
      Alert.alert('Erreur', error.response?.data?.error || 'Impossible d\'ajouter les ventes');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSaleItem = ({ item }) => {
    // Vérifier que item existe avant d'accéder à ses propriétés
    if (!item) return null;

    const product = (item.productId && products && Array.isArray(products)) ? products.find(p => p._id === item.productId) : null;
    const customer = (item.customerId && customers && Array.isArray(customers)) ? customers.find(c => c._id === item.customerId) : null;

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
  const selectedCustomer = (customers && Array.isArray(customers)) ? customers.find(c => c._id === formData.customerId) : null;

  // Calcul du montant total du panier
  const cartTotal = cart.reduce((sum, item) =>
    sum + (item.quantity * item.unitPrice - (item.discount || 0)), 0
  );

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

              {/* Sélection du client (optionnel) */}
              <Text style={styles.fieldLabel}>Client (optionnel)</Text>
              {selectedCustomer && (
                <View style={styles.selectedItemBadge}>
                  <Ionicons name="person" size={16} color={colors.primary} />
                  <Text style={styles.selectedItemText}>
                    {selectedCustomer.name} - {selectedCustomer.phone || 'N/A'}
                  </Text>
                </View>
              )}
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.customerId}
                  onValueChange={(customerId) => setFormData({ customerId })}
                  style={styles.picker}
                >
                  <Picker.Item label="Aucun client" value="" />
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

              {/* Sélection des produits */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Produits</Text>
                <Text style={styles.sectionSubtitle}>Cliquez sur un produit pour l'ajouter au panier</Text>
              </View>

              <View style={styles.productsGrid}>
                {products && products.length > 0 ? products.map(product => {
                  if (!product || !product._id) return null;
                  const isFlashing = flashingProduct === product._id;
                  const animStyle = isFlashing ? {
                    transform: [{ scale: flashAnim }],
                  } : {};

                  return (
                    <Animated.View key={product._id} style={animStyle}>
                      <TouchableOpacity
                        style={[
                          styles.productCard,
                          isFlashing && styles.productCardFlashing
                        ]}
                        onPress={() => handleAddToCart(product._id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.productIconContainer}>
                          <Ionicons name="cube" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.name}
                        </Text>
                        <Text style={styles.productPrice}>{product.unitPrice}€</Text>
                        {cart.find(item => item.productId === product._id) && (
                          <View style={styles.productBadge}>
                            <Text style={styles.productBadgeText}>
                              {cart.find(item => item.productId === product._id).quantity}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                }) : (
                  <Text style={styles.emptyText}>Aucun produit disponible</Text>
                )}
              </View>

              {/* Panier */}
              {cart.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Panier ({cart.length})</Text>
                  </View>

                  {cart.map((item) => (
                    <View key={item.productId} style={styles.cartItem}>
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName}>{item.productName}</Text>
                        <Text style={styles.cartItemPrice}>
                          {item.unitPrice}€ x {item.quantity} = {(item.unitPrice * item.quantity).toFixed(2)}€
                        </Text>
                      </View>
                      <View style={styles.cartItemActions}>
                        <View style={styles.quantityControls}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                          >
                            <Ionicons name="remove" size={20} color={colors.primary} />
                          </TouchableOpacity>
                          <View style={styles.quantityDisplay}>
                            <Text style={styles.quantityText}>{item.quantity}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                          >
                            <Ionicons name="add" size={20} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => removeFromCart(item.productId)}
                        >
                          <Ionicons name="trash-outline" size={20} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <View style={styles.cartTotal}>
                    <Text style={styles.cartTotalLabel}>Total du panier:</Text>
                    <Text style={styles.cartTotalValue}>{cartTotal.toFixed(2)} €</Text>
                  </View>

                  <Button
                    title={submitting ? 'Validation en cours...' : `Valider ${cart.length} vente(s)`}
                    onPress={handleValidateCart}
                    style={styles.submitButton}
                    disabled={submitting}
                  />

                  {submitting && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.loadingText}>Enregistrement des ventes...</Text>
                    </View>
                  )}

                  <Button
                    title="Vider le panier"
                    onPress={handleClearCart}
                    style={[styles.submitButton, { backgroundColor: colors.danger }]}
                    disabled={submitting}
                  />
                </>
              )}
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
  selectedItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  selectedItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  productCard: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    margin: '1%',
    alignItems: 'center',
    position: 'relative',
  },
  productCardFlashing: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  productIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 34,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  productBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  cartItemInfo: {
    marginBottom: 8,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 20,
    padding: 4,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityDisplay: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cartTotal: {
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cartTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 8,
  },
});
