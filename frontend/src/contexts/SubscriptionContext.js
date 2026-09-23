import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { subscriptionAPI, setOnSubscriptionRequired } from '../services/api';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

const PREMIUM_SCREENS = ['Simulation', 'Commissions', 'Stock', 'Customers', 'Planning', 'Team'];

export const SubscriptionProvider = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  // Accès au business (tous les rôles) : { locked, isOwner, reason, offer? } — voir /subscription/access
  const [access, setAccess] = useState(null);
  const [accessChecked, setAccessChecked] = useState(false);

  const loadAccess = useCallback(async () => {
    if (!isAuthenticated) {
      setAccess(null);
      setAccessChecked(false);
      return;
    }
    try {
      const res = await subscriptionAPI.getAccess();
      setAccess(res.data);
    } catch (err) {
      // En cas d'erreur réseau on ne bloque pas : le serveur refuse de toute façon les requêtes (402)
      console.error('Error loading access:', err);
    } finally {
      setAccessChecked(true);
    }
  }, [isAuthenticated]);

  const loadSubscription = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    try {
      const res = await subscriptionAPI.getMySubscription();
      setSubscription(res.data);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setSubscription({ hasSubscription: false, plan: 'free', status: 'none', features: [], maxProjects: 0 });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin]);

  const loadPlans = useCallback(async () => {
    try {
      const res = await subscriptionAPI.getPlans();
      setPlans(res.data);
    } catch (err) {
      console.error('Error loading plans:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSubscription();
      loadPlans();
      loadAccess();
    } else {
      setSubscription(null);
      setPlans([]);
      setAccess(null);
      setAccessChecked(false);
      setLoading(false);
    }
  }, [isAuthenticated, loadSubscription, loadPlans, loadAccess]);

  // Une réponse 402 du serveur (abonnement terminé pendant l'utilisation) rafraîchit l'état d'accès
  useEffect(() => {
    setOnSubscriptionRequired(() => { loadAccess(); });
    return () => setOnSubscriptionRequired(null);
  }, [loadAccess]);

  // Retour dans l'app (ex. après un paiement par le lien reçu par email) : on revérifie
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) loadAccess();
    });
    return () => sub.remove();
  }, [isAuthenticated, loadAccess]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadSubscription(), loadAccess()]);
  }, [loadSubscription, loadAccess]);

  const isPremium = subscription?.hasSubscription === true && subscription?.status === 'active';

  const canAccessScreen = (screenName) => {
    if (!isAdmin) return true;
    if (isPremium) return true;
    return !PREMIUM_SCREENS.includes(screenName);
  };

  const value = {
    subscription,
    plans,
    loading,
    isPremium,
    canAccessScreen,
    refreshSubscription: refreshAll,
    access,
    isLocked: access?.locked === true,
    accessChecked,
    refreshAccess: loadAccess,
    premiumScreens: PREMIUM_SCREENS,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};
