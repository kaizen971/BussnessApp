import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
  const [salaryModalVisible, setSalaryModalVisible] = useState(false);
  const [salaryStats, setSalaryStats] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' ou 'list'
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [formData, setFormData] = useState({
    userId: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '17:00',
    notes: '',
    status: 'scheduled',
    isRecurring: false,
    recurringDays: [], // [1=Lundi, 2=Mardi, etc.]
    endDate: null,
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'responsable' || user?.role === 'manager';
  const isCashier = user?.role === 'cashier';

  const daysOfWeek = [
    { label: 'Lundi', value: 1, short: 'Lun' },
    { label: 'Mardi', value: 2, short: 'Mar' },
    { label: 'Mercredi', value: 3, short: 'Mer' },
    { label: 'Jeudi', value: 4, short: 'Jeu' },
    { label: 'Vendredi', value: 5, short: 'Ven' },
    { label: 'Samedi', value: 6, short: 'Sam' },
    { label: 'Dimanche', value: 0, short: 'Dim' },
  ];

  useEffect(() => {
    loadSchedules();
    if (isAdmin) {
      loadUsers();
    }
  }, [selectedProjectId, selectedWeek]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const weekStart = getWeekStart(selectedWeek);
      const weekEnd = getWeekEnd(selectedWeek);
      
      const params = {
        projectId: selectedProjectId || user?.projectId,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
      };
      
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

    if (formData.isRecurring && formData.recurringDays.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un jour pour la récurrence');
      return;
    }

    try {
      setLoading(true);
      const dataToSend = {
        ...formData,
        date: formData.date.toISOString().split('T')[0],
        endDate: formData.endDate ? formData.endDate.toISOString().split('T')[0] : null,
        projectId: selectedProjectId || user?.projectId,
      };

      const response = await api.post('/schedules', dataToSend);
      
      if (response.data.count) {
        Alert.alert('Succès', response.data.message);
      } else {
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

  const resetForm = () => {
    setFormData({
      userId: '',
      date: new Date(),
      startTime: '09:00',
      endTime: '17:00',
      notes: '',
      status: 'scheduled',
      isRecurring: false,
      recurringDays: [],
      endDate: null,
    });
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi
    return new Date(d.setDate(diff));
  };

  const getWeekEnd = (date) => {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  };

  const getWeekDays = () => {
    const start = getWeekStart(selectedWeek);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getSchedulesForDay = (date) => {
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date);
      return scheduleDate.toDateString() === date.toDateString();
    });
  };

  const previousWeek = () => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedWeek(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedWeek(newDate);
  };

  const toggleDay = (dayValue) => {
    if (formData.recurringDays.includes(dayValue)) {
      setFormData({
        ...formData,
        recurringDays: formData.recurringDays.filter(d => d !== dayValue)
      });
    } else {
      setFormData({
        ...formData,
        recurringDays: [...formData.recurringDays, dayValue]
      });
    }
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

  const calculateTotalHours = () => {
    return schedules
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + (s.duration || 0), 0);
  };

  const loadSalaryStats = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const response = await api.get(`/users/${user.id}/salary-stats`, {
        params: {
          month: now.getMonth() + 1,
          year: now.getFullYear()
        }
      });
      setSalaryStats(response.data);
      setSalaryModalVisible(true);
    } catch (error) {
      console.error('Erreur chargement salaire:', error);
      Alert.alert('Erreur', 'Impossible de charger les statistiques de salaire');
    } finally {
      setLoading(false);
    }
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    
    return (
      <ScrollView style={styles.weekContainer} showsVerticalScrollIndicator={false}>
        {/* Navigation de semaine */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity style={styles.weekNavButton} onPress={previousWeek}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.weekLabel}>
            <Text style={styles.weekLabelText}>
              Semaine du {weekDays[0].getDate()} {weekDays[0].toLocaleDateString('fr-FR', { month: 'short' })} au {weekDays[6].getDate()} {weekDays[6].toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity style={styles.weekNavButton} onPress={nextWeek}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Grille des jours */}
        {weekDays.map((day, index) => {
          const daySchedules = getSchedulesForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();
          
          return (
            <Card key={index} style={[styles.dayCard, isToday && styles.dayCardToday]}>
              <View style={styles.dayHeader}>
                <View style={styles.dayTitleContainer}>
                  <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                    {day.toLocaleDateString('fr-FR', { weekday: 'long' })}
                  </Text>
                  <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>
                    {day.getDate()} {day.toLocaleDateString('fr-FR', { month: 'long' })}
                  </Text>
                </View>
                {isToday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>Aujourd'hui</Text>
                  </View>
                )}
              </View>

              {daySchedules.length > 0 ? (
                <View style={styles.daySchedules}>
                  {daySchedules.map((schedule) => {
                    const statusInfo = getStatusInfo(schedule.status);
                    const userName = schedule.userId?.fullName || schedule.userId?.username || 'Inconnu';
                    
                    return (
                      <LinearGradient
                        key={schedule._id}
                        colors={[statusInfo.color + '20', statusInfo.color + '08']}
                        style={styles.scheduleItem}
                      >
                        <View style={styles.scheduleItemHeader}>
                          <View style={styles.scheduleUserInfo}>
                            <Ionicons name="person-circle" size={20} color={statusInfo.color} />
                            <Text style={styles.scheduleUserName}>{userName}</Text>
                          </View>
                          {isAdmin && (
                            <TouchableOpacity onPress={() => handleDelete(schedule._id)}>
                              <Ionicons name="trash-outline" size={18} color={colors.error} />
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.scheduleTime}>
                          <Ionicons name="time-outline" size={16} color={statusInfo.color} />
                          <Text style={styles.scheduleTimeText}>
                            {schedule.startTime} - {schedule.endTime} ({schedule.duration}h)
                          </Text>
                        </View>
                        {schedule.notes && (
                          <Text style={styles.scheduleNotes}>📝 {schedule.notes}</Text>
                        )}
                      </LinearGradient>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyDay}>
                  <Ionicons name="calendar-outline" size={32} color={colors.textSecondary} />
                  <Text style={styles.emptyDayText}>Aucun planning</Text>
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
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
            <Text style={styles.title}>📅 Planning</Text>
            <Text style={styles.subtitle}>
              {isCashier ? 'Mon planning' : 'Gestion des horaires'}
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

      {/* Bouton pour voir le salaire mensuel */}
      <TouchableOpacity 
        style={styles.salaryButton} 
        onPress={loadSalaryStats}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.accent, colors.accent + 'DD']}
          style={styles.salaryButtonGradient}
        >
          <View style={styles.salaryButtonContent}>
            <Ionicons name="wallet" size={28} color="#fff" />
            <View style={styles.salaryButtonTextContainer}>
              <Text style={styles.salaryButtonTitle}>💰 Mon Salaire Mensuel</Text>
              <Text style={styles.salaryButtonSubtitle}>Voir le détail de ma rémunération</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {renderWeekView()}

      {/* Modal de création/édition avec récurrence */}
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
                    <Ionicons name="calendar" size={28} color="#000" />
                  </LinearGradient>
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Nouveau planning</Text>
                  <Text style={styles.modalSubtitle}>
                    {formData.isRecurring ? 'Planning récurrent' : 'Planning unique'}
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

              {/* Toggle récurrence */}
              <TouchableOpacity
                style={styles.recurringToggle}
                onPress={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })}
              >
                <LinearGradient
                  colors={formData.isRecurring ? [colors.accent + '20', colors.accent + '10'] : [colors.surface, colors.surface]}
                  style={styles.recurringToggleContent}
                >
                  <View style={styles.recurringToggleLeft}>
                    <Ionicons 
                      name={formData.isRecurring ? "repeat" : "calendar-outline"} 
                      size={24} 
                      color={formData.isRecurring ? colors.accent : colors.textSecondary} 
                    />
                    <View style={styles.recurringToggleText}>
                      <Text style={styles.recurringToggleTitle}>Planning récurrent</Text>
                      <Text style={styles.recurringToggleSubtitle}>
                        {formData.isRecurring ? 'Répéter tous les jours sélectionnés' : 'Activer pour planifier plusieurs jours'}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.toggle,
                    formData.isRecurring && styles.toggleActive
                  ]}>
                    <View style={[
                      styles.toggleCircle,
                      formData.isRecurring && styles.toggleCircleActive
                    ]} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {formData.isRecurring && (
                <>
                  <View style={styles.daysSelectionContainer}>
                    <Text style={styles.pickerLabel}>⚡ Sélectionner les jours</Text>
                    <View style={styles.daysGrid}>
                      {daysOfWeek.map((day) => (
                        <TouchableOpacity
                          key={day.value}
                          style={[
                            styles.dayChip,
                            formData.recurringDays.includes(day.value) && styles.dayChipSelected
                          ]}
                          onPress={() => toggleDay(day.value)}
                        >
                          <LinearGradient
                            colors={
                              formData.recurringDays.includes(day.value)
                                ? [colors.primary, colors.primaryDark]
                                : [colors.surface, colors.surface]
                            }
                            style={styles.dayChipGradient}
                          >
                            <Text style={[
                              styles.dayChipText,
                              formData.recurringDays.includes(day.value) && styles.dayChipTextSelected
                            ]}>
                              {day.short}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <View style={styles.dateButtonContent}>
                      <Text style={styles.dateButtonLabel}>Jusqu'au</Text>
                      <Text style={styles.dateButtonText}>
                        {formData.endDate ? formData.endDate.toLocaleDateString('fr-FR') : '3 mois par défaut'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {showEndDatePicker && (
                    <DateTimePicker
                      value={formData.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        setShowEndDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          setFormData({ ...formData, endDate: selectedDate });
                        }
                      }}
                      minimumDate={new Date()}
                    />
                  )}
                </>
              )}

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <View style={styles.dateButtonContent}>
                  <Text style={styles.dateButtonLabel}>
                    {formData.isRecurring ? 'À partir du' : 'Date'}
                  </Text>
                  <Text style={styles.dateButtonText}>
                    {formData.date.toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
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
                      <Ionicons name="checkmark-circle" size={20} color="#000" />
                      <Text style={styles.saveButtonText}>
                        {formData.isRecurring ? 'Créer les plannings' : 'Créer'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* Modal de visualisation du salaire mensuel */}
      <Modal visible={salaryModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[colors.surface, colors.background]}
            style={styles.modalContent}
          >
            <View style={styles.modalHeaderContainer}>
              <LinearGradient
                colors={[colors.accent + '30', colors.accent + '10']}
                style={styles.modalHeaderGradient}
              >
                <View style={styles.modalIconContainer}>
                  <LinearGradient
                    colors={[colors.accent, colors.accent + 'DD']}
                    style={styles.modalIcon}
                  >
                    <Ionicons name="wallet" size={28} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>💰 Mon Salaire</Text>
                  <Text style={styles.modalSubtitle}>
                    {salaryStats?.period?.label || 'Mois actuel'}
                  </Text>
                </View>
              </LinearGradient>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSalaryModalVisible(false)}
              >
                <Ionicons name="close-circle" size={32} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {salaryStats && (
                <>
                  {/* Résumé financier */}
                  <View style={styles.salarySection}>
                    <Text style={styles.salarySectionTitle}>📊 Résumé Financier</Text>
                    <View style={styles.salaryStatsGrid}>
                      <LinearGradient
                        colors={[colors.primary + '15', colors.primary + '08']}
                        style={styles.salaryStatCard}
                      >
                        <Ionicons name="cash" size={32} color={colors.primary} />
                        <Text style={styles.salaryStatValue}>
                          {salaryStats.salary.hourly.toFixed(2)} €
                        </Text>
                        <Text style={styles.salaryStatLabel}>Salaire horaire</Text>
                        <Text style={styles.salaryStatDetail}>
                          {salaryStats.hours.total}h × {salaryStats.user.hourlyRate}€/h
                        </Text>
                      </LinearGradient>

                      <LinearGradient
                        colors={[colors.success + '15', colors.success + '08']}
                        style={styles.salaryStatCard}
                      >
                        <Ionicons name="trending-up" size={32} color={colors.success} />
                        <Text style={styles.salaryStatValue}>
                          {salaryStats.salary.commissions.toFixed(2)} €
                        </Text>
                        <Text style={styles.salaryStatLabel}>Commissions</Text>
                        <Text style={styles.salaryStatDetail}>
                          {salaryStats.user.commissionRate}% sur ventes
                        </Text>
                      </LinearGradient>
                    </View>

                    <LinearGradient
                      colors={[colors.accent + '20', colors.accent + '08']}
                      style={styles.totalSalaryCard}
                    >
                      <View style={styles.totalSalaryContent}>
                        <Ionicons name="wallet" size={40} color={colors.accent} />
                        <View style={styles.totalSalaryText}>
                          <Text style={styles.totalSalaryLabel}>Salaire Total</Text>
                          <Text style={styles.totalSalaryValue}>
                            {salaryStats.salary.total.toFixed(2)} €
                          </Text>
                          <Text style={styles.totalSalarySubtext}>
                            Pour le mois de {salaryStats.period.label}
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Détail des heures */}
                  <View style={styles.salarySection}>
                    <Text style={styles.salarySectionTitle}>⏱️ Détail des Heures</Text>
                    <View style={styles.hoursDetailGrid}>
                      <View style={styles.hoursDetailItem}>
                        <Ionicons name="time-outline" size={24} color={colors.info} />
                        <Text style={styles.hoursDetailLabel}>Total heures</Text>
                        <Text style={styles.hoursDetailValue}>
                          {salaryStats.hours.total}h
                        </Text>
                      </View>
                      <View style={styles.hoursDetailItem}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                        <Text style={styles.hoursDetailLabel}>Jours travaillés</Text>
                        <Text style={styles.hoursDetailValue}>
                          {salaryStats.hours.completed}
                        </Text>
                      </View>
                      <View style={styles.hoursDetailItem}>
                        <Ionicons name="stats-chart" size={24} color={colors.primary} />
                        <Text style={styles.hoursDetailLabel}>Moyenne/jour</Text>
                        <Text style={styles.hoursDetailValue}>
                          {salaryStats.hours.average}h
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Détail des commissions */}
                  {salaryStats.commissions.count > 0 && (
                    <View style={styles.salarySection}>
                      <Text style={styles.salarySectionTitle}>💸 Détail des Commissions</Text>
                      <View style={styles.commissionsDetail}>
                        <View style={styles.commissionDetailRow}>
                          <Text style={styles.commissionDetailLabel}>Total commissions</Text>
                          <Text style={styles.commissionDetailValue}>
                            {salaryStats.commissions.total.toFixed(2)} €
                          </Text>
                        </View>
                        <View style={styles.commissionDetailRow}>
                          <Text style={styles.commissionDetailLabel}>En attente</Text>
                          <Text style={[styles.commissionDetailValue, { color: colors.warning }]}>
                            {salaryStats.commissions.pending.toFixed(2)} €
                          </Text>
                        </View>
                        <View style={styles.commissionDetailRow}>
                          <Text style={styles.commissionDetailLabel}>Payées</Text>
                          <Text style={[styles.commissionDetailValue, { color: colors.success }]}>
                            {salaryStats.commissions.paid.toFixed(2)} €
                          </Text>
                        </View>
                        <View style={styles.commissionDetailRow}>
                          <Text style={styles.commissionDetailLabel}>Nombre de ventes</Text>
                          <Text style={styles.commissionDetailValue}>
                            {salaryStats.commissions.count}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Statistiques hebdomadaires */}
                  {salaryStats.weeklyStats && salaryStats.weeklyStats.length > 0 && (
                    <View style={styles.salarySection}>
                      <Text style={styles.salarySectionTitle}>📅 Détail Hebdomadaire</Text>
                      {salaryStats.weeklyStats.map((week, index) => (
                        <LinearGradient
                          key={index}
                          colors={[colors.surface, colors.surface]}
                          style={styles.weeklyStatCard}
                        >
                          <View style={styles.weeklyStatHeader}>
                            <Text style={styles.weeklyStatWeek}>{week.week}</Text>
                            <Text style={styles.weeklyStatSalary}>
                              {week.salary.toFixed(2)} €
                            </Text>
                          </View>
                          <View style={styles.weeklyStatDetails}>
                            <Text style={styles.weeklyStatDetail}>
                              {week.hours}h sur {week.days} jour(s)
                            </Text>
                          </View>
                        </LinearGradient>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.saveButtonWrapper}
                onPress={() => setSalaryModalVisible(false)}
              >
                <LinearGradient
                  colors={[colors.accent, colors.accent + 'DD']}
                  style={styles.saveButton}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Fermer</Text>
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
  // Vue semaine
  weekContainer: {
    flex: 1,
    padding: 20,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
  },
  weekNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekLabel: {
    flex: 1,
    alignItems: 'center',
  },
  weekLabelText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  dayCard: {
    marginBottom: 15,
  },
  dayCardToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayTitleContainer: {
    flex: 1,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  dayNameToday: {
    color: colors.primary,
  },
  dayDate: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  dayDateToday: {
    color: colors.primary,
    fontWeight: '600',
  },
  todayBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  daySchedules: {
    gap: 10,
  },
  scheduleItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scheduleItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  scheduleUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  scheduleTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  scheduleTimeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  scheduleNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyDay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyDayText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
  },
  // Modal
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
  // Toggle récurrence
  recurringToggle: {
    marginBottom: 20,
  },
  recurringToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recurringToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  recurringToggleText: {
    flex: 1,
  },
  recurringToggleTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  recurringToggleSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.accent,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleCircleActive: {
    transform: [{ translateX: 22 }],
  },
  // Sélection des jours
  daysSelectionContainer: {
    marginBottom: 20,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayChip: {
    flex: 1,
    minWidth: '12%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dayChipSelected: {
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  dayChipGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 12,
    borderColor: colors.border,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  dayChipTextSelected: {
    color: '#000',
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
  dateButtonContent: {
    flex: 1,
  },
  dateButtonLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateButtonText: {
    fontSize: 14,
    color: colors.text,
    textTransform: 'capitalize',
    fontWeight: '600',
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
  // Styles pour le bouton de salaire
  salaryButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  salaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  salaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  salaryButtonTextContainer: {
    gap: 4,
  },
  salaryButtonTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
  },
  salaryButtonSubtitle: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
  },
  // Styles pour la modal de salaire
  salarySection: {
    marginBottom: 24,
  },
  salarySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  salaryStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  salaryStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  salaryStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  salaryStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  salaryStatDetail: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  totalSalaryCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  totalSalaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  totalSalaryText: {
    flex: 1,
  },
  totalSalaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  totalSalaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  totalSalarySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  hoursDetailGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  hoursDetailItem: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hoursDetailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  hoursDetailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  commissionsDetail: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  commissionDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  commissionDetailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  commissionDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  weeklyStatCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weeklyStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weeklyStatWeek: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  weeklyStatSalary: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
  },
  weeklyStatDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeklyStatDetail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
