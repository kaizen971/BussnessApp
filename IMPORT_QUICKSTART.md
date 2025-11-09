# Guide Rapide - Import Excel 🚀

## En 3 étapes simples

### 1️⃣ Préparer votre fichier Excel

Créez un fichier Excel (.xlsx) avec les feuilles suivantes :

```
📊 MonFichier.xlsx
├── Clients        (nom, email, telephone, ...)
├── Produits       (nom, prixVente, prixRevient, ...)
├── Stocks         (nom, quantite, prixUnitaire, ...)
├── Employes       (username, email, nomComplet, ...)
├── Ventes         (nomProduit, quantite, montant, ...)
├── Depenses       (montant, categorie, ...)
├── Plannings      (employe, date, heureDebut, heureFin, ...)
└── Commissions    (employe, montant, taux, ...)
```

**💡 Astuce :** Toutes les feuilles sont optionnelles. N'incluez que celles dont vous avez besoin !

### 2️⃣ Importer dans l'application

1. Ouvrez l'application BussnessApp
2. Connectez-vous avec un compte **Admin** ou **Manager**
3. Sur le **Dashboard**, cliquez sur **"Import Excel"**
4. Sélectionnez votre fichier
5. Cliquez sur **"Importer les données"**

### 3️⃣ Vérifier les résultats

L'application affiche un rapport complet avec :
- ✅ Nombre d'éléments importés par catégorie
- ⚠️ Liste des erreurs éventuelles
- 📊 Résumé global de l'import

---

## Format des colonnes

### Feuille "Clients"
| nom (requis) | email | telephone | totalAchats | pointsFidelite | niveauFidelite | remise | notes |

### Feuille "Produits"
| nom (requis) | prixVente (requis) | prixRevient (requis) | description | categorie | actif |

### Feuille "Stocks"
| nom (requis) | quantite (requis) | prixUnitaire (requis) | quantiteMin | sku | emplacement |

### Feuille "Employes"
| username (requis) | email (requis) | nomComplet (requis) | role | tauxCommission | tauxHoraire | actif | motDePasse |

### Feuille "Ventes"
| nomProduit (requis) | quantite (requis) | prixUnitaire (requis) | montant (requis) | nomClient | employe | remise | description | date |

### Feuille "Depenses"
| montant (requis) | categorie (requis) | description | date |

**Catégories valides :** `purchase`, `variable`, `fixed`

### Feuille "Plannings"
| employe (requis) | date (requis) | heureDebut (requis) | heureFin (requis) | statut | notes |

**Format heures :** HH:MM (ex: 09:00)  
**Format date :** YYYY-MM-DD (ex: 2025-01-15)

### Feuille "Commissions"
| employe (requis) | montant (requis) | taux (requis) | montantVente (requis) | statut | date |

---

## ⚡ Conseils

### ✅ À faire
- Commencer par un petit fichier de test
- Respecter l'ordre des colonnes
- Utiliser le format de date YYYY-MM-DD
- Utiliser le point (.) pour les décimales : 15.99

### ❌ À éviter
- Fichiers > 10 MB
- Virgule pour les décimales : ~~15,99~~
- Espaces en début/fin de cellule
- Caractères spéciaux dans les noms de feuilles

---

## 🎯 Exemple Minimal

Un fichier Excel minimal pour démarrer :

**Feuille "Clients"**
```
| nom           | email              | telephone    |
|---------------|-------------------|--------------|
| Jean Dupont   | jean@email.com    | 0612345678   |
| Marie Martin  | marie@email.com   | 0698765432   |
```

**Feuille "Produits"**
```
| nom              | prixVente | prixRevient |
|------------------|-----------|-------------|
| Café arabica     | 15.99     | 8.50        |
| Croissant        | 1.50      | 0.60        |
```

**Feuille "Stocks"**
```
| nom              | quantite | prixUnitaire |
|------------------|----------|--------------|
| Café arabica     | 50       | 8.50         |
| Croissant        | 30       | 0.60         |
```

C'est tout ! Vous pouvez maintenant importer ce fichier. 🎉

---

## 🆘 Problèmes fréquents

### "Aucun fichier fourni"
➡️ Vérifiez que vous avez bien sélectionné un fichier .xlsx ou .xls

### "projectId est requis"
➡️ Assurez-vous d'être connecté et d'avoir un projet actif

### Certaines lignes ne s'importent pas
➡️ Consultez le rapport d'erreurs pour voir les détails
➡️ Vérifiez que les colonnes requises sont remplies

### "Produit non trouvé" dans les ventes
➡️ Assurez-vous que le produit existe dans la feuille "Produits"
➡️ Le nom doit correspondre exactement (même casse)

---

## 📚 Besoin de plus d'aide ?

- 📖 **Guide complet :** Consultez `IMPORT_EXCEL_GUIDE.md`
- 🔧 **Documentation technique :** Consultez `IMPORT_FEATURE.md`
- 💬 **Support :** Utilisez le système de Feedback dans l'application

---

**Bonne importation ! 🚀**

*Développé avec ❤️ pour BussnessApp*

