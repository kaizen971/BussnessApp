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

Dans le back-office, ouvrir la fiche d’un administrateur de test et choisir
« Simuler une fin d’abonnement ». La confirmation indique que l’expiration est
réelle : la date de fin passe à maintenant, le traitement habituel expire
l’abonnement, invalide le cache d’accès et envoie le même mail de renouvellement.
Le compte reste actif et peut se connecter pour renouveler. L’action est réservée
aux superadministrateurs et enregistrée dans l’activité du compte.

La simulation nécessite un seul abonnement en cours et déjà démarré. Elle refuse
les abonnements associés à une session, un lien ou un abonnement Stripe, ainsi
que les achats Apple/Google, pour ne pas désynchroniser la facturation externe.
Utiliser un essai ou un abonnement de test attribué en donation. L’email part à
l’adresse du compte ciblé. En cas d’échec SMTP, l’expiration reste effective et le
job horaire réessaie l’envoi. Pour rétablir l’accès après le test, attribuer un
nouvel abonnement depuis la fiche.

```sh
node --test tests/subscription_access_test.js tests/subscription_expiry_test.js
```
