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
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { stockAPI } from '../services/api';
import { colors } from '../utils/colors';

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
  });

  useEffect(() => {
    loadStock();
  }, []);

  const loadStock = async () => {
    try {
      const response = await stockAPI.getAll(user?.projectId);
      setStock(response.data);
    } catch (error) {
      console.error('Error loading stock:', error);
      Alert.alert('Erreur', 'Impossible de charger le stock');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStock = async () => {
    if (!formData.name || !formData.quantity || !formData.unitPrice) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const stockData = {
        name: formData.name,
        quantity: parseFloat(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        minQuantity: parseFloat(formData.minQuantity) || 0,
      };

      if (selectedItem) {
        await stockAPI.update(selectedItem._id, stockData);
        Alert.alert('Succès', 'Article modifié avec succès');
      } else {
        await stockAPI.create({
          ...stockData,
          projectId: user?.projectId,
        });
        Alert.alert('Succès', 'Article ajouté avec succès');
      }

      setFormData({ name: '', quantity: '', unitPrice: '', minQuantity: '' });
      setSelectedItem(null);
      setModalVisible(false);
      loadStock();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'article');
    }
  };

  const openStockModal = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        name: item.name,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        minQuantity: item.minQuantity?.toString() || '',
      });
    } else {
      setSelectedItem(null);
      setFormData({ name: '', quantity: '', unitPrice: '', minQuantity: '' });
    }
    setModalVisible(true);
  };

  const renderStockItem = ({ item }) => {
    const totalValue = item.quantity * item.unitPrice;
    const isLowStock = item.minQuantity > 0 && item.quantity <= item.minQuantity;

    return (
      <Card style={styles.stockItem} onPress={() => openStockModal(item)}>
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
            {item.minQuantity > 0 && (
              <Text style={styles.minQuantityText}>
                Seuil minimum: {item.minQuantity}
              </Text>
            )}
          </View>
        </View>
      </Card>
    );
  };

  const totalStockValue = stock.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const lowStockItems = stock.filter(item => item.minQuantity > 0 && item.quantity <= item.minQuantity);

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

            <Input
              label="Nom de l'article *"
              value={formData.name}
              onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
              placeholder="Ex: T-shirt blanc"
              icon="pricetag-outline"
            />

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

            <Button
              title={selectedItem ? 'Modifier' : 'Ajouter'}
              onPress={handleSaveStock}
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
    shadowColor: colors.info,
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
