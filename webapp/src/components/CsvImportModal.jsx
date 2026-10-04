import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Upload, Download, FileText, CheckCircle, AlertTriangle, X } from 'lucide-react'
import { importAPI, downloadBlob } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Modal, Spinner } from './ui'

// Définition des imports : colonnes attendues + exemples de remplissage
export const CSV_IMPORT_TYPES = {
  products: {
    title: 'Importer des produits',
    entityLabel: 'produit(s)',
    filename: 'modele-produits.csv',
    intro: 'Chaque ligne crée un produit. Si « stock_initial » est renseigné, le stock lié est créé automatiquement.',
    columns: [
      { key: 'nom', required: true, description: 'Nom du produit (doit être unique)', example: 'T-shirt logo' },
      { key: 'prix_vente', required: true, description: 'Prix de vente unitaire', example: '25.00' },
      { key: 'prix_revient', required: true, description: 'Prix de revient (coût)', example: '10.50' },
      { key: 'categorie', required: false, description: 'Catégorie (créée si nouvelle)', example: 'Vêtements' },
      { key: 'description', required: false, description: 'Description libre', example: 'Coton bio, tailles S à XL' },
      { key: 'stock_initial', required: false, description: 'Quantité de départ (crée le stock lié)', example: '100' },
      { key: 'stock_minimum', required: false, description: "Seuil d'alerte stock bas", example: '10' },
    ],
    sampleRows: [
      ['T-shirt logo', '25.00', '10.50', 'Vêtements', 'Coton bio, tailles S à XL', '100', '10'],
      ['Casquette brodée', '15.00', '6.00', 'Accessoires', '', '50', '5'],
      ['Carte cadeau 20', '20.00', '0', 'Cartes cadeaux', 'Valable 1 an', '', ''],
    ],
  },
  stock: {
    title: 'Importer du stock',
    entityLabel: 'article(s)',
    filename: 'modele-stock.csv',
    intro: 'Si un article du même nom existe déjà, la quantité importée est AJOUTÉE (entrée de stock). Si le nom correspond à un produit existant, ils sont liés automatiquement.',
    columns: [
      { key: 'produit', required: true, description: "Nom de l'article / du produit", example: 'T-shirt logo' },
      { key: 'quantite', required: true, description: 'Quantité à ajouter au stock', example: '100' },
      { key: 'prix_unitaire', required: false, description: 'Prix unitaire (repris du produit si vide)', example: '25.00' },
      { key: 'quantite_min', required: false, description: "Seuil d'alerte stock bas", example: '10' },
      { key: 'sku', required: false, description: 'Code SKU', example: 'TSH-001' },
      { key: 'emplacement', required: false, description: 'Emplacement physique', example: 'Étagère A3' },
    ],
    sampleRows: [
      ['T-shirt logo', '100', '25.00', '10', 'TSH-001', 'Étagère A3'],
      ['Casquette brodée', '50', '', '5', 'CAS-001', 'Bac B1'],
    ],
  },
  sales: {
    title: 'Importer des ventes',
    entityLabel: 'vente(s)',
    filename: 'modele-ventes.csv',
    intro: 'Le produit doit déjà exister (même nom exact). Le client est créé automatiquement s\'il est inconnu. Les ventes importées vous sont attribuées comme vendeur.',
    columns: [
      { key: 'produit', required: true, description: 'Nom exact du produit existant', example: 'T-shirt logo' },
      { key: 'quantite', required: false, description: 'Quantité vendue (défaut : 1)', example: '2' },
      { key: 'prix_unitaire', required: false, description: 'Prix appliqué (défaut : prix du produit)', example: '25.00' },
      { key: 'remise', required: false, description: 'Remise en montant (défaut : 0)', example: '5.00' },
      { key: 'date', required: false, description: 'JJ/MM/AAAA ou JJ/MM/AAAA HH:MM (défaut : maintenant)', example: '15/06/2026 14:30' },
      { key: 'client', required: false, description: 'Nom du client (créé si inconnu)', example: 'Awa Diallo' },
      { key: 'description', required: false, description: 'Note libre', example: 'Vente marché de juin' },
    ],
    sampleRows: [
      ['T-shirt logo', '2', '25.00', '0', '15/06/2026 14:30', 'Awa Diallo', 'Vente marché de juin'],
      ['Casquette brodée', '1', '', '2.00', '16/06/2026', '', ''],
    ],
    options: [
      { key: 'updateStock', label: 'Déduire les quantités vendues du stock actuel', default: false },
    ],
  },
  customers: {
    title: 'Importer des clients',
    entityLabel: 'client(s)',
    filename: 'modele-clients.csv',
    intro: 'Chaque ligne crée un client. Les doublons (même nom) sont ignorés avec une erreur.',
    columns: [
      { key: 'nom', required: true, description: 'Nom du client (doit être unique)', example: 'Awa Diallo' },
      { key: 'email', required: false, description: 'Adresse email', example: 'awa@example.com' },
      { key: 'telephone', required: false, description: 'Numéro de téléphone', example: '+221 77 123 45 67' },
      { key: 'remise', required: false, description: 'Remise personnalisée en % (0 à 100)', example: '5' },
      { key: 'notes', required: false, description: 'Notes libres', example: 'Cliente fidèle du samedi' },
    ],
    sampleRows: [
      ['Awa Diallo', 'awa@example.com', '+221 77 123 45 67', '5', 'Cliente fidèle du samedi'],
      ['Moussa Ndiaye', '', '+221 76 987 65 43', '', ''],
    ],
  },
  expenses: {
    title: 'Importer des dépenses',
    entityLabel: 'dépense(s)',
    filename: 'modele-depenses.csv',
    intro: 'Catégories acceptées : « achat » (matières/marchandises), « variable » (charges variables), « fixe » (loyer, abonnements…).',
    columns: [
      { key: 'montant', required: true, description: 'Montant de la dépense', example: '150.00' },
      { key: 'categorie', required: true, description: 'achat, variable ou fixe', example: 'fixe' },
      { key: 'description', required: false, description: 'Description libre', example: 'Loyer boutique juin' },
      { key: 'date', required: false, description: 'JJ/MM/AAAA (défaut : aujourd\'hui)', example: '01/06/2026' },
    ],
    sampleRows: [
      ['150.00', 'fixe', 'Loyer boutique juin', '01/06/2026'],
      ['80.00', 'achat', 'Réassort tissus', '05/06/2026'],
      ['25.50', 'variable', 'Essence livraisons', '12/06/2026'],
    ],
  },
}

