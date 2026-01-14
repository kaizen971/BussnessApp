# 📊 Documentation - Fonctionnalité d'Export Excel

## Vue d'ensemble

La fonctionnalité d'export Excel permet aux administrateurs et responsables d'exporter toutes les données de l'application dans un fichier Excel structuré, pour une période donnée.

## 🎯 Fonctionnalités

### Données exportées

Le fichier Excel généré contient **8 feuilles** avec les données suivantes :

1. **Ventes** - Toutes les transactions de vente
   - Date de vente
   - Produit vendu
   - Client
   - Employé ayant effectué la vente
   - Quantité
   - Prix unitaire
   - Remise
   - Montant total
   - Description

2. **Dépenses** - Toutes les dépenses enregistrées
   - Date
   - Catégorie (Achat / Variable / Fixe)
   - Montant
   - Description

3. **Stocks** - État actuel du stock
   - Nom de l'article
   - Produit lié
   - SKU
   - Quantité disponible
   - Prix unitaire
   - Valeur totale
   - Quantité minimale
   - Emplacement
   - Dernière mise à jour

4. **Employés** - Liste des employés
   - Nom complet
   - Username
   - Email
   - Rôle
   - Taux de commission
   - Commissions totales
   - Taux horaire
   - Statut (Actif/Inactif)
   - Date de création

5. **Commissions** - Historique des commissions
   - Date
   - Employé
   - Montant de la vente
   - Taux de commission
   - Montant de la commission
   - Statut (Payée / En attente)

6. **Salaires** - Détail des salaires basés sur le planning
   - Date
   - Employé
   - Heure de début
   - Heure de fin
   - Durée (heures)
   - Taux horaire
   - Salaire calculé
   - Statut
   - Notes

7. **Clients** - Base de données clients
   - Nom
   - Email
   - Téléphone
   - Achats totaux
   - Points de fidélité
   - Niveau de fidélité
   - Remise personnalisée
   - Dernier achat
   - Date de création
   - Notes

8. **Bilan** - Résumé financier
   - Ventes totales
   - Dépenses totales
   - Commissions totales
   - Salaires totaux
   - Valeur du stock
   - Bénéfice net
   - Statistiques (nombre de ventes, dépenses, articles, clients, employés)
   - Période d'export
   - Date d'export

## 🚀 Utilisation

### Depuis l'application mobile

1. **Accéder à la fonctionnalité**
   - Ouvrez le Dashboard
   - Cliquez sur le bouton "Export Excel" dans la section "Actions rapides"
   - Note : Cette fonctionnalité est uniquement disponible pour les administrateurs et responsables

2. **Sélectionner la période**
   - Date de début : Par défaut, le 1er janvier de l'année en cours
   - Date de fin : Par défaut, la date du jour
   - Cliquez sur les dates pour les modifier

3. **Générer l'export**
   - Cliquez sur "Générer l'export Excel"
   - Attendez la fin de la génération (quelques secondes)
   - Le fichier sera automatiquement partagé via le menu de partage de votre appareil

4. **Enregistrer le fichier**
   - Choisissez où enregistrer le fichier (Drive, Email, Stockage local, etc.)
   - Le fichier est nommé : `export_[ID_PROJET]_[TIMESTAMP].xlsx`

## 🔧 Implémentation technique

### Backend (Node.js + Express)

**Route API** : `POST /BussnessApp/export-excel/:projectId`

**Paramètres** :
- `projectId` : ID du projet (dans l'URL)
- `startDate` : Date de début (ISO format)
- `endDate` : Date de fin (ISO format)

**Bibliothèque utilisée** : `xlsx` (SheetJS)

**Processus** :
1. Récupération des données depuis MongoDB avec filtrage par date
2. Formatage des données pour chaque feuille
3. Création du workbook Excel avec 8 feuilles
4. Génération du buffer Excel
5. Envoi du fichier en réponse

### Frontend (React Native + Expo)

**Composant** : `DashboardScreen.js`

**Bibliothèques utilisées** :
- `expo-file-system` : Téléchargement et gestion des fichiers
- `expo-sharing` : Partage du fichier généré
- `@react-native-community/datetimepicker` : Sélection des dates

**Processus** :
1. Affichage du modal avec sélection de dates
2. Téléchargement du fichier Excel via `FileSystem.downloadAsync`
3. Partage du fichier via `Sharing.shareAsync`
4. Gestion des erreurs et affichage des messages

## 📝 Notes importantes

### Permissions
- Seuls les utilisateurs avec le rôle **admin** ou **manager** peuvent accéder à cette fonctionnalité
- L'authentification JWT est requise pour accéder à la route API

### Performance
- Le temps de génération dépend de la quantité de données
- Pour de grandes périodes avec beaucoup de données, le processus peut prendre quelques secondes
- Les données sont récupérées en parallèle avec `Promise.all` pour optimiser les performances

### Filtrage des données
- **Avec filtrage par date** : Ventes, Dépenses, Commissions, Salaires (planning)
- **Sans filtrage par date** : Stocks, Employés, Clients (état actuel)

### Format des données
- Dates : Format français (DD/MM/YYYY)
- Montants : Format décimal avec 2 chiffres après la virgule + symbole €
- Pourcentages : Format numérique + symbole %

## 🐛 Dépannage

### Le bouton n'apparaît pas
- Vérifiez que vous êtes connecté en tant qu'administrateur ou responsable
- Vérifiez qu'un projet est sélectionné

### Erreur lors de la génération
- Vérifiez votre connexion internet
- Vérifiez que le serveur backend est accessible
- Vérifiez que vous avez des données dans la période sélectionnée

### Le fichier ne se télécharge pas
- Vérifiez les permissions de stockage sur votre appareil
- Essayez de redémarrer l'application
- Vérifiez l'espace de stockage disponible

## 🔄 Évolutions possibles

1. **Filtres avancés**
   - Exporter uniquement certaines feuilles
   - Filtrer par employé spécifique
   - Filtrer par catégorie de produits

2. **Formats supplémentaires**
   - Export PDF
   - Export CSV
   - Export JSON

3. **Planification**
   - Exports automatiques programmés
   - Envoi par email automatique

4. **Personnalisation**
   - Choix des colonnes à exporter
   - Personnalisation du format des données
   - Ajout de graphiques dans l'export

## 📞 Support

Pour toute question ou problème, veuillez créer un ticket dans la section Feedback de l'application.

---

**Version** : 1.0.0  
**Dernière mise à jour** : 9 Novembre 2025

