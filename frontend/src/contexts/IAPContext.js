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
  const purchaseUpdateSubscription = useRef(null);
  const purchaseErrorSubscription = useRef(null);

  const initialize = useCallback(async () => {
    if (!iapAvailable) {
      console.warn('IAP: running in Expo Go – skipping StoreKit init');
      setLoading(false);
      return;
    }
    try {
      const result = await RNIap.initConnection();
      setConnected(!!result);

      if (Platform.OS === 'android') {
        await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
      }

      await loadProducts();
      await restorePurchases();
    } catch (error) {
      console.warn('IAP init error:', error.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    if (!iapAvailable) return;
    try {
      const subs = await RNIap.getSubscriptions({ skus: IAP_SUBSCRIPTION_IDS });
      const enriched = subs.map(product => ({
        ...product,
        displayInfo: PLAN_DISPLAY_INFO[product.productId] || {},
      }));
      setProducts(enriched);
    } catch (error) {
      console.warn('Error loading IAP products:', error.message);
    }
  }, []);

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
      await RNIap.requestSubscription({
        sku: productId,
        ...(Platform.OS === 'ios' && { andDangerouslyFinishTransactionAutomaticallyIOS: false }),
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
              receipt: purchase.transactionReceipt,
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
        const receipt = purchase.transactionReceipt;
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
  };

  return <IAPContext.Provider value={value}>{children}</IAPContext.Provider>;
};
