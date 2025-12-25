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
