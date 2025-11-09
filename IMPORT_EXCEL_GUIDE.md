# Guide d'Import Excel - BussnessApp

Ce guide explique comment préparer votre fichier Excel pour importer des données dans BussnessApp.

## Format du Fichier

- **Type de fichier:** `.xlsx` ou `.xls`
- **Taille maximale:** 10 MB
- **Structure:** Plusieurs feuilles (sheets) dans un seul fichier

## Feuilles Requises

Votre fichier Excel doit contenir les feuilles suivantes (vous pouvez en omettre certaines si vous n'avez pas de données à importer pour cette catégorie):

### 1. Feuille "Clients"

Contient la liste de vos clients.

**Colonnes requises:**
- `nom` (requis) - Nom du client
- `email` (optionnel) - Email du client
- `telephone` (optionnel) - Numéro de téléphone
- `totalAchats` (optionnel) - Montant total des achats
- `pointsFidelite` (optionnel) - Points de fidélité accumulés
- `niveauFidelite` (optionnel) - Niveau: bronze, silver, gold, platinum
- `remise` (optionnel) - Remise en pourcentage (ex: 5 pour 5%)
- `notes` (optionnel) - Notes supplémentaires

**Exemple:**
```
| nom           | email              | telephone    | totalAchats | pointsFidelite | niveauFidelite | remise | notes                    |
|---------------|-------------------|--------------|-------------|----------------|----------------|--------|--------------------------|
| Jean Dupont   | jean@email.com    | 0612345678   | 1500        | 150            | silver         | 5      | Client régulier          |
| Marie Martin  | marie@email.com   | 0698765432   | 3000        | 300            | gold           | 10     | Préfère les produits bio |
```

---

### 2. Feuille "Produits"

Contient votre catalogue de produits.

**Colonnes requises:**
- `nom` (requis) - Nom du produit
- `prixVente` (requis) - Prix de vente unitaire
- `prixRevient` (requis) - Prix de revient/coût
- `description` (optionnel) - Description du produit
- `categorie` (optionnel) - Catégorie du produit
- `actif` (optionnel) - 1 pour actif, 0 pour inactif (défaut: 1)

**Exemple:**
```
| nom              | prixVente | prixRevient | description           | categorie    | actif |
|------------------|-----------|-------------|-----------------------|--------------|-------|
| Café arabica     | 15.99     | 8.50        | Café pur arabica 250g | Boissons     | 1     |
| Croissant        | 1.50      | 0.60        | Croissant au beurre   | Viennoiserie | 1     |
| Pain complet     | 3.20      | 1.80        | Pain complet 400g     | Boulangerie  | 1     |
```

---

### 3. Feuille "Stocks"

Contient l'état de votre stock.

**Colonnes requises:**
- `nom` (requis) - Nom de l'article
- `quantite` (requis) - Quantité en stock
- `prixUnitaire` (requis) - Prix unitaire
- `quantiteMin` (optionnel) - Quantité minimale d'alerte
- `sku` (optionnel) - Code SKU
- `emplacement` (optionnel) - Emplacement dans l'entrepôt

**Exemple:**
```
| nom              | quantite | prixUnitaire | quantiteMin | sku       | emplacement |
|------------------|----------|--------------|-------------|-----------|-------------|
| Café arabica     | 50       | 8.50         | 10          | CAF-001   | A-12        |
| Croissant        | 30       | 0.60         | 15          | VIE-002   | B-05        |
| Pain complet     | 25       | 1.80         | 10          | BOU-003   | B-08        |
```

---

### 4. Feuille "Employes"

Contient la liste de vos employés.

**Colonnes requises:**
- `username` (requis) - Nom d'utilisateur unique
- `email` (requis) - Email unique
- `nomComplet` (requis) - Nom complet de l'employé
- `role` (optionnel) - Role: admin, manager, cashier (défaut: cashier)
- `tauxCommission` (optionnel) - Taux de commission en % (ex: 5 pour 5%)
- `tauxHoraire` (optionnel) - Salaire horaire en €
- `actif` (optionnel) - 1 pour actif, 0 pour inactif (défaut: 1)
- `motDePasse` (optionnel) - Mot de passe (défaut: BussnessApp2025)

**Exemple:**
```
| username  | email               | nomComplet      | role    | tauxCommission | tauxHoraire | actif | motDePasse    |
|-----------|---------------------|-----------------|---------|----------------|-------------|-------|---------------|
| jdupont   | jdupont@email.com   | Jean Dupont     | cashier | 3              | 12.50       | 1     | password123   |
| mmartin   | mmartin@email.com   | Marie Martin    | manager | 5              | 15.00       | 1     | password456   |
```

**⚠️ Important:** Si un employé existe déjà (même username ou email), il ne sera pas importé.

---

### 5. Feuille "Ventes"

Contient l'historique de vos ventes.

**Colonnes requises:**
- `nomProduit` (requis) - Nom du produit vendu
- `quantite` (requis) - Quantité vendue
- `prixUnitaire` (requis) - Prix unitaire de vente
- `montant` (requis) - Montant total de la vente
- `nomClient` (optionnel) - Nom du client (doit exister dans la feuille Clients)
- `employe` (optionnel) - Username de l'employé (doit exister dans Employes)
- `remise` (optionnel) - Remise appliquée en montant
- `description` (optionnel) - Description de la vente
- `date` (optionnel) - Date de la vente (format: YYYY-MM-DD)

**Exemple:**
```
| nomProduit    | quantite | prixUnitaire | montant | nomClient    | employe | remise | description      | date       |
|---------------|----------|--------------|---------|--------------|---------|--------|------------------|------------|
| Café arabica  | 2        | 15.99        | 31.98   | Jean Dupont  | jdupont | 0      | Vente matinale   | 2025-01-15 |
| Croissant     | 5        | 1.50         | 7.50    | Marie Martin | mmartin | 0      |                  | 2025-01-15 |
| Pain complet  | 1        | 3.20         | 3.20    |              | jdupont | 0      |                  | 2025-01-16 |
```

**Note:** L'import des ventes mettra automatiquement à jour le stock et créera les commissions si l'employé a un taux de commission.

---

### 6. Feuille "Depenses"

Contient vos dépenses.

**Colonnes requises:**
- `montant` (requis) - Montant de la dépense
- `categorie` (requis) - Catégorie: purchase, variable, fixed
- `description` (optionnel) - Description de la dépense
- `date` (optionnel) - Date de la dépense (format: YYYY-MM-DD)

**Exemple:**
```
| montant | categorie | description              | date       |
|---------|-----------|--------------------------|------------|
| 500.00  | purchase  | Achat matières premières | 2025-01-10 |
| 120.00  | variable  | Électricité              | 2025-01-15 |
| 1200.00 | fixed     | Loyer mensuel            | 2025-01-01 |
```

---

### 7. Feuille "Plannings"

Contient les plannings de travail de vos employés.

**Colonnes requises:**
- `employe` (requis) - Username de l'employé
- `date` (requis) - Date du shift (format: YYYY-MM-DD)
- `heureDebut` (requis) - Heure de début (format: HH:MM)
- `heureFin` (requis) - Heure de fin (format: HH:MM)
- `statut` (optionnel) - Statut: scheduled, completed, absent, cancelled (défaut: scheduled)
- `notes` (optionnel) - Notes supplémentaires

**Exemple:**
```
| employe | date       | heureDebut | heureFin | statut    | notes                |
|---------|------------|------------|----------|-----------|----------------------|
| jdupont | 2025-01-20 | 09:00      | 17:00    | completed | Journée complète     |
| mmartin | 2025-01-20 | 08:00      | 16:00    | completed |                      |
| jdupont | 2025-01-21 | 09:00      | 13:00    | scheduled | Demi-journée         |
```

---

### 8. Feuille "Commissions"

Contient les commissions manuelles (en plus de celles générées automatiquement par les ventes).

**Colonnes requises:**
- `employe` (requis) - Username de l'employé
- `montant` (requis) - Montant de la commission
- `taux` (requis) - Taux appliqué en %
- `montantVente` (requis) - Montant de la vente associée
- `statut` (optionnel) - Statut: pending, paid (défaut: pending)
- `date` (optionnel) - Date de la commission (format: YYYY-MM-DD)

**Exemple:**
```
| employe | montant | taux | montantVente | statut  | date       |
|---------|---------|------|--------------|---------|------------|
| jdupont | 15.00   | 5    | 300.00       | paid    | 2025-01-15 |
| mmartin | 25.00   | 5    | 500.00       | pending | 2025-01-16 |
```

---

## Conseils et Bonnes Pratiques

### Ordre d'Import
L'import se fait dans cet ordre pour respecter les dépendances:
1. Clients
2. Produits
3. Stocks
4. Employés
5. Ventes (nécessite Clients, Produits, Employés)
6. Dépenses
7. Plannings (nécessite Employés)
8. Commissions (nécessite Employés)

### Gestion des Erreurs
- Si une ligne contient des erreurs, elle sera ignorée
- Les autres lignes seront quand même importées
- Un rapport d'erreurs sera affiché à la fin de l'import

### Dates
- Format recommandé: `YYYY-MM-DD` (ex: 2025-01-15)
- Excel accepte aussi: `DD/MM/YYYY` ou `MM/DD/YYYY`

### Nombres
- Utilisez le point (.) comme séparateur décimal
- Exemple: 15.99 et non 15,99

### Relations entre les données
- Les noms de produits, clients et employés doivent correspondre exactement
- Respectez la casse (majuscules/minuscules)
- Évitez les espaces en début ou fin de cellule

### Feuilles Optionnelles
Vous pouvez omettre les feuilles pour lesquelles vous n'avez pas de données. Par exemple, si vous n'avez pas de commissions à importer, ne créez pas la feuille "Commissions".

---

## Exemple Complet

Un fichier Excel typique devrait ressembler à ceci:

```
📊 MonImport.xlsx
├── 📄 Clients (10 lignes)
├── 📄 Produits (25 lignes)
├── 📄 Stocks (25 lignes)
├── 📄 Employes (3 lignes)
├── 📄 Ventes (150 lignes)
├── 📄 Depenses (30 lignes)
├── 📄 Plannings (45 lignes)
└── 📄 Commissions (8 lignes)
```

---

## Dépannage

### "Aucun fichier fourni"
➡️ Assurez-vous de sélectionner un fichier Excel (.xlsx ou .xls)

### "projectId est requis"
➡️ Vous devez être connecté et avoir un projet actif

### "Erreur lors de l'import"
➡️ Vérifiez que:
- Les noms de feuilles sont corrects (respectez les majuscules)
- Les noms de colonnes sont corrects
- Les données sont dans le bon format
- Les références entre feuilles sont valides (ex: les produits vendus existent)

### Certaines lignes ne s'importent pas
➡️ Consultez le rapport d'erreurs à la fin de l'import
➡️ Les lignes avec des données manquantes ou invalides sont ignorées

---

## Support

Pour toute question ou problème, utilisez le système de Feedback intégré dans l'application.

**Bonne importation ! 🚀**

