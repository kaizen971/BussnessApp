# 📥 Guide d'import CSV

Importez en masse vos **produits**, **stock**, **ventes**, **clients** et **dépenses** depuis un fichier CSV (webapp uniquement, rôles admin / manager / responsable).

## Comment ça marche

1. Ouvrez la page concernée (Produits, Stock, Ventes, Clients ou Dépenses) dans la webapp.
2. Cliquez sur **« Importer CSV »** en haut de page.
3. Téléchargez le **modèle CSV** pré-rempli avec des exemples.
4. Remplissez-le dans Excel, Google Sheets ou LibreOffice (une ligne = un élément).
5. Enregistrez au format **CSV** puis sélectionnez le fichier dans la fenêtre d'import.
6. Cliquez sur **Importer** : un rapport indique les lignes créées et les erreurs éventuelles (avec le numéro de ligne).

### Règles générales du fichier

| Règle | Détail |
|---|---|
| Séparateur | `;` ou `,` (détecté automatiquement) |
| Encodage | UTF-8 (par défaut avec les modèles fournis) |
| Nombres | Point ou virgule acceptés : `12.50` ou `12,50` |
| Dates | `JJ/MM/AAAA`, `JJ/MM/AAAA HH:MM` ou `AAAA-MM-JJ` |
| En-têtes | Obligatoires en 1ʳᵉ ligne — accents et majuscules ignorés (`Catégorie` = `categorie`) |
| Taille | Maximum 2000 lignes de données par fichier |
| Guillemets | Entourez de `"…"` toute valeur contenant `;` `,` ou un retour à la ligne |

Les lignes en erreur sont **ignorées**, les lignes valides sont importées quand même. Le rapport liste chaque erreur avec son numéro de ligne : corrigez ces lignes-là uniquement puis réimportez-les (ne réimportez pas tout le fichier, sinon les lignes déjà importées seront signalées en doublon).

---

## 🏷️ Produits — `modele-produits.csv`

| Colonne | Obligatoire | Description | Exemple |
|---|---|---|---|
| `nom` | ✅ | Nom du produit (unique dans le business) | `T-shirt logo` |
| `prix_vente` | ✅ | Prix de vente unitaire | `25.00` |
| `prix_revient` | ✅ | Prix de revient (coût) | `10.50` |
| `categorie` | — | Catégorie (créée automatiquement si nouvelle) | `Vêtements` |
| `description` | — | Description libre | `Coton bio` |
| `stock_initial` | — | Quantité de départ → crée le stock lié + mouvement d'entrée | `100` |
| `stock_minimum` | — | Seuil d'alerte stock bas | `10` |

```csv
nom;prix_vente;prix_revient;categorie;description;stock_initial;stock_minimum
T-shirt logo;25.00;10.50;Vêtements;Coton bio, tailles S à XL;100;10
Casquette brodée;15.00;6.00;Accessoires;;50;5
Carte cadeau 20;20.00;0;Cartes cadeaux;Valable 1 an;;
```

> 💡 Renseignez `stock_initial` pour créer le produit **et** son stock en une seule fois.

---

## 📦 Stock — `modele-stock.csv`

| Colonne | Obligatoire | Description | Exemple |
|---|---|---|---|
| `produit` | ✅ | Nom de l'article (lié automatiquement au produit du même nom) | `T-shirt logo` |
| `quantite` | ✅ | Quantité à ajouter | `100` |
| `prix_unitaire` | — | Repris du produit du même nom si vide | `25.00` |
| `quantite_min` | — | Seuil d'alerte stock bas | `10` |
| `sku` | — | Code SKU | `TSH-001` |
| `emplacement` | — | Emplacement physique | `Étagère A3` |

```csv
produit;quantite;prix_unitaire;quantite_min;sku;emplacement
T-shirt logo;100;25.00;10;TSH-001;Étagère A3
Casquette brodée;50;;5;CAS-001;Bac B1
```

