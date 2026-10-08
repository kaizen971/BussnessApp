# EAS – Application Web (webapp)

Version web de l'application mobile **EAS – Entreprendre avec Succès** (dossier `frontend/`).
Stack : Vite + React 18 + TailwindCSS 3 + react-router-dom 6 + recharts, thème noir & or identique au mobile.

## Lancer en développement

```bash
cd webapp
npm install
npm run dev
```

L'app est servie sur **http://localhost:5174/app/**.
Le proxy Vite (`vite.config.js`) redirige `/BussnessApp/*` vers l'API de production
`https://businessapp.installpostiz.com/bussnessapp` — ⚠️ la base de données est réelle, utilisez un compte de test.

Pour travailler contre un backend local, changez la `target` du proxy en `http://localhost:3003`
(et supprimez le `rewrite`, le backend local expose `/BussnessApp` directement).

## Paiement Stripe self-service (nouveau)

Deux endpoints ont été ajoutés dans `backend/server.js` :

- `POST /BussnessApp/subscription/checkout` `{ planId }` (authentifié) — plan gratuit → activation
  immédiate ; plan payant → crée une Subscription `pending_payment` + session Stripe Checkout et
  renvoie `{ url }` pour redirection.
- `GET /BussnessApp/subscription/checkout-status?session_id=...` — statut de la souscription
  (pollé par la page `/abonnement/succes` après retour de Stripe).

L'activation est faite par le **webhook existant** `POST /BussnessApp/backoffice/stripe/webhook`
(`checkout.session.completed`, matching via `metadata.adminId`). Aucune modification du webhook.

Variables d'environnement backend :

| Variable | Rôle | Exemple |
|---|---|---|
| `STRIPE_SECRET_KEY` | déjà utilisée, requise pour le checkout | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | déjà utilisée (signature webhook) | `whsec_...` |
| `WEBAPP_PUBLIC_URL` | **nouvelle** — URL publique de la webapp pour les redirections Stripe | `https://businessapp.installpostiz.com/app` |

### Tester le paiement en local

```bash
# backend local avec clé Stripe TEST + Mongo (docker-compose.yml à la racine)
cd backend && node server.js
stripe listen --forward-to localhost:3003/BussnessApp/backoffice/stripe/webhook
```

Carte de test : `4242 4242 4242 4242` (date future, CVC libre). Après paiement, la page
`/abonnement/succes` doit passer en « Abonnement activé » et débloquer les pages premium.

## Build & déploiement

```bash
npm run build   # génère webapp/dist
```

L'app est construite avec `base: '/app/'` et `BrowserRouter basename="/app"` : déployez le contenu
de `dist/` sur le serveur (comme le backoffice sous `/admin`) et ajoutez un bloc reverse-proxy :

```nginx
location /app/ {
    alias /var/www/webapp/dist/;
    try_files $uri $uri/ /app/index.html;   # fallback SPA
}
```

Puis définissez `WEBAPP_PUBLIC_URL=https://businessapp.installpostiz.com/app` dans le `.env`
du backend et redémarrez PM2 (`pm2 restart bussnessapp`).

## Structure

```
src/
  App.jsx               # routes + providers (Auth, Currency, Subscription)
  services/api.js       # port de frontend/src/services/api.js (localStorage, refresh token)
  contexts/             # AuthContext, CurrencyContext, SubscriptionContext (même gating mobile)
  components/           # Layout (sidebar/drawer), ui.jsx, ProtectedRoute, PremiumRoute
  pages/                # 19 pages portées depuis frontend/src/screens/
  utils/                # currency.js, chartTheme.js (palette charts validée)
```

Le gating premium est identique au mobile : `Simulation`, `Stock`, `Customers` (Clients),
`Team` (Équipe), `Planning`, `Commissions` affichent le paywall sans abonnement actif.
