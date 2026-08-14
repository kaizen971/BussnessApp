import React, { useMemo, useState } from 'react'
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { useAuth } from '../contexts/AuthContext'
import { useTheme, useThemedStyles } from '../contexts/ThemeContext'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { csvImportAPI } from '../services/api'
import { radius, spacing, typography } from '../utils/designSystem'
import {
  buildCsvTemplate,
  CSV_IMPORT_TYPES,
  inspectCsv,
} from '../utils/csvImport'

const IMPORT_TYPE_KEYS = Object.keys(CSV_IMPORT_TYPES)

function formatFileSize(size = 0) {
  if (size < 1024) return `${size} o`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`
}

export const CsvImportScreen = () => {
  const { colors } = useTheme()
  const styles = useThemedStyles(createStyles)
  const { user, selectedProjectId } = useAuth()
  const [selectedType, setSelectedType] = useState('products')
  const [file, setFile] = useState(null)
  const [csvContent, setCsvContent] = useState('')
  const [inspection, setInspection] = useState(null)
  const [updateStock, setUpdateStock] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const config = CSV_IMPORT_TYPES[selectedType]
  const projectId = selectedProjectId || user?.projectId
  const requiredCount = useMemo(
    () => config.columns.filter((column) => column.required).length,
    [config]
  )

  const resetFile = () => {
    setFile(null)
    setCsvContent('')
    setInspection(null)
    setResult(null)
  }

  const selectType = (type) => {
    if (type === selectedType) return
    setSelectedType(type)
    setUpdateStock(false)
    resetFile()
  }

  const downloadTemplate = async () => {
    try {
      const content = buildCsvTemplate(selectedType)
      const fileUri = `${FileSystem.cacheDirectory}modele-${selectedType}.csv`
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      })

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Enregistrer le modèle ${config.label}`,
          UTI: 'public.comma-separated-values-text',
        })
      } else {
        Alert.alert('Modèle créé', `Le fichier est disponible ici : ${fileUri}`)
      }
    } catch (error) {
      console.error('CSV template error:', error)
      Alert.alert('Erreur', 'Impossible de créer le modèle CSV.')
    }
  }

  const pickFile = async () => {
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      })
      if (pickerResult.canceled) return

      const asset = pickerResult.assets[0]
      if (!asset.name?.toLowerCase().endsWith('.csv')) {
        Alert.alert('Format non reconnu', 'Sélectionnez un fichier dont l’extension est .csv.')
        return
      }
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        Alert.alert('Fichier trop volumineux', 'Le fichier CSV doit peser moins de 5 Mo.')
        return
      }

      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      })
      const nextInspection = inspectCsv(content, selectedType)
      setFile(asset)
      setCsvContent(content)
      setInspection(nextInspection)
      setResult(null)
    } catch (error) {
      console.error('CSV picker error:', error)
      Alert.alert('Erreur', 'Impossible de lire ce fichier CSV.')
    }
  }

  const runImport = async () => {
    if (!projectId) {
      Alert.alert('Business requis', 'Sélectionnez un business avant de lancer l’import.')
      return
    }
    if (!inspection?.valid || !csvContent) return

    setSubmitting(true)
    try {
      const response = await csvImportAPI.importData(projectId, selectedType, csvContent, {
        updateStock: selectedType === 'sales' && updateStock,
      })
      setResult(response.data?.data || null)
    } catch (error) {
      console.error('CSV import error:', error)
      Alert.alert(
        'Import impossible',
        error.response?.data?.error || 'Le fichier n’a pas pu être importé. Vérifiez sa structure et réessayez.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const confirmImport = () => {
    Alert.alert(
      `Importer ${inspection?.rowCount || 0} ligne(s)`,
      `Les données valides seront ajoutées à ${config.label.toLowerCase()}. Les lignes incorrectes seront signalées dans le bilan.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Importer', onPress: runImport },
      ]
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <Ionicons name="document-text-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.introContent}>
          <Text style={styles.introTitle}>Importer des données</Text>
          <Text style={styles.introText}>Préparez votre CSV à partir d’un modèle, puis contrôlez-le avant l’ajout.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.stepLabel}>Étape 1</Text>
        <Text style={styles.sectionTitle}>Données à ajouter</Text>
        <View style={styles.typeGrid}>
          {IMPORT_TYPE_KEYS.map((type) => {
            const item = CSV_IMPORT_TYPES[type]
            const selected = type === selectedType
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeButton, selected && styles.typeButtonSelected]}
                onPress={() => selectType(type)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Ionicons name={item.icon} size={20} color={selected ? colors.onPrimary : colors.primary} />
                <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>{item.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
        <Text style={styles.typeDescription}>{config.description}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.stepLabel}>Étape 2</Text>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Préparer le fichier</Text>
            <Text style={styles.sectionSubtitle}>{requiredCount} colonne(s) obligatoire(s)</Text>
          </View>
          <TouchableOpacity style={styles.templateButton} onPress={downloadTemplate} accessibilityRole="button">
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <Text style={styles.templateButtonText}>Modèle</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.columnsList}>
          {config.columns.map((column, index) => (
            <View key={column.key} style={[styles.columnRow, index < config.columns.length - 1 && styles.rowBorder]}>
              <View style={styles.columnContent}>
                <Text style={styles.columnName}>{column.label}</Text>
                <Text style={styles.columnDetail}>{column.detail}</Text>
              </View>
              <View style={[styles.requirementBadge, column.required ? styles.requiredBadge : styles.optionalBadge]}>
                <Text style={[styles.requirementText, column.required ? styles.requiredText : styles.optionalText]}>
                  {column.required ? 'Obligatoire' : 'Facultatif'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.rulesBox}>
          <View style={styles.ruleRow}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.ruleText}>Le modèle contient deux exemples : remplacez-les ou supprimez-les avant l’import.</Text>
          </View>
          <View style={styles.ruleRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
            <Text style={styles.ruleText}>Séparateur accepté : point-virgule ou virgule.</Text>
          </View>
          <View style={styles.ruleRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
            <Text style={styles.ruleText}>Nombres acceptés : 25,50 ou 25.50.</Text>
          </View>
          <View style={styles.ruleRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
            <Text style={styles.ruleText}>Maximum : 2 000 lignes par fichier.</Text>
          </View>
          {config.notes.map((note) => (
            <View key={note} style={styles.ruleRow}>
              <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
              <Text style={styles.ruleText}>{note}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.stepLabel}>Étape 3</Text>
        <Text style={styles.sectionTitle}>Choisir et contrôler le CSV</Text>

        <TouchableOpacity style={styles.filePicker} onPress={pickFile} activeOpacity={0.75} accessibilityRole="button">
          <View style={styles.filePickerIcon}>
            <Ionicons name={file ? 'document-text' : 'cloud-upload-outline'} size={24} color={colors.primary} />
          </View>
          <View style={styles.filePickerContent}>
            <Text style={styles.filePickerTitle} numberOfLines={1}>{file?.name || 'Sélectionner un fichier CSV'}</Text>
            <Text style={styles.filePickerText}>
              {file ? `${formatFileSize(file.size)} · Touchez pour remplacer` : 'Depuis votre téléphone ou votre espace cloud'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        {inspection && (
          <Card style={styles.validationCard}>
            <View style={styles.validationHeader}>
              <View style={[styles.validationIcon, {
                backgroundColor: inspection.valid ? colors.success + '18' : colors.error + '18',
              }]}>
                <Ionicons
                  name={inspection.valid ? 'checkmark' : 'close'}
                  size={20}
                  color={inspection.valid ? colors.success : colors.error}
                />
              </View>
              <View style={styles.validationContent}>
                <Text style={styles.validationTitle}>
                  {inspection.valid ? 'Structure reconnue' : 'Fichier à corriger'}
                </Text>
                <Text style={styles.validationSubtitle}>{inspection.rowCount} ligne(s) détectée(s)</Text>
              </View>
            </View>

            {inspection.errors.map((message) => (
              <View key={message} style={styles.messageRow}>
                <Ionicons name="alert-circle-outline" size={17} color={colors.error} />
                <Text style={[styles.messageText, { color: colors.error }]}>{message}</Text>
              </View>
            ))}
            {inspection.warnings.map((message) => (
              <View key={message} style={styles.messageRow}>
                <Ionicons name="warning-outline" size={17} color={colors.warning} />
                <Text style={styles.messageText}>{message}</Text>
              </View>
            ))}

            {inspection.previewRows.length > 0 && (
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>Aperçu des premières lignes</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.previewTable}>
                    <View style={styles.previewHeaderRow}>
                      {inspection.headers.map((header, index) => (
                        <Text key={`${header}-${index}`} style={styles.previewHeaderCell} numberOfLines={1}>{header || '—'}</Text>
                      ))}
                    </View>
                    {inspection.previewRows.map((row, rowIndex) => (
                      <View key={rowIndex} style={styles.previewRow}>
                        {inspection.headers.map((_, cellIndex) => (
                          <Text key={cellIndex} style={styles.previewCell} numberOfLines={1}>{row[cellIndex] || '—'}</Text>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </Card>
        )}

        {selectedType === 'sales' && inspection?.valid && (
          <View style={styles.optionRow}>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Déduire les quantités du stock</Text>
              <Text style={styles.optionDescription}>Activez seulement pour des ventes qui ne sont pas encore comptabilisées dans le stock.</Text>
            </View>
            <Switch
              value={updateStock}
              onValueChange={setUpdateStock}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={updateStock ? colors.primary : colors.textLight}
            />
          </View>
        )}

        {inspection?.valid && !result && (
          <Button
            title={`Importer ${inspection.rowCount} ligne(s)`}
            icon="download-outline"
            onPress={confirmImport}
            loading={submitting}
            disabled={submitting}
            style={styles.importButton}
          />
        )}

        {submitting && (
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.progressText}>Import en cours, gardez l’application ouverte…</Text>
          </View>
        )}
      </View>

      {result && (
        <Card style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultIcon}>
              <Ionicons name="checkmark-done" size={22} color={colors.success} />
            </View>
            <View style={styles.resultHeaderText}>
              <Text style={styles.resultTitle}>Import terminé</Text>
              <Text style={styles.resultSubtitle}>{result.total} ligne(s) traitée(s)</Text>
            </View>
          </View>

          <View style={styles.resultMetrics}>
            <View style={styles.resultMetric}>
              <Text style={[styles.resultMetricValue, { color: colors.success }]}>{result.inserted || 0}</Text>
              <Text style={styles.resultMetricLabel}>Ajoutées</Text>
            </View>
            <View style={styles.resultDivider} />
            <View style={styles.resultMetric}>
              <Text style={[styles.resultMetricValue, { color: colors.primary }]}>{result.updated || 0}</Text>
              <Text style={styles.resultMetricLabel}>Mises à jour</Text>
            </View>
            <View style={styles.resultDivider} />
            <View style={styles.resultMetric}>
              <Text style={[styles.resultMetricValue, { color: (result.errors?.length || 0) ? colors.error : colors.textLight }]}>
                {result.errors?.length || 0}
              </Text>
              <Text style={styles.resultMetricLabel}>Ignorées</Text>
            </View>
          </View>

          {result.errors?.length > 0 && (
            <View style={styles.errorList}>
              <Text style={styles.errorListTitle}>Lignes à corriger</Text>
              {result.errors.slice(0, 20).map((error, index) => (
                <View key={`${error.line}-${index}`} style={styles.importErrorRow}>
                  <Text style={styles.errorLine}>Ligne {error.line}</Text>
                  <Text style={styles.errorMessage}>{error.message}</Text>
                </View>
              ))}
              {result.errors.length > 20 && (
                <Text style={styles.moreErrors}>+ {result.errors.length - 20} autre(s) erreur(s)</Text>
              )}
            </View>
          )}

          <Button title="Importer un autre fichier" variant="outline" icon="refresh-outline" onPress={resetFile} />
        </Card>
      )}
    </ScrollView>
  )
}

const createStyles = (colors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 48 },
  intro: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  introIcon: {
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.md, backgroundColor: colors.primary + '16',
  },
  introContent: { minWidth: 0, flex: 1, marginLeft: spacing.sm },
  introTitle: { ...typography.screenTitle, color: colors.text },
  introText: { ...typography.caption, color: colors.textLight, lineHeight: 18, marginTop: 3 },
  section: { marginBottom: spacing.xl },
  stepLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  sectionTitle: { ...typography.sectionTitle, color: colors.text, marginTop: 3 },
  sectionSubtitle: { ...typography.caption, color: colors.textLight, marginTop: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionHeaderText: { minWidth: 0, flex: 1 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  typeButton: {
    minWidth: '30%', flexGrow: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  typeButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  typeLabelSelected: { color: colors.onPrimary },
  typeDescription: { ...typography.caption, color: colors.textLight, lineHeight: 18, marginTop: spacing.sm },
  templateButton: {
    minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md,
  },
  templateButtonText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  columnsList: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden' },
  columnRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  columnContent: { minWidth: 0, flex: 1, paddingRight: spacing.xs },
  columnName: { fontSize: 13, fontWeight: '700', color: colors.text },
  columnDetail: { fontSize: 11, color: colors.textLight, marginTop: 3 },
  requirementBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  requiredBadge: { backgroundColor: colors.primary + '18' },
  optionalBadge: { backgroundColor: colors.surfaceLight },
  requirementText: { fontSize: 10, fontWeight: '700' },
  requiredText: { color: colors.primary },
  optionalText: { color: colors.textLight },
  rulesBox: { gap: spacing.xs, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceLight },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  ruleText: { minWidth: 0, flex: 1, fontSize: 12, lineHeight: 17, color: colors.textLight },
  filePicker: {
    minHeight: 72, flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, padding: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface,
  },
  filePickerIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary + '16' },
  filePickerContent: { minWidth: 0, flex: 1, marginHorizontal: spacing.sm },
  filePickerTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  filePickerText: { fontSize: 11, color: colors.textLight, marginTop: 4 },
  validationCard: { marginTop: spacing.sm, padding: spacing.sm },
  validationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  validationIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  validationContent: { flex: 1, marginLeft: spacing.sm },
  validationTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  validationSubtitle: { fontSize: 11, color: colors.textLight, marginTop: 3 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.xs },
  messageText: { minWidth: 0, flex: 1, fontSize: 11, lineHeight: 16, color: colors.warning },
  previewSection: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  previewTitle: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  previewTable: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, overflow: 'hidden' },
  previewHeaderRow: { flexDirection: 'row', backgroundColor: colors.surfaceLight },
  previewRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  previewHeaderCell: { width: 128, padding: 8, fontSize: 10, fontWeight: '700', color: colors.text },
  previewCell: { width: 128, padding: 8, fontSize: 10, color: colors.textLight },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceLight },
  optionContent: { minWidth: 0, flex: 1, marginRight: spacing.sm },
  optionTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  optionDescription: { fontSize: 11, lineHeight: 16, color: colors.textLight, marginTop: 3 },
  importButton: { marginTop: spacing.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm },
  progressText: { fontSize: 11, color: colors.textLight },
  resultCard: { marginBottom: spacing.xl },
  resultHeader: { flexDirection: 'row', alignItems: 'center' },
  resultIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.success + '18' },
  resultHeaderText: { flex: 1, marginLeft: spacing.sm },
  resultTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  resultSubtitle: { fontSize: 11, color: colors.textLight, marginTop: 3 },
  resultMetrics: { minHeight: 78, flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  resultMetric: { minWidth: 0, flex: 1, alignItems: 'center' },
  resultMetricValue: { fontSize: 22, fontWeight: '700' },
  resultMetricLabel: { fontSize: 10, color: colors.textLight, marginTop: 3 },
  resultDivider: { width: 1, height: 40, backgroundColor: colors.border },
  errorList: { marginBottom: spacing.md },
  errorListTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  importErrorRow: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  errorLine: { fontSize: 10, fontWeight: '700', color: colors.error },
  errorMessage: { fontSize: 11, lineHeight: 16, color: colors.textLight, marginTop: 2 },
  moreErrors: { fontSize: 11, color: colors.textLight, marginTop: spacing.xs },
})