// Génère le contenu du modèle CSV (BOM UTF-8 pour Excel, séparateur ;)
const buildTemplateCsv = (config) => {
  const escapeCell = (cell) => (/[;"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)
  const lines = [
    config.columns.map(c => c.key).join(';'),
    ...config.sampleRows.map(row => row.map(escapeCell).join(';')),
  ]
  return '\uFEFF' + lines.join('\r\n')
}

export default function CsvImportModal({ open, onClose, type, onImported }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [csvContent, setCsvContent] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [optionValues, setOptionValues] = useState({})

  const config = CSV_IMPORT_TYPES[type]
  if (!config) return null

  const reset = () => {
    setFile(null)
    setCsvContent('')
    setResult(null)
    setOptionValues({})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleDownloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv(config)], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, config.filename)
  }

  const handleFilePick = async (e) => {
    const picked = e.target.files?.[0]
    if (!picked) return
    try {
      const text = await picked.text()
      if (!text.trim()) {
        toast.error('Le fichier est vide')
        return
      }
      setFile(picked)
      setCsvContent(text)
      setResult(null)
    } catch {
      toast.error('Impossible de lire le fichier')
    }
  }

  const dataLineCount = csvContent
    ? Math.max(0, csvContent.split(/\r?\n/).filter(l => l.trim() !== '').length - 1)
    : 0

  const handleImport = async () => {
    if (!csvContent) return
    setImporting(true)
    try {
      const options = {}
      for (const opt of config.options || []) {
        options[opt.key] = optionValues[opt.key] ?? opt.default
      }
      const response = await importAPI.importCsv(type, user?.projectId, csvContent, options)
      const data = response.data?.data
      setResult(data)
      const createdCount = (data?.inserted || 0) + (data?.updated || 0)
      if (createdCount > 0) {
        toast.success(`${createdCount} ${config.entityLabel} importé(s)`)
        onImported?.()
      } else {
        toast.error("Aucune ligne n'a pu être importée")
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur lors de l'import")
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={config.title} size="lg">
      <div className="p-6 space-y-5">
        {/* Aide au remplissage */}
        <div className="rounded-xl bg-night-900 border border-night-700 p-4 space-y-3">
          <p className="text-[13px] text-gray-400 leading-relaxed">{config.intro}</p>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-gray-500 uppercase text-[10.5px] tracking-wide">
                  <th className="py-1.5 pr-3 font-semibold">Colonne</th>
                  <th className="py-1.5 pr-3 font-semibold">Description</th>
                  <th className="py-1.5 font-semibold">Exemple</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-night-700/60">
                {config.columns.map(col => (
                  <tr key={col.key}>
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      <code className="text-gold-400 font-semibold">{col.key}</code>
                      {col.required && <span className="text-red-400 ml-1" title="Obligatoire">*</span>}
                    </td>
                    <td className="py-1.5 pr-3 text-gray-400">{col.description}</td>
                    <td className="py-1.5 text-gray-500 whitespace-nowrap">{col.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11.5px] text-gray-600 leading-relaxed">
            * colonne obligatoire — Séparateur « ; » ou « , » accepté · encodage UTF-8 · nombres avec point ou virgule (12.50 ou 12,50) · maximum 2000 lignes par fichier.
          </p>
          <button onClick={handleDownloadTemplate} className="btn-secondary !py-2 text-[13px]">
            <Download className="w-4 h-4" />
            Télécharger le modèle CSV (avec exemples)
          </button>
        </div>

        {/* Options (ex: déduire du stock pour les ventes) */}
        {(config.options || []).map(opt => (
          <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={optionValues[opt.key] ?? opt.default}
              onChange={(e) => setOptionValues(prev => ({ ...prev, [opt.key]: e.target.checked }))}
              className="w-4 h-4 rounded accent-gold-500"
            />
            <span className="text-[13px] text-gray-300">{opt.label}</span>
          </label>
        ))}

        {/* Sélection du fichier */}
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFilePick} />
        {file ? (
          <div className="flex items-center gap-3 rounded-xl bg-night-900 border border-night-700 p-3.5">
            <span className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-gold-500" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-cream truncate">{file.name}</p>
              <p className="text-[11.5px] text-gray-500 mt-0.5">{dataLineCount} ligne(s) de données détectée(s)</p>
            </div>
            <button onClick={reset} className="p-1.5 rounded-lg hover:bg-night-700 text-gray-500 hover:text-red-400 transition-colors" title="Retirer le fichier">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-night-500 hover:border-gold-500/60 transition-colors"
          >
            <Upload className="w-6 h-6 text-gold-500" />
            <span className="text-[13px] text-gray-400">Cliquez pour sélectionner votre fichier .csv</span>
          </button>
        )}

        {/* Résultat de l'import */}
        {result && (
          <div className="rounded-xl bg-night-900 border border-night-700 p-4 space-y-3">
            <div className="flex items-center gap-2">
              {result.errors.length === 0 ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
              <p className="text-[13.5px] font-semibold text-cream">
                {result.inserted + (result.updated || 0)} / {result.total} ligne(s) importée(s)
                {result.updated > 0 && <span className="text-gray-500 font-normal"> (dont {result.updated} mise(s) à jour)</span>}
              </p>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-44 overflow-y-auto scrollbar-thin space-y-1.5">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-[12.5px] text-red-400">
                    <span className="font-semibold">Ligne {err.line} :</span> {err.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button onClick={handleClose} className="btn-secondary flex-1">
            {result ? 'Fermer' : 'Annuler'}
          </button>
          <button onClick={handleImport} disabled={!csvContent || importing} className="btn-primary flex-1 disabled:opacity-50">
            {importing ? <Spinner className="w-4 h-4" /> : (
              <>
                <Upload className="w-4 h-4" />
                Importer
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
