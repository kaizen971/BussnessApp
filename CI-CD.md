# CI/CD BussnessApp

Les workflows GitHub Actions se trouvent dans `.github/workflows/`. La publication Android démarre depuis `master`. Le serveur suit la branche configurée dans `LIGHTSAIL_BRANCH`.

## Android vers Google Play

Le workflow **Android - Google Play** se lance depuis l'onglet **Actions > Run workflow**. Choisir `internal` pour les testeurs ou `production` pour la piste publique. Chaque lancement construit un nouvel AAB signé avec le profil EAS `production` du script Mac, puis soumet **l'ID de ce build précis** à la piste choisie. La publication en production peut encore nécessiter une validation dans Play Console.

Configuration une seule fois :

1. Créer un jeton Expo avec accès au projet EAS et l'ajouter comme secret GitHub `EXPO_TOKEN`.
2. Dans Expo, configurer la clé de compte de service Google Play pour EAS Submit. Ce compte doit avoir les droits de publier sur les pistes interne et production. L'application doit déjà exister dans Play Console.
3. Le `versionCode` Android est maintenant géré par EAS à distance. Il a été initialisé à **55**, la plus haute valeur trouvée dans les AAB locaux le 4 octobre 2026. Vérifier dans Play Console qu'aucun AAB de code supérieur n'a été chargé. Si c'est le cas, ajuster la valeur avec `cd frontend && eas build:version:set -p android` avant le premier run.
4. Facultatif : créer les environnements GitHub `google-play-internal` et `google-play-production`, puis ajouter des reviewers obligatoires pour la production.

Le script local `/Users/jordanhoomiz/Desktop/Deploy EAS/build-android.command` utilise le même profil EAS et lit maintenant le `versionCode` distant pour nommer l'AAB. Les builds cloud et Mac partagent ainsi la même séquence de versions.

## Serveur Lightsail

Le workflow **Serveur Lightsail** se lance après un push sur la branche du serveur touchant le backend, la webapp ou le back-office. Il peut aussi être relancé manuellement. Il vérifie la syntaxe du serveur, construit les deux sites, récupère le commit exact sur le serveur, installe les dépendances backend, redémarre PM2, sauvegarde les anciens fichiers web, publie les nouveaux et vérifie les URL publiques.

Dans GitHub, configurer les **variables** du dépôt ou de l'environnement `server-production` :

| Variable | Valeur actuelle |
| --- | --- |
| `LIGHTSAIL_HOST` | `52.47.146.19` |
| `LIGHTSAIL_USER` | `admin` |
| `LIGHTSAIL_BRANCH` | `enhancefeature` (branche constatée sur le serveur le 4 octobre 2026) |

Configurer les **secrets** suivants :

| Secret | Contenu |
| --- | --- |
| `LIGHTSAIL_SSH_KEY` | Contenu de la clé privée du serveur, par exemple `LightsailDefaultKey-eu-west-3.pem` |
| `LIGHTSAIL_KNOWN_HOSTS` | Ligne de clé d'hôte SSH vérifiée pour `52.47.146.19` |

Le serveur doit conserver `/home/admin/BussnessApp` sur la branche `LIGHTSAIL_BRANCH`, le processus PM2 `businessapp`, les variables d'environnement backend et l'accès `sudo -n` aux deux dossiers Nginx. Le déploiement s'arrête si le dépôt serveur contient des modifications suivies : il ne les efface pas. Les sauvegardes web sont conservées sous `/home/admin/deploy-backups/`.

Les modifications locales non commitées de ce poste ne sont pas envoyées par GitHub Actions. Pousser les changements voulus sur la branche de chaque workflow avant de le lancer.
