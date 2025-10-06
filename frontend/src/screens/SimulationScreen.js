import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { colors } from '../utils/colors';

export const SimulationScreen = () => {
  const [formData, setFormData] = useState({
    productName: '',
    purchaseCost: '',
    sellingPrice: '',
    monthlyVolume: '',
    variableCosts: '',
    fixedCosts: '',
  });

  const [results, setResults] = useState(null);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateSimulation = () => {
    const {
      productName,
      purchaseCost,
      sellingPrice,
      monthlyVolume,
      variableCosts,
      fixedCosts,
    } = formData;

    if (!purchaseCost || !sellingPrice || !monthlyVolume) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires');
      return;
    }

    const purchase = parseFloat(purchaseCost) || 0;
    const selling = parseFloat(sellingPrice) || 0;
    const volume = parseFloat(monthlyVolume) || 0;
    const variable = parseFloat(variableCosts) || 0;
    const fixed = parseFloat(fixedCosts) || 0;

    const unitMargin = selling - purchase - variable;
    const totalRevenue = selling * volume;
    const totalCosts = (purchase + variable) * volume + fixed;
    const netProfit = totalRevenue - totalCosts;
    const breakEvenPoint = fixed > 0 ? Math.ceil(fixed / unitMargin) : 0;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

    setResults({
      productName,
      unitMargin,
      totalRevenue,
      totalCosts,
      netProfit,
      breakEvenPoint,
      profitMargin,
    });
  };

  const reset = () => {
    setFormData({
      productName: '',
      purchaseCost: '',
      sellingPrice: '',
      monthlyVolume: '',
      variableCosts: '',
      fixedCosts: '',
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
          Calculez la rentabilité de votre projet
        </Text>
      </Card>

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>Informations produit</Text>

        <Input
          label="Nom du produit/service (optionnel)"
          value={formData.productName}
          onChangeText={(value) => updateField('productName', value)}
          placeholder="Ex: T-shirt personnalisé"
          icon="pricetag-outline"
        />

        <Input
          label="Coût d'achat unitaire *"
          value={formData.purchaseCost}
          onChangeText={(value) => updateField('purchaseCost', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="cash-outline"
        />

        <Input
          label="Prix de vente unitaire *"
          value={formData.sellingPrice}
          onChangeText={(value) => updateField('sellingPrice', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="trending-up-outline"
        />

        <Input
          label="Volume mensuel estimé *"
          value={formData.monthlyVolume}
          onChangeText={(value) => updateField('monthlyVolume', value)}
          placeholder="Nombre d'unités"
          keyboardType="numeric"
          icon="stats-chart-outline"
        />

        <Text style={styles.sectionTitle}>Charges</Text>

        <Input
          label="Coûts variables unitaires"
          value={formData.variableCosts}
          onChangeText={(value) => updateField('variableCosts', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="trending-down-outline"
        />

        <Input
          label="Charges fixes mensuelles"
          value={formData.fixedCosts}
          onChangeText={(value) => updateField('fixedCosts', value)}
          placeholder="0.00"
          keyboardType="numeric"
          icon="wallet-outline"
        />

        <View style={styles.buttonRow}>
          <Button
            title="Calculer"
            onPress={calculateSimulation}
            style={styles.calculateButton}
          />
          <Button
            title="Réinitialiser"
            onPress={reset}
            variant="outline"
            style={styles.resetButton}
          />
        </View>
      </Card>

      {results && (
        <Card style={styles.resultsCard}>
          <View style={styles.resultsHeader}>
            <Ionicons name="analytics-outline" size={28} color={colors.success} />
            <Text style={styles.resultsTitle}>Résultats de la simulation</Text>
          </View>

          {results.productName && (
            <Text style={styles.productName}>{results.productName}</Text>
          )}

          <View style={styles.divider} />

          <ResultRow
            label="Marge unitaire"
            value={`${results.unitMargin.toFixed(2)} €`}
            color={results.unitMargin >= 0 ? colors.success : colors.error}
          />

          <ResultRow
            label="Chiffre d'affaires mensuel"
            value={`${results.totalRevenue.toFixed(2)} €`}
          />

          <ResultRow
            label="Coûts totaux mensuels"
            value={`${results.totalCosts.toFixed(2)} €`}
          />

          <View style={styles.divider} />

          <ResultRow
            label="Bénéfice net mensuel"
            value={`${results.netProfit.toFixed(2)} €`}
            color={results.netProfit >= 0 ? colors.success : colors.error}
          />

          <ResultRow
            label="Marge bénéficiaire"
            value={`${results.profitMargin.toFixed(2)} %`}
            color={results.profitMargin >= 0 ? colors.success : colors.error}
          />

          <ResultRow
            label="Point mort (unités)"
            value={results.breakEvenPoint}
          />

          <View style={[styles.statusBadge, {
            backgroundColor: results.netProfit >= 0 ? colors.success + '20' : colors.error + '20'
          }]}>
            <Ionicons
              name={results.netProfit >= 0 ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={results.netProfit >= 0 ? colors.success : colors.error}
            />
            <Text style={[styles.statusText, {
              color: results.netProfit >= 0 ? colors.success : colors.error
            }]}>
              {results.netProfit >= 0 ? 'Projet rentable' : 'Projet non rentable'}
            </Text>
          </View>
        </Card>
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
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  calculateButton: {
    flex: 2,
  },
  resetButton: {
    flex: 1,
  },
  resultsCard: {
    marginBottom: 24,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 12,
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
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
