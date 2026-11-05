# Offres annuelles EAS

Les écrans Android et web affichent le prix annuel et l'équivalent mensuel FCFA indicatif.

Depuis un environnement autorisé à accéder à MongoDB Atlas, avec `MONGODB_URI` configuré :

```sh
cd backend
node scripts/update-annual-offers.js
node scripts/update-annual-offers.js --apply
```

Le premier appel affiche les changements sans les enregistrer. Le second actualise les tarifs du catalogue (10, 22, 38 et 48 EUR pour un an) et crée EAS Standard + Web avec les limites et fonctionnalités du Standard, plus `webappAccess: true`. Les abonnements et paiements existants ne sont pas réécrits. Le script peut être relancé sans créer de doublon ; éviter les exécutions concurrentes.

Déployer ensuite le web et publier la version Android modifiée. Les achats iOS restent gérés séparément par les produits App Store existants.

Vérification locale : `node tests/annual_offers_test.js`.
