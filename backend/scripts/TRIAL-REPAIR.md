# Correction des essais et des offres de renouvellement

Les inscriptions sans offre choisie reçoivent désormais le plan gratuit actif en
jours, ou un essai de sept jours si aucun n'est configuré. La fin d'essai bloque
les fonctionnalités ; le compte reste connecté pour permettre un renouvellement.

Les abonnements échus passent à `expired` même après plus de sept jours. L'email
n'est marqué comme envoyé qu'après succès SMTP. Un échec ou l'absence de plan
payant actif laisse la notification en attente pour le passage suivant.
Le job tourne au démarrage puis toutes les heures. La protection contre deux
passages simultanés est locale au processus ; utiliser un seul processus pour ce
job. Un arrêt entre l'envoi SMTP et son enregistrement peut entraîner un doublon.

## Rattrapage des comptes existants

Depuis `backend`, avec l'environnement de la base ciblée :

```sh
node scripts/repair-missing-trials.js
```

Cet aperçu liste les administrateurs actifs sans aucun abonnement et les dates
proposées. Vérifier les éventuels comptes autorisés exceptionnellement sans
abonnement avant application. L'essai est daté depuis la création du compte,
sans offrir de nouveaux jours aux comptes anciens.

```sh
node scripts/repair-missing-trials.js --apply
```

Appliquer hors inscriptions/paiements concurrents, puis démarrer le serveur
corrigé. Le script ne contacte personne ; le job serveur enverra ensuite les
notifications en attente, y compris les anciennes expirations non notifiées.

Les emails que l'ancien code a déjà marqués à tort comme envoyés ne sont pas
distinguables des vrais envois sans journaux SMTP. Pour ces comptes, vérifier les
journaux et utiliser le bouton « Envoyer l'offre » du back-office si nécessaire.

L'offre proposée est le plan `TRIAL_UPGRADE_PLAN_ID` si configuré, sinon Basic,
sinon le plan payant actif le moins cher. Vérifier ce paramètre et la présence du
plan Basic actif, ainsi que SMTP et `BACKEND_PUBLIC_URL` avant déploiement.
Les abonnements achetés via Apple conservent le parcours de renouvellement dans
l'application. Aucun abonnement payant n'est activé sans paiement.

## Vérification locale

```sh
node --test tests/subscription_access_test.js tests/subscription_expiry_test.js
```
