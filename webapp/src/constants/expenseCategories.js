export const EXPENSE_CATEGORIES = [
  { value: 'purchase', label: 'Achats / Marchandises / Matières premières', chartLabel: 'Achats' },
  { value: 'salaries', label: 'Salaires & rémunérations', chartLabel: 'Salaires' },
  { value: 'salary_advances', label: 'Avances sur salaire', chartLabel: 'Avances' },
  { value: 'rent', label: 'Loyer & locaux', chartLabel: 'Loyer' },
  { value: 'utilities', label: 'Énergie & services', chartLabel: 'Énergie' },
  { value: 'transport', label: 'Transport & déplacements', chartLabel: 'Transport' },
  { value: 'marketing', label: 'Marketing & communication', chartLabel: 'Marketing' },
  { value: 'telecom', label: 'Télécom & numérique', chartLabel: 'Télécom' },
  { value: 'equipment', label: 'Matériel & équipements', chartLabel: 'Matériel' },
  { value: 'maintenance', label: 'Entretien & réparations', chartLabel: 'Entretien' },
  { value: 'taxes', label: 'Taxes & frais financiers', chartLabel: 'Taxes' },
  { value: 'external_services', label: 'Prestataires & services externes', chartLabel: 'Prestataires' },
  { value: 'other', label: 'Autres dépenses', chartLabel: 'Autres' },
];

export const LEGACY_EXPENSE_CATEGORIES = [
  { value: 'variable', label: 'Variable' },
  { value: 'fixed', label: 'Fixe' },
];

export const getExpenseCategoryLabel = (value) =>
  [...EXPENSE_CATEGORIES, ...LEGACY_EXPENSE_CATEGORIES].find((item) => item.value === value)?.label || value;
