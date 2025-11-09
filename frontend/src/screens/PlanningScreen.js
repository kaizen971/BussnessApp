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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../utils/colors';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export const PlanningScreen = ({ navigation }) => {
  const { user, selectedProjectId } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  const [formData, setFormData] = useState({
    userId: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '17:00',
    notes: '',
    status: 'scheduled',
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'responsable' || user?.role === 'manager';
  const isCashier = user?.role === 'cashier';

  useEffect(() => {
    loadSchedules();
    if (isAdmin) {
      loadUsers();
    }
  }, [selectedProjectId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const params = { projectId: selectedProjectId || user?.projectId };
      
      // Si c'est un caissier, charger uniquement son planning
      if (isCashier) {
        params.userId = user.id;
      }

      const response = await api.get('/schedules', { params });
      setSchedules(response.data.data || []);
    } catch (error) {
      console.error('Erreur chargement planning:', error);
      Alert.alert('Erreur', 'Impossible de charger les plannings');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users', {
        params: { projectId: selectedProjectId || user?.projectId }
      });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!formData.userId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un employé');
      return;
    }

    try {
      setLoading(true);
      const dataToSend = {
        ...formData,
        date: formData.date.toISOString().split('T')[0],
        projectId: selectedProjectId || user?.projectId,
      };

      if (selectedSchedule) {
        await api.put(`/schedules/${selectedSchedule._id}`, dataToSend);
        Alert.alert('Succès', 'Planning mis à jour');
      } else {
        await api.post('/schedules', dataToSend);
        Alert.alert('Succès', 'Planning créé');
      }

      setModalVisible(false);
      resetForm();
      loadSchedules();
    } catch (error) {
      console.error('Erreur sauvegarde planning:', error);
      Alert.alert('Erreur', error.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment supprimer ce planning ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/schedules/${id}`);
              loadSchedules();
              Alert.alert('Succès', 'Planning supprimé');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le planning');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      userId: schedule.userId._id || schedule.userId,
      date: new Date(schedule.date),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      notes: schedule.notes || '',
      status: schedule.status,
    });
    setModalVisible(true);
  };

  const resetForm = () => {
    setSelectedSchedule(null);
    setFormData({
      userId: '',
      date: new Date(),
      startTime: '09:00',
      endTime: '17:00',
      notes: '',
      status: 'scheduled',
    });
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'scheduled':
        return { label: 'Planifié', color: colors.info, icon: 'calendar' };
      case 'completed':
        return { label: 'Terminé', color: colors.success, icon: 'checkmark-circle' };
      case 'absent':
        return { label: 'Absent', color: colors.error, icon: 'close-circle' };
      case 'cancelled':
        return { label: 'Annulé', color: colors.textSecondary, icon: 'ban' };
      default:
        return { label: status, color: colors.textSecondary, icon: 'help-circle' };
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const calculateTotalHours = () => {
    return schedules
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + (s.duration || 0), 0);
  };

  const renderScheduleItem = ({ item }) => {
    const statusInfo = getStatusInfo(item.status);
    const userName = item.userId?.fullName || item.userId?.username || 'Inconnu';

    return (
      <Card style={styles.scheduleCard}>
        <View style={styles.scheduleHeader}>
          <View style={styles.scheduleUser}>
            <View style={[styles.userAvatar, { backgroundColor: statusInfo.color + '30' }]}>
              <Ionicons name="person" size={24} color={statusInfo.color} />
            </View>
            <View style={styles.scheduleUserInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.scheduleDate}>{formatDate(item.date)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.scheduleDetails}>
          <View style={styles.timeContainer}>
            <View style={styles.timeBlock}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.timeLabel}>Début</Text>
              <Text style={styles.timeValue}>{item.startTime}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.textSecondary} />
            <View style={styles.timeBlock}>
              <Ionicons name="time" size={20} color={colors.accent} />
              <Text style={styles.timeLabel}>Fin</Text>
              <Text style={styles.timeValue}>{item.endTime}</Text>
            </View>
            <View style={styles.durationBlock}>
              <Ionicons name="hourglass-outline" size={20} color={colors.info} />
              <Text style={styles.durationValue}>{item.duration?.toFixed(1)}h</Text>
            </View>
          </View>

          {item.notes && (
            <View style={styles.notesContainer}>
              <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}
        </View>

        {isAdmin && (
          <View style={styles.scheduleActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                Modifier
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item._id)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.actionButtonText, { color: colors.error }]}>
                Supprimer
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
            <Text style={styles.title}>Planning</Text>
            <Text style={styles.subtitle}>
              {isCashier ? 'Mon planning' : `${schedules.length} planning(s)`}
            </Text>
          </View>
          {isAdmin && (
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
          )}
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
          <Ionicons name="calendar" size={28} color={colors.primary} />
          <Text style={styles.statValue}>{schedules.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </LinearGradient>
        <LinearGradient
          colors={[colors.success + '25', colors.success + '10']}
          style={styles.statCard}
        >
          <Ionicons name="checkmark-circle" size={28} color={colors.success} />
          <Text style={styles.statValue}>
            {schedules.filter(s => s.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Terminés</Text>
        </LinearGradient>
        <LinearGradient
          colors={[colors.info + '25', colors.info + '10']}
          style={styles.statCard}
        >
          <Ionicons name="time" size={28} color={colors.info} />
          <Text style={styles.statValue}>{calculateTotalHours().toFixed(0)}h</Text>
          <Text style={styles.statLabel}>Heures</Text>
        </LinearGradient>
      </LinearGradient>

      <FlatList
        data={schedules}
        renderItem={renderScheduleItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadSchedules}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={80} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Aucun planning</Text>
            {isAdmin && (
              <Text style={styles.emptySubtext}>Appuyez sur + pour créer un planning</Text>
            )}
          </View>
        }
      />

      {/* Modal de création/édition */}
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
                      name={selectedSchedule ? 'create' : 'calendar'}
                      size={28}
                      color="#000"
                    />
                  </LinearGradient>
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>
                    {selectedSchedule ? 'Modifier le planning' : 'Nouveau planning'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Planifier les horaires de travail
                  </Text>
                </View>
              </LinearGradient>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Ionicons name="close-circle" size={32} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Employé *</Text>
                <Picker
                  selectedValue={formData.userId}
                  onValueChange={(value) => setFormData({ ...formData, userId: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Sélectionner un employé" value="" />
                  {users.map((u) => (
                    <Picker.Item
                      key={u._id}
                      label={`${u.fullName} (@${u.username})`}
                      value={u._id}
                    />
                  ))}
                </Picker>
              </View>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={styles.dateButtonText}>
                  {formData.date.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={formData.date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setFormData({ ...formData, date: selectedDate });
                    }
                  }}
                />
              )}

              <View style={styles.timePickerRow}>
                <View style={styles.timePickerColumn}>
                  <Text style={styles.pickerLabel}>Heure de début *</Text>
                  <Input
                    placeholder="09:00"
                    value={formData.startTime}
                    onChangeText={(text) => setFormData({ ...formData, startTime: text })}
                  />
                </View>
                <View style={styles.timePickerColumn}>
                  <Text style={styles.pickerLabel}>Heure de fin *</Text>
                  <Input
                    placeholder="17:00"
                    value={formData.endTime}
                    onChangeText={(text) => setFormData({ ...formData, endTime: text })}
                  />
                </View>
              </View>

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Statut</Text>
                <Picker
                  selectedValue={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Planifié" value="scheduled" />
                  <Picker.Item label="Terminé" value="completed" />
                  <Picker.Item label="Absent" value="absent" />
                  <Picker.Item label="Annulé" value="cancelled" />
                </Picker>
              </View>

              <Input
                placeholder="Notes (optionnel)"
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButtonWrapper}
                onPress={handleCreateOrUpdate}
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
                      <Ionicons
                        name={selectedSchedule ? 'checkmark' : 'add'}
                        size={20}
                        color="#000"
                      />
                      <Text style={styles.saveButtonText}>
                        {selectedSchedule ? 'Modifier' : 'Créer'}
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
  scheduleCard: {
    marginBottom: 15,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  scheduleUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleUserInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  scheduleDate: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleDetails: {
    marginBottom: 15,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 2,
  },
  durationBlock: {
    alignItems: 'center',
  },
  durationValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.info,
    marginTop: 4,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  scheduleActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
    color: colors.text,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 15,
    gap: 10,
  },
  dateButtonText: {
    fontSize: 14,
    color: colors.text,
    textTransform: 'capitalize',
  },
  timePickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  timePickerColumn: {
    flex: 1,
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

