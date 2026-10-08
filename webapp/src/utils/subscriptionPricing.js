// Indicative monthly amounts for annual EUR offers; billing remains annual.
export function isAnnualPlan(plan) {
  return (plan.durationType === 'years' && Number(plan.duration) === 1)
    || (plan.durationType === 'months' && Number(plan.duration) === 12);
}

export function getMonthlyFcfa(plan) {
  if (!isAnnualPlan(plan) || (plan.currency && plan.currency !== 'EUR')) return null;
  const amounts = { 10: '550', 22: '1 200', 38: '2 100', 48: '2 600' };
  return amounts[Number(plan.price)] || null;
}

export function getPricePeriod(plan, translate = (text) => text) {
  if (isAnnualPlan(plan)) return translate('an');
  if (plan.durationType === 'lifetime') return translate('À vie');
  const unit = { days: 'jour(s)', months: 'mois', years: 'an(s)' }[plan.durationType];
  return `${plan.duration} ${translate(unit || plan.durationType || '')}`.trim();
}
