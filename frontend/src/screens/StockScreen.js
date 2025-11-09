import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { stockAPI } from '../services/api';
import { colors } from '../utils/colors';
import api from '../services/api';

export const StockScreen = () => {
  const { user } = useAuth();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unitPrice: '',
    minQuantity: '',
    sku: '',
    location: '',
    productId: '',
  });
  const [showMovements, setShowMovements] = useState(false);
  const [selectedStockMovements, setSelectedStockMovements] = useState([]);
  const [movementType, setMovementType] = useState('in');
  const [movementQuantity, setMovementQuantity] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [showProductSelector, setShowProductSelector] = useState(false);

  useEffect(() => {
    loadStock();
    loadProducts();
  }, []);

  const loadStock = async () => {
    try {
      const response = await stockAPI.getAll(user?.projectId);
      setStock(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error loading stock:', error);
      Alert.alert('Erreur', 'Impossible de charger le stock');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/products', { params: { projectId: user?.projectId } });
      setProducts(response.data?.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Erreur', 'Impossible de charger les produits');
    }
  };

  const handleSaveStock = async () => {
    if (!formData.productId || !formData.quantity || !formData.unitPrice) {
      Alert.alert('Erreur', 'Veuillez sélectionner un produit et remplir tous les champs obligatoires');
      return;
    }

    try {
      const stockData = {
        name: formData.name.trim(),
        quantity: parseFloat(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        minQuantity: parseFloat(formData.minQuantity) || 0,
        productId: formData.productId,
      };

      if (selectedItem) {
        const response = await stockAPI.update(selectedItem._id, stockData);
        Alert.alert('Succès', 'Article modifié avec succès');
      } else {
        const response = await stockAPI.create({
          ...stockData,
          projectId: user?.projectId,
        });
        Alert.alert('Succès', 'Article ajouté avec succès');
      }

      setFormData({ name: '', quantity: '', unitPrice: '', minQuantity: '', productId: '' });
      setSelectedItem(null);
      setModalVisible(false);
      await loadStock();
    } catch (error) {
      console.error('Error saving stock:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Impossible de sauvegarder l\'article';
      const errorDetails = error.response?.status === 403
        ? 'Vous n\'avez pas les permissions nécessaires pour créer un article'
        : errorMessage;
      Alert.alert('Erreur', errorDetails);
    }
  };

  const handleSelectProduct = (product) => {
    setFormData(prev => ({
      ...prev,
      productId: product._id,
      name: product.name,
      unitPrice: product.unitPrice.toString(),
    }));
    setShowProductSelector(false);
  };

  const openStockModal = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        name: item.name,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        minQuantity: item.minQuantity?.toString() || '',
        sku: item.sku || '',
        location: item.location || '',
        productId: item.productId || '',
      });
    } else {
      setSelectedItem(null);
      setFormData({ name: '', quantity: '', unitPrice: '', minQuantity: '', sku: '', location: '', productId: '' });
    }
    setModalVisible(true);
  };

  const loadStockMovements = async (stockId) => {
    try {
      const response = await stockAPI.getMovements(stockId);
      setSelectedStockMovements(response.data.data || []);
      setShowMovements(true);
    } catch (error) {
      console.error('Error loading movements:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'historique');
    }
  };

  const handleAddMovement = async () => {
    if (!movementQuantity || parseFloat(movementQuantity) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une quantité valide');
      return;
    }

    try {
      await stockAPI.addMovement({
        stockId: selectedItem._id,
        type: movementType,
        quantity: parseFloat(movementQuantity),
        reason: movementReason || (movementType === 'in' ? 'Approvisionnement' : 'Sortie'),
      });

      Alert.alert('Succès', 'Mouvement enregistré');
      setShowMovementModal(false);
      setMovementQuantity('');
      setMovementReason('');
      await loadStock();
      if (showMovements) {
        await loadStockMovements(selectedItem._id);
      }
    } catch (error) {
      console.error('Error adding movement:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le mouvement');
    }
  };

  const renderStockItem = ({ item }) => {
    const totalValue = item.quantity * item.unitPrice;
    const isLowStock = item.minQuantity > 0 && item.quantity <= item.minQuantity;

    return (
      <Card style={styles.stockItem}>
        <TouchableOpacity onPress={() => openStockModal(item)}>
          <View style={styles.stockHeader}>
            <View style={[
              styles.stockIcon,
              { backgroundColor: isLowStock ? colors.error + '20' : colors.info + '20' }
            ]}>
              <Ionicons
                name={isLowStock ? 'alert-circle-outline' : 'cube-outline'}
                size={24}
                color={isLowStock ? colors.error : colors.info}
              />
            </View>
            <View style={styles.stockInfo}>
              <View style={styles.headerRow}>
                <Text style={styles.stockName}>{item.name}</Text>
                {isLowStock && (
                  <View style={styles.alertBadge}>
                    <Ionicons name="warning-outline" size={14} color={colors.error} />
                    <Text style={styles.alertText}>Stock bas</Text>
                  </View>
                )}
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Quantité</Text>
                  <Text style={[styles.detailValue, isLowStock && { color: colors.error }]}>
                    {item.quantity}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Prix unitaire</Text>
                  <Text style={styles.detailValue}>{item.unitPrice.toFixed(2)} €</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Valeur totale</Text>
                  <Text style={[styles.detailValue, styles.totalValue]}>
                    {totalValue.toFixed(2)} €
                  </Text>
                </View>
              </View>
              {item.sku && (
                <Text style={styles.skuText}>SKU: {item.sku}</Text>
              )}
              {item.location && (
                <Text style={styles.locationText}>
                  <Ionicons name="location-outline" size={12} color={colors.textSecondary} /> {item.location}
                </Text>
              )}
              {item.minQuantity > 0 && (
                <Text style={styles.minQuantityText}>
                  Seuil minimum: {item.minQuantity}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.stockActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setSelectedItem(item);
              loadStockMovements(item._id);
            }}
          >
            <Ionicons name="time-outline" size={18} color={colors.info} />
            <Text style={[styles.actionBtnText, { color: colors.info }]}>Historique</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setSelectedItem(item);
              setMovementType('in');
              setShowMovementModal(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.success} />
            <Text style={[styles.actionBtnText, { color: colors.success }]}>Entrée</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setSelectedItem(item);
              setMovementType('out');
              setShowMovementModal(true);
            }}
          >
            <Ionicons name="remove-circle-outline" size={18} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>Sortie</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const totalStockValue = (stock && Array.isArray(stock)) ? stock.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) : 0;
  const lowStockItems = (stock && Array.isArray(stock)) ? stock.filter(item => item.minQuantity > 0 && item.quantity <= item.minQuantity) : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>Valeur du stock</Text>
          <Text style={styles.totalAmount}>{totalStockValue.toFixed(2)} €</Text>
          <View style={styles.statsRow}>
            <Text style={styles.totalCount}>{stock.length} article(s)</Text>
            {lowStockItems.length > 0 && (
              <View style={styles.alertBadge}>
                <Ionicons name="warning" size={14} color={colors.error} />
                <Text style={styles.alertText}>{lowStockItems.length} en alerte</Text>
              </View>
            )}
          </View>
        </Card>
      </View>

      <FlatList
        data={stock}
        renderItem={renderStockItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>Aucun article en stock</Text>
          </View>
        }
      />

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => openStockModal()}
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
              <Text style={styles.modalTitle}>
                {selectedItem ? 'Modifier l\'article' : 'Nouvel article'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.productSelectorContainer}>
              <Text style={styles.inputLabel}>Produit *</Text>
              <TouchableOpacity
                style={styles.productSelector}
                onPress={() => !selectedItem && setShowProductSelector(true)}
                disabled={selectedItem}
              >
                <Ionicons name="pricetag-outline" size={20} color={formData.productId ? colors.success : colors.textSecondary} />
                <Text style={[styles.productSelectorText, formData.productId && styles.productSelectorTextSelected]}>
                  {formData.name || 'Sélectionner un produit'}
                </Text>
                {!selectedItem && (
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
              {formData.productId && !selectedItem && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setFormData(prev => ({ ...prev, productId: '', name: '', unitPrice: '' }))}
                >
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>

            <Input
              label="Quantité *"
              value={formData.quantity}
              onChangeText={(value) => setFormData(prev => ({ ...prev, quantity: value }))}
              placeholder="0"
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
              label="Quantité minimale (optionnel)"
              value={formData.minQuantity}
              onChangeText={(value) => setFormData(prev => ({ ...prev, minQuantity: value }))}
              placeholder="Seuil d'alerte"
              keyboardType="numeric"
              icon="alert-circle-outline"
            />

            <Input
              label="Code SKU (optionnel)"
              value={formData.sku}
              onChangeText={(value) => setFormData(prev => ({ ...prev, sku: value }))}
              placeholder="Ex: PRD-001"
              icon="barcode-outline"
            />

            <Input
              label="Emplacement (optionnel)"
              value={formData.location}
              onChangeText={(value) => setFormData(prev => ({ ...prev, location: value }))}
              placeholder="Ex: Étagère A3"
              icon="location-outline"
            />

            <Button
              title={selectedItem ? 'Modifier' : 'Ajouter'}
              onPress={handleSaveStock}
            />
          </View>
        </View>
      </Modal>

      {/* Modal de mouvements */}
      <Modal
        visible={showMovementModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMovementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {movementType === 'in' ? 'Entrée de stock' : 'Sortie de stock'}
              </Text>
              <TouchableOpacity onPress={() => setShowMovementModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <View style={styles.selectedItemInfo}>
                <Text style={styles.selectedItemName}>{selectedItem.name}</Text>
                <Text style={styles.selectedItemQuantity}>
                  Stock actuel: {selectedItem.quantity}
                </Text>
              </View>
            )}

            <Input
              label="Quantité *"
              value={movementQuantity}
              onChangeText={setMovementQuantity}
              placeholder="Quantité à ajouter/retirer"
              keyboardType="numeric"
              icon={movementType === 'in' ? 'add-circle-outline' : 'remove-circle-outline'}
            />

            <Input
              label="Raison (optionnel)"
              value={movementReason}
              onChangeText={setMovementReason}
              placeholder={movementType === 'in' ? 'Ex: Réception commande' : 'Ex: Retour client'}
              multiline
              numberOfLines={2}
              icon="document-text-outline"
            />

            <Button
              title={movementType === 'in' ? 'Ajouter au stock' : 'Retirer du stock'}
              onPress={handleAddMovement}
            />
          </View>
        </View>
      </Modal>

      {/* Modal d'historique des mouvements */}
      <Modal
        visible={showMovements}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMovements(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Historique des mouvements</Text>
              <TouchableOpacity onPress={() => setShowMovements(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <View style={styles.selectedItemInfo}>
                <Text style={styles.selectedItemName}>{selectedItem.name}</Text>
                <Text style={styles.selectedItemQuantity}>
                  Stock actuel: {selectedItem.quantity}
                </Text>
              </View>
            )}

            <FlatList
              data={selectedStockMovements}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.movementItem}>
                  <View style={styles.movementHeader}>
                    <View style={[
                      styles.movementIcon,
                      { backgroundColor: item.type === 'in' || item.type === 'return' ? colors.success + '20' : colors.error + '20' }
                    ]}>
                      <Ionicons
                        name={
                          item.type === 'in' ? 'arrow-down-circle' :
                          item.type === 'out' ? 'arrow-up-circle' :
                          item.type === 'sale' ? 'cart' :
                          item.type === 'return' ? 'return-down-back' :
                          'swap-horizontal'
                        }
                        size={20}
                        color={item.type === 'in' || item.type === 'return' ? colors.success : colors.error}
                      />
                    </View>
                    <View style={styles.movementInfo}>
                      <Text style={styles.movementType}>{item.reason || item.type}</Text>
                      <Text style={styles.movementDate}>
                        {new Date(item.createdAt).toLocaleString('fr-FR')}
                      </Text>
                      {item.userId && (
                        <Text style={styles.movementUser}>
                          Par: {item.userId.fullName || item.userId.username}
                        </Text>
                      )}
                    </View>
                    <View style={styles.movementQuantity}>
                      <Text style={[
                        styles.quantityChange,
                        { color: item.quantity > 0 ? colors.success : colors.error }
                      ]}>
                        {item.quantity > 0 ? '+' : ''}{item.quantity}
                      </Text>
                      <Text style={styles.quantityDetails}>
                        {item.previousQuantity} → {item.newQuantity}
                      </Text>
                    </View>
                  </View>
                  {item.notes && (
                    <Text style={styles.movementNotes}>{item.notes}</Text>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="time-outline" size={48} color={colors.textLight} />
                  <Text style={styles.emptyText}>Aucun mouvement enregistré</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Modal de sélection de produits */}
      <Modal
        visible={showProductSelector}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProductSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un produit</Text>
              <TouchableOpacity onPress={() => setShowProductSelector(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={products}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productItem}
                  onPress={() => handleSelectProduct(item)}
                >
                  <View style={styles.productItemIcon}>
                    <Ionicons name="pricetag" size={20} color={colors.info} />
                  </View>
                  <View style={styles.productItemInfo}>
                    <Text style={styles.productItemName}>{item.name}</Text>
                    <Text style={styles.productItemPrice}>{item.unitPrice.toFixed(2)} €</Text>
                    {item.description && (
                      <Text style={styles.productItemDescription} numberOfLines={1}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="cube-outline" size={48} color={colors.textLight} />
                  <Text style={styles.emptyText}>Aucun produit disponible</Text>
                  <Text style={styles.emptySubtext}>Créez d'abord des produits dans la section Produits</Text>
                </View>
              }
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
    backgroundColor: colors.info + '10',
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.info,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  stockItem: {
    marginBottom: 12,
  },
  stockHeader: {
    flexDirection: 'row',
  },
  stockIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stockInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  alertText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.error,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  totalValue: {
    color: colors.info,
  },
  minQuantityText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  skuText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  locationText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stockActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedItemInfo: {
    backgroundColor: colors.info + '10',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  selectedItemQuantity: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  movementItem: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  movementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movementIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  movementInfo: {
    flex: 1,
  },
  movementType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  movementDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  movementUser: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  movementQuantity: {
    alignItems: 'flex-end',
  },
  quantityChange: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityDetails: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  movementNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontStyle: 'italic',
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
    backgroundColor: colors.info,
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
  productSelectorContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  productSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  productSelectorText: {
    flex: 1,
    fontSize: 16,
    color: colors.textSecondary,
  },
  productSelectorTextSelected: {
    color: colors.text,
    fontWeight: '500',
  },
  clearButton: {
    position: 'absolute',
    right: 48,
    top: 44,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  productItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.info + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productItemInfo: {
    flex: 1,
  },
  productItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  productItemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.info,
    marginBottom: 2,
  },
  productItemDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
