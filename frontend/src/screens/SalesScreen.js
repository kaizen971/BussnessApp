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
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { salesAPI, productsAPI, customersAPI } from '../services/api';
import { colors } from '../utils/colors';

const { width } = Dimensions.get('window');

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
      setSales(salesRes.data?.data || []);
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
      <LinearGradient
        colors={[colors.surface, colors.background]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.headerTitle}>Ventes</Text>
            <Text style={styles.headerSubtitle}>{(sales && Array.isArray(sales)) ? sales.length : 0} vente(s)</Text>
          </View>
        </View>
        <LinearGradient
          colors={[colors.primary + '25', colors.primary + '10']}
          style={styles.totalCard}
        >
          <View style={styles.totalCardContent}>
            <Ionicons name="wallet" size={32} color={colors.primary} />
            <View style={styles.totalTextContainer}>
              <Text style={styles.totalLabel}>Total des ventes</Text>
              <Text style={styles.totalAmount}>{totalSales.toFixed(2)} €</Text>
            </View>
          </View>
        </LinearGradient>
      </LinearGradient>

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
          style={styles.fabWrapper}
          onPress={() => setModalVisible(true)}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.fab}
          >
            <Ionicons name="add" size={32} color="#000" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={[colors.surface, colors.background]}
            style={styles.modalContent}
          >
            <View style={styles.modalHeaderContainer}>
              <LinearGradient
                colors={[colors.primary + '30', colors.primary + '10']}
                style={styles.modalHeaderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.modalIconContainer}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.modalIcon}
                  >
                    <Ionicons name="cart" size={28} color="#000" />
                  </LinearGradient>
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Nouvelle vente</Text>
                  <Text style={styles.modalSubtitle}>Ajoutez des produits au panier</Text>
                </View>
              </LinearGradient>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close-circle" size={32} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalForm}
              showsVerticalScrollIndicator={false}
            >
              <LinearGradient
                colors={[colors.primary + '20', colors.primary + '10']}
                style={styles.employeeInfo}
              >
                <Ionicons name="person-circle" size={24} color={colors.primary} />
                <Text style={styles.employeeText}>
                  Vendeur: {user?.fullName || user?.username}
                </Text>
              </LinearGradient>

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
                <LinearGradient
                  colors={[colors.primary + '20', colors.primary + '10']}
                  style={styles.infoBox}
                >
                  <Ionicons name="star" size={20} color={colors.primary} />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoText}>
                      {selectedCustomer.loyaltyLevel || 'Bronze'} • {selectedCustomer.loyaltyPoints || 0} pts • {selectedCustomer.discount || 0}% remise
                    </Text>
                  </View>
                </LinearGradient>
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

                  const inCart = cart.find(item => item.productId === product._id);
                  return (
                    <Animated.View key={product._id} style={animStyle}>
                      <TouchableOpacity
                        style={[
                          styles.productCard,
                          isFlashing && styles.productCardFlashing
                        ]}
                        onPress={() => handleAddToCart(product._id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.productIconContainer}>
                          <Ionicons name="cube" size={32} color={colors.primary} />
                        </View>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.name}
                        </Text>
                        <View style={styles.productPriceContainer}>
                          <Text style={styles.productPrice}>{product.unitPrice}€</Text>
                          {inCart && (
                            <Ionicons name="checkmark-circle" size={18} color={colors.success} style={{ marginLeft: 6 }} />
                          )}
                        </View>
                        {inCart && (
                          <View style={styles.productBadge}>
                            <Text style={styles.productBadgeText}>
                              {inCart.quantity}
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

                  <TouchableOpacity 
                    style={styles.validateButtonWrapper}
                    onPress={handleValidateCart}
                    disabled={submitting}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.primaryDark]}
                      style={styles.validateButton}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#000" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={22} color="#000" />
                          <Text style={styles.validateButtonText}>
                            Valider {cart.length} vente(s)
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={handleClearCart}
                    disabled={submitting}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    <Text style={styles.clearButtonText}>Vider le panier</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </LinearGradient>
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  headerContent: {
    marginBottom: 16,
  },
  titleSection: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  totalCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  totalTextContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
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
  fabWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 30,
    maxHeight: '92%',
    borderTopWidth: 2,
    borderColor: colors.primary + '40',
  },
  modalHeaderContainer: {
    padding: 20,
    paddingBottom: 16,
  },
  modalHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  modalIconContainer: {
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  modalForm: {
    paddingHorizontal: 20,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  employeeText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginLeft: 12,
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
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
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
  validateButtonWrapper: {
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  validateButton: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  validateButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.danger + '15',
    borderWidth: 1,
    borderColor: colors.danger + '30',
    gap: 8,
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
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
    marginHorizontal: -10,
  },
  productCard: {
    width: (width - 60) / 2,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    margin: 10,
    alignItems: 'center',
    position: 'relative',
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productCardFlashing: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
    borderWidth: 2,
    shadowOpacity: 0.15,
    elevation: 3,
  },
  productIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
    minHeight: 44,
    lineHeight: 22,
  },
  productPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  productBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.primary,
    borderRadius: 16,
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  productBadgeText: {
    color: '#000',
    fontSize: 14,
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

