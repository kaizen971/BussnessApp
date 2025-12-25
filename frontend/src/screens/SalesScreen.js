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
  TextInput,
} from 'react-native';
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

  // Nouveaux états pour la recherche et l'affichage
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productViewMode, setProductViewMode] = useState('grid'); // 'grid' ou 'list'

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
      console.log(productsRes.data)
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

  // Fonction pour rembourser une vente
  const handleRefund = (saleId) => {
    Alert.alert(
      'Confirmer le remboursement',
      'Êtes-vous sûr de vouloir rembourser cette vente ? Cette action créera une vente négative et remettra le stock.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rembourser',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await salesAPI.refund(saleId);
              playSound('success');
              await loadData();
              Alert.alert('Succès', 'Remboursement effectué avec succès');
            } catch (error) {
              console.error('Error refunding sale:', error);
              playSound('error');
              Alert.alert('Erreur', error.response?.data?.error || 'Impossible de rembourser cette vente');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Déterminer si l'utilisateur est admin/manager
  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'responsable';

  // Fonction pour afficher les ventes (uniquement pour les admins)
  const renderSaleItem = ({ item }) => {
    // Vérifier que item existe avant d'accéder à ses propriétés
    if (!item) return null;

    const product = (item.productId && products && Array.isArray(products)) ? products.find(p => p._id === item.productId) : null;
    const customer = (item.customerId && customers && Array.isArray(customers)) ? customers.find(c => c._id === item.customerId) : null;
    const isRefund = item.amount < 0;
    const isRefunded = item.description?.includes('Remboursement');

    return (
      <Card style={[styles.saleItem, isRefund && styles.saleItemRefund]}>
        <View style={styles.saleHeader}>
          <View style={[styles.saleIcon, isRefund && styles.saleIconRefund]}>
            <Ionicons
              name={isRefund ? "arrow-undo-outline" : "cash-outline"}
              size={24}
              color={isRefund ? colors.danger : colors.primary}
            />
          </View>
          <View style={styles.saleInfo}>
            <Text style={[styles.saleAmount, isRefund && styles.saleAmountRefund]}>
              {isRefund ? '' : '+'}{item.amount?.toFixed(2) || '0.00'} €
            </Text>
            {item.productId ? (
              <Text style={styles.saleProduct}>
                {item.productId?.name} x{item.quantity || 1}
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
              <Text style={[styles.saleDescription, isRefund && styles.saleDescriptionRefund]}>
                {item.description}
              </Text>
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
          {!isRefund && !isRefunded && (
            <TouchableOpacity
              style={styles.refundButton}
              onPress={() => handleRefund(item._id)}
            >
              <Ionicons name="arrow-undo" size={20} color={colors.danger} />
            </TouchableOpacity>
          )}
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

  // Filtrage des clients selon la recherche
  const filteredCustomers = customers.filter(customer => {
    if (!customerSearch) return true;
    const searchLower = customerSearch.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower)
    );
  });

  // Filtrage des produits selon la recherche
  const filteredProducts = products.filter(product => {
    if (!productSearch) return true;
    const searchLower = productSearch.toLowerCase();
    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.surface, colors.background]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.headerTitle}>
              {isAdmin ? 'Ventes' : 'Point de Vente'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isAdmin
                ? `${(sales && Array.isArray(sales)) ? sales.length : 0} vente(s)`
                : 'Effectuez vos ventes rapidement'}
            </Text>
          </View>
        </View>

        {/* Afficher le total uniquement pour les admins */}
        {isAdmin && (
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
        )}
      </LinearGradient>

      {/* Interface pour les admins : liste des ventes */}
      {isAdmin ? (
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
      ) : (
        /* Interface pour les salariés : écran simplifié */
        <View style={styles.centerContainer}>
          <LinearGradient
            colors={[colors.primary + '20', colors.primary + '10']}
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeIconContainer}>
              <Ionicons name="cart" size={64} color={colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Bienvenue, {user?.fullName || user?.username}</Text>
            <Text style={styles.welcomeText}>
              Cliquez sur le bouton ci-dessous pour commencer une nouvelle vente
            </Text>

            <TouchableOpacity
              style={styles.mainSaleButtonWrapper}
              onPress={() => setModalVisible(true)}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.mainSaleButton}
              >
                <Ionicons name="add-circle" size={28} color="#000" />
                <Text style={styles.mainSaleButtonText}>Nouvelle Vente</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
          {/* Statistiques rapides du jour (optionnel) */}
          <View style={styles.quickStatsContainer}>
            <LinearGradient
              colors={[colors.surface, colors.background]}
              style={styles.quickStatCard}
            >
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <Text style={styles.quickStatValue}>
                {sales.filter(s => {
                  const today = new Date();
                  const saleDate = new Date(s.date);
                  return saleDate.toDateString() === today.toDateString();
                }).length}
              </Text>
              <Text style={styles.quickStatLabel}>Ventes aujourd'hui</Text>
            </LinearGradient>
          </View>

        </View>

      )}


      {/* Bouton FAB (toujours accessible) */}
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

              {/* Sélection du client (optionnel) */}
              <Text style={styles.fieldLabel}>Client (optionnel)</Text>

              {/* Badge du client sélectionné */}
              {selectedCustomer ? (
                <View style={styles.selectedClientContainer}>
                  <LinearGradient
                    colors={[colors.primary + '20', colors.primary + '10']}
                    style={styles.selectedClientCard}
                  >
                    <View style={styles.selectedClientInfo}>
                      <View style={styles.selectedClientIcon}>
                        <Ionicons name="person" size={20} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.selectedClientName}>{selectedCustomer.name}</Text>
                        <Text style={styles.selectedClientPhone}>{selectedCustomer.phone || 'Pas de téléphone'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeClientButton}
                      onPress={() => {
                        setFormData({ ...formData, customerId: '' });
                        setCustomerSearch('');
                      }}
                    >
                      <Ionicons name="close" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              ) : (
                /* Champ de recherche et liste d'autocomplete */
                <View style={styles.autocompleteContainer}>
                  <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Rechercher un client (nom, téléphone)..."
                      placeholderTextColor={colors.textLight}
                      value={customerSearch}
                      onChangeText={setCustomerSearch}
                    />
                    {customerSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setCustomerSearch('')}>
                        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Liste des résultats d'autocomplete */}
                  {customerSearch.length > 0 && (
                    <View style={styles.autocompleteList}>
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.slice(0, 5).map(customer => (
                          <TouchableOpacity
                            key={customer._id}
                            style={styles.autocompleteItem}
                            onPress={() => {
                              setFormData({ ...formData, customerId: customer._id });
                              setCustomerSearch(''); // Optionnel : vider la recherche ou garder le nom
                            }}
                          >
                            <View style={styles.autocompleteItemIcon}>
                              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                            </View>
                            <View style={styles.autocompleteItemContent}>
                              <Text style={styles.autocompleteItemName}>{customer.name}</Text>
                              <Text style={styles.autocompleteItemSub}>{customer.phone || customer.email || 'N/A'}</Text>
                            </View>
                            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.autocompleteEmpty}>
                          <Text style={styles.autocompleteEmptyText}>Aucun client trouvé</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

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
                <View style={styles.viewModeToggle}>
                  <TouchableOpacity
                    style={[styles.viewModeButton, productViewMode === 'grid' && styles.viewModeButtonActive]}
                    onPress={() => setProductViewMode('grid')}
                  >
                    <Ionicons
                      name="grid"
                      size={20}
                      color={productViewMode === 'grid' ? colors.primary : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.viewModeButton, productViewMode === 'list' && styles.viewModeButtonActive]}
                    onPress={() => setProductViewMode('list')}
                  >
                    <Ionicons
                      name="list"
                      size={20}
                      color={productViewMode === 'list' ? colors.primary : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Champ de recherche pour les produits */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un produit..."
                  placeholderTextColor={colors.textLight}
                  value={productSearch}
                  onChangeText={setProductSearch}
                />
                {productSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setProductSearch('')}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {productSearch && (
                <Text style={styles.searchResultText}>
                  {filteredProducts.length} produit(s) trouvé(s)
                </Text>
              )}

              {/* Affichage des produits selon le mode */}
              <View style={productViewMode === 'grid' ? styles.productsGrid : styles.productsList}>
                {filteredProducts && filteredProducts.length > 0 ? filteredProducts.map(product => {
                  if (!product || !product._id) return null;
                  const isFlashing = flashingProduct === product._id;
                  const animStyle = isFlashing ? {
                    transform: [{ scale: flashAnim }],
                  } : {};

                  const inCart = cart.find(item => item.productId === product._id);

                  // Vue Liste
                  if (productViewMode === 'list') {
                    return (
                      <Animated.View key={product._id} style={animStyle}>
                        <TouchableOpacity
                          style={[
                            styles.productListItem,
                            isFlashing && styles.productCardFlashing
                          ]}
                          onPress={() => handleAddToCart(product._id)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.productListIconContainer}>
                            <Ionicons name="cube" size={24} color={colors.primary} />
                          </View>
                          <View style={styles.productListInfo}>
                            <Text style={styles.productListName} numberOfLines={1}>
                              {product.name}
                            </Text>
                            <Text style={styles.productListPrice}>{product.unitPrice}€</Text>
                          </View>
                          {inCart && (
                            <View style={styles.productListBadge}>
                              <Text style={styles.productBadgeText}>
                                {inCart.quantity}
                              </Text>
                            </View>
                          )}
                          <Ionicons
                            name={inCart ? "checkmark-circle" : "add-circle-outline"}
                            size={28}
                            color={inCart ? colors.success : colors.primary}
                          />
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  }

                  // Vue Grille (existante)
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
                          <TextInput
                            style={styles.quantityInput}
                            value={String(item.quantity)}
                            onChangeText={(text) => {
                              const value = text.replace(/[^0-9]/g, '');
                              if (value === '' || value === '0') {
                                updateCartItemQuantity(item.productId, 0);
                              } else {
                                updateCartItemQuantity(item.productId, parseInt(value));
                              }
                            }}
                            keyboardType="numeric"
                            selectTextOnFocus
                            maxLength={4}
                          />
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
    </View >
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
  centerContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  welcomeCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
  },
  welcomeIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary + '40',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  mainSaleButtonWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  mainSaleButton: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mainSaleButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  quickStatCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 180,
  },
  quickStatValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  quickStatLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  // Styles pour les remboursements
  saleItemRefund: {
    borderColor: colors.danger + '30',
    borderWidth: 1,
    backgroundColor: colors.danger + '05',
  },
  saleIconRefund: {
    backgroundColor: colors.danger + '20',
  },
  saleAmountRefund: {
    color: colors.danger,
  },
  saleDescriptionRefund: {
    color: colors.danger,
    fontStyle: 'italic',
  },
  refundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.danger + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  searchResultText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  viewModeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  viewModeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  productsList: {
    gap: 8,
  },
  productListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productListIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  productListInfo: {
    flex: 1,
  },
  productListName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  productListPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  productListBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
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
  quantityInput: {
    minWidth: 50,
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: 8,
    marginHorizontal: 8,
    paddingVertical: 5,
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
  // Styles Autocomplete Client
  selectedClientContainer: {
    marginBottom: 16,
  },
  selectedClientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  selectedClientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedClientIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedClientName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  selectedClientPhone: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  removeClientButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  autocompleteContainer: {
    position: 'relative',
    zIndex: 10,
  },
  autocompleteList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    marginTop: -8,
    overflow: 'hidden',
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  autocompleteItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  autocompleteItemContent: {
    flex: 1,
  },
  autocompleteItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  autocompleteItemSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  autocompleteEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  autocompleteEmptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
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

