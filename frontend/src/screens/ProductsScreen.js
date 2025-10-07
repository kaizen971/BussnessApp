import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../utils/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import api from '../services/api';

export const ProductsScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unitPrice: '',
    costPrice: '',
    category: '',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      console.log(response.data);
      setProducts(response.data?.data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les produits');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.unitPrice || !formData.costPrice) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setLoading(true);
      const productData = {
        ...formData,
        unitPrice: parseFloat(formData.unitPrice),
        costPrice: parseFloat(formData.costPrice),
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, productData);
      } else {
        await api.post('/products', productData);
      }

      setModalVisible(false);
      resetForm();
      loadProducts();
      Alert.alert('Succès', `Produit ${editingProduct ? 'modifié' : 'créé'} avec succès`);
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      unitPrice: product.unitPrice.toString(),
      costPrice: product.costPrice.toString(),
      category: product.category || '',
    });
    setModalVisible(true);
  };

  const handleDelete = (product) => {
    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous vraiment supprimer ${product.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/products/${product._id}`);
              loadProducts();
              Alert.alert('Succès', 'Produit supprimé');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le produit');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      unitPrice: '',
      costPrice: '',
      category: '',
    });
    setEditingProduct(null);
  };

  const calculateMargin = (unitPrice, costPrice) => {
    if (!unitPrice || !costPrice) return 0;
    const margin = ((unitPrice - costPrice) / unitPrice) * 100;
    return margin.toFixed(2);
  };

  const renderProduct = ({ item }) => {
    const margin = calculateMargin(item.unitPrice, item.costPrice);
    const marginColor = margin > 30 ? colors.success : margin > 15 ? colors.warning : colors.error;

    // Informations de stock
    const hasStock = item.stock !== null && item.stock !== undefined;
    const stockQuantity = hasStock ? item.stock.quantity : 0;
    const isLowStock = hasStock && item.stock.isLowStock;
    const stockColor = isLowStock ? colors.error : (stockQuantity > 0 ? colors.success : colors.textSecondary);

    return (
      <Card style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.productName}>{item.name}</Text>
              {hasStock && (
                <View style={[styles.stockBadge, { backgroundColor: stockColor + '20', borderColor: stockColor }]}>
                  <Ionicons
                    name={isLowStock ? "alert-circle" : "cube"}
                    size={14}
                    color={stockColor}
                  />
                  <Text style={[styles.stockBadgeText, { color: stockColor }]}>
                    {stockQuantity}
                  </Text>
                </View>
              )}
            </View>
            {item.description && <Text style={styles.productDescription}>{item.description}</Text>}
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
            {isLowStock && (
              <View style={styles.warningBadge}>
                <Ionicons name="warning" size={12} color={colors.error} />
                <Text style={styles.warningText}>Stock bas</Text>
              </View>
            )}
          </View>
          <View style={styles.productActions}>
            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
              <Ionicons name="pencil" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
              <Ionicons name="trash" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.productPricing}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Prix de vente:</Text>
            <Text style={styles.priceValue}>{item.unitPrice.toFixed(2)} €</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Prix de revient:</Text>
            <Text style={styles.priceValue}>{item.costPrice.toFixed(2)} €</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Marge:</Text>
            <Text style={[styles.priceValue, { color: marginColor }]}>{margin}%</Text>
          </View>
          {hasStock && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>En stock:</Text>
              <Text style={[styles.priceValue, { color: stockColor, fontWeight: 'bold' }]}>
                {stockQuantity} unité(s)
              </Text>
            </View>
          )}
        </View>
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
            <Text style={styles.title}>Produits & Services</Text>
            <Text style={styles.subtitle}>{products?.length || 0} produit(s)</Text>
          </View>
          <TouchableOpacity
            style={styles.addButtonWrapper}
            onPress={() => {
              resetForm();
              setModalVisible(true);
            }}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.addButton}
            >
              <Ionicons name="add" size={28} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadProducts}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Aucun produit enregistré</Text>
            <Text style={styles.emptySubtext}>Appuyez sur + pour ajouter un produit</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
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
                    <Ionicons 
                      name={editingProduct ? "create-outline" : "add-circle-outline"} 
                      size={28} 
                      color="#000" 
                    />
                  </LinearGradient>
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>
                    {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {editingProduct ? 'Modifiez les informations' : 'Ajoutez un nouveau produit'}
                  </Text>
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
              <Input
                placeholder="Nom du produit *"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Input
                placeholder="Description"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
              />

              <Input
                placeholder="Catégorie"
                value={formData.category}
                onChangeText={(text) => setFormData({ ...formData, category: text })}
              />

              <Input
                placeholder="Prix de vente unitaire *"
                value={formData.unitPrice}
                onChangeText={(text) => setFormData({ ...formData, unitPrice: text })}
                keyboardType="decimal-pad"
              />

              <Input
                placeholder="Prix de revient *"
                value={formData.costPrice}
                onChangeText={(text) => setFormData({ ...formData, costPrice: text })}
                keyboardType="decimal-pad"
              />

              {formData.unitPrice && formData.costPrice && (
                <LinearGradient
                  colors={[colors.primary + '20', colors.primary + '10']}
                  style={styles.marginPreview}
                >
                  <View style={styles.marginPreviewContent}>
                    <Ionicons name="trending-up" size={24} color={colors.primary} />
                    <View style={styles.marginTextContainer}>
                      <Text style={styles.marginLabel}>Marge prévue</Text>
                      <Text style={styles.marginValue}>
                        {calculateMargin(parseFloat(formData.unitPrice), parseFloat(formData.costPrice))}%
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButtonWrapper}
                onPress={handleSave}
                disabled={loading}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.saveButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#000" />
                      <Text style={styles.saveButtonText}>
                        {editingProduct ? 'Modifier' : 'Créer'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
  addButtonWrapper: {
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
  },
  productCard: {
    marginBottom: 15,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  productDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  categoryBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  categoryText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.error,
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
  productPricing: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 15,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
  },
  modalContainer: {
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
    marginBottom: 20,
  },
  marginPreview: {
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  marginPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marginTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  marginLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  marginValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButtonWrapper: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButton: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
