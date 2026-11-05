import fs from 'node:fs/promises';
import path from 'node:path';
import { Workbook } from '@oai/artifact-tool';

const outputDir = path.resolve('.');

const datasets = [
  {
    filename: '01-produits-test-complet.csv',
    sheetName: 'Produits',
    rows: [
      ['nom', 'prix_vente', 'prix_revient', 'categorie', 'description', 'stock_initial', 'stock_minimum'],
      ['Produit Démo Café 20260814', 25.5, 10.25, 'Tests CSV', 'Produit physique; édition "démo"', 20, 5],
      ['Service Conseil Test 20260814', 80, 15, 'Services', 'Prestation de conseil importée', 0, 0],
    ],
  },
  {
    filename: '02-stock-test-complet.csv',
    sheetName: 'Stock',
    rows: [
      ['produit', 'quantite', 'prix_unitaire', 'quantite_min', 'sku', 'emplacement'],
      ['Produit Démo Café 20260814', 5, 25.5, 5, 'TEST-CAFE-20260814', 'Étagère A'],
      ['Emballage Test 20260814', 50, 1.2, 10, 'TEST-EMB-20260814', 'Réserve'],
    ],
  },
  {
    filename: '03-clients-test-complet.csv',
    sheetName: 'Clients',
    rows: [
      ['nom', 'email', 'telephone', 'remise', 'notes'],
      ['Client Test CSV 20260814', 'client.test.20260814@example.com', '0690123456', 5, 'Client fidèle; import de validation'],
      ['Entreprise Démo 20260814', 'entreprise.demo.20260814@example.com', '0690654321', 0, 'Compte professionnel "démo"'],
    ],
  },
  {
    filename: '04-ventes-test-complet.csv',
    sheetName: 'Ventes',
    rows: [
      ['produit', 'quantite', 'prix_unitaire', 'remise', 'date', 'client', 'description'],
      ['Produit Démo Café 20260814', 2, 25.5, 5, '14/08/2026 10:30', 'Client Test CSV 20260814', 'Vente boutique; test complet'],
      ['Service Conseil Test 20260814', 1, 80, 0, '2026-08-13', 'Entreprise Démo 20260814', 'Prestation de démonstration'],
    ],
  },
  {
    filename: '05-depenses-test-complet.csv',
    sheetName: 'Dépenses',
    rows: [
      ['montant', 'categorie', 'description', 'date'],
      [120.5, 'achat', 'Matières premières test', '10/08/2026'],
      [35.75, 'variable', 'Livraison variable test', '12/08/2026'],
      [49.9, 'fixe', 'Abonnement internet test', '2026-08-01'],
    ],
  },
];

function csvCell(value) {
  const text = String(value ?? '');
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

for (const dataset of datasets) {
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add(dataset.sheetName);
  const rowCount = dataset.rows.length;
  const colCount = dataset.rows[0].length;
  const endColumn = String.fromCharCode(64 + colCount);
  const fullRange = sheet.getRange(`A1:${endColumn}${rowCount}`);
  fullRange.values = dataset.rows;
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
  sheet.getRange(`A1:${endColumn}1`).format = {
    fill: '#D4AF37',
    font: { bold: true, color: '#111111' },
    rowHeight: 26,
  };
  fullRange.format.borders = {
    insideHorizontal: { style: 'thin', color: '#E5E7EB' },
    bottom: { style: 'thin', color: '#D1D5DB' },
  };
  fullRange.format.autofitColumns();
  fullRange.format.autofitRows();

  const inspection = await workbook.inspect({
    kind: 'table',
    sheetId: dataset.sheetName,
    range: `A1:${endColumn}${rowCount}`,
    include: 'values,formulas',
    tableMaxRows: 10,
    tableMaxCols: 10,
    maxChars: 5000,
  });
  if (!inspection.ndjson.includes(dataset.rows[0][0]) || !inspection.ndjson.includes(String(dataset.rows[1][0]))) {
    throw new Error(`Échec de vérification pour ${dataset.filename}`);
  }

  const preview = await workbook.render({
    sheetName: dataset.sheetName,
    range: `A1:${endColumn}${rowCount}`,
    scale: 1.5,
    format: 'png',
  });
  await fs.writeFile(
    path.join(outputDir, `.preview-${dataset.filename}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );

  const csv = `\uFEFF${dataset.rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
  await fs.writeFile(path.join(outputDir, dataset.filename), csv, 'utf8');
}

console.log(JSON.stringify(datasets.map(({ filename, sheetName, rows }) => ({
  filename,
  type: sheetName,
  dataRows: rows.length - 1,
  columns: rows[0].length,
})), null, 2));