> ⚠️ Si un article du même nom existe déjà, la quantité importée est **ajoutée** au stock existant (entrée de stock tracée dans l'historique), elle ne remplace pas la quantité actuelle.

---

## 💰 Ventes — `modele-ventes.csv`

| Colonne | Obligatoire | Description | Exemple |
|---|---|---|---|
| `produit` | ✅ | Nom **exact** d'un produit existant | `T-shirt logo` |
| `quantite` | — | Quantité vendue (défaut : 1) | `2` |
| `prix_unitaire` | — | Prix appliqué (défaut : prix du produit) | `25.00` |
| `remise` | — | Remise en montant (défaut : 0) | `5.00` |
| `date` | — | Date de la vente (défaut : maintenant) | `15/06/2026 14:30` |
| `client` | — | Nom du client — créé automatiquement s'il n'existe pas | `Awa Diallo` |
| `description` | — | Note libre | `Vente marché` |

```csv
produit;quantite;prix_unitaire;remise;date;client;description
T-shirt logo;2;25.00;0;15/06/2026 14:30;Awa Diallo;Vente marché de juin
Casquette brodée;1;;2.00;16/06/2026;;
```

À savoir :
- Les produits doivent exister **avant** d'importer les ventes (importez les produits d'abord).
- Les ventes importées vous sont attribuées comme vendeur ; **aucune commission** n'est générée.
- Les points de fidélité des clients sont mis à jour normalement.
- Case à cocher **« Déduire les quantités vendues du stock actuel »** : laissez-la décochée pour un historique de ventes déjà écoulées ; cochez-la si le stock actuel doit être décrémenté (ventes récentes non saisies).

---

## 👥 Clients — `modele-clients.csv`

| Colonne | Obligatoire | Description | Exemple |
|---|---|---|---|
| `nom` | ✅ | Nom du client (unique) | `Awa Diallo` |
| `email` | — | Adresse email | `awa@example.com` |
| `telephone` | — | Téléphone | `+221 77 123 45 67` |
| `remise` | — | Remise personnalisée en % (0 à 100) | `5` |
| `notes` | — | Notes libres | `Cliente fidèle` |

```csv
nom;email;telephone;remise;notes
Awa Diallo;awa@example.com;+221 77 123 45 67;5;Cliente fidèle du samedi
Moussa Ndiaye;;+221 76 987 65 43;;
```

---

## 🧾 Dépenses — `modele-depenses.csv`

| Colonne | Obligatoire | Description | Exemple |
|---|---|---|---|
| `montant` | ✅ | Montant de la dépense (> 0) | `150.00` |
| `categorie` | ✅ | `achat`, `variable` ou `fixe` | `fixe` |
| `description` | — | Description libre | `Loyer boutique juin` |
| `date` | — | Date de la dépense (défaut : aujourd'hui) | `01/06/2026` |

```csv
montant;categorie;description;date
150.00;fixe;Loyer boutique juin;01/06/2026
80.00;achat;Réassort tissus;05/06/2026
25.50;variable;Essence livraisons;12/06/2026
```

Catégories : **achat** = marchandises/matières premières · **variable** = charges qui varient avec l'activité · **fixe** = loyer, abonnements, assurances…

> ℹ️ L'import ne crée pas de dépenses **récurrentes** — pour cela, utilisez le bouton « Nouvelle dépense » avec l'option récurrence.

---

## Ordre conseillé pour démarrer

1. **Produits** (avec `stock_initial` pour créer le stock en même temps)
2. **Clients**
3. **Ventes** (l'historique, case stock décochée)
4. **Dépenses**

## Erreurs fréquentes

| Message | Cause / solution |
|---|---|
| `Colonnes obligatoires manquantes` | La 1ʳᵉ ligne d'en-têtes est absente ou mal orthographiée — repartez du modèle |
| `Le produit "X" existe déjà` | Doublon : la ligne est ignorée, rien à faire si c'est voulu |
| `Produit "X" introuvable` | Import de ventes avant les produits, ou nom différent (l'orthographe doit être identique) |
| `prix_vente invalide` | Valeur non numérique — retirez le symbole monétaire (`25.00`, pas `25 €`) |
| `date invalide` | Utilisez `JJ/MM/AAAA` ou `AAAA-MM-JJ` |

## Détails techniques

- Endpoint : `POST /BussnessApp/import-csv` — body JSON `{ projectId, type, csv, options }` avec `type` ∈ `products | stock | sales | customers | expenses` et `csv` = contenu texte du fichier.
- Réponse : `{ data: { type, total, inserted, updated, errors: [{ line, message }] } }`.
- Accès restreint aux rôles `admin`, `manager`, `responsable`.
- Composant frontend : `webapp/src/components/CsvImportModal.jsx` (modèles générés côté client, définitions dans `CSV_IMPORT_TYPES`).
