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
import { useCurrency } from '../contexts/CurrencyContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { customersAPI } from '../services/api';
import { useTheme, useThemedStyles } from '../contexts/ThemeContext';
import { EmptyState, FloatingActionButton, SearchField } from '../components/AppPrimitives';

export const CustomersScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const { format: formatPrice } = useCurrency();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      customer.name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query)
    );
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

  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'responsable';

  const renderCustomerItem = ({ item }) => (
    <Card
      style={styles.customerItem}
      onPress={isAdmin ? () => openCustomerModal(item) : undefined}
      activeOpacity={isAdmin ? 0.7 : 1}
    >
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
              <Text style={styles.statValue}>{formatPrice(item.totalPurchases || 0)}</Text>
              <Text style={styles.statLabel}>Total achats</Text>
            </View>

          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Rechercher un client…" />
        {searchQuery.length > 0 && (
          <Text style={styles.searchResultText}>
            {filteredCustomers.length} client{filteredCustomers.length !== 1 ? 's' : ''} trouvé{filteredCustomers.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={searchQuery ? 'Aucun résultat' : 'Aucun client'}
            description={searchQuery ? 'Modifiez votre recherche.' : 'Ajoutez votre premier client pour commencer le suivi.'}
          />
        }
      />

      <FloatingActionButton icon="person-add-outline" label="Ajouter un client" onPress={() => openCustomerModal()} bottom={80} />

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

const createStyles = (colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  searchResultText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 110,
  },
  customerItem: {
    marginBottom: 12,
  },
  customerHeader: {
    flexDirection: 'row',
  },
  customerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
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
    fontWeight: '700',
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
    bottom: 80,
    right: 16,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.primary,
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
    fontWeight: '700',
    color: colors.text,
  },
});
