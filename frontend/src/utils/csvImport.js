export const CSV_IMPORT_TYPES = {
  products: {
    label: 'Produits',
    icon: 'pricetag-outline',
    description: 'Créer le catalogue, les catégories et le stock initial.',
    columns: [
      { key: 'nom', label: 'nom', required: true, detail: 'Nom unique du produit', aliases: ['nom', 'name', 'produit'] },
      { key: 'prix_vente', label: 'prix_vente', required: true, detail: 'Prix facturé au client', aliases: ['prix_vente', 'prix_de_vente', 'unitprice', 'prix'] },
      { key: 'prix_revient', label: 'prix_revient', required: true, detail: 'Coût d’achat ou de fabrication', aliases: ['prix_revient', 'prix_de_revient', 'cout', 'costprice'] },
      { key: 'categorie', label: 'categorie', detail: 'Créée automatiquement si nécessaire', aliases: ['categorie', 'category'] },
      { key: 'description', label: 'description', detail: 'Informations complémentaires', aliases: ['description'] },
      { key: 'stock_initial', label: 'stock_initial', detail: 'Quantité disponible au départ', aliases: ['stock_initial', 'stock'] },
      { key: 'stock_minimum', label: 'stock_minimum', detail: 'Seuil d’alerte du stock', aliases: ['stock_minimum', 'seuil_alerte', 'minquantity'] },
    ],
    rows: [
      ['T-shirt noir', '25,00', '10,50', 'Vêtements', 'Coton premium', '20', '5'],
      ['Casquette', '18,00', '7,00', 'Accessoires', '', '12', '3'],
    ],
    notes: ['Un produit déjà existant avec le même nom sera ignoré.'],
  },
  stock: {
    label: 'Stock',
    icon: 'cube-outline',
    description: 'Ajouter des articles ou enregistrer des entrées de stock.',
    columns: [
      { key: 'produit', label: 'produit', required: true, detail: 'Nom de l’article', aliases: ['nom', 'name', 'produit', 'article'] },
      { key: 'quantite', label: 'quantite', required: true, detail: 'Quantité à ajouter', aliases: ['quantite', 'quantity', 'qte'] },
      { key: 'prix_unitaire', label: 'prix_unitaire', detail: 'Requis si le produit n’existe pas', aliases: ['prix_unitaire', 'unitprice', 'prix'] },
      { key: 'quantite_min', label: 'quantite_min', detail: 'Seuil d’alerte', aliases: ['quantite_min', 'stock_minimum', 'seuil_alerte', 'minquantity'] },
      { key: 'sku', label: 'sku', detail: 'Référence interne', aliases: ['sku', 'code_sku'] },
      { key: 'emplacement', label: 'emplacement', detail: 'Zone de stockage', aliases: ['emplacement', 'location'] },
    ],
    rows: [
      ['T-shirt noir', '10', '25,00', '5', 'TS-NOIR-M', 'Étagère A'],
      ['Carton emballage', '50', '1,20', '10', 'EMB-001', 'Réserve'],
    ],
    notes: ['Pour un article existant, la quantité importée est ajoutée au stock actuel.'],
  },
  sales: {
    label: 'Ventes',
    icon: 'cart-outline',
    description: 'Ajouter un historique de ventes et, si besoin, déduire le stock.',
    columns: [
      { key: 'produit', label: 'produit', required: true, detail: 'Nom exact d’un produit existant', aliases: ['produit', 'product', 'nom'] },
      { key: 'quantite', label: 'quantite', detail: '1 si la cellule est vide', aliases: ['quantite', 'quantity', 'qte'] },
      { key: 'prix_unitaire', label: 'prix_unitaire', detail: 'Prix du produit si vide', aliases: ['prix_unitaire', 'unitprice', 'prix'] },
      { key: 'remise', label: 'remise', detail: 'Montant à retirer, pas un pourcentage', aliases: ['remise', 'discount'] },
      { key: 'date', label: 'date', detail: 'JJ/MM/AAAA ou AAAA-MM-JJ', aliases: ['date'] },
      { key: 'client', label: 'client', detail: 'Créé automatiquement s’il est nouveau', aliases: ['client', 'customer'] },
      { key: 'description', label: 'description', detail: 'Informations complémentaires', aliases: ['description'] },
    ],
    rows: [
      ['T-shirt noir', '2', '25,00', '5,00', '12/08/2026', 'Sophie Martin', 'Vente boutique'],
      ['Casquette', '1', '', '0', '13/08/2026', '', ''],
    ],
    notes: ['Les produits doivent être créés avant l’import des ventes.'],
  },
  customers: {
    label: 'Clients',
    icon: 'people-outline',
    description: 'Créer plusieurs fiches clients en une seule opération.',
    columns: [
      { key: 'nom', label: 'nom', required: true, detail: 'Nom unique du client', aliases: ['nom', 'name', 'client'] },
      { key: 'email', label: 'email', detail: 'Adresse électronique', aliases: ['email', 'mail'] },
      { key: 'telephone', label: 'telephone', detail: 'Numéro de téléphone', aliases: ['telephone', 'phone', 'tel'] },
      { key: 'remise', label: 'remise', detail: 'Pourcentage entre 0 et 100', aliases: ['remise', 'discount'] },
      { key: 'notes', label: 'notes', detail: 'Informations utiles', aliases: ['notes', 'note'] },
    ],
    rows: [
      ['Sophie Martin', 'sophie@example.com', '0690123456', '5', 'Cliente fidèle'],
      ['Paul Durand', '', '0690654321', '0', ''],
    ],
    notes: ['Un client déjà existant avec le même nom sera ignoré.'],
  },
  expenses: {
    label: 'Dépenses',
    icon: 'wallet-outline',
    description: 'Ajouter les achats et charges passées de l’activité.',
    columns: [
      { key: 'montant', label: 'montant', required: true, detail: 'Montant strictement positif', aliases: ['montant', 'amount'] },
      { key: 'categorie', label: 'categorie', required: true, detail: 'achat, variable ou fixe', aliases: ['categorie', 'category', 'type'] },
      { key: 'description', label: 'description', detail: 'Motif de la dépense', aliases: ['description'] },
      { key: 'date', label: 'date', detail: 'JJ/MM/AAAA ou AAAA-MM-JJ', aliases: ['date'] },
    ],
    rows: [
      ['120,50', 'achat', 'Matières premières', '10/08/2026'],
      ['49,90', 'fixe', 'Abonnement internet', '01/08/2026'],
    ],
    notes: ['Les seules catégories acceptées sont achat, variable et fixe.'],
  },
}

