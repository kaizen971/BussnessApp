# Système d'abonnement - BussnessApp

Documentation complète du système de gestion des abonnements, de la base de données au frontend mobile en passant par l'intégration Stripe.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture](#2-architecture)
3. [Modèles de données](#3-modèles-de-données)
4. [Flux de paiement](#4-flux-de-paiement)
5. [Back-office (Super-admin)](#5-back-office-super-admin)
6. [Application mobile](#6-application-mobile)
7. [Intégration Stripe](#7-intégration-stripe)
8. [Contrôle d'accès et limites](#8-contrôle-daccès-et-limites)
9. [Endpoints API](#9-endpoints-api)
10. [Configuration](#10-configuration)

---

## 1. Vue d'ensemble

Le système d'abonnement permet au super-admin de :
- Définir des **plans d'abonnement** configurables (Basic, Premium, etc.)
- Créer des **admins** (propriétaires de business) avec un plan et une méthode de paiement
- Gérer le **cycle de vie** des abonnements (activation, suspension, expiration)
- Contrôler les **limites** (nombre de business, accès aux fonctionnalités premium)

Côté utilisateur mobile :
- Voir son **plan actuel** et les jours restants
- Comparer les **plans disponibles**
- Être bloqué par un **paywall** sur les fonctionnalités premium si non souscrit

### Principes clés

| Principe | Description |
|----------|-------------|
| L'app est gratuite | Tout le monde peut se connecter et utiliser les fonctions de base |
| Le super-admin pilote | C'est le super-admin qui crée les comptes et gère les abonnements |
| 2 modes de paiement | Carte (Stripe) ou Espèces/Don (manuel) |
| Limites par plan | Nombre de business et accès aux fonctionnalités selon le plan |

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        SUPER-ADMIN                           │
│                     (Back-office web)                         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │ Gérer Plans │  │ Créer Admin │  │ Gérer Abonnements    │ │
│  │ (CRUD)      │  │ + Plan      │  │ (activer/suspendre)  │ │
│  └─────────────┘  └──────┬──────┘  └──────────────────────┘ │
└───────────────────────────┼──────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────▼─────┐ ┌────▼────┐ ┌──────▼──────┐
        │  Paiement  │ │ Espèces │ │    Don      │
        │  par carte │ │  (cash) │ │ (donation)  │
        └─────┬─────┘ └────┬────┘ └──────┬──────┘
              │             │             │
        ┌─────▼─────┐      │             │
        │  Stripe   │      │             │
        │ Checkout  │      │             │
        └─────┬─────┘      │             │
              │             │             │
        ┌─────▼─────┐ ┌────▼─────────────▼────┐
        │ Webhook   │ │  Activation immédiate  │
        │ confirme  │ │  + envoi identifiants  │
        └─────┬─────┘ └────┬──────────────────┘
              │             │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │  ADMIN      │
              │  (App mobile)│
              │              │
              │  Plan actif  │
              │  = accès     │
              │  complet     │
              └──────────────┘
```

---

## 3. Modèles de données

### SubscriptionPlan (Plan d'abonnement)

Défini dans `backend/backoffice.js`. Représente un plan que le super-admin peut configurer.

| Champ | Type | Description |
|-------|------|-------------|
| `name` | String (requis) | Nom du plan (ex: "Basic", "Premium") |
| `description` | String | Description libre |
| `price` | Number (requis) | Prix du plan |
| `currency` | String | Devise, défaut `EUR` |
| `duration` | Number (requis) | Durée numérique (ex: 1, 3, 12) |
| `durationType` | Enum | `days`, `months`, `years`, `lifetime` |
| `maxProjects` | Number | Nombre max de business, défaut 1 |
| `features` | [String] | Liste des fonctionnalités incluses |
| `isRecurring` | Boolean | Renouvellement automatique Stripe |
| `isActive` | Boolean | Plan disponible à l'attribution |
| `sortOrder` | Number | Ordre d'affichage |

### Subscription (Abonnement)

Lie un admin à un plan avec un suivi de statut et paiement.

| Champ | Type | Description |
|-------|------|-------------|
| `adminId` | ObjectId → User | L'admin concerné |
| `planId` | ObjectId → SubscriptionPlan | Le plan souscrit |
| `planName` | String | Nom du plan (cache) |
| `status` | Enum | Statut actuel (voir ci-dessous) |
| `startDate` | Date | Date de début |
| `endDate` | Date | Date de fin (calculée automatiquement) |
| `amount` | Number | Montant payé |
| `duration` / `durationType` | Number / Enum | Durée de l'abonnement |
| `maxProjects` | Number | Limite de business |
| `paymentMethod` | Enum | `card`, `cash`, `donation` |
| `stripeSessionId` | String | ID session Stripe Checkout |
| `stripeCustomerId` | String | ID client Stripe |
| `stripeSubscriptionId` | String | ID abonnement récurrent Stripe |
| `createdBy` | ObjectId → SuperAdmin | Qui a créé l'abonnement |

#### Statuts d'abonnement

```
pending_payment ──► active ──► expired
                      │
                      ├──► cancelled
                      │
                      └──► suspended (paiement échoué)
```

| Statut | Signification |
|--------|--------------|
| `pending_payment` | En attente de paiement carte (Stripe) |
| `active` | Actif, l'admin peut utiliser l'app |
| `expired` | La date de fin est dépassée |
| `cancelled` | Annulé manuellement ou via Stripe |
| `suspended` | Suspendu pour défaut de paiement |

### Payment (Paiement)

Trace chaque transaction financière.

| Champ | Type | Description |
|-------|------|-------------|
| `subscriptionId` | ObjectId → Subscription | Abonnement lié |
| `adminId` | ObjectId → User | Admin concerné |
| `amount` | Number | Montant |
| `paymentMethod` | Enum | `card`, `cash`, `donation` |
| `status` | Enum | `pending`, `completed`, `failed`, `refunded` |
| `stripePaymentIntentId` | String | Référence Stripe |
| `paidAt` | Date | Date effective du paiement |

---

## 4. Flux de paiement

### Flux Carte (Stripe)

```
1. Super-admin crée l'admin avec paymentMethod: "card"
          │
2. Backend crée une session Stripe Checkout
   (mode: subscription ou payment selon isRecurring)
          │
3. Email envoyé à l'admin avec le lien de paiement Stripe
          │
4. Admin clique sur le lien et paie
          │
5. Stripe envoie le webhook "checkout.session.completed"
          │
6. Backend reçoit le webhook :
   - Active l'abonnement (status → active)
   - Calcule startDate et endDate
   - Active le compte admin (isActive → true)
   - Crée un enregistrement Payment (status: completed)
   - Génère un mot de passe temporaire
   - Envoie les identifiants par email
   - Notifie les super-admins
          │
7. Admin se connecte à l'app mobile
```

### Flux Espèces / Don

```
1. Super-admin crée l'admin avec paymentMethod: "cash" ou "donation"
          │
2. Backend active immédiatement :
   - Admin créé avec isActive: true
   - Abonnement avec status: "active"
   - startDate = maintenant, endDate = calculée
   - Payment enregistré (status: completed)
          │
3. Email envoyé à l'admin avec ses identifiants
          │
4. Admin se connecte à l'app mobile
```

---

## 5. Back-office (Super-admin)

### Gestion des plans (`PlansPage.jsx`)

Le super-admin peut :
- **Créer** un plan avec nom, prix, durée, nombre max de business, fonctionnalités
- **Modifier** un plan existant
- **Activer/Désactiver** un plan (un plan désactivé n'est plus attribuable)
- **Supprimer** un plan (uniquement s'il n'a aucun abonnement actif)

### Création d'un admin (`CreateAdminPage.jsx`)

Formulaire multi-étapes :
1. **Informations** : nom, email, mot de passe
2. **Plan** : sélection du plan d'abonnement
3. **Paiement** : choix de la méthode (carte, espèces, don)
4. **Résumé** : confirmation avant création

### Gestion des abonnements (`SubscriptionsPage.jsx`)

Vue tabulaire de tous les abonnements avec :
- Filtrage par statut
- Changement de statut (activer, suspendre, annuler)
- Impact automatique sur le compte admin (désactivation si suspension)

### Tableau de bord (`DashboardPage.jsx`)

Statistiques en temps réel :
- Nombre total d'admins (actifs / inactifs)
- Nombre d'abonnements par statut
- Répartition des méthodes de paiement
- Revenus totaux

---

## 6. Application mobile

### Contexte d'abonnement (`SubscriptionContext.js`)

Fournit à toute l'app :

| Propriété / Méthode | Description |
|---------------------|-------------|
| `subscription` | Objet abonnement de l'utilisateur connecté |
| `plans` | Liste des plans disponibles |
| `isPremium` | `true` si l'abonnement est actif |
| `canAccessScreen(name)` | Vérifie si l'utilisateur peut accéder à un écran |
| `refreshSubscription()` | Recharge les données d'abonnement |

### Écrans premium (protégés par paywall)

Les écrans suivants nécessitent un abonnement actif pour les admins :

| Écran | Fonctionnalité |
|-------|---------------|
| `Simulation` | Simulation Business Plan |
| `Stock` | Gestion de stock avancée |
| `Customers` | CRM Clients |
| `Team` | Gestion d'équipe |
| `Planning` | Planning des employés |
| `Commissions` | Commissions |

> Les non-admins (salariés, cashiers) ont toujours accès, car c'est l'admin qui paie.

### Écran Abonnement (`SubscriptionScreen.js`)

Affiche :
- **Carte du plan actuel** : nom, statut, jours restants, barre de progression, max business
- **Fonctionnalités incluses** du plan
- **Comparaison des plans** disponibles avec prix, durée, fonctionnalités
- **Contact admin** : message expliquant comment changer de plan

### Paywall (`PaywallScreen.js`)

S'affiche quand un admin sans abonnement actif tente d'accéder à un écran premium :
- Icône de cadenas
- Liste des fonctionnalités premium
- Carte du plan Premium recommandé
- Boutons : "Voir mon abonnement" / "Retour"

### PremiumGate (HOC dans `App.js`)

Composant Higher-Order qui enveloppe les écrans premium :

```javascript
function PremiumGate(WrappedComponent, screenName, featureName) {
  return function GatedScreen(props) {
    const { canAccessScreen } = useSubscription();
    if (!canAccessScreen(screenName)) {
      return <PaywallScreen {...props} />;
    }
    return <WrappedComponent {...props} />;
  };
}
```

### Bannière Dashboard

Le `DashboardScreen` affiche une bannière dynamique :
- **Admin Premium** : affiche "Plan Premium" en doré
- **Admin sans abonnement** : affiche "Passer au Premium" pour inciter à la souscription

---

## 7. Intégration Stripe

### Création de session Checkout

Lors de la création d'un admin avec paiement carte, le backend crée une session Stripe :

```
Mode récurrent (isRecurring: true)
  → mode: "subscription"
  → Stripe crée un Price et un Product automatiquement
  → Facturation récurrente (mensuelle/annuelle)

Mode ponctuel (isRecurring: false)
  → mode: "payment"
  → Paiement unique
```

### Webhooks

Le endpoint `POST /BussnessApp/backoffice/stripe/webhook` traite :

| Événement | Action |
|-----------|--------|
| `checkout.session.completed` | Active l'abonnement, active l'admin, envoie les identifiants |
| `customer.subscription.deleted` | Passe l'abonnement en `cancelled` |
| `customer.subscription.updated` | Si `unpaid`/`past_due` → suspend l'abonnement et désactive l'admin |

### Renvoi de lien de paiement

Si un admin n'a pas encore payé, le super-admin peut renvoyer le lien de paiement via le back-office (`POST /admins/:id/resend-payment-link`).

---

## 8. Contrôle d'accès et limites

### Limite de projets (business)

À la création d'un projet (`POST /BussnessApp/projects`) :

```
1. Récupérer l'abonnement actif de l'admin
2. Compter ses projets existants
3. Si projets >= maxProjects → Erreur 403
   {
     "error": "Limite atteinte : votre abonnement autorise X business maximum",
     "code": "PROJECT_LIMIT_REACHED",
     "maxProjects": X,
     "currentProjects": Y
   }
```

### Accès aux écrans

```
canAccessScreen(screenName):
  ├── Utilisateur non-admin (salarié) ? → Accès autorisé
  ├── Utilisateur premium (isPremium) ?  → Accès autorisé
  ├── Écran dans PREMIUM_SCREENS ?       → Accès refusé → Paywall
  └── Sinon                              → Accès autorisé
```

### Expiration automatique

À chaque appel de `GET /subscription/my` :
- Si `endDate < maintenant` et `status === 'active'` → passage automatique en `expired`

### Désactivation admin

Quand un abonnement est suspendu ou annulé :
- Le champ `isActive` de l'admin passe à `false`
- L'admin ne peut plus se connecter à l'application
- Le super-admin peut réactiver manuellement depuis le back-office

---

## 9. Endpoints API

### Back-office (préfixe `/BussnessApp/backoffice`)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/plans` | Lister tous les plans |
| GET | `/plans/active` | Plans actifs uniquement |
| GET | `/plans/:id` | Détail d'un plan |
| POST | `/plans` | Créer un plan |
| PUT | `/plans/:id` | Modifier un plan |
| DELETE | `/plans/:id` | Supprimer un plan |
| GET | `/subscriptions` | Lister les abonnements |
| PUT | `/subscriptions/:id/status` | Changer le statut |
| GET | `/payments` | Lister les paiements |
| POST | `/admins` | Créer un admin + abonnement |
| POST | `/admins/:id/resend-payment-link` | Renvoyer le lien de paiement |
| POST | `/stripe/webhook` | Webhook Stripe |

### Application mobile (préfixe `/BussnessApp`)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/subscription/my` | Oui | Mon abonnement actuel |
| GET | `/subscription/plans` | Non | Plans disponibles |

---

## 10. Configuration

### Variables d'environnement requises

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=votre_secret_jwt

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre@email.com
SMTP_PASS=votre_mot_de_passe_app

# URLs
FRONTEND_URL=https://votre-app.com
BACKOFFICE_URL=https://admin.votre-app.com
```

### Configurer le webhook Stripe

1. Aller sur le [Dashboard Stripe](https://dashboard.stripe.com/webhooks)
2. Ajouter un endpoint : `https://votre-domaine.com/BussnessApp/backoffice/stripe/webhook`
3. Sélectionner les événements :
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copier le **Signing Secret** dans la variable `STRIPE_WEBHOOK_SECRET`

### Créer le premier super-admin

Le premier super-admin doit être créé manuellement :

```bash
node -e "
  require('dotenv').config();
  const mongoose = require('mongoose');
  const bcrypt = require('bcryptjs');
  mongoose.connect(process.env.MONGODB_URI, { dbName: 'BussnessApp' }).then(async () => {
    const SuperAdmin = mongoose.model('SuperAdmin');
    const hash = await bcrypt.hash('votre_mot_de_passe', 10);
    await SuperAdmin.create({
      username: 'superadmin',
      email: 'admin@votre-domaine.com',
      password: hash,
      role: 'super_admin'
    });
    console.log('Super-admin créé');
    process.exit(0);
  });
"
```
