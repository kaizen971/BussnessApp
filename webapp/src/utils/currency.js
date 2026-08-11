/**
 * Utilitaire de gestion des devises (port web de frontend/src/utils/currency.js)
 * Affiche les montants avec le symbole de devise choisi (€ ou FCFA), sans conversion.
 */

// Devises disponibles
export const CURRENCIES = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    position: 'after',
  },
  XOF: {
    code: 'XOF',
    symbol: 'CFA',
    name: 'Franc CFA',
    position: 'after',
  },
};

/**
 * Formater un montant avec le symbole de devise
 */
export const formatCurrency = (amount, currency = null, decimals = 2) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }

  const parsedAmount = parseFloat(amount);
  let formattedAmount;

  if (!currency) {
    formattedAmount = Math.round(parsedAmount).toString();
    return `${formattedAmount} CFA`;
  }

  const { symbol, code } = currency;

  if (code === 'XOF' && Math.abs(parsedAmount) >= 1000) {
    const rounded = Math.round(parsedAmount);
    formattedAmount = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  } else if (code === 'XOF') {
    formattedAmount = Math.round(parsedAmount).toString();
  } else {
    formattedAmount = parsedAmount.toFixed(decimals);
  }

  return `${formattedAmount} ${symbol}`;
};

/**
 * Taux de conversion EUR vers XOF (taux officiel fixe)
 */
export const EUR_TO_XOF_RATE = 655.957;

export const convertEurToXof = (amountEur) => Math.round(amountEur * EUR_TO_XOF_RATE);

export const convertXofToEur = (amountXof) => Math.round((amountXof / EUR_TO_XOF_RATE) * 100) / 100;

/**
 * Valeurs de sélection rapide selon la devise
 */
export const getQuickSelectValues = (currencyCode) => {
  const eurValues = [10, 12, 15, 18, 20];

  if (currencyCode === 'XOF') {
    return [5000, 7500, 10000, 12000, 15000];
  }

  return eurValues;
};
