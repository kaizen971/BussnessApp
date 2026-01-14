import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingScreen } from '../components/LoadingScreen';
import { projectsAPI } from '../services/api';
import { colors, gradients } from '../utils/colors';
import { CURRENCIES } from '../utils/currency';

export const ProjectsScreen = ({ navigation }) => {
  const { user, isAdmin, isManager, selectedProjectId, selectProject, loadAvailableProjects, availableProjects } = useAuth();
  const { setProjectCurrency } = useCurrency();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    logo: null,
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      const projectsList = response.data;
      setProjects(projectsList);
      loadAvailableProjects(projectsList);
    } catch (error) {
      console.error('Error loading projects:', error);
      Alert.alert('Erreur', 'Impossible de charger les projets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  const handleSelectProject = async (projectId) => {
    await selectProject(projectId);
    
    // Trouver le projet sélectionné et appliquer sa devise
    const selectedProject = projects.find(p => p._id === projectId);
    if (selectedProject) {
      setProjectCurrency(selectedProject.currency || 'EUR');
    }
    
    navigation.navigate('Dashboard');
  };

  const openAddModal = () => {
    setEditingProject(null);
    setFormData({ name: '', description: '', category: '', logo: null });
    setModalVisible(true);
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      category: project.category || '',
      logo: project.logo || null,
    });
    setModalVisible(true);
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

  const pickImage = async () => {
    // Demander la permission d'accéder à la galerie
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à vos photos');
      return;
    }

    // Lancer le sélecteur d'images
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        const base64Image = await convertImageToBase64(result.assets[0].uri);
        setFormData({ ...formData, logo: base64Image });
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de traiter l\'image');
      }
    }
  };

  const takePhoto = async () => {
    // Demander la permission d'accéder à la caméra
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour utiliser la caméra');
      return;
    }

    // Lancer la caméra
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        const base64Image = await convertImageToBase64(result.assets[0].uri);
        setFormData({ ...formData, logo: base64Image });
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de traiter l\'image');
      }
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Ajouter un logo',
      'Choisissez une option',
      [
        { text: 'Galerie', onPress: pickImage },
        { text: 'Prendre une photo', onPress: takePhoto },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Erreur', 'Le nom du projet est requis');
      return;
    }

    try {
      if (editingProject) {
        await projectsAPI.update(editingProject._id, formData);
        Alert.alert('Succès', 'Projet modifié avec succès');
      } else {
        await projectsAPI.create(formData);
        Alert.alert('Succès', 'Projet créé avec succès');
      }
      setModalVisible(false);
      loadProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      Alert.alert('Erreur', error.response?.data?.error || 'Erreur lors de la sauvegarde du projet');
    }
  };

  const handleDelete = (project) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer "${project.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectsAPI.delete(project._id);
              Alert.alert('Succès', 'Projet supprimé avec succès');
              loadProjects();
            } catch (error) {
              console.error('Error deleting project:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le projet');
            }
          },
        },
      ]
    );
  };

  const handleChangeCurrency = (project) => {
    const currentCurrency = project.currency || 'EUR';
    const newCurrency = currentCurrency === 'EUR' ? 'XOF' : 'EUR';
    const currencyName = CURRENCIES[newCurrency].name;
    const currencySymbol = CURRENCIES[newCurrency].symbol;

    Alert.alert(
      'Changer la devise',
      `Voulez-vous changer la devise de "${project.name}" en ${currencyName} (${currencySymbol}) ?\n\nToute l'équipe verra les montants dans cette devise.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Changer',
          onPress: async () => {
            try {
              await projectsAPI.updateCurrency(project._id, newCurrency);
              
              // Si c'est le projet actif, mettre à jour la devise dans le contexte
              if (selectedProjectId === project._id) {
                setProjectCurrency(newCurrency);
              }
              
              Alert.alert('Succès', `Devise changée en ${currencyName}`);
              loadProjects();
            } catch (error) {
              console.error('Error changing currency:', error);
              Alert.alert('Erreur', 'Impossible de changer la devise');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.gold} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.background} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Projets</Text>
        {(isAdmin || isManager) && (
          <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.background} />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {projects.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>Aucun projet disponible</Text>
            <Text style={styles.emptySubtext}>
              {isAdmin || isManager ? 'Créez votre premier projet' : 'Contactez un administrateur'}
            </Text>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project._id} style={styles.projectCard}>
              <TouchableOpacity
                style={styles.projectContent}
                onPress={() => handleSelectProject(project._id)}
                activeOpacity={0.7}
              >
                <View style={styles.projectHeader}>
                  <View style={styles.projectIconContainer}>
                    {project.logo ? (
                      <View style={styles.projectLogoContainer}>
                        <Image
                          source={{ uri: project.logo }}
                          style={styles.projectLogo}
                        />
                        {selectedProjectId === project._id && (
                          <View style={styles.selectedBadgeOverlay}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                          </View>
                        )}
                      </View>
                    ) : (
                      <LinearGradient
                        colors={selectedProjectId === project._id ? [colors.primary, colors.accent] : [colors.textLight, colors.textSecondary]}
                        style={styles.projectIcon}
                      >
                        <Ionicons
                          name={selectedProjectId === project._id ? "checkmark-circle" : "briefcase"}
                          size={24}
                          color={colors.background}
                        />
                      </LinearGradient>
                    )}
                  </View>
                  <View style={styles.projectInfo}>
                    <Text style={styles.projectName}>{project.name}</Text>
                    {project.description && (
                      <Text style={styles.projectDescription} numberOfLines={2}>
                        {project.description}
                      </Text>
                    )}
                    <View style={styles.badgesContainer}>
                      {project.category && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryText}>{project.category}</Text>
                        </View>
                      )}
                      <View style={styles.currencyBadge}>
                        <Ionicons name="cash-outline" size={12} color={colors.info} />
                        <Text style={styles.currencyText}>
                          {CURRENCIES[project.currency || 'EUR'].symbol}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {selectedProjectId === project._id && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedText}>Projet actif</Text>
                  </View>
                )}
              </TouchableOpacity>

              {(isAdmin || isManager) && (
                <View style={styles.projectActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleChangeCurrency(project)}
                  >
                    <Ionicons name="swap-horizontal-outline" size={20} color={colors.info} />
                    <Text style={[styles.actionButtonText, { color: colors.info }]}>
                      {project.currency === 'XOF' ? 'EUR' : 'CFA'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(project)}
                  >
                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(project)}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProject ? 'Modifier le projet' : 'Nouveau projet'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Logo Section */}
              {isAdmin && (
                <View style={styles.logoSection}>
                  <Text style={styles.inputLabel}>Logo du business</Text>
                  <TouchableOpacity
                    style={styles.logoPickerButton}
                    onPress={showImageOptions}
                  >
                    {formData.logo ? (
                      <View style={styles.logoPreviewContainer}>
                        <Image
                          source={{ uri: formData.logo }}
                          style={styles.logoPreview}
                        />
                        <View style={styles.logoOverlay}>
                          <Ionicons name="camera" size={24} color={colors.background} />
                          <Text style={styles.logoOverlayText}>Modifier</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.logoPlaceholder}>
                        <Ionicons name="business-outline" size={48} color={colors.primary} />
                        <Text style={styles.logoPlaceholderText}>Ajouter un logo</Text>
                        <Text style={styles.logoPlaceholderSubtext}>
                          Touchez pour sélectionner une image
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.inputLabel}>Nom du projet *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Restaurant Le Gourmet"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholderTextColor={colors.textLight}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description du projet"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={4}
                placeholderTextColor={colors.textLight}
              />

              <Text style={styles.inputLabel}>Catégorie</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Restauration, Commerce, Service..."
                value={formData.category}
                onChangeText={(text) => setFormData({ ...formData, category: text })}
                placeholderTextColor={colors.textLight}
              />

              <Button
                title={editingProject ? 'Mettre à jour' : 'Créer le projet'}
                onPress={handleSubmit}
                style={styles.submitButton}
              />
            </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.background,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  projectCard: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  projectContent: {
    padding: 16,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  projectIconContainer: {
    marginRight: 12,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  currencyText: {
    fontSize: 11,
    color: colors.info,
    fontWeight: '700',
  },
  selectedBadge: {
    marginTop: 12,
    backgroundColor: colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  selectedText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '700',
  },
  projectActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalScroll: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 24,
  },
  projectLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  projectLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  selectedBadgeOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 2,
  },
  logoSection: {
    marginBottom: 20,
  },
  logoPickerButton: {
    borderWidth: 2,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
  },
  logoPreviewContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  logoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoOverlayText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  logoPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
  },
  logoPlaceholderText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  logoPlaceholderSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});
