import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import colors from '../utils/colors';
import Card from '../components/Card';

const ImportScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importResults, setImportResults] = useState(null);

  const projectId = user?.projectId;

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
        ],
        copyToCacheDirectory: true
      });

      if (result.type === 'success' || !result.canceled) {
        const file = result.assets ? result.assets[0] : result;
        setSelectedFile(file);
        setImportResults(null);
      }
    } catch (error) {
      console.error('Erreur lors de la sélection du fichier:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      Alert.alert('Attention', 'Veuillez sélectionner un fichier Excel');
      return;
    }

    if (!projectId) {
      Alert.alert('Erreur', 'Aucun projet sélectionné');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      
      // Préparer le fichier pour l'upload
      const file = {
        uri: Platform.OS === 'ios' ? selectedFile.uri.replace('file://', '') : selectedFile.uri,
        type: selectedFile.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        name: selectedFile.name
      };

      formData.append('file', file);
      formData.append('projectId', projectId);

      const response = await api.post('/import-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setImportResults(response.data.results);
        Alert.alert(
          'Succès',
          'Import terminé avec succès !',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Erreur lors de l\'import du fichier'
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    Alert.alert(
      'Modèle Excel',
      'Pour créer votre fichier Excel, utilisez les noms de feuilles suivants:\n\n' +
      '1. Clients - Colonnes: nom, email, telephone, totalAchats, pointsFidelite, niveauFidelite, remise, notes\n\n' +
      '2. Produits - Colonnes: nom, description, prixVente, prixRevient, categorie, actif\n\n' +
      '3. Stocks - Colonnes: nom, quantite, prixUnitaire, quantiteMin, sku, emplacement\n\n' +
      '4. Employes - Colonnes: username, email, nomComplet, role, tauxCommission, tauxHoraire, actif, motDePasse\n\n' +
      '5. Ventes - Colonnes: nomProduit, nomClient, employe, quantite, prixUnitaire, montant, remise, description, date\n\n' +
      '6. Depenses - Colonnes: montant, categorie, description, date\n\n' +
      '7. Plannings - Colonnes: employe, date, heureDebut, heureFin, statut, notes\n\n' +
      '8. Commissions - Colonnes: employe, montant, taux, montantVente, statut, date',
      [{ text: 'OK' }]
    );
  };

  const renderImportResult = (category, data) => {
    if (!data) return null;

    return (
      <View style={styles.resultItem}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>{category}</Text>
          <View style={styles.resultBadge}>
            <Text style={styles.resultCount}>{data.count}</Text>
          </View>
        </View>
        {data.errors && data.errors.length > 0 && (
          <View style={styles.errorsContainer}>
            <Text style={styles.errorTitle}>⚠️ Erreurs ({data.errors.length}):</Text>
            {data.errors.slice(0, 3).map((error, index) => (
              <Text key={index} style={styles.errorText}>• {error}</Text>
            ))}
            {data.errors.length > 3 && (
              <Text style={styles.errorMore}>... et {data.errors.length - 3} autres</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import Excel</Text>
        <TouchableOpacity
          onPress={downloadTemplate}
          style={styles.helpButton}
        >
          <Ionicons name="help-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Instructions */}
        <Card style={styles.instructionsCard}>
          <View style={styles.instructionHeader}>
            <Ionicons name="information-circle" size={32} color={colors.primary} />
            <Text style={styles.instructionTitle}>Comment importer vos données</Text>
          </View>
          <Text style={styles.instructionText}>
            1. Préparez un fichier Excel (.xlsx) avec les feuilles suivantes:{'\n'}
            • Clients{'\n'}
            • Produits{'\n'}
            • Stocks{'\n'}
            • Employes{'\n'}
            • Ventes{'\n'}
            • Depenses{'\n'}
            • Plannings{'\n'}
            • Commissions
          </Text>
          <Text style={styles.instructionText}>
            2. Sélectionnez votre fichier ci-dessous
          </Text>
          <Text style={styles.instructionText}>
            3. Lancez l'import
          </Text>
          <TouchableOpacity
            style={styles.templateButton}
            onPress={downloadTemplate}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={styles.templateButtonText}>Voir le format des colonnes</Text>
          </TouchableOpacity>
        </Card>

        {/* File Selection */}
        <Card style={styles.selectionCard}>
          <Text style={styles.sectionTitle}>Fichier Excel</Text>
          
          {selectedFile ? (
            <View style={styles.fileSelected}>
              <View style={styles.fileInfo}>
                <Ionicons name="document" size={40} color={colors.success} />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedFile(null)}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={24} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.pickButton}
              onPress={pickDocument}
            >
              <Ionicons name="cloud-upload-outline" size={48} color={colors.primary} />
              <Text style={styles.pickButtonText}>Sélectionner un fichier Excel</Text>
              <Text style={styles.pickButtonSubtext}>(.xlsx ou .xls)</Text>
            </TouchableOpacity>
          )}

          {/* Import Button */}
          {selectedFile && (
            <TouchableOpacity
              style={[styles.importButton, loading && styles.importButtonDisabled]}
              onPress={handleImport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-done-outline" size={24} color="#fff" />
                  <Text style={styles.importButtonText}>Importer les données</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Card>

        {/* Import Results */}
        {importResults && (
          <Card style={styles.resultsCard}>
            <View style={styles.resultsHeader}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <Text style={styles.resultsTitle}>Résultats de l'import</Text>
            </View>

            {renderImportResult('Clients', importResults.clients)}
            {renderImportResult('Produits', importResults.produits)}
            {renderImportResult('Stocks', importResults.stocks)}
            {renderImportResult('Employés', importResults.employes)}
            {renderImportResult('Ventes', importResults.ventes)}
            {renderImportResult('Dépenses', importResults.depenses)}
            {renderImportResult('Plannings', importResults.plannings)}
            {renderImportResult('Commissions', importResults.commissions)}

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                setImportResults(null);
                setSelectedFile(null);
                navigation.goBack();
              }}
            >
              <Text style={styles.doneButtonText}>Terminé</Text>
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>
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
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  helpButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  instructionsCard: {
    marginBottom: 15,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 10,
    flex: 1,
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  templateButtonText: {
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  selectionCard: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  pickButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight + '20',
  },
  pickButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 10,
  },
  pickButtonSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
  },
  fileSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.success + '10',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  removeButton: {
    padding: 5,
  },
  importButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
  },
  importButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resultsCard: {
    marginBottom: 15,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 10,
  },
  resultItem: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  resultBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultCount: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorsContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.danger + '10',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: 3,
  },
  errorMore: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 3,
  },
  doneButton: {
    backgroundColor: colors.success,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ImportScreen;

