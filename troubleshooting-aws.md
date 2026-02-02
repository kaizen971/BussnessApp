# Checklist de Vérification AWS Lightsail

## 🔍 Diagnostic : L'IP statique 52.47.146.19 ne répond pas

### ✅ ÉTAPE 1 : Vérifier l'état de l'instance

1. Allez sur https://lightsail.aws.amazon.com/
2. Connectez-vous à votre compte AWS
3. Assurez-vous d'être dans la région **Paris (eu-west-3)**
4. Regardez votre instance "Node-js-1"

**L'état doit être :**
- ✅ **Running** (avec un point vert) → OK, passez à l'étape 2
- ❌ **Stopped** → Cliquez sur les 3 points → Start → Attendez 2-3 minutes
- ⚠️ **Pending** → Attendez que le démarrage se termine
- ❌ **Failed** → Problème grave, vous devrez peut-être recréer l'instance

### ✅ ÉTAPE 2 : Vérifier que l'IP statique est attachée

1. Dans la page d'accueil Lightsail, sous votre instance "Node-js-1"
2. Vous devriez voir : **52.47.146.19** (l'IP publique)

**Si l'IP affichée est différente :**

1. Cliquez sur **"Networking"** (menu de gauche)
2. Cliquez sur votre IP statique **"StaticIp-1"**
3. Vérifiez : **"Attached to: Node-js-1"**
4. Si ce n'est PAS le cas :
   - Cliquez sur **"Attach"**
   - Sélectionnez **"Node-js-1"**
   - Cliquez **"Attach"**
   - Attendez 30 secondes

### ✅ ÉTAPE 3 : Vérifier le firewall

1. Cliquez sur votre instance **"Node-js-1"**
2. Allez dans l'onglet **"Networking"**
3. Section **"IPv4 Firewall"**

**Vous devez avoir AU MINIMUM :**

```
Application   Protocol   Port range   Restricted to
─────────────────────────────────────────────────────
SSH           TCP        22           ✅ (Default)
HTTP          TCP        80           ⚠️ (Optionnel)
Custom        TCP        3003         ⚠️ (OBLIGATOIRE pour votre API)
```

**Si le port 3003 n'est PAS dans la liste :**

1. Cliquez sur **"Add rule"** (bouton en bas)
2. Remplissez :
   - Application: **Custom**
   - Protocol: **TCP**
   - Port range: **3003**
   - Restricted to IP address: **Laissez VIDE** (ou 0.0.0.0/0)
3. Cliquez **"Create"**

### ✅ ÉTAPE 4 : Tester la connexion SSH

1. Sur la page de votre instance "Node-js-1"
2. Cliquez sur **"Connect using SSH"** (gros bouton orange en haut)
3. Une fenêtre de terminal devrait s'ouvrir dans votre navigateur

**Si ça fonctionne :**
✅ Votre instance est accessible ! Passez à l'étape 5

**Si ça ne fonctionne PAS :**
❌ Il y a un problème avec l'instance elle-même
   → Essayez de redémarrer l'instance (3 points → Reboot)
   → Si ça ne marche toujours pas, vous devrez peut-être recréer l'instance

### ✅ ÉTAPE 5 : Vérifier que votre application tourne

**Dans le terminal SSH (étape 4), tapez :**

```bash
# Vérifier si Node.js est installé
node --version

# Vérifier si quelque chose écoute sur le port 3003
sudo netstat -tlnp | grep 3003
```

**Résultat attendu :**

- ✅ **Si vous voyez quelque chose comme :** `tcp ... 0.0.0.0:3003 ... LISTEN ...`
  → Votre application tourne ! Le problème est ailleurs (firewall probablement)

- ❌ **Si vous ne voyez rien :**
  → Votre application n'est pas démarrée, vous devez la déployer

### ✅ ÉTAPE 6 : Déployer l'application (si pas encore fait)

**Si l'étape 5 n'a rien retourné, déployez votre code :**

```bash
# Créer un dossier pour le projet
mkdir -p ~/backend
cd ~/backend

# Note : Vous devrez transférer vos fichiers depuis votre PC
# Voir les instructions dans deploy-to-aws.md
```

## 🎯 Actions Immédiates

### Action 1 : Redémarrer l'instance

Parfois, un simple redémarrage résout le problème :

1. Dans Lightsail, cliquez sur votre instance
2. Cliquez sur les **3 points verticaux** (en haut à droite)
3. Sélectionnez **"Reboot"**
4. Attendez 2-3 minutes
5. Retestez : `ping 52.47.146.19` depuis votre PC

### Action 2 : Vérifier dans une autre région

Assurez-vous d'être dans la bonne région AWS :

1. En haut de la console Lightsail, regardez la région sélectionnée
2. Elle doit être : **Paris (eu-west-3)** ou **EU (Paris)**
3. Si ce n'est pas le cas, changez de région

### Action 3 : Créer une nouvelle IP statique (dernier recours)

Si l'IP statique est corrompue :

1. Networking → Votre IP statique → Detach
2. Networking → Create static IP
3. Attachez-la à Node-js-1
4. Notez la nouvelle IP
5. Mettez à jour votre frontend avec la nouvelle IP

## 📞 Prochaines étapes

**Une fois que l'instance répond au ping :**

1. ✅ Connexion SSH fonctionne
2. ✅ Déployer le code backend
3. ✅ Démarrer l'application avec PM2
4. ✅ Tester l'API : `curl http://52.47.146.19:3003`
5. ✅ Tester depuis l'app mobile

## 🆘 Si rien ne fonctionne

**Recréer l'instance depuis zéro :**

1. Dans Lightsail, créez une nouvelle instance
2. Plateforme : Linux/Unix
3. Blueprint : Node.js
4. Plan : 5 USD/mois
5. Nom : Node-js-2
6. Créer l'instance
7. Créer et attacher une nouvelle IP statique
8. Recommencer le déploiement

---

## 📝 Résumé Visuel

```
┌─────────────────────────────────────────────┐
│  PROBLÈME : IP ne répond pas (100% perte)  │
└─────────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ Instance Running ? ❓  │
        └────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
       OUI                       NON
        │                         │
        ▼                         ▼
┌───────────────┐        ┌────────────────┐
│ IP attachée ? │        │ Démarrer       │
└───────────────┘        │ l'instance     │
        │                └────────────────┘
       OUI
        │
        ▼
┌───────────────────┐
│ Firewall 3003 ? ❓│
└───────────────────┘
        │
       OUI
        │
        ▼
┌────────────────────┐
│ SSH fonctionne ? ❓│
└────────────────────┘
        │
       OUI
        │
        ▼
┌─────────────────────────┐
│ App déployée et         │
│ tourne sur port 3003 ? ❓│
└─────────────────────────┘
        │
       NON
        │
        ▼
┌─────────────────────┐
│ DÉPLOYER LE CODE !  │
└─────────────────────┘
```
