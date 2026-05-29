import { Platform } from 'react-native';

export const IAP_PRODUCT_IDS = Platform.select({
  ios: [
    'com.kaizen971.eas.basic.yearly',
    'com.kaizen971.eas.standard.yearly',
    'com.kaizen971.eas.premium.yearly',
  ],
  android: [],
});

export const IAP_SUBSCRIPTION_IDS = Platform.select({
  ios: [
    'com.kaizen971.eas.basic.yearly',
    'com.kaizen971.eas.standard.yearly',
    'com.kaizen971.eas.premium.yearly',
  ],
  android: [],
});

export const PLAN_DISPLAY_INFO = {
  'com.kaizen971.eas.basic.yearly': {
    tier: 'basic',
    label: 'EAS Basic',
    icon: 'star-outline',
    gradient: ['#D4AF37', '#B8941E'],
    maxProjects: 1,
    features: [
      '1 Business max',
      '1 admin + 1 salarié max',
      'Gestion des ventes et dépenses',
    ],
  },
  'com.kaizen971.eas.standard.yearly': {
    tier: 'standard',
    label: 'EAS Standard',
    icon: 'rocket-outline',
    gradient: ['#6C63FF', '#4A42D4'],
    badge: 'Populaire',
    maxProjects: 3,
    features: [
      '3 Business max',
      '10 salariés max',
      'Toutes les fonctionnalités',
      'Base clients & export',
    ],
  },
  'com.kaizen971.eas.premium.yearly': {
    tier: 'premium',
    label: 'EAS Premium',
    icon: 'diamond-outline',
    gradient: ['#8B5CF6', '#6D28D9'],
    badge: 'Meilleure offre',
    maxProjects: 100,
    features: [
      '100 Business max',
      'Nombre de salariés illimité',
      'Accès à toutes les fonctionnalités',
      'Évolutions prioritaires',
    ],
  },
};
