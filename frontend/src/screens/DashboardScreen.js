import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { Card } from '../components/Card';
import { LoadingScreen } from '../components/LoadingScreen';
import api, { dashboardAPI, projectsAPI } from '../services/api';
import { colors, gradients } from '../utils/colors';

const screenWidth = Dimensions.get('window').width;

export const DashboardScreen = ({ navigation }) => {
  const { user, logout, selectedProjectId, availableProjects, loadAvailableProjects, selectProject } = useAuth();
  const { format: formatPrice, currency, setProjectCurrency, availableCurrencies } = useCurrency();
  console.log(user)
  const [stats, setStats] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [commerceModalVisible, setCommerceModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1)); // Début de l'année
  const [endDate, setEndDate] = useState(new Date()); // Aujourd'hui
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const modalSlideAnim = useRef(new Animated.Value(0)).current;
  const exportModalSlideAnim = useRef(new Animated.Value(0)).current;
  const commerceModalSlideAnim = useRef(new Animated.Value(0)).current;
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  console.log(user)

  // Charger les projets disponibles au montage si pas encore chargés
  useEffect(() => {
    const loadProjectsIfNeeded = async () => {
      if (availableProjects.length === 0) {
        try {
          const response = await projectsAPI.getAll();
          const projectsList = response.data;
          loadAvailableProjects(projectsList);

          // Si pas de projet sélectionné mais l'utilisateur a un projectId, le sélectionner
          if (!selectedProjectId && user?.projectId) {
            selectProject(user.projectId);
          }
        } catch (error) {
          console.error('Error loading projects:', error);
        }
      }
    };
    loadProjectsIfNeeded();
  }, []);

  useEffect(() => {
    loadDashboardData();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadDashboardData();
    }
  }, [selectedProjectId]);

  const loadDashboardData = async () => {
    const projectId = selectedProjectId || user?.projectId;

    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      const response = await dashboardAPI.getStats(projectId);
      setStats(response.data);

      // Charger les infos du projet pour obtenir la devise
      const project = availableProjects.find(p => p._id === projectId);
      if (project) {
        setCurrentProject(project);
        // Définir la devise du projet
        setProjectCurrency(project.currency || 'XOF');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const openStatsModal = () => {
    setStatsModalVisible(true);
    Animated.spring(modalSlideAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const closeStatsModal = () => {
    Animated.timing(modalSlideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setStatsModalVisible(false);
    });
  };

  const openExportModal = () => {
    setExportModalVisible(true);
    Animated.spring(exportModalSlideAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const closeExportModal = () => {
    Animated.timing(exportModalSlideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setExportModalVisible(false);
    });
  };

  const openCommerceModal = () => {
    setCommerceModalVisible(true);
    Animated.spring(commerceModalSlideAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const closeCommerceModal = () => {
    Animated.timing(commerceModalSlideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setCommerceModalVisible(false);
    });
  };

  const handleExportExcel = async () => {
    const projectId = selectedProjectId || user?.projectId;

    if (!projectId) {
      Alert.alert('Erreur', 'Aucun projet sélectionné');
      return;
    }

    try {
      setExportLoading(true);

      // Définir le chemin du fichier
      const fileName = `export_${projectId}_${Date.now()}.xlsx`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Faire une requête POST pour récupérer le fichier
      const token = await AsyncStorage.getItem('userToken');
      const baseURL = api.defaults.baseURL;
      const response = await fetch(
        `${baseURL}export-excel/${projectId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }),
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur réponse:', errorText);
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      // Récupérer les données brutes et les convertir en base64
      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      // Écrire le fichier localement
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Partager le fichier
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Exporter les données',
          UTI: 'com.microsoft.excel.xlsx'
        });
        Alert.alert('Succès', 'Export Excel créé avec succès !');
      } else {
        Alert.alert('Succès', `Fichier sauvegardé : ${fileUri}`);
      }

      closeExportModal();
    } catch (error) {
      console.error('Erreur export Excel:', error);
      Alert.alert('Erreur', 'Impossible de générer l\'export Excel. Vérifiez votre connexion et réessayez.');
    } finally {
      setExportLoading(false);
    }
  };

  const onChangeStartDate = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onChangeEndDate = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const StatCard = ({ title, value, icon, color, onPress, subtitle }) => (
    <Card style={styles.statCard} onPress={onPress}>
      <LinearGradient
        colors={[color + '20', color + '08']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statGradient}
      >
        <View style={styles.statHeader}>
          <View style={[styles.statIcon, { backgroundColor: color + '30' }]}>
            <Ionicons name={icon} size={32} color={color} />
          </View>
          <View style={styles.statBadge}>
            <Ionicons name="trending-up" size={14} color={colors.success} />
          </View>
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={styles.statValue}>{value}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </LinearGradient>
    </Card>
  );

  const QuickActionButton = ({ title, icon, color, onPress }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={[color + '15', color + '05']}
        style={styles.actionGradient}
      >
        <View style={[styles.actionIcon, { backgroundColor: color + '25' }]}>
          <Ionicons name={icon} size={26} color={color} />
        </View>
        <Text style={styles.actionText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.avatarContainer}>
                {user?.photo ? (
                  <Image source={{ uri: user.photo }} style={styles.avatarImage} />
                ) : (
                  <LinearGradient colors={[colors.primary, colors.accent]} style={styles.avatar}>
                    <Text style={styles.avatarText}>{(user?.fullName || user?.username)?.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.greeting}>Bonjour 👋</Text>
                <Text style={styles.userName}>{user?.fullName || user?.username}</Text>
                <View style={styles.roleContainer}>
                  <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                  <Text style={styles.userRole}>
                    {user?.role === 'admin' ? 'Administrateur' : user?.role === 'manager' ? 'Responsable' : 'Salarié'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.headerActions}>

              <TouchableOpacity onPress={() => navigation.navigate('Projects')} style={styles.projectButton}>
                <View style={styles.projectIconContainer}>
                  <Ionicons name="briefcase-outline" size={20} color={colors.background} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <View style={styles.logoutIconContainer}>
                  <Ionicons name="log-out-outline" size={22} color={colors.error} />
                </View>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {selectedProjectId && (
          <Card style={styles.projectInfoCard}>
            <View style={styles.projectInfoContent}>
              <Ionicons name="briefcase" size={20} color={colors.primary} />
              <Text style={styles.projectInfoText}>
                Projet: {availableProjects.find(p => p._id === selectedProjectId)?.name || currentProject?.name || 'Chargement...'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isAdmin && (
                <TouchableOpacity onPress={() => setCurrencyModalVisible(true)} style={styles.currencyButton}>
                  <Ionicons name="cash-outline" size={18} color={colors.primary} />
                  <Text style={styles.currencyButtonText}>{currency.symbol}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => navigation.navigate('Projects')}>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {stats && isAdmin && (
          <TouchableOpacity style={styles.statsButton} onPress={openStatsModal} activeOpacity={0.8}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statsButtonGradient}
            >
              <View style={styles.statsButtonContent}>
                <View style={styles.statsButtonLeft}>
                  <Ionicons name="stats-chart" size={28} color={colors.background} />
                  <View style={styles.statsButtonTextContainer}>
                    <Text style={styles.statsButtonTitle}>Statistiques détaillées</Text>
                    <Text style={styles.statsButtonSubtitle}>Voir toutes les analyses</Text>
                  </View>
                </View>
                <Ionicons name="chevron-up" size={24} color={colors.background} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Gestion</Text>
        <View style={styles.actionsGrid}>
          <QuickActionButton
            title="Ventes"
            icon="cart-outline"
            color={colors.success}
            onPress={() => navigation.navigate('Sales')}
          />
          {isAdmin && (
            <QuickActionButton
              title="Dépenses"
              icon="wallet-outline"
              color={colors.error}
              onPress={() => navigation.navigate('Expenses')}
            />
          )}
          {isAdmin && (
            <QuickActionButton
              title="Stock"
              icon="cube-outline"
              color={colors.info}
              onPress={() => navigation.navigate('Stock')}
            />
          )}
          {isAdmin && (
            <QuickActionButton
              title="Clients"
              icon="people-outline"
              color={colors.accent}
              onPress={() => navigation.navigate('Customers')}
            />
          )}
          {isAdmin && (
            <QuickActionButton
              title="Produits"
              icon="pricetag-outline"
              color={colors.warning}
              onPress={() => navigation.navigate('Products')}
            />
          )}
          {isAdmin && <QuickActionButton
            title="Équipe"
            icon="people"
            color={colors.info}
            onPress={() => navigation.navigate('Team')}
          />}
          {isAdmin && (
            <QuickActionButton
              title="Catégories"
              icon="grid-outline"
              color={colors.warning}
              onPress={() => navigation.navigate('Categories')}
            />
          )}
          <QuickActionButton
            title="Commerce"
            icon="business-outline"
            color={colors.primary}
            onPress={openCommerceModal}
          />
        </View>
      </ScrollView>

      <Modal
        visible={commerceModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeCommerceModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeCommerceModal}
          />
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    translateY: commerceModalSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHandle}>
              <View style={styles.modalHandleLine} />
            </View>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💼 Outils Commerce</Text>
              <TouchableOpacity onPress={closeCommerceModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.actionsGrid}>
                {isAdmin && <QuickActionButton
                  title="Simulation"
                  icon="calculator-outline"
                  color={colors.primary}
                  onPress={() => {
                    closeCommerceModal();
                    navigation.navigate('Simulation');
                  }}
                />}
                <QuickActionButton
                  title="Planning"
                  icon="calendar"
                  color={colors.primary}
                  onPress={() => {
                    closeCommerceModal();
                    navigation.navigate('Planning');
                  }}
                />
                <QuickActionButton
                  title="Commissions"
                  icon="cash"
                  color={colors.success}
                  onPress={() => {
                    closeCommerceModal();
                    navigation.navigate('Commissions');
                  }}
                />
                <QuickActionButton
                  title="Feedback"
                  icon="chatbubble-outline"
                  color={colors.primary}
                  onPress={() => {
                    closeCommerceModal();
                    navigation.navigate('Feedback');
                  }}
                />
                {isAdmin && <QuickActionButton
                  title="Export Excel"
                  icon="cloud-download-outline"
                  color={colors.accent}
                  onPress={() => {
                    closeCommerceModal();
                    setTimeout(openExportModal, 500);
                  }}
                />}
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={statsModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeStatsModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeStatsModal}
          />
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    translateY: modalSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHandle}>
              <View style={styles.modalHandleLine} />
            </View>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📊 Statistiques complètes</Text>
              <TouchableOpacity onPress={closeStatsModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {stats && (
                <>
                  <View style={styles.statsRow}>
                    <StatCard
                      title="Ventes totales"
                      value={formatPrice(stats.totalSales || 0)}
                      subtitle={`${stats.salesCount || 0} ventes`}
                      icon="cash"
                      color={colors.success}
                    />
                    <StatCard
                      title="Dépenses"
                      value={formatPrice(stats.totalExpenses || 0)}
                      subtitle={`${stats.expensesCount || 0} dépenses`}
                      icon="trending-down"
                      color={colors.error}
                    />
                  </View>

                  <View style={styles.statsRow}>
                    <StatCard
                      title="Bénéfice Net"
                      value={formatPrice(stats.netProfit || 0)}
                      subtitle={stats.netProfit >= 0 ? "Positif" : "Négatif"}
                      icon="analytics"
                      color={stats.netProfit >= 0 ? colors.success : colors.error}
                    />
                    <StatCard
                      title="Valeur Stock"
                      value={formatPrice(stats.totalStock || 0)}
                      subtitle={`${stats.stockItems || 0} articles`}
                      icon="cube"
                      color={colors.primary}
                    />
                  </View>

                  <Card style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                      <Text style={styles.summaryTitle}>Aperçu détaillé</Text>
                      <View style={styles.summaryIcon}>
                        <Ionicons name="bar-chart" size={24} color={colors.primary} />
                      </View>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryRowLeft}>
                        <View style={[styles.summaryDot, { backgroundColor: colors.success }]} />
                        <Text style={styles.summaryLabel}>Nombre de ventes</Text>
                      </View>
                      <Text style={styles.summaryValue}>{stats.salesCount || 0}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryRowLeft}>
                        <View style={[styles.summaryDot, { backgroundColor: colors.error }]} />
                        <Text style={styles.summaryLabel}>Nombre de dépenses</Text>
                      </View>
                      <Text style={styles.summaryValue}>{stats.expensesCount || 0}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryRowLeft}>
                        <View style={[styles.summaryDot, { backgroundColor: colors.primary }]} />
                        <Text style={styles.summaryLabel}>Articles en stock</Text>
                      </View>
                      <Text style={styles.summaryValue}>{stats.stockItems || 0}</Text>
                    </View>
                  </Card>

                  {stats.monthlyData && stats.monthlyData.length > 0 && (
                    <>
                      <Text style={styles.sectionTitleModal}>Évolution mensuelle</Text>
                      <Card style={styles.chartCard}>
                        <Text style={styles.chartTitle}>Ventes vs Dépenses (6 derniers mois)</Text>
                        <LineChart
                          data={{
                            labels: stats.monthlyData.map(d => d.month.split(' ')[0]),
                            datasets: [
                              {
                                data: stats.monthlyData.map(d => d.sales),
                                color: (opacity = 1) => colors.success,
                                strokeWidth: 3
                              },
                              {
                                data: stats.monthlyData.map(d => d.expenses),
                                color: (opacity = 1) => colors.error,
                                strokeWidth: 3
                              }
                            ],
                            legend: ['Ventes', 'Dépenses']
                          }}
                          width={screenWidth - 64}
                          height={220}
                          chartConfig={{
                            backgroundColor: colors.background,
                            backgroundGradientFrom: colors.background,
                            backgroundGradientTo: colors.background,
                            decimalPlaces: 0,
                            color: (opacity = 1) => colors.text + Math.round(opacity * 255).toString(16).padStart(2, '0'),
                            labelColor: (opacity = 1) => colors.textSecondary,
                            style: { borderRadius: 16 },
                            propsForDots: {
                              r: '6',
                              strokeWidth: '2',
                              stroke: colors.background
                            }
                          }}
                          bezier
                          style={styles.chart}
                        />
                      </Card>

                      <Card style={styles.chartCard}>
                        <Text style={styles.chartTitle}>Bénéfices mensuels</Text>
                        <BarChart
                          data={{
                            labels: stats.monthlyData.map(d => d.month.split(' ')[0]),
                            datasets: [{
                              data: stats.monthlyData.map(d => d.profit)
                            }]
                          }}
                          width={screenWidth - 64}
                          height={220}
                          chartConfig={{
                            backgroundColor: colors.background,
                            backgroundGradientFrom: colors.background,
                            backgroundGradientTo: colors.background,
                            decimalPlaces: 0,
                            color: (opacity = 1) => colors.primary + Math.round(opacity * 255).toString(16).padStart(2, '0'),
                            labelColor: (opacity = 1) => colors.textSecondary,
                            style: { borderRadius: 16 },
                            barPercentage: 0.7
                          }}
                          style={styles.chart}
                          showValuesOnTopOfBars
                        />
                      </Card>
                    </>
                  )}

                  {stats.expensesByCategory && (
                    <Card style={styles.chartCard}>
                      <Text style={styles.chartTitle}>Répartition des dépenses</Text>
                      <PieChart
                        data={[
                          {
                            name: 'Achats',
                            population: stats.expensesByCategory.purchase || 0,
                            color: colors.primary,
                            legendFontColor: colors.textSecondary,
                            legendFontSize: 13
                          },
                          {
                            name: 'Variables',
                            population: stats.expensesByCategory.variable || 0,
                            color: colors.accent,
                            legendFontColor: colors.textSecondary,
                            legendFontSize: 13
                          },
                          {
                            name: 'Fixes',
                            population: stats.expensesByCategory.fixed || 0,
                            color: colors.error,
                            legendFontColor: colors.textSecondary,
                            legendFontSize: 13
                          }
                        ].filter(item => item.population > 0)}
                        width={screenWidth - 64}
                        height={200}
                        chartConfig={{
                          color: (opacity = 1) => colors.text + Math.round(opacity * 255).toString(16).padStart(2, '0'),
                        }}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                      />
                    </Card>
                  )}

                  {stats.topProducts && stats.topProducts.length > 0 && (
                    <Card style={styles.summaryCard}>
                      <View style={styles.summaryHeader}>
                        <Text style={styles.summaryTitle}>Top 5 Produits</Text>
                        <View style={styles.summaryIcon}>
                          <Ionicons name="trophy" size={24} color={colors.accent} />
                        </View>
                      </View>
                      <View style={styles.summaryDivider} />
                      {stats.topProducts.map((product, index) => (
                        <View key={index} style={styles.summaryRow}>
                          <View style={styles.summaryRowLeft}>
                            <View style={[styles.rankBadge, { backgroundColor: index === 0 ? colors.accent : colors.primary }]}>
                              <Text style={styles.rankText}>{index + 1}</Text>
                            </View>
                            <View style={styles.productInfo}>
                              <Text style={styles.productName} numberOfLines={1}>{product.productName}</Text>
                              <Text style={styles.productQuantity}>{product.quantity} ventes</Text>
                            </View>
                          </View>
                          <Text style={styles.productRevenue} numberOfLines={1}>{formatPrice(product.revenue)}</Text>
                        </View>
                      ))}
                    </Card>
                  )}
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal Export Excel */}
      <Modal
        visible={exportModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeExportModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeExportModal}
          />
          <Animated.View
            style={[
              styles.exportModalContainer,
              {
                transform: [
                  {
                    translateY: exportModalSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHandle}>
              <View style={styles.modalHandleLine} />
            </View>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📊 Export Excel</Text>
              <TouchableOpacity onPress={closeExportModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.exportModalContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.exportDescription}>
                Sélectionnez la période pour exporter toutes les données : ventes, dépenses, stocks, salaires, employés, commissions, bilan et clients.
              </Text>

              <Card style={styles.dateCard}>
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>Date de début :</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={styles.dateText}>
                      {startDate.toLocaleDateString('fr-FR')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showStartDatePicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={onChangeStartDate}
                    maximumDate={endDate}
                  />
                )}
              </Card>

              <Card style={styles.dateCard}>
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>Date de fin :</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={styles.dateText}>
                      {endDate.toLocaleDateString('fr-FR')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showEndDatePicker && (
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    onChange={onChangeEndDate}
                    minimumDate={startDate}
                    maximumDate={new Date()}
                  />
                )}
              </Card>

              <Card style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="information-circle" size={24} color={colors.info} />
                  <Text style={styles.infoTitle}>Contenu de l'export</Text>
                </View>
                <Text style={styles.infoText}>Le fichier Excel contiendra les feuilles suivantes :</Text>
                <View style={styles.infoList}>
                  <View style={styles.infoItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.infoItemText}>Ventes</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.infoItemText}>Dépenses</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.infoItemText}>Stocks</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.infoItemText}>Employés</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.infoItemText}>Commissions</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.infoItemText}>Salaires</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.infoItemText}>Clients</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.infoItemText}>Bilan</Text>
                  </View>
                </View>
              </Card>

              <TouchableOpacity
                style={[styles.exportButton, exportLoading && styles.exportButtonDisabled]}
                onPress={handleExportExcel}
                disabled={exportLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={exportLoading ? [colors.textSecondary, colors.textLight] : [colors.success, colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.exportButtonGradient}
                >
                  {exportLoading ? (
                    <>
                      <ActivityIndicator color={colors.background} size="small" />
                      <Text style={styles.exportButtonText}>Génération en cours...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="cloud-download" size={24} color={colors.background} />
                      <Text style={styles.exportButtonText}>Générer l'export Excel</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal de sélection de devise */}
      <Modal
        visible={currencyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setCurrencyModalVisible(false)}
          />
          <View style={styles.currencyModalContainer}>
            <View style={styles.currencyModalHeader}>
              <Text style={styles.currencyModalTitle}>💱 Choisir la devise</Text>
              <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.currencyOptionsContainer}>
              {availableCurrencies.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[
                    styles.currencyOption,
                    currency.code === curr.code && styles.currencyOptionSelected
                  ]}
                  onPress={async () => {
                    try {
                      const projectId = selectedProjectId || user?.projectId;
                      if (!projectId) {
                        Alert.alert('Erreur', 'Aucun projet sélectionné');
                        return;
                      }

                      // Mettre à jour la devise du projet dans le backend
                      await projectsAPI.updateCurrency(projectId, curr.code);
                      
                      // Mettre à jour localement
                      setProjectCurrency(curr.code);
                      
                      // Mettre à jour le projet dans la liste
                      if (currentProject) {
                        setCurrentProject({ ...currentProject, currency: curr.code });
                      }

                      setCurrencyModalVisible(false);
                      Alert.alert(
                        'Devise changée',
                        `La devise du projet a été changée en ${curr.name} (${curr.symbol}). Toute l'équipe verra cette devise.`
                      );
                      
                      // Recharger les données du dashboard
                      loadDashboardData();
                    } catch (error) {
                      console.error('Error updating currency:', error);
                      Alert.alert('Erreur', 'Impossible de changer la devise');
                    }
                  }}
                >
                  <View style={styles.currencyOptionContent}>
                    <Text style={styles.currencySymbol}>{curr.symbol}</Text>
                    <View style={styles.currencyInfo}>
                      <Text style={styles.currencyName}>{curr.name}</Text>
                      <Text style={styles.currencyCode}>{curr.code}</Text>
                    </View>
                  </View>
                  {currency.code === curr.code && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.currencyModalFooter}>
              <Text style={styles.currencyModalNote}>
                ℹ️ La devise sera appliquée à ce projet. Toute l'équipe verra les montants dans cette devise.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 28,
    marginHorizontal: -16,
  },
  headerGradient: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.background,
  },
  headerInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: colors.background,
    fontWeight: '600',
    opacity: 0.9,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.background,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: colors.background + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  userRole: {
    fontSize: 11,
    color: colors.background,
    marginLeft: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  projectButton: {
    padding: 4,
  },
  projectIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    padding: 4,
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 16,
    backgroundColor: colors.primary + '10',
  },
  projectInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 0,
    minHeight: 140,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  statGradient: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  statHeader: {
    position: 'relative',
  },
  statIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.success + '30',
    borderRadius: 12,
    padding: 4,
  },
  statContent: {
    marginTop: 12,
  },
  statTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: -0.5,
  },
  statSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
    fontWeight: '500',
  },
  summaryCard: {
    marginBottom: 28,
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 0.3,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight + '50',
  },
  summaryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  commerceCard: {
    padding: 12,
    marginBottom: 24,
  },
  actionButton: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  actionGradient: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  chartCard: {
    marginBottom: 20,
    padding: 16,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.background,
  },
  productInfo: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  productQuantity: {
    fontSize: 12,
    color: colors.textLight,
  },
  productRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flexShrink: 0,
    minWidth: 80,
    textAlign: 'right',
  },
  statsButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    marginTop: 8,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statsButtonGradient: {
    padding: 20,
  },
  statsButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statsButtonTextContainer: {
    gap: 4,
  },
  statsButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.background,
    letterSpacing: 0.3,
  },
  statsButtonSubtitle: {
    fontSize: 13,
    color: colors.background,
    opacity: 0.9,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  modalHandleLine: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 16,
  },
  sectionTitleModal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    marginTop: 12,
    letterSpacing: 0.3,
  },
  exportModalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  exportModalContent: {
    padding: 16,
  },
  exportDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  dateCard: {
    marginBottom: 16,
    padding: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  infoCard: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.info + '10',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoItemText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  exportButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 4,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonGradient: {
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.background,
    letterSpacing: 0.3,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  currencyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  currencyModalContainer: {
    backgroundColor: colors.background,
    borderRadius: 20,
    margin: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  currencyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  currencyModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  currencyOptionsContainer: {
    gap: 12,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  currencyOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  currencyOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  currencyInfo: {
    gap: 4,
  },
  currencyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  currencyCode: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  currencyModalFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  currencyModalNote: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
