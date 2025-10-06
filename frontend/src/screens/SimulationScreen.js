import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { colors } from '../utils/colors';
import { simulationAPI } from '../services/api';

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
      setResults(response.data);
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

            {results.summary && (
              <>
                <ResultRow
                  label="Marge unitaire"
                  value={`${results.summary.unitMargin?.toFixed(2) || 0} €`}
                  color={results.summary.unitMargin >= 0 ? colors.success : colors.error}
                />

                <ResultRow
                  label="Pourcentage de marge"
                  value={`${results.summary.marginPercentage?.toFixed(2) || 0}%`}
                  color={results.summary.marginPercentage >= 0 ? colors.success : colors.error}
                />

                <ResultRow
                  label="Charges fixes totales"
                  value={`${results.summary.totalFixedCosts?.toFixed(2) || 0} €/mois`}
                />

                <ResultRow
                  label="Budget de lancement"
                  value={`${results.summary.initialInvestment?.toFixed(2) || 0} €`}
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
                value={`${results.breakEven.revenueNeeded?.toFixed(2) || 0} €`}
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
                value={`${results.monthlyForecasts.revenue?.toFixed(2) || 0} €`}
              />

              <ResultRow
                label="Coûts variables mensuels"
                value={`${results.monthlyForecasts.variableCosts?.toFixed(2) || 0} €`}
              />

              <ResultRow
                label="Charges fixes mensuelles"
                value={`${results.monthlyForecasts.fixedCosts?.toFixed(2) || 0} €`}
              />

              <View style={styles.divider} />

              <ResultRow
                label="Bénéfice net mensuel"
                value={`${results.monthlyForecasts.netProfit?.toFixed(2) || 0} €`}
                color={results.monthlyForecasts.netProfit >= 0 ? colors.success : colors.error}
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
                value={`${results.periodAnalysis.totalRevenue?.toFixed(2) || 0} €`}
              />

              <ResultRow
                label="Profit total"
                value={`${results.periodAnalysis.totalProfit?.toFixed(2) || 0} €`}
                color={results.periodAnalysis.totalProfit >= 0 ? colors.success : colors.error}
              />

              <ResultRow
                label="ROI"
                value={`${results.periodAnalysis.roi?.toFixed(2) || 0}%`}
                color={results.periodAnalysis.roi >= 0 ? colors.success : colors.error}
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
                    <Text style={styles.projectionLabel}>
                      Profit: <Text style={[styles.projectionValue, {
                        color: projection.profit >= 0 ? colors.success : colors.error
                      }]}>
                        {projection.profit?.toFixed(2) || 0} €
                      </Text>
                    </Text>
                    <Text style={styles.projectionLabel}>
                      Cumul: <Text style={[styles.projectionValue, {
                        color: projection.cumulativeProfit >= 0 ? colors.success : colors.error
                      }]}>
                        {projection.cumulativeProfit?.toFixed(2) || 0} €
                      </Text>
                    </Text>
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
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  projectionMonth: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  projectionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  projectionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  projectionValue: {
    fontWeight: '600',
  },
});
