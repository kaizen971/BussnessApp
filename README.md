# BussnessApp

Application React Native Expo avec backend Node.js pour la gestion de projets business.

## Description

Application simple et intuitive pour porteurs de projet et commerçants permettant de :
- Valider la rentabilité (business plan simplifié)
- Gérer ventes/dépenses/stock/bénéfices au quotidien
- Suivre la relation client (historique, remises, fidélité)
- Donner des accès différenciés (admin/responsable/caissier)

## Structure du projet

```
BussnessApp/
├── frontend/          # Application Expo React Native
│   ├── App.js
│   ├── package.json
│   └── ...
├── backend/           # Serveur Node.js Express
│   ├── server.js
│   ├── package.json
│   ├── .env
│   └── ...
└── README.md
```

## Installation

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## Configuration

### Backend (.env)
```
MONGODB_URI=mongodb://kaizen971:secret@192.168.1.72:27017/
PORT=3001
JWT_SECRET=bussnessapp_secret_key_2025
```

### API URL
- **Local**: http://localhost:3001/BussnessApp
- **Public**: https://mabouya.servegame.com/BussnessApp/BussnessApp

## Lancement

### Backend
```bash
cd backend && npm start
```

### Frontend
```bash
cd frontend
npm run android  # Pour Android
npm run ios      # Pour iOS
npm run web      # Pour Web
```

## Modules

### 1. Simulation
- Saisie des coûts (achat, variables, fixes)
- Prix de vente et volumes
- Calcul marge, point mort, bénéfice
- Export PDF

### 2. Gestion opérationnelle
- Tableau de bord (trésorerie, ventes, dépenses, stock, marge nette)
- Ajout de ventes/dépenses
- Gestion des stocks
- Création d'utilisateurs et permissions
- CRM client avec historique et offres promotionnelles

## API Endpoints

### Projects
- `GET /BussnessApp/projects` - Liste des projets
- `POST /BussnessApp/projects` - Créer un projet
- `GET /BussnessApp/projects/:id` - Détails d'un projet
- `PUT /BussnessApp/projects/:id` - Modifier un projet
- `DELETE /BussnessApp/projects/:id` - Supprimer un projet

### Sales
- `GET /BussnessApp/sales` - Liste des ventes
- `POST /BussnessApp/sales` - Ajouter une vente

### Expenses
- `GET /BussnessApp/expenses` - Liste des dépenses
- `POST /BussnessApp/expenses` - Ajouter une dépense

### Stock
- `GET /BussnessApp/stock` - Liste du stock
- `POST /BussnessApp/stock` - Ajouter un article
- `PUT /BussnessApp/stock/:id` - Modifier un article
- `DELETE /BussnessApp/stock/:id` - Supprimer un stock et ses mouvements manuels (refusé si lié à une vente)

### Customers
- `GET /BussnessApp/customers` - Liste des clients
- `POST /BussnessApp/customers` - Ajouter un client
- `PUT /BussnessApp/customers/:id` - Modifier un client

### Users
- `GET /BussnessApp/users` - Liste des utilisateurs
- `POST /BussnessApp/users` - Créer un utilisateur

### Authentication
- `POST /BussnessApp/auth/register` - Inscription
- `POST /BussnessApp/auth/login` - Connexion
- `GET /BussnessApp/auth/me` - Profil utilisateur
- `POST /BussnessApp/auth/change-password` - Changer mot de passe

### Feedback
- `GET /BussnessApp/feedback` - Liste des feedbacks
- `POST /BussnessApp/feedback` - Soumettre un feedback
- `PUT /BussnessApp/feedback/:id` - Modifier statut (admin/manager only)

### Dashboard
- `GET /BussnessApp/dashboard/:projectId` - Statistiques du projet

## Rôles et Permissions

### Admin
- Accès complet à toutes les fonctionnalités
- Gestion des utilisateurs et permissions
- Modification des feedbacks

### Manager (Responsable)
- Gestion des ventes, dépenses et stock
- Accès au CRM clients
- Modification des feedbacks
- Consultation des statistiques

### Cashier (Caissier)
- Enregistrement des ventes
- Consultation du stock
- Accès limité aux statistiques

