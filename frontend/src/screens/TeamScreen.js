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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../utils/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { getQuickSelectValues } from '../utils/currency';
import { usersAPI } from '../services/api';

export const TeamScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { format: formatPrice, currency } = useCurrency();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [commissionModalVisible, setCommissionModalVisible] = useState(false);
  const [salaryModalVisible, setSalaryModalVisible] = useState(false);
  const [editInfoModalVisible, setEditInfoModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [commissionRate, setCommissionRate] = useState('0');
  const [hourlyRate, setHourlyRate] = useState('0');
  const [editInfoData, setEditInfoData] = useState({
    fullName: '',
    email: '',
  });
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'cashier',
    photo: null,
  });
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

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

  const openCommissionModal = (user) => {
    setSelectedUser(user);
    setCommissionRate(user.commissionRate?.toString() || '0');
    setCommissionModalVisible(true);
  };

  const handleUpdateCommission = async () => {
    if (!selectedUser) return;
    
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      Alert.alert('Erreur', 'Le taux doit être entre 0 et 100%');
      return;
    }

    try {
      await api.put(`/users/${selectedUser._id}/commission`, { commissionRate: rate });
      setCommissionModalVisible(false);
      setSelectedUser(null);
      loadUsers();
      Alert.alert('Succès', 'Taux de commission modifié avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le taux de commission');
    }
  };

  const openSalaryModal = (user) => {
    setSelectedUser(user);
    setHourlyRate(user.hourlyRate?.toString() || '0');
    setSalaryModalVisible(true);
  };

  const handleUpdateHourlyRate = async () => {
    if (!selectedUser) return;
    
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate < 0) {
      Alert.alert('Erreur', 'Le salaire horaire doit être un nombre positif');
      return;
    }

    try {
      await api.put(`/users/${selectedUser._id}/hourly-rate`, { hourlyRate: rate });
      setSalaryModalVisible(false);
      setSelectedUser(null);
      loadUsers();
      Alert.alert('Succès', 'Salaire horaire modifié avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le salaire horaire');
    }
  };

  const openEditInfoModal = (user) => {
    setSelectedUser(user);
    setEditInfoData({
      fullName: user.fullName || '',
      email: user.email || '',
    });
    setEditInfoModalVisible(true);
  };

  const handleUpdateUserInfo = async () => {
    if (!selectedUser) return;

    if (!editInfoData.fullName.trim() || !editInfoData.email.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editInfoData.email)) {
      Alert.alert('Erreur', 'Veuillez entrer un email valide');
      return;
    }

    try {
      await api.put(`/users/${selectedUser._id}/info`, {
        fullName: editInfoData.fullName,
        email: editInfoData.email,
      });
      setEditInfoModalVisible(false);
      setSelectedUser(null);
      loadUsers();
      Alert.alert('Succès', 'Informations modifiées avec succès');
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.error || 'Impossible de modifier les informations');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: 'cashier',
      photo: null,
    });
  };

  const convertImageToBase64 = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erreur conversion base64:', error);
      throw error;
    }
  };

  const pickImage = async (userForPhoto = null) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à vos photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        const base64Image = await convertImageToBase64(result.assets[0].uri);
        if (userForPhoto) {
          await updateUserPhoto(userForPhoto._id, base64Image);
        } else {
          setFormData({ ...formData, photo: base64Image });
        }
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de traiter l\'image');
      }
    }
  };

  const takePhoto = async (userForPhoto = null) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour utiliser la caméra');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        const base64Image = await convertImageToBase64(result.assets[0].uri);
        if (userForPhoto) {
          await updateUserPhoto(userForPhoto._id, base64Image);
        } else {
          setFormData({ ...formData, photo: base64Image });
        }
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de traiter l\'image');
      }
    }
  };

  const showImageOptions = (userForPhoto = null) => {
    Alert.alert(
      'Ajouter une photo',
      'Choisissez une option',
      [
        { text: 'Galerie', onPress: () => pickImage(userForPhoto) },
        { text: 'Prendre une photo', onPress: () => takePhoto(userForPhoto) },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const updateUserPhoto = async (userId, photoUri) => {
    try {
      setLoading(true);
      const response = await api.put(`/users/${userId}/photo`, { photo: photoUri });
      console.log('Photo update response:', response.data);
      await loadUsers();
      Alert.alert('Succès', 'Photo mise à jour avec succès');
    } catch (error) {
      console.error('Photo update error:', error.response?.data || error.message);
      Alert.alert('Erreur', error.response?.data?.error || 'Impossible de mettre à jour la photo');
    } finally {
      setLoading(false);
    }
  };

  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrateur', icon: 'shield-checkmark', color: colors.error };
      case 'manager':
        return { label: 'Responsable', icon: 'star', color: colors.warning };
      case 'cashier':
        return { label: 'Salarié', icon: 'person', color: colors.info };
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
          <TouchableOpacity 
            style={styles.userAvatarContainer}
            onPress={() => user?.role === 'admin' && showImageOptions(item)}
            disabled={user?.role !== 'admin'}
          >
            {item.photo ? (
              <View style={styles.userAvatarWithPhoto}>
                <Image
                  source={{ uri: item.photo }}
                  style={styles.userPhotoImage}
                />
                {user?.role === 'admin' && (
                  <View style={styles.photoEditBadge}>
                    <Ionicons name="camera" size={12} color={colors.background} />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.userAvatar}>
                <Ionicons name={roleInfo.icon} size={30} color={roleInfo.color} />
                {user?.role === 'admin' && (
                  <View style={styles.photoAddBadge}>
                    <Ionicons name="add" size={12} color={colors.background} />
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
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

        {/* Section rémunération */}
        <View style={styles.commissionSection}>
          <View style={styles.compensationGrid}>
            <View style={styles.commissionInfo}>
              <Ionicons name="time-outline" size={20} color={colors.info} />
              <View style={styles.commissionTextContainer}>
                <Text style={styles.commissionLabel}>Salaire horaire</Text>
                <Text style={styles.commissionValue}>{formatPrice(item.hourlyRate || 0)}/h</Text>
              </View>
            </View>
            <View style={styles.commissionInfo}>
              <Ionicons name="cash-outline" size={20} color={colors.success} />
              <View style={styles.commissionTextContainer}>
                <Text style={styles.commissionLabel}>Commission</Text>
                <Text style={styles.commissionValue}>{item.commissionRate || 0}%</Text>
              </View>
            </View>
          </View>
          <View style={styles.commissionRow}>
            <View style={styles.commissionInfo}>
              <Ionicons name="wallet-outline" size={20} color={colors.accent} />
              <View style={styles.commissionTextContainer}>
                <Text style={styles.commissionLabel}>Total commissions</Text>
                <Text style={styles.commissionValue}>{formatPrice(item.totalCommissions || 0)}</Text>
              </View>
            </View>
          </View>
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

          {(user?.role === 'admin' || user?.role === 'responsable') && item._id !== user.id && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openEditInfoModal(item)}
            >
              <Ionicons name="create-outline" size={20} color={colors.accent} />
              <Text style={[styles.actionButtonText, { color: colors.accent }]}>Modifier infos</Text>
            </TouchableOpacity>
          )}

          {item.role !== 'admin' && (user?.role === 'admin') && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openRoleModal(item)}
            >
              <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>Changer rôle</Text>
            </TouchableOpacity>
          )}

          {(user?.role === 'admin' || user?.role === 'responsable' || user?.role === 'manager') && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openSalaryModal(item)}
              >
                <Ionicons name="time" size={20} color={colors.info} />
                <Text style={[styles.actionButtonText, { color: colors.info }]}>Salaire</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openCommissionModal(item)}
              >
                <Ionicons name="cash" size={20} color={colors.success} />
                <Text style={[styles.actionButtonText, { color: colors.success }]}>Commission</Text>
              </TouchableOpacity>
            </>
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
              {/* Photo Section */}
              {user?.role === 'admin' && (
                <View style={styles.photoSection}>
                  <Text style={styles.photoLabel}>Photo du collaborateur</Text>
                  <TouchableOpacity
                    style={styles.photoPickerButton}
                    onPress={() => showImageOptions(null)}
                  >
                    {formData.photo ? (
                      <View style={styles.photoPreviewContainer}>
                        <Image
                          source={{ uri: formData.photo }}
                          style={styles.photoPreview}
                        />
                        <View style={styles.photoOverlay}>
                          <Ionicons name="camera" size={24} color={colors.background} />
                          <Text style={styles.photoOverlayText}>Modifier</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Ionicons name="person-circle-outline" size={64} color={colors.primary} />
                        <Text style={styles.photoPlaceholderText}>Ajouter une photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}

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
                    <Text style={styles.roleOptionTitle}>Salarié</Text>
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

      {/* Modal de modification de commission - Améliorée */}
      <Modal 
        visible={commissionModalVisible} 
        animationType="slide" 
        transparent
        onRequestClose={() => setCommissionModalVisible(false)}
      >
        <View style={styles.commissionModalOverlay}>
          <TouchableOpacity 
            style={styles.commissionModalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setCommissionModalVisible(false);
              setSelectedUser(null);
            }}
          />
          <View style={styles.commissionModalContainer}>
            {/* Handle de glissement */}
            <View style={styles.commissionModalHandle}>
              <View style={styles.commissionModalHandleLine} />
            </View>

            {/* En-tête avec avatar */}
            <LinearGradient
              colors={[colors.success + '20', colors.success + '05']}
              style={styles.commissionModalHeader}
            >
              <View style={styles.commissionUserAvatar}>
                <LinearGradient
                  colors={[colors.success, colors.success + 'DD']}
                  style={styles.commissionAvatarGradient}
                >
                  <Ionicons name="person" size={32} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.commissionHeaderText}>
                <Text style={styles.commissionModalTitle}>💰 Modifier la commission</Text>
                {selectedUser && (
                  <Text style={styles.commissionModalSubtitle}>{selectedUser.fullName}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.commissionCloseButton}
                onPress={() => {
                  setCommissionModalVisible(false);
                  setSelectedUser(null);
                }}
              >
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView 
              style={styles.commissionModalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Statistiques actuelles */}
              {selectedUser && (
                <View style={styles.currentCommissionStats}>
                  <LinearGradient
                    colors={[colors.primary + '15', colors.primary + '05']}
                    style={styles.currentStatCard}
                  >
                    <Ionicons name="trending-up" size={24} color={colors.primary} />
                    <View style={styles.currentStatContent}>
                      <Text style={styles.currentStatLabel}>Taux actuel</Text>
                      <Text style={styles.currentStatValue}>{selectedUser.commissionRate || 0}%</Text>
                    </View>
                  </LinearGradient>
                  <LinearGradient
                    colors={[colors.accent + '15', colors.accent + '05']}
                    style={styles.currentStatCard}
                  >
                    <Ionicons name="wallet" size={24} color={colors.accent} />
                    <View style={styles.currentStatContent}>
                      <Text style={styles.currentStatLabel}>Total gagné</Text>
                      <Text style={styles.currentStatValue}>
                        {formatPrice(selectedUser.totalCommissions || 0)}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              )}

              {/* Sélection rapide */}
              <View style={styles.quickSelectContainer}>
                <Text style={styles.quickSelectTitle}>⚡ Sélection rapide</Text>
                <View style={styles.quickSelectButtons}>
                  {[2, 5, 10, 15, 20].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[
                        styles.quickSelectButton,
                        commissionRate === rate.toString() && styles.quickSelectButtonActive
                      ]}
                      onPress={() => setCommissionRate(rate.toString())}
                    >
                      <LinearGradient
                        colors={
                          commissionRate === rate.toString()
                            ? [colors.success, colors.success + 'DD']
                            : [colors.surface, colors.surface]
                        }
                        style={styles.quickSelectButtonGradient}
                      >
                        <Text style={[
                          styles.quickSelectButtonText,
                          commissionRate === rate.toString() && styles.quickSelectButtonTextActive
                        ]}>
                          {rate}%
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Saisie personnalisée */}
              <View style={styles.customInputSection}>
                <Text style={styles.customInputTitle}>🎯 Taux personnalisé</Text>
                <LinearGradient
                  colors={[colors.success + '15', colors.success + '08']}
                  style={styles.commissionInputContainer}
                >
                  <View style={styles.commissionInputWrapper}>
                    <Ionicons name="cash-outline" size={28} color={colors.success} />
                    <Input
                      placeholder="0"
                      value={commissionRate}
                      onChangeText={setCommissionRate}
                      keyboardType="decimal-pad"
                      style={styles.commissionInput}
                    />
                    <Text style={styles.commissionPercentSymbol}>%</Text>
                  </View>
                  <Text style={styles.commissionHint}>
                    Entrez un taux entre 0 et 100%
                  </Text>
                </LinearGradient>
              </View>

              {/* Exemple de calcul */}
              {commissionRate && parseFloat(commissionRate) > 0 && (() => {
                const exampleValues = currency.code === 'XOF' 
                  ? [50000, 250000, 500000] 
                  : [100, 500, 1000];
                
                return (
                  <View style={styles.exampleCalculation}>
                    <LinearGradient
                      colors={[colors.info + '15', colors.info + '05']}
                      style={styles.exampleCard}
                    >
                      <View style={styles.exampleHeader}>
                        <Ionicons name="calculator-outline" size={20} color={colors.info} />
                        <Text style={styles.exampleTitle}>Exemple de calcul</Text>
                      </View>
                      {exampleValues.map((value, index) => (
                        <View key={index} style={styles.exampleRow}>
                          <Text style={styles.exampleLabel}>Vente de {formatPrice(value)}</Text>
                          <Text style={styles.exampleValue}>
                            → {formatPrice(value * parseFloat(commissionRate) / 100)} de commission
                          </Text>
                        </View>
                      ))}
                    </LinearGradient>
                  </View>
                );
              })()}
            </ScrollView>

            {/* Actions */}
            <View style={styles.commissionModalActions}>
              <TouchableOpacity
                style={styles.commissionCancelButton}
                onPress={() => {
                  setCommissionModalVisible(false);
                  setSelectedUser(null);
                }}
              >
                <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.commissionCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.commissionSaveButtonWrapper}
                onPress={handleUpdateCommission}
              >
                <LinearGradient
                  colors={[colors.success, colors.success + 'DD']}
                  style={styles.commissionSaveButton}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.commissionSaveButtonText}>Valider la commission</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de modification du salaire horaire */}
      <Modal 
        visible={salaryModalVisible} 
        animationType="slide" 
        transparent
        onRequestClose={() => setSalaryModalVisible(false)}
      >
        <View style={styles.commissionModalOverlay}>
          <TouchableOpacity 
            style={styles.commissionModalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setSalaryModalVisible(false);
              setSelectedUser(null);
            }}
          />
          <View style={styles.commissionModalContainer}>
            <View style={styles.commissionModalHandle}>
              <View style={styles.commissionModalHandleLine} />
            </View>

            <LinearGradient
              colors={[colors.info + '20', colors.info + '05']}
              style={styles.commissionModalHeader}
            >
              <View style={styles.commissionUserAvatar}>
                <LinearGradient
                  colors={[colors.info, colors.info + 'DD']}
                  style={styles.commissionAvatarGradient}
                >
                  <Ionicons name="person" size={32} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.commissionHeaderText}>
                <Text style={styles.commissionModalTitle}>💶 Modifier le salaire horaire</Text>
                {selectedUser && (
                  <Text style={styles.commissionModalSubtitle}>{selectedUser.fullName}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.commissionCloseButton}
                onPress={() => {
                  setSalaryModalVisible(false);
                  setSelectedUser(null);
                }}
              >
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView 
              style={styles.commissionModalContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedUser && (
                <View style={styles.currentCommissionStats}>
                  <LinearGradient
                    colors={[colors.primary + '15', colors.primary + '05']}
                    style={styles.currentStatCard}
                  >
                    <Ionicons name="time-outline" size={24} color={colors.primary} />
                    <View style={styles.currentStatContent}>
                      <Text style={styles.currentStatLabel}>Actuel</Text>
                      <Text style={styles.currentStatValue}>{formatPrice(selectedUser.hourlyRate || 0)}/h</Text>
                    </View>
                  </LinearGradient>
                  <LinearGradient
                    colors={[colors.accent + '15', colors.accent + '05']}
                    style={styles.currentStatCard}
                  >
                    <Ionicons name="calculator" size={24} color={colors.accent} />
                    <View style={styles.currentStatContent}>
                      <Text style={styles.currentStatLabel}>Mensuel estimé</Text>
                      <Text style={styles.currentStatValue}>
                        {formatPrice((selectedUser.hourlyRate || 0) * 35 * 4.33)}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              )}

              <View style={styles.quickSelectContainer}>
                <Text style={styles.quickSelectTitle}>⚡ Sélection rapide</Text>
                <View style={styles.quickSelectButtons}>
                  {getQuickSelectValues(currency.code).slice(0, 5).map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[
                        styles.quickSelectButton,
                        hourlyRate === rate.toString() && styles.quickSelectButtonActive
                      ]}
                      onPress={() => setHourlyRate(rate.toString())}
                    >
                      <LinearGradient
                        colors={
                          hourlyRate === rate.toString()
                            ? [colors.info, colors.info + 'DD']
                            : [colors.surface, colors.surface]
                        }
                        style={styles.quickSelectButtonGradient}
                      >
                        <View style={styles.quickSelectTextContainer}>
                          <Text style={[
                            styles.quickSelectButtonText,
                            currency.code === 'XOF' && styles.quickSelectButtonTextSmall,
                            hourlyRate === rate.toString() && styles.quickSelectButtonTextActive
                          ]}>
                            {rate}
                          </Text>
                          <Text style={[
                            styles.quickSelectButtonCurrency,
                            currency.code === 'XOF' && styles.quickSelectButtonCurrencySmall,
                            hourlyRate === rate.toString() && styles.quickSelectButtonTextActive
                          ]}>
                            {currency.symbol}
                          </Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.customInputSection}>
                <Text style={styles.customInputTitle}>🎯 Salaire personnalisé</Text>
                <LinearGradient
                  colors={[colors.info + '15', colors.info + '08']}
                  style={styles.commissionInputContainer}
                >
                  <View style={styles.commissionInputWrapper}>
                    <Ionicons name="time-outline" size={28} color={colors.info} />
                    <Input
                      placeholder="0"
                      value={hourlyRate}
                      onChangeText={setHourlyRate}
                      keyboardType="decimal-pad"
                      style={styles.commissionInput}
                    />
                    <Text style={styles.commissionPercentSymbol}>{currency.symbol}/h</Text>
                  </View>
                  <Text style={styles.commissionHint}>
                    Salaire par heure de travail
                  </Text>
                </LinearGradient>
              </View>

              {hourlyRate && parseFloat(hourlyRate) > 0 && (
                <View style={styles.exampleCalculation}>
                  <LinearGradient
                    colors={[colors.success + '15', colors.success + '05']}
                    style={styles.exampleCard}
                  >
                    <View style={styles.exampleHeader}>
                      <Ionicons name="calculator-outline" size={20} color={colors.success} />
                      <Text style={styles.exampleTitle}>Estimation de salaire</Text>
                    </View>
                    <View style={styles.exampleRow}>
                      <Text style={styles.exampleLabel}>8h de travail</Text>
                      <Text style={styles.exampleValue}>
                        → {formatPrice(8 * parseFloat(hourlyRate))} / jour
                      </Text>
                    </View>
                    <View style={styles.exampleRow}>
                      <Text style={styles.exampleLabel}>35h / semaine</Text>
                      <Text style={styles.exampleValue}>
                        → {formatPrice(35 * parseFloat(hourlyRate))} / semaine
                      </Text>
                    </View>
                    <View style={styles.exampleRow}>
                      <Text style={styles.exampleLabel}>151.67h / mois (35h)</Text>
                      <Text style={styles.exampleValue}>
                        → {formatPrice(151.67 * parseFloat(hourlyRate))} / mois
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              )}
            </ScrollView>

            <View style={styles.commissionModalActions}>
              <TouchableOpacity
                style={styles.commissionCancelButton}
                onPress={() => {
                  setSalaryModalVisible(false);
                  setSelectedUser(null);
                }}
              >
                <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.commissionCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.commissionSaveButtonWrapper}
                onPress={handleUpdateHourlyRate}
              >
                <LinearGradient
                  colors={[colors.info, colors.info + 'DD']}
                  style={styles.commissionSaveButton}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.commissionSaveButtonText}>Valider le salaire</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de modification des informations */}
      <Modal
        visible={editInfoModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditInfoModalVisible(false)}
      >
        <View style={styles.commissionModalOverlay}>
          <TouchableOpacity
            style={styles.commissionModalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setEditInfoModalVisible(false);
              setSelectedUser(null);
            }}
          />
          <View style={styles.commissionModalContainer}>
            <View style={styles.commissionModalHandle}>
              <View style={styles.commissionModalHandleLine} />
            </View>

            <LinearGradient
              colors={[colors.accent + '20', colors.accent + '05']}
              style={styles.commissionModalHeader}
            >
              <View style={styles.commissionUserAvatar}>
                <LinearGradient
                  colors={[colors.accent, colors.accent + 'DD']}
                  style={styles.commissionAvatarGradient}
                >
                  <Ionicons name="person" size={32} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.commissionHeaderText}>
                <Text style={styles.commissionModalTitle}>✏️ Modifier les informations</Text>
                {selectedUser && (
                  <Text style={styles.commissionModalSubtitle}>{selectedUser.username}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.commissionCloseButton}
                onPress={() => {
                  setEditInfoModalVisible(false);
                  setSelectedUser(null);
                }}
              >
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView
              style={styles.commissionModalContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedUser && (
                <View style={styles.currentCommissionStats}>
                  <LinearGradient
                    colors={[colors.primary + '15', colors.primary + '05']}
                    style={styles.currentStatCard}
                  >
                    <Ionicons name="person-outline" size={24} color={colors.primary} />
                    <View style={styles.currentStatContent}>
                      <Text style={styles.currentStatLabel}>Nom actuel</Text>
                      <Text style={styles.currentStatValue}>{selectedUser.fullName}</Text>
                    </View>
                  </LinearGradient>
                  <LinearGradient
                    colors={[colors.info + '15', colors.info + '05']}
                    style={styles.currentStatCard}
                  >
                    <Ionicons name="mail-outline" size={24} color={colors.info} />
                    <View style={styles.currentStatContent}>
                      <Text style={styles.currentStatLabel}>Email actuel</Text>
                      <Text style={styles.currentStatValue}>{selectedUser.email}</Text>
                    </View>
                  </LinearGradient>
                </View>
              )}

              <View style={styles.customInputSection}>
                <Text style={styles.customInputTitle}>👤 Nom complet</Text>
                <LinearGradient
                  colors={[colors.accent + '15', colors.accent + '08']}
                  style={styles.commissionInputContainer}
                >
                  <View style={styles.editInfoInputWrapper}>
                    <Ionicons name="person-outline" size={24} color={colors.accent} />
                    <Input
                      placeholder="Nom complet"
                      value={editInfoData.fullName}
                      onChangeText={(text) => setEditInfoData({ ...editInfoData, fullName: text })}
                      style={styles.editInfoInput}
                    />
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.customInputSection}>
                <Text style={styles.customInputTitle}>📧 Adresse email</Text>
                <LinearGradient
                  colors={[colors.accent + '15', colors.accent + '08']}
                  style={styles.commissionInputContainer}
                >
                  <View style={styles.editInfoInputWrapper}>
                    <Ionicons name="mail-outline" size={24} color={colors.accent} />
                    <Input
                      placeholder="email@exemple.com"
                      value={editInfoData.email}
                      onChangeText={(text) => setEditInfoData({ ...editInfoData, email: text })}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.editInfoInput}
                    />
                  </View>
                </LinearGradient>
              </View>

              <LinearGradient
                colors={[colors.warning + '15', colors.warning + '05']}
                style={styles.exampleCard}
              >
                <View style={styles.exampleHeader}>
                  <Ionicons name="information-circle" size={20} color={colors.warning} />
                  <Text style={[styles.exampleTitle, { color: colors.warning }]}>Information</Text>
                </View>
                <Text style={styles.exampleLabel}>
                  Ces informations seront utilisées pour identifier le collaborateur et communiquer avec lui.
                </Text>
              </LinearGradient>
            </ScrollView>

            <View style={styles.commissionModalActions}>
              <TouchableOpacity
                style={styles.commissionCancelButton}
                onPress={() => {
                  setEditInfoModalVisible(false);
                  setSelectedUser(null);
                }}
              >
                <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.commissionCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.commissionSaveButtonWrapper}
                onPress={handleUpdateUserInfo}
              >
                <LinearGradient
                  colors={[colors.accent, colors.accent + 'DD']}
                  style={styles.commissionSaveButton}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.commissionSaveButtonText}>Enregistrer</Text>
                </LinearGradient>
              </TouchableOpacity>
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
  userAvatarContainer: {
    marginRight: 15,
    position: 'relative',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  userAvatarWithPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  userPhotoImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  photoAddBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
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
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 15,
    marginBottom: 10,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
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
  // Styles pour la section commissions
  commissionSection: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  compensationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commissionTextContainer: {
    gap: 2,
  },
  commissionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commissionValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  // Styles pour le modal de commission amélioré
  commissionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  commissionModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  commissionModalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  commissionModalHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  commissionModalHandleLine: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  commissionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  commissionUserAvatar: {
    marginRight: 14,
  },
  commissionAvatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commissionHeaderText: {
    flex: 1,
  },
  commissionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  commissionModalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  commissionCloseButton: {
    padding: 4,
  },
  commissionModalContent: {
    padding: 20,
    maxHeight: 500,
  },
  // Statistiques actuelles
  currentCommissionStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  currentStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  currentStatContent: {
    flex: 1,
  },
  currentStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  // Sélection rapide
  quickSelectContainer: {
    marginBottom: 24,
  },
  quickSelectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  quickSelectButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  quickSelectButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickSelectButtonActive: {
    elevation: 4,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  quickSelectButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 12,
    borderColor: colors.border,
    minHeight: 56,
  },
  quickSelectTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSelectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  quickSelectButtonTextSmall: {
    fontSize: 13,
  },
  quickSelectButtonCurrency: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  quickSelectButtonCurrencySmall: {
    fontSize: 9,
  },
  quickSelectButtonTextActive: {
    color: '#fff',
  },
  // Saisie personnalisée
  customInputSection: {
    marginBottom: 24,
  },
  customInputTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  commissionInputContainer: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  commissionInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  commissionInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  commissionPercentSymbol: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.success,
  },
  commissionHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  // Édition des informations
  editInfoInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  editInfoInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  // Exemple de calcul
  exampleCalculation: {
    marginBottom: 20,
  },
  exampleCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.info,
  },
  exampleRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  exampleLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  exampleValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  // Actions
  commissionModalActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commissionCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  commissionCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  commissionSaveButtonWrapper: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  commissionSaveButton: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  commissionSaveButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Styles pour la section photo
  photoSection: {
    marginBottom: 20,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  photoPickerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreviewContainer: {
    width: 150,
    height: 150,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOverlayText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
  },
  photoPlaceholderText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});
