# Cohérence Produits, Ventes et Stock

Le prix de vente courant vient de `Product.unitPrice`. La valorisation affichée
est la quantité restante multipliée par ce prix (valeur de vente potentielle,
pas une valorisation comptable au coût d'achat).

- Modifier un produit synchronise le nom et le prix des fiches actives liées du même projet.
  Les fiches archivées gardent le nom et le prix présents lors de leur archivage.
- Les lectures Stock reprennent le prix courant en une requête produits groupée :
  cela corrige aussi l'affichage des anciennes divergences, les statistiques et les
  exports, sans migration destructive ni écriture cachée pendant une lecture.
- Les sauvegardes et modifications de fiches liées reprennent aussi le prix du
  produit. Le champ devient non modifiable dans les écrans Stock web et mobile.
- Les anciennes fiches sans productId peuvent être reconnues par leur nom exact
  dans le même projet, uniquement sans homonyme. Les recherches de vente privilégient
  toujours le productId ; une référence explicite à un autre produit est respectée.
  Les imports CSV refusent les noms ambigus de produits ou de fiches de stock
  avec une erreur de ligne, plutôt que de choisir arbitrairement une référence.
- Les ventes (`unitPrice`, `amount`) et mouvements existants ne sont pas recalculés.
  Le décompte physique reste fondé sur les quantités, indépendamment du prix.

`DELETE /stock/:id` archive désormais la fiche (`archivedAt`) en conservant sa
quantité, ses mouvements et toutes les ventes. Les fiches archivées sont exclues
des listes actives, statistiques, exports, imports et recherches pour nouvelles
ventes. Le produit reste disponible au catalogue, conformément au fonctionnement
existant qui autorise les ventes sans fiche de stock.

Un remboursement retrouve le stock débité grâce au mouvement de vente initial,
y compris si cette fiche est archivée et qu'une nouvelle fiche a été créée. Il
ne réactive pas la fiche archivée. Sans mouvement d'origine (anciennes ventes),
la recherche de secours porte sur le stock actif du produit. L'historique global
`GET /stock-movements` conserve le nom de la fiche archivée via populate explicite.
L'API `GET /stock/:id/movements` autorise aussi la consultation d'une archive,
avec contrôle d'accès au projet. Il n'y a pas encore d'écran de restauration des archives.

## Conséquences et limites de la correction

- Archiver une fiche avec une quantité positive retire cette quantité et sa valeur
  des totaux actifs. Les écrans de confirmation indiquent désormais cette conséquence.
- Un remboursement dans une archive n'augmente pas le stock disponible à la vente.
  Un retour physique destiné à la vente doit faire l'objet d'une entrée manuelle
  dans la fiche active ; l'archive reste une trace historique.
- Le prix d'un stock lié n'est plus indépendant, y compris pour un import CSV :
  le prix du produit prévaut sur le prix transmis pour le stock.
- La résolution des prix ajoute une requête produits groupée aux lectures de stock.
  Les rattachements anciens par nom demandent des recherches supplémentaires ;
  aucune mesure de performance sur un gros catalogue n'a été effectuée.
- Les flux vente/remboursement restent constitués d'écritures successives, sans
  transaction commune. Ce risque préexistant n'est pas résolu ici : une panne au
  milieu du traitement peut laisser une vente enregistrée sans tous ses mouvements.
  Les écritures concurrentes de quantités et remboursements demandent une recette
  distincte. Les tests mémoire ne prouvent ni l'atomicité ni les performances MongoDB.
- La suppression physique d'un produit reste un comportement existant. Le
  remboursement tolère maintenant l'absence du produit en utilisant sa référence
  originale et le mouvement de vente, mais le nom du produit supprimé n'est pas
  restauré dans les anciennes ventes : un archivage produit serait un chantier séparé.

Vérification locale : `node --test backend/tests/stock_consistency_test.js`.
Les tests utilisent les vrais middlewares Mongoose avec un pilote mémoire ; ils
n'accèdent à aucune base distante. La recette après déploiement doit vérifier :
10 unités à 300, une vente à 300, passage à 500 (9 × 500), vente à 500
(8 × 500), retrait du stock, création d'une nouvelle fiche puis remboursement de
la première vente : remboursement de 300 et une unité ajoutée exclusivement
à l'ancienne fiche archivée ; nouvelle fiche inchangée et historique conservé.
