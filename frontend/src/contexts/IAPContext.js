import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert, Modal, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { IAP_SUBSCRIPTION_IDS, PLAN_DISPLAY_INFO } from '../config/iap';
import { subscriptionAPI } from '../services/api';
import { useSubscription } from './SubscriptionContext';
import { useTheme, useThemedStyles } from './ThemeContext';

let RNIap = null;
let iapAvailable = false;

// L'In-App Purchase n'est activé que sur iOS (Apple StoreKit).
// Sur Android, les abonnements passent par Stripe (cf. écrans *.android.js),
// donc on n'initialise pas react-native-iap / Google Play Billing.
if (Platform.OS === 'ios') {
  try {
    RNIap = require('react-native-iap');
    iapAvailable = true;
  } catch (e) {
    console.warn('react-native-iap not available (Expo Go?). IAP disabled.');
  }
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
  const { colors } = useTheme();
  const overlayStyles = useThemedStyles(createOverlayStyles);
  const [connected, setConnected] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [ownedSubscriptions, setOwnedSubscriptions] = useState([]);

  // Permet d'actualiser le SubscriptionContext juste après un achat validé.
  // IAPProvider est imbriqué DANS SubscriptionProvider (cf. App.js), donc le hook est dispo.
  const { refreshSubscription } = useSubscription();
  const refreshSubscriptionRef = useRef(refreshSubscription);
  useEffect(() => { refreshSubscriptionRef.current = refreshSubscription; }, [refreshSubscription]);
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
        try { await refreshSubscriptionRef.current?.(); } catch (e) { console.warn('refreshSubscription:', e?.message); }
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
          setValidating(true);
          try {
            await subscriptionAPI.validateReceipt({
              receipt,
              productId: purchase.productId,
              platform: Platform.OS,
            });
            await RNIap.finishTransaction({ purchase, isConsumable: false });
            setOwnedSubscriptions(prev => [...prev, purchase]);
            // Actualise l'abonnement pour qu'il s'affiche immédiatement (sans redémarrer l'app).
            try { await refreshSubscriptionRef.current?.(); } catch (e) { console.warn('refreshSubscription:', e?.message); }
            Alert.alert(
              'Achat réussi',
              'Votre abonnement a été activé avec succès. Merci !',
            );
          } catch (error) {
            console.error('Receipt validation error:', error);
            Alert.alert('Erreur', 'L\'achat a été effectué mais la validation a échoué. Veuillez restaurer vos achats.');
          } finally {
            setValidating(false);
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

  return (
    <IAPContext.Provider value={value}>
      {children}
      {/* Feedback plein écran pendant l'achat / la validation du reçu */}
      <Modal visible={purchasing || validating} transparent animationType="fade" statusBarTranslucent>
        <View style={overlayStyles.backdrop}>
          <View style={overlayStyles.card}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={overlayStyles.text}>
              {validating ? 'Validation de votre abonnement…' : 'Achat en cours…'}
            </Text>
            <Text style={overlayStyles.subtext}>Merci de patienter, ne fermez pas l'application.</Text>
          </View>
        </View>
      </Modal>
    </IAPContext.Provider>
  );
};

const createOverlayStyles = (colors) => ({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 28, paddingHorizontal: 32, alignItems: 'center', maxWidth: 300, borderWidth: 1, borderColor: colors.border },
  text: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  subtext: { color: colors.textLight, fontSize: 13, marginTop: 8, textAlign: 'center' },
});
