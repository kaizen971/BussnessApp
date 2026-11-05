const EXPENSE_CATEGORIES = {
  purchase: 'Achats / Marchandises / Matières premières',
  salaries: 'Salaires & rémunérations',
  salary_advances: 'Avances sur salaire',
  rent: 'Loyer & locaux',
  utilities: 'Énergie & services',
  transport: 'Transport & déplacements',
  marketing: 'Marketing & communication',
  telecom: 'Télécom & numérique',
  equipment: 'Matériel & équipements',
  maintenance: 'Entretien & réparations',
  taxes: 'Taxes & frais financiers',
  external_services: 'Prestataires & services externes',
  other: 'Autres dépenses',
};

// Preserve historical expenses created with the former three-category model.
const LEGACY_EXPENSE_CATEGORIES = {
  variable: 'Variable',
  fixed: 'Fixe',
};

const EXPENSE_CATEGORY_LABELS = { ...EXPENSE_CATEGORIES, ...LEGACY_EXPENSE_CATEGORIES };

module.exports = { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS };
