# Guide : Changer le Nom de Domaine d'une Application AWS Lightsail

Ce guide explique comment remplacer votre nom de domaine actuel par un nouveau, en reconfigurant Nginx et le certificat SSL (Let's Encrypt).

## 📋 Prérequis

1. Avoir acheté le nouveau nom de domaine.
2. Avoir configuré l'enregistrement DNS (Type A) vers l'IP statique de votre serveur AWS Lightsail (`52.47.146.19`).
3. Attendre la propagation DNS (tester avec `ping votre-nouveau-domaine.com`).
4. Avoir accès SSH au serveur.

---

## 🚀 Étape 1 : Se connecter au serveur

```bash
# Via votre terminal local (ou depuis la console Lightsail)
ssh -i "path/to/key.pem" ubuntu@52.47.146.19
```

---

## ⚙️ Étape 2 : Mettre à jour la configuration Nginx

Il faut supprimer l'ancienne configuration et créer la nouvelle.

```bash
# 1. Supprimer l'ancienne configuration (remplacez 'ancien-domaine' par le vrai nom)
sudo rm /etc/nginx/sites-enabled/businessapp
sudo rm /etc/nginx/sites-available/businessapp

# 2. Créer la nouvelle configuration
# Remplacez 'nouveau-domaine.com' par votre vrai domaine
sudo nano /etc/nginx/sites-available/businessapp
```

**Collez le contenu suivant dans l'éditeur :**

```nginx
server {
    listen 80;
    server_name nouveau-domaine.com;  # <-- METTRE VOTRE NOUVEAU DOMAINE ICI

    location / {
        proxy_pass http://localhost:3003; # Port de votre API Node.js
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Taille max upload (pour les images base64)
        client_max_body_size 50M;
    }
}
```
*Sauvegardez avec `Ctrl+X`, puis `Y`, puis `Enter`.*

---

## 🔄 Étape 3 : Activer la nouvelle configuration

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/businessapp /etc/nginx/sites-enabled/

# Tester la configuration (doit afficher "syntax is ok")
sudo nginx -t

# Redémarrer Nginx pour appliquer les changements
sudo systemctl restart nginx
```

---

## 🔒 Étape 4 : Générer le nouveau certificat SSL

Utilisez Certbot pour obtenir un certificat HTTPS gratuit.

```bash
# Remplacez par votre vrai domaine
sudo certbot --nginx -d nouveau-domaine.com
```

**Si Certbot demande :**
- De rediriger le trafic HTTP vers HTTPS (Redirect) → **Choisissez 2** (Oui).

---

## 📱 Étape 5 : Mettre à jour le Frontend (React Native)

N'oubliez pas de changer l'URL de l'API dans votre code source local.

**Fichier :** `frontend/src/services/api.js`

```javascript
// Mettre à jour avec le nouveau domaine
const API_BASE_URL = 'https://nouveau-domaine.com';

// export default...
```

---

## 🧹 (Optionnel) Nettoyer les anciens certificats

Si vous ne comptez plus jamais utiliser l'ancien domaine, vous pouvez le supprimer de Certbot.

```bash
# Lister les certificats installés
sudo certbot certificates

# Supprimer un ancien certificat
sudo certbot delete --cert-name ancien-domaine.com
```
