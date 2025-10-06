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
import { customersAPI } from '../services/api';
import { colors } from '../utils/colors';

export const CustomersScreen = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customersAPI.getAll(user?.projectId);
      setCustomers(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Erreur', 'Impossible de charger les clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!formData.name || !formData.name.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom');
      return;
    }

    try {
      const customerData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      };

      if (selectedCustomer) {
        const response = await customersAPI.update(selectedCustomer._id, customerData);
        Alert.alert('Succès', 'Client modifié avec succès');
      } else {
        const response = await customersAPI.create({
          ...customerData,
          projectId: user?.projectId,
        });
        Alert.alert('Succès', 'Client ajouté avec succès');
      }

      setFormData({ name: '', email: '', phone: '' });
      setSelectedCustomer(null);
      setModalVisible(false);
      await loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Impossible de sauvegarder le client';
      const errorDetails = error.response?.status === 403
        ? 'Vous n\'avez pas les permissions nécessaires pour créer un client'
        : errorMessage;
      Alert.alert('Erreur', errorDetails);
    }
  };

  const openCustomerModal = (customer = null) => {
    if (customer) {
      setSelectedCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
      });
    } else {
      setSelectedCustomer(null);
      setFormData({ name: '', email: '', phone: '' });
    }
    setModalVisible(true);
  };

  const renderCustomerItem = ({ item }) => (
    <Card style={styles.customerItem} onPress={() => openCustomerModal(item)}>
      <View style={styles.customerHeader}>
        <View style={styles.customerIcon}>
          <Ionicons name="person-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name}</Text>
          {item.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.customerDetail}>{item.email}</Text>
            </View>
          )}
          {item.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.customerDetail}>{item.phone}</Text>
            </View>
          )}
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Text style={styles.statValue}>{item.totalPurchases?.toFixed(2) || 0} €</Text>
              <Text style={styles.statLabel}>Total achats</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statValue}>{item.loyaltyPoints || 0}</Text>
              <Text style={styles.statLabel}>Points fidélité</Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>Aucun client enregistré</Text>
          </View>
        }
      />

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => openCustomerModal()}
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
                {selectedCustomer ? 'Modifier client' : 'Nouveau client'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Input
              label="Nom *"
              value={formData.name}
              onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
              placeholder="Nom du client"
              icon="person-outline"
            />

            <Input
              label="Email"
              value={formData.email}
              onChangeText={(value) => setFormData(prev => ({ ...prev, email: value }))}
              placeholder="email@exemple.com"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Téléphone"
              value={formData.phone}
              onChangeText={(value) => setFormData(prev => ({ ...prev, phone: value }))}
              placeholder="+33 6 12 34 56 78"
              icon="call-outline"
              keyboardType="phone-pad"
            />

            <Button
              title={selectedCustomer ? 'Modifier' : 'Ajouter'}
              onPress={handleSaveCustomer}
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
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  customerItem: {
    marginBottom: 12,
  },
  customerHeader: {
    flexDirection: 'row',
  },
  customerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  statBadge: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 10,
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
