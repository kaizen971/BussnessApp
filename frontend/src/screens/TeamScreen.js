import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { colors } from '../utils/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import api from '../services/api';

export const TeamScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'cashier',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les collaborateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.username || !formData.email || !formData.password || !formData.fullName) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setLoading(true);
      await api.post('/users', formData);
      setModalVisible(false);
      resetForm();
      loadUsers();
      Alert.alert('Succès', 'Collaborateur créé avec succès');
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await api.put(`/users/${user._id}`, { isActive: !user.isActive });
      loadUsers();
      Alert.alert('Succès', `Compte ${user.isActive ? 'désactivé' : 'activé'}`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le statut');
    }
  };

  const handleChangeRole = async (user, newRole) => {
    try {
      await api.put(`/users/${user._id}`, { role: newRole });
      loadUsers();
      Alert.alert('Succès', 'Rôle modifié avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le rôle');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: 'cashier',
    });
  };

  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrateur', icon: 'shield-checkmark', color: colors.error };
      case 'manager':
        return { label: 'Responsable', icon: 'star', color: colors.warning };
      case 'cashier':
        return { label: 'Caissier', icon: 'person', color: colors.info };
      default:
        return { label: role, icon: 'person', color: colors.textSecondary };
    }
  };

  const getRolePermissions = (role) => {
    switch (role) {
      case 'admin':
        return 'Accès complet: gestion des utilisateurs, produits, ventes, clients, et configuration';
      case 'manager':
        return 'Gestion des produits, ventes, clients et accès aux rapports';
      case 'cashier':
        return 'Ajout de ventes et consultation du catalogue';
      default:
        return 'Permissions non définies';
    }
  };

  const renderUser = ({ item }) => {
    const roleInfo = getRoleInfo(item.role);

    return (
      <Card style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userAvatar}>
            <Ionicons name={roleInfo.icon} size={30} color={roleInfo.color} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.fullName}</Text>
            <Text style={styles.userUsername}>@{item.username}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View style={styles.statusBadge}>
            {item.isActive ? (
              <View style={[styles.badge, styles.badgeActive]}>
                <Text style={styles.badgeText}>Actif</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeInactive]}>
                <Text style={styles.badgeText}>Inactif</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.roleSection}>
          <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '20' }]}>
            <Ionicons name={roleInfo.icon} size={16} color={roleInfo.color} />
            <Text style={[styles.roleLabel, { color: roleInfo.color }]}>{roleInfo.label}</Text>
          </View>
          <Text style={styles.rolePermissions}>{getRolePermissions(item.role)}</Text>
        </View>

        <View style={styles.userActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleToggleStatus(item)}
          >
            <Ionicons
              name={item.isActive ? 'lock-closed' : 'lock-open'}
              size={20}
              color={item.isActive ? colors.error : colors.success}
            />
            <Text style={[styles.actionButtonText, { color: item.isActive ? colors.error : colors.success }]}>
              {item.isActive ? 'Désactiver' : 'Activer'}
            </Text>
          </TouchableOpacity>

          {item.role !== 'admin' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                Alert.alert(
                  'Modifier le rôle',
                  `Choisir un nouveau rôle pour ${item.fullName}`,
                  [
                    { text: 'Annuler', style: 'cancel' },
                    {
                      text: 'Caissier',
                      onPress: () => handleChangeRole(item, 'cashier'),
                    },
                    {
                      text: 'Responsable',
                      onPress: () => handleChangeRole(item, 'manager'),
                    },
                    {
                      text: 'Admin',
                      onPress: () => handleChangeRole(item, 'admin'),
                      style: 'destructive',
                    },
                  ]
                );
              }}
            >
              <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>Changer rôle</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.userFooter}>
          <Text style={styles.userDate}>
            Créé le {new Date(item.createdAt).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestion d'équipe</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Ionicons name="person-add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {users.filter((u) => u.isActive).length}
          </Text>
          <Text style={styles.statLabel}>Actifs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {users.filter((u) => u.role === 'admin').length}
          </Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadUsers}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Aucun collaborateur</Text>
            <Text style={styles.emptySubtext}>Appuyez sur + pour ajouter un membre</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau collaborateur</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Input
                placeholder="Nom complet *"
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              />

              <Input
                placeholder="Nom d'utilisateur *"
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                autoCapitalize="none"
              />

              <Input
                placeholder="Email *"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                placeholder="Mot de passe *"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
              />

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Rôle *</Text>
                <Picker
                  selectedValue={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Caissier" value="cashier" />
                  <Picker.Item label="Responsable" value="manager" />
                  <Picker.Item label="Administrateur" value="admin" />
                </Picker>
              </View>

              <View style={styles.permissionsInfo}>
                <Ionicons name="information-circle" size={20} color={colors.info} />
                <Text style={styles.permissionsText}>{getRolePermissions(formData.role)}</Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Annuler"
                onPress={() => setModalVisible(false)}
                variant="outline"
                style={{ flex: 1, marginRight: 10 }}
              />
              <Button
                title="Créer"
                onPress={handleCreate}
                loading={loading}
                style={{ flex: 1 }}
              />
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.background,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
  },
  list: {
    padding: 20,
  },
  userCard: {
    marginBottom: 15,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    marginLeft: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeActive: {
    backgroundColor: colors.success + '20',
  },
  badgeInactive: {
    backgroundColor: colors.error + '20',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleSection: {
    marginBottom: 15,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  rolePermissions: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  userActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 15,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 14,
    marginLeft: 5,
    fontWeight: '600',
  },
  userFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  userDate: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalForm: {
    marginBottom: 20,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  picker: {
    backgroundColor: colors.background,
    borderRadius: 10,
  },
  permissionsInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    padding: 12,
    borderRadius: 10,
    marginTop: 5,
  },
  permissionsText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    marginLeft: 8,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
  },
});
