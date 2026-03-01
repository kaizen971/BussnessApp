import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { subscriptionAPI } from '../services/api';
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
    } else {
      setSubscription(null);
      setPlans([]);
      setLoading(false);
    }
  }, [isAuthenticated, loadSubscription, loadPlans]);

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
    refreshSubscription: loadSubscription,
    premiumScreens: PREMIUM_SCREENS,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};
