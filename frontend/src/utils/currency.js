/**
 * Utilitaire de gestion des devises
 * Permet d'afficher les montants avec le symbole de devise choisi (€ ou FCFA)
 * Sans conversion - juste l'affichage du symbole
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Clé de stockage pour la préférence de devise
const CURRENCY_KEY = '@currency_preference';

// Devises disponibles
export const CURRENCIES = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    position: 'after', // Le symbole € se place après le montant
  },
  XOF: {
    code: 'XOF',
    symbol: 'CFA',
    name: 'Franc CFA',
    position: 'after', // CFA se place aussi après
  },
};

// Devise par défaut (CFA pour les marchés principaux)
const DEFAULT_CURRENCY = CURRENCIES.XOF;

/**
 * Obtenir la devise actuellement sélectionnée
 */
export const getCurrentCurrency = async () => {
  try {
    const currencyCode = await AsyncStorage.getItem(CURRENCY_KEY);
    return CURRENCIES[currencyCode] || DEFAULT_CURRENCY;
  } catch (error) {
    console.error('Error loading currency preference:', error);
    return DEFAULT_CURRENCY;
  }
};

/**
 * Définir la devise à utiliser
 */
export const setCurrency = async (currencyCode) => {
  try {
    if (CURRENCIES[currencyCode]) {
      await AsyncStorage.setItem(CURRENCY_KEY, currencyCode);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error saving currency preference:', error);
    return false;
  }
};

/**
 * Formater un montant avec le symbole de devise
 * @param {number} amount - Montant à formater
 * @param {object} currency - Objet devise (optionnel, utilise la devise actuelle si non fourni)
 * @param {number} decimals - Nombre de décimales (par défaut 2)
 * @returns {string} Montant formaté avec symbole
 */
export const formatCurrency = (amount, currency = null, decimals = 2) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }

  const parsedAmount = parseFloat(amount);
  let formattedAmount;
  
  if (!currency) {
    // Si pas de devise fournie, utiliser CFA par défaut (synchrone)
    formattedAmount = Math.round(parsedAmount).toString();
    return `${formattedAmount} CFA`;
  }

  const { symbol, code } = currency;

  // Pour CFA, formater avec des espaces pour les grands nombres
  if (code === 'XOF' && Math.abs(parsedAmount) >= 1000) {
    // Arrondir à l'entier pour CFA (pas de décimales)
    const rounded = Math.round(parsedAmount);
    // Formater avec des espaces tous les 3 chiffres
    formattedAmount = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  } else if (code === 'XOF') {
    // Pour les petites valeurs CFA, pas de décimales
    formattedAmount = Math.round(parsedAmount).toString();
  } else {
    // Pour EUR et autres, garder les décimales
    formattedAmount = parsedAmount.toFixed(decimals);
  }

  return `${formattedAmount} ${symbol}`;
};

/**
 * Formater un montant de manière asynchrone (avec la devise stockée)
 * Utiliser cette fonction dans les composants
 */
export const formatCurrencyAsync = async (amount, decimals = 2) => {
  const currency = await getCurrentCurrency();
  return formatCurrency(amount, currency, decimals);
};

/**
 * Taux de conversion EUR vers XOF (Franc CFA)
 * 1 EUR = 655.957 XOF (taux officiel fixe)
 */
export const EUR_TO_XOF_RATE = 655.957;

/**
 * Convertir un montant d'EUR vers XOF
 */
export const convertEurToXof = (amountEur) => {
  return Math.round(amountEur * EUR_TO_XOF_RATE);
};

/**
 * Convertir un montant de XOF vers EUR
 */
export const convertXofToEur = (amountXof) => {
  return Math.round((amountXof / EUR_TO_XOF_RATE) * 100) / 100;
};

/**
 * Obtenir les valeurs de sélection rapide selon la devise
 * @param {string} currencyCode - Code de la devise (EUR ou XOF)
 * @returns {array} Tableau des valeurs suggérées
 */
export const getQuickSelectValues = (currencyCode) => {
  const eurValues = [10, 12, 15, 18, 20];
  
  if (currencyCode === 'XOF') {
    // Valeurs arrondies et lisibles en CFA (environ 7-15€)
    return [5000, 7500, 10000, 12000, 15000];
  }
  
  return eurValues;
};
