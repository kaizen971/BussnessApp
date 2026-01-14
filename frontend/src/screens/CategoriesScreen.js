import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../utils/colors';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const CategoriesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'responsable';

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories', { params: { projectId: user?.projectId } });
      setCategories(response.data?.data || []);
    } catch (error) {
      console.error('Error loading categories', error);
      Alert.alert('Erreur', 'Impossible de charger les catégories');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de catégorie');
      return;
    }

    try {
      setLoading(true);
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, {
          name: categoryName,
          projectId: user?.projectId
        });
        Alert.alert('Succès', 'Catégorie modifiée');
      } else {
        await api.post('/categories', {
          name: categoryName,
          projectId: user?.projectId
        });
        Alert.alert('Succès', 'Catégorie créée');
      }
      setModalVisible(false);
      setCategoryName('');
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setModalVisible(true);
  };

  const handleDelete = (category) => {
    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous vraiment supprimer la catégorie "${category.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/categories/${category._id}`);
              loadCategories();
              Alert.alert('Succès', 'Catégorie supprimée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la catégorie');
            }
          },
        },
      ]
    );
  };

  const renderCategory = ({ item }) => (
    <Card style={styles.categoryCard}>
      <View style={styles.categoryContent}>
        <View style={styles.categoryIconContainer}>
          <LinearGradient
            colors={[colors.primary + '30', colors.primary + '10']}
            style={styles.categoryIcon}
          >
            <Ionicons name="grid" size={24} color={colors.primary} />
          </LinearGradient>
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <Text style={styles.categoryDate}>
            Créée le {new Date(item.createdAt).toLocaleDateString('fr-FR')}
          </Text>
        </View>
        {isAdmin && (
          <View style={styles.categoryActions}>
            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
              <Ionicons name="pencil" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
              <Ionicons name="trash" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Card>
  );

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
            <Text style={styles.title}>Catégories</Text>
            <Text style={styles.subtitle}>{categories.length} catégorie(s)</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity
              style={styles.addButtonWrapper}
              onPress={() => {
                setCategoryName('');
                setEditingCategory(null);
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
          )}
        </View>
      </LinearGradient>

      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadCategories}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="grid-outline" size={80} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Aucune catégorie</Text>
            <Text style={styles.emptySubtext}>Appuyez sur + pour créer une catégorie</Text>
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
              >
                <View style={styles.modalIconContainer}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.modalIcon}
                  >
                    <Ionicons
                      name={editingCategory ? "create-outline" : "add-circle-outline"}
                      size={28}
                      color="#000"
                    />
                  </LinearGradient>
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>
                    {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {editingCategory ? 'Modifiez le nom' : 'Créez une nouvelle catégorie'}
                  </Text>
                </View>
              </LinearGradient>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setCategoryName('');
                  setEditingCategory(null);
                }}
              >
                <Ionicons name="close-circle" size={32} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>Nom de la catégorie</Text>
              <Input
                placeholder="Ex: Boissons, Soins, Accessoires..."
                value={categoryName}
                onChangeText={setCategoryName}
                autoFocus
              />

              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Suggestions</Text>
                <View style={styles.suggestionsGrid}>
                  {['Boissons', 'Soins', 'Accessoires', 'Vêtements', 'Alimentation', 'Services'].map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      style={styles.suggestionChip}
                      onPress={() => setCategoryName(suggestion)}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setCategoryName('');
                  setEditingCategory(null);
                }}
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
                        {editingCategory ? 'Modifier' : 'Créer'}
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
  addButtonWrapper: {},
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
  categoryCard: {
    marginBottom: 12,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    marginRight: 14,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  categoryDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
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
    maxHeight: '80%',
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  suggestionsContainer: {
    marginTop: 20,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.text,
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
