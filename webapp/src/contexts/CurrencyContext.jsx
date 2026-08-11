import React, { createContext, useState, useContext } from 'react';
import { CURRENCIES, formatCurrency } from '../utils/currency';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrencyState] = useState(CURRENCIES.XOF);
  const [loading] = useState(false);

  // Appelée depuis les composants qui ont accès au projet
  const setProjectCurrency = (currencyCode) => {
    if (CURRENCIES[currencyCode]) {
      setCurrencyState(CURRENCIES[currencyCode]);
    } else {
      setCurrencyState(CURRENCIES.XOF);
    }
  };

  const format = (amount, decimals = 2) => {
    return formatCurrency(amount, currency, decimals);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setProjectCurrency,
        format,
        loading,
        availableCurrencies: Object.values(CURRENCIES),
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
