# Fonctionnalité d'Import Excel - Documentation Technique

## Vue d'ensemble

La fonctionnalité d'import Excel permet d'importer en masse toutes les données de votre business dans l'application BussnessApp à partir d'un seul fichier Excel structuré.

## Architecture

### Backend

#### Dépendances ajoutées
- `multer` (^1.4.5-lts.1) - Gestion de l'upload de fichiers
- `xlsx` (^0.18.5) - Parsing des fichiers Excel

#### Endpoint API

**POST** `/BussnessApp/import-excel`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
- `file` - Fichier Excel (.xlsx ou .xls)
- `projectId` - ID du projet cible

**Response:**
```json
{
  "success": true,
  "message": "Import Excel terminé avec succès",
  "results": {
    "clients": { "count": 10, "errors": [] },
    "produits": { "count": 25, "errors": [] },
    "stocks": { "count": 25, "errors": [] },
    "ventes": { "count": 150, "errors": [] },
    "depenses": { "count": 30, "errors": [] },
    "employes": { "count": 3, "errors": [] },
    "plannings": { "count": 45, "errors": [] },
    "commissions": { "count": 8, "errors": [] }
  }
}
```

#### Fonctionnalités Backend

1. **Upload sécurisé**
   - Limite de taille: 10 MB
   - Validation du type de fichier (.xlsx, .xls uniquement)
   - Nettoyage automatique du fichier après traitement

2. **Import intelligent**
   - Ordre d'import respectant les dépendances
   - Gestion des erreurs par ligne
   - Continuation de l'import même en cas d'erreurs sur certaines lignes
   - Rapport détaillé des succès et erreurs

3. **Intégration automatique**
   - Mise à jour automatique du stock lors de l'import des ventes
   - Création automatique des commissions si taux défini
   - Création automatique des mouvements de stock
   - Hashage sécurisé des mots de passe des employés

4. **Validation des données**
   - Vérification des champs requis
   - Validation des types de données
   - Vérification de l'existence des relations (produits, clients, employés)

### Frontend

#### Écran ImportScreen

**Localisation:** `/frontend/src/screens/ImportScreen.js`

**Fonctionnalités:**
- Sélection de fichier via `expo-document-picker`
- Affichage des instructions d'utilisation
- Upload du fichier vers le backend
- Affichage des résultats d'import avec:
  - Compteurs de succès par catégorie
  - Liste des erreurs éventuelles
  - Badge visuel pour chaque catégorie

**Navigation:**
- Accessible depuis le Dashboard via le bouton "Import Excel"
- Réservé aux utilisateurs admin/manager

#### Composants utilisés
- `Card` - Carte stylée réutilisable
- `DocumentPicker` - Sélection de documents
- `ActivityIndicator` - Indicateur de chargement
- `Alert` - Alertes natives

## Structure des Feuilles Excel

Le fichier Excel doit contenir jusqu'à 8 feuilles (sheets):

### 1. Clients
- Importation des fiches clients avec historique
- Gestion de la fidélité et des remises

### 2. Produits
- Catalogue de produits avec prix de vente et coût
- Catégorisation et statut actif/inactif

### 3. Stocks
- État du stock avec quantités et alertes
- SKU et emplacements physiques

### 4. Employes
- Création des comptes utilisateurs
- Configuration des taux de commission et salaires horaires
- Attribution des rôles (admin, manager, cashier)

### 5. Ventes
- Historique des ventes avec liens vers produits/clients/employés
- Mise à jour automatique des stocks
- Génération automatique des commissions

### 6. Depenses
- Historique des dépenses par catégorie
- Suivi des coûts fixes et variables

### 7. Plannings
- Planning de travail des employés
- Calcul automatique des durées
- Suivi des statuts (planifié, complété, absent)

### 8. Commissions
- Commissions additionnelles manuelles
- Suivi des paiements (pending/paid)

## Flux d'Import

```
1. Utilisateur sélectionne le fichier Excel
   ↓
2. Upload vers le backend (multipart/form-data)
   ↓
3. Validation du fichier (type, taille)
   ↓
4. Parsing du fichier Excel (xlsx)
   ↓
5. Import séquentiel par ordre de dépendance:
   - Clients
   - Produits
   - Stocks
   - Employés
   - Ventes (+ mise à jour stocks + commissions)
   - Dépenses
   - Plannings
   - Commissions
   ↓
6. Génération du rapport de résultats
   ↓
7. Nettoyage du fichier temporaire
   ↓
8. Affichage des résultats à l'utilisateur
```

## Sécurité

### Backend
- Authentification JWT requise
- Validation du projectId
- Limite de taille de fichier (10 MB)
- Validation du type MIME
- Suppression automatique des fichiers temporaires
- Hashage bcrypt des mots de passe (10 rounds)

### Frontend
- Accès réservé aux administrateurs
- Validation côté client avant upload
- Gestion des erreurs réseau
- Feedback utilisateur en temps réel

## Gestion des Erreurs

### Niveaux d'erreurs

1. **Erreur fatale** - Arrêt complet de l'import
   - Fichier corrompu ou invalide
   - projectId manquant
   - Erreur de connexion base de données

2. **Erreur de ligne** - Ligne ignorée, import continue
   - Données manquantes ou invalides
   - Relations introuvables
   - Erreurs de validation

### Rapport d'erreurs
Chaque erreur contient:
- Numéro de ligne
- Message d'erreur descriptif
- Catégorie concernée

## Performance

### Optimisations
- Import par lots (pas de transaction unique)
- Requêtes optimisées (findOne au lieu de find)
- Nettoyage mémoire (suppression fichier temporaire)
- Pas de chargement complet en mémoire

### Limites
- Taille maximale: 10 MB
- Recommandation: < 5000 lignes par feuille
- Temps d'import moyen: 1-5 secondes pour 1000 lignes

## Tests Recommandés

### Tests unitaires (à implémenter)
- Validation des données
- Parsing Excel
- Gestion des erreurs

### Tests d'intégration
- Import complet avec toutes les feuilles
- Import partiel (quelques feuilles uniquement)
- Import avec erreurs
- Import de gros fichiers

### Tests de sécurité
- Upload de fichiers non-Excel
- Upload de fichiers > 10 MB
- Tentative d'import sans authentification
- Injection de données malveillantes

## Migration et Compatibilité

### Versions Excel supportées
- Excel 2007+ (.xlsx)
- Excel 97-2003 (.xls)
- LibreOffice Calc
- Google Sheets (export en .xlsx)

### Encodage
- UTF-8 recommandé
- Support des caractères spéciaux et accents

## Évolutions Futures

### Court terme
- Export de template Excel vierge
- Validation préalable du fichier
- Aperçu avant import

### Long terme
- Import incrémental (mise à jour)
- Planification d'imports automatiques
- Import depuis CSV
- API d'import pour intégrations tierces
- Rollback en cas d'erreur critique

## Support

Pour tout problème ou question:
1. Consulter le fichier `IMPORT_EXCEL_GUIDE.md`
2. Utiliser le système de Feedback dans l'application
3. Vérifier les logs serveur pour les erreurs détaillées

## Changelog

### Version 1.0.0 (2025-01-09)
- ✨ Première version de la fonctionnalité d'import
- 📊 Support de 8 types de données
- 🔒 Sécurité et validation
- 📱 Interface utilisateur intuitive
- 📝 Documentation complète

---

**Développé pour BussnessApp** 🚀