## Configuration Caddy

Le Caddyfile a été mis à jour avec :
```caddy
handle_path /BussnessApp* {
  reverse_proxy 192.168.1.72:3001
}
```

## Technologies

### Frontend
- React Native + Expo
- React Navigation (Stack Navigator)
- Axios (API calls)
- AsyncStorage (local storage)
- Expo Vector Icons
- Expo Linear Gradient
- React Context API (AuthContext)

### Backend
- Node.js + Express
- MongoDB + Mongoose
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)
- CORS
- dotenv

## Écrans Disponibles

1. **Login** - Connexion utilisateur
2. **Register** - Inscription nouveau compte
3. **Dashboard** - Tableau de bord avec statistiques
4. **Simulation** - Business plan simplifié
5. **Sales** - Gestion des ventes
6. **Customers** - CRM clients
7. **Feedback** - Système de feedback

## Améliorations UI/UX

- Design moderne avec couleurs cohérentes
- Cartes avec ombres et bordures arrondies
- Icônes expressives (Ionicons)
- Formulaires avec validation
- Modales fluides
- Navigation intuitive
- Boutons FAB (Floating Action Button)
- Gradient backgrounds
- États de chargement
- Messages d'erreur clairs

## Suivi des connexions et inactivité

Le backoffice affiche la dernière connexion dans la liste des administrateurs. La fiche d’un
administrateur propose un onglet **Connexions** pour le propriétaire et les membres de ses
business. L’onglet **Activité** présente les 50 derniers événements, dont les connexions et
les actions de gestion du compte. Les nouveaux compteurs et journaux commencent à la mise
en place du suivi ; les anciennes dates de dernière connexion sont conservées.

Une connexion avec mot de passe met à jour les dates et incrémente le compteur. Un
renouvellement de session met uniquement à jour l’activité. Les requêtes authentifiées
enregistrent aussi l’activité, au plus toutes les 15 minutes par utilisateur.

Dans **Tableau de bord → Suivi d’activité clients → Réglages**, le seuil par défaut est de
14 jours (réglable de 1 à 365 jours). L’activité du propriétaire, de son équipe non archivée,
les ventes et les mouvements de stock sont pris en compte. La vérification s’exécute au
démarrage et toutes les heures, ou via **Vérifier maintenant**.

Les notifications d’inactivité par e-mail sont activées par défaut et peuvent être
désactivées séparément. Elles sont destinées aux super-admins actifs et utilisent le SMTP
existant. Un destinataire déjà notifié n’est pas relancé pendant la même période
d’inactivité, même après acquittement dans le backoffice. Les échecs d’envoi restent en
attente et sont réessayés au passage suivant. Une reprise d’activité clôture l’alerte.

## Mobile Money dans le mail de renouvellement

Ce mail est indépendant des alertes d’inactivité. Les offres envoyées en fin d’essai ou
d’abonnement et les offres renvoyées depuis la fiche client proposent :

- MTN Mobile Money : **+229 01 59 50 77 54** ;
- Celtiis Cash : **+229 01 93 33 67 67** ;
- le motif obligatoire **EAS suivi de l’adresse e-mail du compte** ;
- le paiement par carte Stripe existant et les contacts WhatsApp Bénin / France fournis.

Le montant en FCFA est arrondi au franc, avec la même parité EUR/XOF que les applications
([source BCEAO](https://www.bceao.int/fr/content/histoire-du-franc-cfa)). Un tarif déjà en
XOF est conservé. Pour une autre devise, le mail invite à confirmer le montant avec
l’équipe. Le paiement Mobile Money doit être vérifié puis l’abonnement activé manuellement
dans le backoffice. Le mail n’effectue aucune confirmation de transfert automatique.
`SMTP_REPLY_TO` permet de choisir l’adresse recevant les réponses ; à défaut, `SMTP_USER`
est utilisé.

Tests locaux de ces deux fonctionnalités (sans envoi d’e-mail ni accès à une base réelle) :

```bash
cd backend
node --test tests/activity_alerts_test.js tests/activity_workflow_test.js tests/subscription_access_test.js tests/subscription_expiry_test.js
```
