import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildExpenseBreakdown, PIE_PALETTE } from '../src/utils/expenseBreakdown.js';

const require = createRequire(import.meta.url);
const Pie = require('paths-js/pie');

// Valeurs réelles vues sur la capture du dashboard (11 catégories non nulles)
const SCREENSHOT_DATA = {
  purchase: 566450,
  utilities: 104500,
  transport: 200400,
  marketing: 20100,
  telecom: 600,
  equipment: 312100,
  maintenance: 15550,
  external_services: 6000,
  variable: 3377475,
  fixed: 1405500,
  payroll: 660248,
  rent: 0,
  taxes: 0,
};

test('chaque part a une couleur unique (bug : 5 couleurs recyclées)', () => {
  const { items } = buildExpenseBreakdown(SCREENSHOT_DATA);
  assert.equal(items.length, 11);
  assert.equal(new Set(items.map((i) => i.color)).size, items.length);
  // La palette couvre toutes les catégories possibles (13 + 2 anciennes + masse salariale = 16)
  assert.ok(PIE_PALETTE.length >= 15);
});

test('parts triées par montant décroissant, catégories nulles exclues', () => {
  const { items } = buildExpenseBreakdown(SCREENSHOT_DATA);
  assert.deepEqual(items.slice(0, 3).map((i) => i.key), ['variable', 'fixed', 'payroll']);
  for (let i = 1; i < items.length; i += 1) {
    assert.ok(items[i - 1].population >= items[i].population);
  }
  assert.ok(!items.some((i) => i.key === 'rent' || i.key === 'taxes'));
});

test('total = somme exacte, aucune catégorie comptée deux fois', () => {
  const { total, items } = buildExpenseBreakdown(SCREENSHOT_DATA);
  const expected = Object.values(SCREENSHOT_DATA).reduce((s, v) => s + v, 0);
  assert.equal(total, expected);
  assert.equal(new Set(items.map((i) => i.key)).size, items.length);
});

test('les pourcentages affichés totalisent exactement 100', () => {
  const { items } = buildExpenseBreakdown(SCREENSHOT_DATA);
  assert.equal(items.reduce((s, i) => s + i.percent, 0), 100);
  assert.equal(items.find((i) => i.key === 'variable').percent, 51); // 3 377 475 / 6 668 923 = 50,6 %
  assert.equal(items.find((i) => i.key === 'telecom').percent, 0);
});

test('une petite part non nulle affiche « <1% » et jamais « 0% »', () => {
  const { items } = buildExpenseBreakdown(SCREENSHOT_DATA);
  assert.equal(items.find((i) => i.key === 'telecom').percentLabel, '<1%');
  assert.equal(items.find((i) => i.key === 'marketing').percentLabel, '<1%');
  assert.equal(items.find((i) => i.key === 'variable').percentLabel, '51%');
  assert.ok(!items.some((i) => i.percentLabel === '0%'));
});

test('les noms passent par la traduction et utilisent les libellés courts', () => {
  const { items } = buildExpenseBreakdown(SCREENSHOT_DATA, (s) => `T:${s}`);
  const names = items.map((i) => i.name);
  assert.ok(names.includes('T:Achats'));
  assert.ok(names.includes('T:Masse salariale'));
  assert.ok(names.includes('T:Variable'));
});

test('données vides, nulles ou invalides : aucun crash, rien à afficher', () => {
  for (const input of [undefined, null, {}, { purchase: 0 }, { purchase: -50, fixed: 'abc', payroll: NaN }]) {
    const { total, items } = buildExpenseBreakdown(input);
    assert.equal(total, 0);
    assert.deepEqual(items, []);
  }
});

test('une seule catégorie = 100 %', () => {
  const { items } = buildExpenseBreakdown({ payroll: 1200 });
  assert.equal(items.length, 1);
  assert.equal(items[0].percent, 100);
});

test('géométrie chart-kit : camembert centré et entièrement visible', () => {
  // Reproduit exactement le calcul de react-native-chart-kit/PieChart avec nos props
  for (const screenWidth of [320, 375, 412, 768, 1440]) {
    const pieSize = Math.min(screenWidth - 64, 260);
    const width = pieSize;
    const height = pieSize * 0.8;
    const center = [pieSize / 4, 0];
    const R = height / 2.5;
    const groupX = width / 2 / 2 + 0; // paddingLeft = 0
    const cx = groupX + center[0];
    const cy = height / 2;

    assert.ok(Math.abs(cx - width / 2) < 1e-9, `centré horizontalement (${screenWidth}px)`);
    assert.ok(cx - R >= 0 && cx + R <= width, `pas de débordement horizontal (${screenWidth}px)`);
    assert.ok(cy - R >= 0 && cy + R <= height, `pas de débordement vertical (${screenWidth}px)`);

    const { items } = buildExpenseBreakdown(SCREENSHOT_DATA);
    const chart = Pie({ center, r: 0, R, data: items, accessor: (x) => x.population });
    assert.equal(chart.curves.length, items.length);
  }
});
