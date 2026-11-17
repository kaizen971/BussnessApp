import { EXPENSE_CATEGORIES, LEGACY_EXPENSE_CATEGORIES } from '../constants/expenseCategories.js';

// Palette catégorielle distincte (lisible en thème clair et sombre) pour la répartition des charges
export const PIE_PALETTE = [
  '#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899',
  '#14B8A6', '#A16207', '#6366F1', '#84CC16', '#06B6D4', '#A855F7',
  '#EAB308', '#64748B', '#F43F5E',
];

const toAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

/**
 * Construit les parts du camembert « Répartition des charges » :
 * une part par catégorie non nulle + la masse salariale, triées par montant décroissant,
 * chacune avec une couleur unique et son pourcentage (arrondi, total = 100).
 */
export const buildExpenseBreakdown = (expensesByCategory = {}, translate = (s) => s) => {
  const source = expensesByCategory || {};
  const items = [
    ...[...EXPENSE_CATEGORIES, ...LEGACY_EXPENSE_CATEGORIES].map(({ value, label, chartLabel }) => ({
      key: value,
      name: translate(chartLabel || label),
      population: toAmount(source[value]),
    })),
    { key: 'payroll', name: translate('Masse salariale'), population: toAmount(source.payroll) },
  ]
    .filter((item) => item.population > 0)
    .sort((a, b) => b.population - a.population);

  const total = items.reduce((sum, item) => sum + item.population, 0);

  // Arrondi par la méthode du plus fort reste pour que les % affichés totalisent 100
  const raw = items.map((item) => (total > 0 ? (item.population / total) * 100 : 0));
  const percents = raw.map(Math.floor);
  let remainder = total > 0 ? 100 - percents.reduce((s, p) => s + p, 0) : 0;
  raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ index }) => {
      if (remainder > 0) {
        percents[index] += 1;
        remainder -= 1;
      }
    });

  return {
    total,
    items: items.map((item, index) => ({
      ...item,
      color: PIE_PALETTE[index % PIE_PALETTE.length],
      percent: percents[index],
      // Une part non nulle n'affiche jamais « 0 % »
      percentLabel: percents[index] === 0 ? '<1%' : `${percents[index]}%`,
    })),
  };
};
