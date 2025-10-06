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
import { feedbackAPI } from '../services/api';
import { colors } from '../utils/colors';

export const FeedbackScreen = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    type: 'feature',
    message: '',
  });

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    try {
      const response = await feedbackAPI.getAll({ projectId: user?.projectId });
      setFeedbacks(response.data);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
      Alert.alert('Erreur', 'Impossible de charger les feedbacks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!formData.message) {
      Alert.alert('Erreur', 'Veuillez saisir un message');
      return;
    }

    try {
      await feedbackAPI.create({
        ...formData,
        projectId: user?.projectId,
      });

      setFormData({ type: 'feature', message: '' });
      setModalVisible(false);
      loadFeedbacks();
      Alert.alert('Succès', 'Feedback envoyé avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le feedback');
    }
  };

  const getTypeInfo = (type) => {
    switch (type) {
      case 'bug':
        return { label: 'Bug', icon: 'bug-outline', color: colors.error };
      case 'feature':
        return { label: 'Fonctionnalité', icon: 'bulb-outline', color: colors.primary };
      case 'improvement':
        return { label: 'Amélioration', icon: 'trending-up-outline', color: colors.accent };
      default:
        return { label: 'Autre', icon: 'chatbubble-outline', color: colors.textSecondary };
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { label: 'En attente', color: colors.accent };
      case 'in_review':
        return { label: 'En cours', color: colors.info };
      case 'resolved':
        return { label: 'Résolu', color: colors.success };
      default:
        return { label: 'Inconnu', color: colors.textSecondary };
    }
  };

  const renderFeedbackItem = ({ item }) => {
    const typeInfo = getTypeInfo(item.type);
    const statusInfo = getStatusInfo(item.status);

    return (
      <Card style={styles.feedbackItem}>
        <View style={styles.feedbackHeader}>
          <View style={[styles.typeIcon, { backgroundColor: typeInfo.color + '20' }]}>
            <Ionicons name={typeInfo.icon} size={20} color={typeInfo.color} />
          </View>
          <View style={styles.feedbackInfo}>
            <View style={styles.headerRow}>
              <Text style={styles.typeLabel}>{typeInfo.label}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>
            <Text style={styles.feedbackMessage}>{item.message}</Text>
            <Text style={styles.feedbackDate}>
              {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const TypeSelector = ({ selected, onSelect }) => {
    const types = [
      { value: 'bug', label: 'Bug', icon: 'bug-outline' },
      { value: 'feature', label: 'Fonctionnalité', icon: 'bulb-outline' },
      { value: 'improvement', label: 'Amélioration', icon: 'trending-up-outline' },
      { value: 'other', label: 'Autre', icon: 'chatbubble-outline' },
    ];

    return (
      <View style={styles.typeSelector}>
        <Text style={styles.typeSelectorLabel}>Type de feedback *</Text>
        <View style={styles.typeButtons}>
          {types.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeButton,
                selected === type.value && styles.typeButtonActive,
              ]}
              onPress={() => onSelect(type.value)}
            >
              <Ionicons
                name={type.icon}
                size={20}
                color={selected === type.value ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  selected === type.value && styles.typeButtonTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={feedbacks}
        renderItem={renderFeedbackItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>Aucun feedback</Text>
            <Text style={styles.emptySubtext}>
              Partagez vos idées et améliorations
            </Text>
          </View>
        }
      />

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
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
              <Text style={styles.modalTitle}>Nouveau feedback</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TypeSelector
              selected={formData.type}
              onSelect={(type) => setFormData(prev => ({ ...prev, type }))}
            />

            <Input
              label="Message *"
              value={formData.message}
              onChangeText={(value) => setFormData(prev => ({ ...prev, message: value }))}
              placeholder="Décrivez votre feedback en détail..."
              multiline
              style={{ marginTop: 16 }}
            />

            <Button
              title="Envoyer le feedback"
              onPress={handleSubmitFeedback}
              style={{ marginTop: 8 }}
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
  feedbackItem: {
    marginBottom: 12,
  },
  feedbackHeader: {
    flexDirection: 'row',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  feedbackInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackMessage: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  feedbackDate: {
    fontSize: 12,
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
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
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
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondary,
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
  typeSelector: {
    marginBottom: 8,
  },
  typeSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  typeButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
