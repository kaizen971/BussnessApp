import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { colors } from '../utils/colors';
import { simulationAPI } from '../services/api';

const STORAGE_KEY = '@simulation_last_business_plan';

export const SimulationScreen = () => {
  const [formData, setFormData] = useState({
    productName: '',
    unitPrice: '',
    costPrice: '',
    variableCosts: '',
    initialInvestment: '',
    monthlyRent: '',
    monthlySalaries: '',
    monthlyMarketing: '',
    monthlySupplies: '',
    monthlySubscriptions: '',
    monthlyUtilities: '',
    otherMonthlyCosts: '',
    estimatedMonthlySales: '',
    analysisPeriodMonths: '6',
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);

  // Charger les données sauvegardées au montage du composant
  useEffect(() => {
    checkForSavedData();
  }, []);

  // Vérifier s'il existe des données sauvegardées
  const checkForSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      setHasSavedData(!!savedData);
    } catch (error) {
      console.error('Erreur lors de la vérification des données sauvegardées:', error);
    }
  };

  // Sauvegarder les données du formulaire
  const saveFormData = async (data) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setHasSavedData(true);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  // Charger les données sauvegardées
  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);
        Alert.alert('Succès', 'Business plan précédent chargé avec succès');
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger le business plan précédent');
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateSimulation = async () => {
    const {
      unitPrice,
      costPrice,
      estimatedMonthlySales,
    } = formData;

    if (!unitPrice || !costPrice || !estimatedMonthlySales) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires (*)');
      return;
    }

    setLoading(true);
    try {
      // Préparer les données pour l'API
      const simulationData = {
        productName: formData.productName || 'Mon produit',
        unitPrice: parseFloat(formData.unitPrice) || 0,
        costPrice: parseFloat(formData.costPrice) || 0,
        variableCosts: parseFloat(formData.variableCosts) || 0,
        initialInvestment: parseFloat(formData.initialInvestment) || 0,
        monthlyRent: parseFloat(formData.monthlyRent) || 0,
        monthlySalaries: parseFloat(formData.monthlySalaries) || 0,
        monthlyMarketing: parseFloat(formData.monthlyMarketing) || 0,
        monthlySupplies: parseFloat(formData.monthlySupplies) || 0,
        monthlySubscriptions: parseFloat(formData.monthlySubscriptions) || 0,
        monthlyUtilities: parseFloat(formData.monthlyUtilities) || 0,
        otherMonthlyCosts: parseFloat(formData.otherMonthlyCosts) || 0,
        estimatedMonthlySales: parseFloat(formData.estimatedMonthlySales) || 0,
        analysisPeriodMonths: parseInt(formData.analysisPeriodMonths) || 6,
      };

      const response = await simulationAPI.calculate(simulationData);
      console.log(response.data);
      setResults(response.data);
      
      // Sauvegarder les données du formulaire après un calcul réussi
      await saveFormData(formData);
      
      Alert.alert('Succès', 'Simulation calculée avec succès');
    } catch (error) {
      console.error('Error calculating simulation:', error);
      Alert.alert('Erreur', 'Impossible de calculer la simulation');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFormData({
      productName: '',
      unitPrice: '',
      costPrice: '',
      variableCosts: '',
      initialInvestment: '',
      monthlyRent: '',
      monthlySalaries: '',
      monthlyMarketing: '',
      monthlySupplies: '',
      monthlySubscriptions: '',
      monthlyUtilities: '',
      otherMonthlyCosts: '',
      estimatedMonthlySales: '',
      analysisPeriodMonths: '6',
    });
    setResults(null);
  };

  // Fonction utilitaire pour formater les nombres de manière sûre
  const formatNumber = (value, decimals = 2) => {
    const num = Number(value);
    return isNaN(num) ? '0.00' : num.toFixed(decimals);
  };

  const ResultRow = ({ label, value, color }) => (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultValue, color && { color }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Card style={styles.headerCard}>
        <View style={styles.headerIcon}>
          <Ionicons name="calculator-outline" size={32} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Simulation Business Plan</Text>
        <Text style={styles.headerSubtitle}>
          Validez la rentabilité de votre projet
        </Text>
      </Card>

      {hasSavedData && (
        <Card style={styles.savedDataCard}>
          <View style={styles.savedDataContent}>
            <View style={styles.savedDataInfo}>
              <Ionicons name="save-outline" size={24} color={colors.info} />
              <Text style={styles.savedDataText}>
                Un business plan précédent est disponible
              </Text>
            </View>
            <Button
              title="Charger"
              onPress={loadSavedData}
              variant="outline"
              style={styles.loadButton}
            />
          </View>
        </Card>
      )}

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>📦 Informations produit</Text>

        <Input
          label="Nom du produit/service"
          value={formData.productName}
          onChangeText={(value) => updateField('productName', value)}
          placeholder="Ex: T-shirt personnalisé"
          icon="pricetag-outline"
        />

        <Input
          label="Prix de vente unitaire *"
          value={formData.unitPrice}
          onChangeText={(value) => updateField('unitPrice', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="trending-up-outline"
        />

        <Input
          label="Coût de fabrication/achat unitaire *"
          value={formData.costPrice}
          onChangeText={(value) => updateField('costPrice', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="cash-outline"
        />

        <Input
          label="Coûts variables unitaires (livraison, emballage...)"
          value={formData.variableCosts}
          onChangeText={(value) => updateField('variableCosts', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="trending-down-outline"
        />

        <Text style={styles.sectionTitle}>💰 Investissement initial</Text>

        <Input
          label="Budget de lancement (caution, matériel, frais admin...)"
          value={formData.initialInvestment}
          onChangeText={(value) => updateField('initialInvestment', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="wallet-outline"
        />

        <Text style={styles.sectionTitle}>🔄 Charges mensuelles récurrentes</Text>

        <Input
          label="Loyer"
          value={formData.monthlyRent}
          onChangeText={(value) => updateField('monthlyRent', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="home-outline"
        />

        <Input
          label="Salaires / Commissions"
          value={formData.monthlySalaries}
          onChangeText={(value) => updateField('monthlySalaries', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="people-outline"
        />

        <Input
          label="Publicité / Marketing"
          value={formData.monthlyMarketing}
          onChangeText={(value) => updateField('monthlyMarketing', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="megaphone-outline"
        />

        <Input
          label="Fournitures / Réassort"
          value={formData.monthlySupplies}
          onChangeText={(value) => updateField('monthlySupplies', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="cart-outline"
        />

        <Input
          label="Abonnements (internet, logiciels...)"
          value={formData.monthlySubscriptions}
          onChangeText={(value) => updateField('monthlySubscriptions', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="cloud-outline"
        />

        <Input
          label="Entretien / Énergie"
          value={formData.monthlyUtilities}
          onChangeText={(value) => updateField('monthlyUtilities', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="flash-outline"
        />

        <Input
          label="Autres charges fixes"
          value={formData.otherMonthlyCosts}
          onChangeText={(value) => updateField('otherMonthlyCosts', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="ellipsis-horizontal-outline"
        />

        <Text style={styles.sectionTitle}>📊 Prévisions de vente</Text>

        <Input
          label="Quantité prévue à vendre par mois *"
          value={formData.estimatedMonthlySales}
          onChangeText={(value) => updateField('estimatedMonthlySales', value)}
          placeholder="Nombre d'unités"
          keyboardType="numeric"
          icon="stats-chart-outline"
        />

        <Input
          label="Durée d'analyse (en mois)"
          value={formData.analysisPeriodMonths}
          onChangeText={(value) => updateField('analysisPeriodMonths', value)}
          placeholder="6"
          keyboardType="numeric"
          icon="calendar-outline"
        />

        <View style={styles.buttonRow}>
          <Button
            title={loading ? "Calcul..." : "Calculer"}
            onPress={calculateSimulation}
            style={styles.calculateButton}
            disabled={loading}
          />
          <Button
            title="Réinitialiser"
            onPress={reset}
            variant="outline"
            style={styles.resetButton}
            disabled={loading}
          />
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Calcul en cours...</Text>
          </View>
        )}
      </Card>

      {results && (
        <>
          <Card style={styles.resultsCard}>
            <View style={styles.resultsHeader}>
              <Ionicons name="analytics-outline" size={28} color={colors.success} />
              <Text style={styles.resultsTitle}>Résumé</Text>
            </View>
            
            {results?.summary && (
              <>
                <ResultRow
                  label="Marge unitaire"
                  value={`${formatNumber(results.summary.unitMargin)} €`}
                  color={Number(results.summary.unitMargin || 0) >= 0 ? colors.success : colors.error}
                />

                <ResultRow
                  label="Pourcentage de marge"
                  value={`${formatNumber(results.summary.marginPercentage)}%`}
                  color={Number(results.summary.marginPercentage || 0) >= 0 ? colors.success : colors.error}
                />

                <ResultRow
                  label="Charges fixes totales"
                  value={`${formatNumber(results.summary.totalFixedCosts)} €/mois`}
                />

                <ResultRow
                  label="Budget de lancement"
                  value={`${formatNumber(results.summary.initialInvestment)} €`}
                />
              </>
            )}
          </Card>

          {results.breakEven && (
            <Card style={styles.resultsCard}>
              <View style={styles.resultsHeader}>
                <Ionicons name="trending-up-outline" size={28} color={colors.warning} />
                <Text style={styles.resultsTitle}>Point mort</Text>
              </View>

              <ResultRow
                label="Ventes nécessaires"
                value={`${results.breakEven.unitsNeeded || 0} unités/mois`}
              />

              <ResultRow
                label="CA minimum mensuel"
                value={`${formatNumber(results.breakEven.revenueNeeded)} €`}
              />

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color={colors.info} />
                <Text style={styles.infoText}>
                  Vous devez vendre au moins {results.breakEven.unitsNeeded || 0} unités
                  par mois pour couvrir vos charges fixes.
                </Text>
              </View>
            </Card>
          )}

          {results.monthlyForecasts && (
            <Card style={styles.resultsCard}>
              <View style={styles.resultsHeader}>
                <Ionicons name="calendar-outline" size={28} color={colors.primary} />
                <Text style={styles.resultsTitle}>Prévisions mensuelles</Text>
              </View>

              <ResultRow
                label="Revenus mensuels"
                value={`${formatNumber(results.monthlyForecasts.revenue)} €`}
              />

              <ResultRow
                label="Coûts variables mensuels"
                value={`${formatNumber(results.monthlyForecasts.variableCosts)} €`}
              />

              <ResultRow
                label="Charges fixes mensuelles"
                value={`${formatNumber(results.monthlyForecasts.fixedCosts)} €`}
              />

              <View style={styles.divider} />

              <ResultRow
                label="Bénéfice net mensuel"
                value={`${formatNumber(results.monthlyForecasts.netProfit)} €`}
                color={Number(results.monthlyForecasts.netProfit || 0) >= 0 ? colors.success : colors.error}
              />
            </Card>
          )}

          {results.periodAnalysis && (
            <Card style={styles.resultsCard}>
              <View style={styles.resultsHeader}>
                <Ionicons name="bar-chart-outline" size={28} color={colors.success} />
                <Text style={styles.resultsTitle}>Analyse sur {formData.analysisPeriodMonths} mois</Text>
              </View>

              <ResultRow
                label="CA total"
                value={`${formatNumber(results.periodAnalysis.totalRevenue)} €`}
              />

              <ResultRow
                label="Profit total"
                value={`${formatNumber(results.periodAnalysis.totalProfit)} €`}
                color={Number(results.periodAnalysis.totalProfit || 0) >= 0 ? colors.success : colors.error}
              />

              <ResultRow
                label="ROI"
                value={`${formatNumber(results.periodAnalysis.roi)}%`}
                color={Number(results.periodAnalysis.roi || 0) >= 0 ? colors.success : colors.error}
              />

              {results.periodAnalysis.monthsToRecoverInvestment !== null && (
                <ResultRow
                  label="Récupération investissement"
                  value={`${results.periodAnalysis.monthsToRecoverInvestment} mois`}
                />
              )}

              <View style={[styles.statusBadge, {
                backgroundColor: results.periodAnalysis.isViable ? colors.success + '20' : colors.error + '20'
              }]}>
                <Ionicons
                  name={results.periodAnalysis.isViable ? 'checkmark-circle' : 'alert-circle'}
                  size={24}
                  color={results.periodAnalysis.isViable ? colors.success : colors.error}
                />
                <Text style={[styles.statusText, {
                  color: results.periodAnalysis.isViable ? colors.success : colors.error
                }]}>
                  {results.periodAnalysis.isViable ? '✓ Projet viable' : '✗ Projet non viable'}
                </Text>
              </View>
            </Card>
          )}

          {results.projections && results.projections.length > 0 && (
            <Card style={styles.resultsCard}>
              <View style={styles.resultsHeader}>
                <Ionicons name="stats-chart-outline" size={28} color={colors.info} />
                <Text style={styles.resultsTitle}>Évolution mois par mois</Text>
              </View>

              {(results.projections && Array.isArray(results.projections)) && results.projections.map((projection, index) => (
                <View key={index} style={styles.projectionItem}>
                  <Text style={styles.projectionMonth}>Mois {projection.month}</Text>
                  <View style={styles.projectionDetails}>
                    <View style={styles.projectionRow}>
                      <Text style={styles.projectionLabel}>Revenus</Text>
                      <Text style={[styles.projectionValue, { color: colors.primary }]}>
                        {formatNumber(projection.revenue)} €
                      </Text>
                    </View>
                    
                    <View style={styles.projectionRow}>
                      <Text style={styles.projectionLabel}>Dépenses</Text>
                      <Text style={[styles.projectionValue, { color: colors.error }]}>
                        {formatNumber(projection.expenses)} €
                      </Text>
                    </View>
                    
                    <View style={[styles.projectionRow, { 
                      borderTopWidth: 1, 
                      borderTopColor: colors.border,
                      paddingTop: 8,
                      marginTop: 4,
                    }]}>
                      <Text style={[styles.projectionLabel, { fontWeight: '600' }]}>Profit net</Text>
                      <Text style={[styles.projectionValue, {
                        color: Number(projection.netProfit || 0) >= 0 ? colors.success : colors.error
                      }]}>
                        {formatNumber(projection.netProfit)} €
                      </Text>
                    </View>
                    
                    <View style={[styles.projectionRow, {
                      backgroundColor: colors.primary + '10',
                      padding: 8,
                      borderRadius: 6,
                      marginTop: 4,
                    }]}>
                      <Text style={[styles.projectionLabel, { fontWeight: 'bold' }]}>Cumul</Text>
                      <Text style={[styles.projectionValue, {
                        color: Number(projection.cumulativeProfit || 0) >= 0 ? colors.success : colors.error,
                        fontSize: 16,
                      }]}>
                        {formatNumber(projection.cumulativeProfit)} €
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  savedDataCard: {
    marginBottom: 16,
    backgroundColor: colors.info + '10',
    borderColor: colors.info,
    borderWidth: 1,
  },
  savedDataContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedDataInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  savedDataText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  loadButton: {
    minWidth: 100,
  },
  formCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    marginTop: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  calculateButton: {
    flex: 2,
  },
  resetButton: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 14,
  },
  resultsCard: {
    marginBottom: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginLeft: 8,
    lineHeight: 18,
  },
  projectionItem: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  projectionMonth: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  projectionDetails: {
    flexDirection: 'column',
    gap: 8,
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  projectionLabel: {
    fontSize: 14,
    color: colors.text,
  },
  projectionValue: {
    fontWeight: '700',
    fontSize: 15,
  },
});
