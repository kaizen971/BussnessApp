import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { IAP_SUBSCRIPTION_IDS, PLAN_DISPLAY_INFO } from '../config/iap';
import { subscriptionAPI } from '../services/api';

let RNIap = null;
let iapAvailable = false;

try {
  RNIap = require('react-native-iap');
  iapAvailable = true;
} catch (e) {
  console.warn('react-native-iap not available (Expo Go?). IAP disabled.');
}

const IAPContext = createContext();

export const useIAP = () => {
  const context = useContext(IAPContext);
  if (!context) {
    throw new Error('useIAP must be used within an IAPProvider');
  }
  return context;
};

export const IAPProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [ownedSubscriptions, setOwnedSubscriptions] = useState([]);
  // ===== DIAGNOSTIC TEMPORAIRE (à retirer après résolution IAP) =====
  const [diagnostics, setDiagnostics] = useState({
    iapAvailable,
    platform: Platform.OS,
    requestedSkus: IAP_SUBSCRIPTION_IDS || [],
    initOk: null,        // true/false : initConnection a réussi
    productsCount: 0,    // nb d'offres remontées par le store
    returnedIds: [],     // IDs réellement renvoyés par StoreKit
    lastError: null,     // message d'erreur exact
    lastErrorCode: null, // code d'erreur (E_...) si dispo
    steps: [],           // journal horodaté des étapes
  });

  const logStep = useCallback((label, extra = {}) => {
    const line = `${new Date().toLocaleTimeString()} • ${label}`;
    console.log('[IAP-DIAG]', label, extra);
    setDiagnostics(prev => ({ ...prev, ...extra, steps: [...prev.steps, line].slice(-20) }));
  }, []);
  // ================================================================
  const purchaseUpdateSubscription = useRef(null);
  const purchaseErrorSubscription = useRef(null);

  const initialize = useCallback(async () => {
    if (!iapAvailable) {
      console.warn('IAP: running in Expo Go – skipping StoreKit init');
      logStep('Expo Go détecté → IAP désactivé (build natif requis)', { initOk: false });
      setLoading(false);
      return;
    }
    try {
      logStep('initConnection…');
      const result = await RNIap.initConnection();
      setConnected(!!result);
      logStep(`initConnection OK (connected=${!!result})`, { initOk: !!result });

      await loadProducts();
      await restorePurchases();
    } catch (error) {
      console.warn('IAP init error:', error.message);
      setConnected(false);
      logStep(`ERREUR initConnection: ${error.message}`, {
        initOk: false, lastError: error.message, lastErrorCode: error.code || null,
      });
    } finally {
      setLoading(false);
    }
  }, [logStep]);

  const loadProducts = useCallback(async () => {
    if (!iapAvailable) return;
    try {
      logStep(`fetchProducts… (${(IAP_SUBSCRIPTION_IDS || []).length} SKU demandés)`);
      // react-native-iap v15 : fetchProducts remplace getSubscriptions
      const subs = await RNIap.fetchProducts({ skus: IAP_SUBSCRIPTION_IDS, type: 'subs' });
      const list = Array.isArray(subs) ? subs : [];
      const enriched = list.map(product => {
        // v15 renomme les champs : id (ex-productId), displayPrice (ex-localizedPrice)
        const productId = product.id ?? product.productId;
        return {
          ...product,
          productId,
          localizedPrice: product.displayPrice ?? product.localizedPrice,
          displayInfo: PLAN_DISPLAY_INFO[productId] || {},
        };
      });
      setProducts(enriched);
      const ids = enriched.map(p => p.productId);
      logStep(
        enriched.length === 0
          ? 'fetchProducts → 0 offre (config App Store Connect / accord payant ?)'
          : `fetchProducts → ${enriched.length} offre(s)`,
        { productsCount: enriched.length, returnedIds: ids, lastError: enriched.length === 0 ? 'Tableau vide (aucun produit achetable trouvé)' : null },
      );
    } catch (error) {
      console.warn('Error loading IAP products:', error.message);
      logStep(`ERREUR fetchProducts: ${error.message}`, {
        lastError: error.message, lastErrorCode: error.code || null,
      });
    }
  }, [logStep]);

  const restorePurchases = useCallback(async () => {
    if (!iapAvailable) return [];
    try {
      const purchases = await RNIap.getAvailablePurchases();
      setOwnedSubscriptions(purchases);
      return purchases;
    } catch (error) {
      console.warn('Error restoring purchases:', error.message);
      return [];
    }
  }, []);

  const handlePurchase = useCallback(async (productId) => {
    if (!iapAvailable) {
      Alert.alert('Non disponible', 'Les achats intégrés ne sont pas disponibles dans Expo Go. Utilisez un build de production.');
      return;
    }
    if (purchasing) return;
    setPurchasing(true);
    try {
      // react-native-iap v15 : requestPurchase remplace requestSubscription
      await RNIap.requestPurchase({
        type: 'subs',
        request: {
          ios: { sku: productId, andDangerouslyFinishTransactionAutomatically: false },
          android: { skus: [productId] },
        },
      });
    } catch (error) {
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Erreur d\'achat', error.message || 'Une erreur est survenue lors de l\'achat.');
      }
      setPurchasing(false);
    }
  }, [purchasing]);

  const handleRestorePurchases = useCallback(async () => {
    if (!iapAvailable) {
      Alert.alert('Non disponible', 'Les achats intégrés ne sont pas disponibles dans Expo Go.');
      return;
    }
    setLoading(true);
    try {
      const purchases = await restorePurchases();
      if (purchases.length > 0) {
        for (const purchase of purchases) {
          try {
            await subscriptionAPI.validateReceipt({
              receipt: purchase.purchaseToken,
              productId: purchase.productId,
              platform: Platform.OS,
            });
          } catch (err) {
            console.warn('Receipt validation error:', err.message);
          }
        }
        Alert.alert('Achats restaurés', 'Vos achats ont été restaurés avec succès.');
      } else {
        Alert.alert('Aucun achat', 'Aucun achat précédent trouvé.');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de restaurer les achats.');
    } finally {
      setLoading(false);
    }
  }, [restorePurchases]);

  useEffect(() => {
    initialize();

    if (iapAvailable) {
      purchaseUpdateSubscription.current = RNIap.purchaseUpdatedListener(async (purchase) => {
        // v15 : token unifié (JWS iOS / token Android) au lieu de transactionReceipt
        const receipt = purchase.purchaseToken;
        if (receipt) {
          try {
            await subscriptionAPI.validateReceipt({
              receipt,
              productId: purchase.productId,
              platform: Platform.OS,
            });
            await RNIap.finishTransaction({ purchase, isConsumable: false });
            setOwnedSubscriptions(prev => [...prev, purchase]);
            Alert.alert(
              'Achat réussi',
              'Votre abonnement a été activé avec succès. Merci !',
            );
          } catch (error) {
            console.error('Receipt validation error:', error);
            Alert.alert('Erreur', 'L\'achat a été effectué mais la validation a échoué. Veuillez restaurer vos achats.');
          }
        }
        setPurchasing(false);
      });

      purchaseErrorSubscription.current = RNIap.purchaseErrorListener((error) => {
        if (error.code !== 'E_USER_CANCELLED') {
          console.warn('Purchase error:', error);
        }
        setPurchasing(false);
      });
    }

    return () => {
      purchaseUpdateSubscription.current?.remove();
      purchaseErrorSubscription.current?.remove();
      if (iapAvailable) RNIap.endConnection();
    };
  }, [initialize]);

  const value = {
    connected,
    products,
    loading,
    purchasing,
    ownedSubscriptions,
    handlePurchase,
    handleRestorePurchases,
    loadProducts,
    iapAvailable,
    diagnostics,
  };

  return <IAPContext.Provider value={value}>{children}</IAPContext.Provider>;
};