export function normalizeCsvHeader(value = '') {
  return value.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
}

export function parseCsv(text) {
  const content = text.replace(/^\uFEFF/, '')
  const firstLine = content.split(/\r?\n/, 1)[0] || ''
  const delimiter = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ','
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    if (inQuotes) {
      if (char === '"' && content[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[index + 1] === '\n') index += 1
      row.push(field)
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  }

  return { delimiter, rows }
}

export function inspectCsv(text, type) {
  const config = CSV_IMPORT_TYPES[type]
  const { delimiter, rows } = parseCsv(text)
  const headers = (rows[0] || []).map(normalizeCsvHeader)
  const missingColumns = config.columns
    .filter((column) => column.required)
    .filter((column) => !column.aliases.some((alias) => headers.includes(alias)))
    .map((column) => column.label)
  const unknownColumns = headers.filter((header) => (
    header && !config.columns.some((column) => column.aliases.includes(header))
  ))
  const rowCount = Math.max(rows.length - 1, 0)
  const errors = []

  if (rows.length === 0) errors.push('Le fichier est vide.')
  else if (rowCount === 0) errors.push('Ajoutez au moins une ligne sous les en-têtes.')
  if (missingColumns.length) errors.push(`Colonnes obligatoires manquantes : ${missingColumns.join(', ')}.`)
  if (rowCount > 2000) errors.push('Le fichier dépasse la limite de 2 000 lignes.')

  return {
    valid: errors.length === 0,
    delimiter,
    rows,
    headers: rows[0] || [],
    previewRows: rows.slice(1, 4),
    rowCount,
    errors,
    warnings: unknownColumns.length ? [`Colonnes non reconnues et ignorées : ${unknownColumns.join(', ')}.`] : [],
  }
}

function escapeCsvCell(value) {
  const text = String(value ?? '')
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildCsvTemplate(type) {
  const config = CSV_IMPORT_TYPES[type]
  const lines = [
    config.columns.map((column) => column.label),
    ...config.rows,
  ]
  return `\uFEFF${lines.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n')}`
}
