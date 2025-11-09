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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { colors } from '../utils/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../services/api';

export const TeamScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
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
      const response = await usersAPI.getAll(user?.projectId);
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
    console.log(formData);
    try {
      setLoading(true);
      await api.post('/users', { ...formData, projectId: user?.projectId });
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
      await api.put(`/users/${user._id}/status`, { isActive: !user.isActive });
      loadUsers();
      Alert.alert('Succès', `Compte ${user.isActive ? 'désactivé' : 'activé'}`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le statut');
    }
  };

  const handleChangeRole = async (newRole) => {
    if (!selectedUser) return;
    
    try {
      await api.put(`/users/${selectedUser._id}/role`, { role: newRole });
      setRoleModalVisible(false);
      setSelectedUser(null);
      loadUsers();
      Alert.alert('Succès', 'Rôle modifié avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le rôle');
    }
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setRoleModalVisible(true);
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
              onPress={() => openRoleModal(item)}
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
            <Text style={styles.title}>Gestion d'équipe</Text>
            <Text style={styles.subtitle}>{users?.length || 0} membre(s)</Text>
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
              <Ionicons name="person-add" size={28} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <LinearGradient
        colors={[colors.surface + '80', colors.background]}
        style={styles.statsContainer}
      >
        <LinearGradient
          colors={[colors.primary + '25', colors.primary + '10']}
          style={styles.statCard}
        >
          <Ionicons name="people" size={28} color={colors.primary} />
          <Text style={styles.statValue}>{(users && Array.isArray(users)) ? users.length : 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </LinearGradient>
        <LinearGradient
          colors={[colors.success + '25', colors.success + '10']}
          style={styles.statCard}
        >
          <Ionicons name="checkmark-circle" size={28} color={colors.success} />
          <Text style={styles.statValue}>
            {(users && Array.isArray(users)) ? users.filter((u) => u.isActive).length : 0}
          </Text>
          <Text style={styles.statLabel}>Actifs</Text>
        </LinearGradient>
        <LinearGradient
          colors={[colors.warning + '25', colors.warning + '10']}
          style={styles.statCard}
        >
          <Ionicons name="shield-checkmark" size={28} color={colors.warning} />
          <Text style={styles.statValue}>
            {(users && Array.isArray(users)) ? users.filter((u) => u.role === 'admin').length : 0}
          </Text>
          <Text style={styles.statLabel}>Admins</Text>
        </LinearGradient>
      </LinearGradient>

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
                    <Ionicons name="person-add" size={28} color="#000" />
                  </LinearGradient>
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Nouveau collaborateur</Text>
                  <Text style={styles.modalSubtitle}>Ajoutez un membre à l'équipe</Text>
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
                  <Picker.Item label="Salarié" value="cashier" />
                  <Picker.Item label="Manager" value="manager" />
                  <Picker.Item label="Administrateur" value="admin" />
                </Picker>
              </View>

              <LinearGradient
                colors={[colors.primary + '20', colors.primary + '10']}
                style={styles.permissionsInfo}
              >
                <Ionicons name="information-circle" size={24} color={colors.primary} />
                <Text style={styles.permissionsText}>{getRolePermissions(formData.role)}</Text>
              </LinearGradient>
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
                onPress={handleCreate}
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
                      <Ionicons name="person-add" size={20} color="#000" />
                      <Text style={styles.saveButtonText}>Créer</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* Modal de changement de rôle */}
      <Modal 
        visible={roleModalVisible} 
        animationType="fade" 
        transparent
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.roleModalOverlay}>
          <View style={styles.roleModalContainer}>
            <View style={styles.roleModalHeader}>
              <Ionicons name="swap-horizontal" size={32} color={colors.primary} />
              <Text style={styles.roleModalTitle}>Changer le rôle</Text>
              {selectedUser && (
                <Text style={styles.roleModalSubtitle}>{selectedUser.fullName}</Text>
              )}
            </View>

            <View style={styles.roleOptionsContainer}>
              <TouchableOpacity
                style={styles.roleOption}
                onPress={() => handleChangeRole('cashier')}
              >
                <LinearGradient
                  colors={[colors.info + '20', colors.info + '10']}
                  style={styles.roleOptionGradient}
                >
                  <Ionicons name="person" size={32} color={colors.info} />
                  <View style={styles.roleOptionContent}>
                    <Text style={styles.roleOptionTitle}>Caissier</Text>
                    <Text style={styles.roleOptionDescription}>
                      Ajout de ventes et consultation du catalogue
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.info} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roleOption}
                onPress={() => handleChangeRole('manager')}
              >
                <LinearGradient
                  colors={[colors.warning + '20', colors.warning + '10']}
                  style={styles.roleOptionGradient}
                >
                  <Ionicons name="star" size={32} color={colors.warning} />
                  <View style={styles.roleOptionContent}>
                    <Text style={styles.roleOptionTitle}>Responsable</Text>
                    <Text style={styles.roleOptionDescription}>
                      Gestion des produits, ventes, clients et rapports
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.warning} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roleOption}
                onPress={() => handleChangeRole('admin')}
              >
                <LinearGradient
                  colors={[colors.error + '20', colors.error + '10']}
                  style={styles.roleOptionGradient}
                >
                  <Ionicons name="shield-checkmark" size={32} color={colors.error} />
                  <View style={styles.roleOptionContent}>
                    <Text style={styles.roleOptionTitle}>Administrateur</Text>
                    <Text style={styles.roleOptionDescription}>
                      Accès complet et gestion des utilisateurs
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.error} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.roleCancelButton}
              onPress={() => {
                setRoleModalVisible(false);
                setSelectedUser(null);
              }}
            >
              <Text style={styles.roleCancelButtonText}>Annuler</Text>
            </TouchableOpacity>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    textColor: colors.text,
    color: colors.text,
  },
  permissionsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  permissionsText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginLeft: 12,
    lineHeight: 20,
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
  // Styles du modal de changement de rôle
  roleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  roleModalContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  roleModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  roleModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
  },
  roleModalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  roleOptionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  roleOption: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  roleOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  roleOptionContent: {
    flex: 1,
  },
  roleOptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  roleOptionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  roleCancelButton: {
    backgroundColor: colors.background,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
