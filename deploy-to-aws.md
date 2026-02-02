# Guide de Déploiement AWS Lightsail

## Prérequis
- Instance Lightsail créée (Node-js-1)
- IP statique attachée (52.47.146.19)
- Port 3003 ouvert dans le firewall

## Étape 1 : Se connecter à l'instance

### Option A : Via la console web (Le plus simple)
1. Allez sur https://lightsail.aws.amazon.com/
2. Cliquez sur votre instance "Node-js-1"
3. Cliquez sur "Connect using SSH" (bouton orange)

### Option B : Via PowerShell
```powershell
# Téléchargez d'abord votre clé SSH depuis Lightsail
# Account → SSH Keys → Download
ssh -i "C:\Users\Cheetoh\.ssh\LightsailDefaultKey-eu-west-3.pem" ubuntu@52.47.146.19
```

## Étape 2 : Préparer le serveur

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Vérifier que Node.js est installé (devrait être préinstallé)
node --version
npm --version

# Installer Git
sudo apt install git -y

# Installer PM2 (gestionnaire de processus)
sudo npm install -g pm2
```

## Étape 3 : Transférer votre code

### Option A : Via Git (Si votre code est sur GitHub)
```bash
# Sur le serveur AWS
cd ~
git clone https://github.com/VOTRE-USERNAME/BussnessApp.git
cd BussnessApp/backend
```

### Option B : Via SCP depuis votre PC Windows
```powershell
# Sur votre PC Windows (PowerShell)
# Créer une archive
Compress-Archive -Path "C:\Users\Cheetoh\Desktop\Projet\BussnessApp\backend\*" -DestinationPath "C:\Users\Cheetoh\Desktop\backend.zip" -Force

# Transférer vers AWS
scp -i "C:\Users\Cheetoh\.ssh\LightsailDefaultKey-eu-west-3.pem" "C:\Users\Cheetoh\Desktop\backend.zip" ubuntu@52.47.146.19:~/

# Puis sur le serveur AWS, décompresser :
ssh ubuntu@52.47.146.19
unzip backend.zip -d ~/backend
cd ~/backend
```

## Étape 4 : Configurer l'application

```bash
# Installer les dépendances
npm install

# Créer le fichier .env
nano .env
```

Copiez ce contenu dans .env :
```
MONGODB_URI=mongodb+srv://easDatabase:oDqCMD5pRdMBLImo@eas.sg9meiv.mongodb.net/
JWT_SECRET=your-secret-key-change-this-in-production
PORT=3003
NODE_ENV=production
```

Sauvegardez avec : `Ctrl+X`, puis `Y`, puis `Enter`

## Étape 5 : Démarrer l'application

```bash
# Démarrer avec PM2
pm2 start server.js --name bussnessapp

# Configurer le démarrage automatique
pm2 startup
# Copiez et exécutez la commande affichée
pm2 save

# Vérifier le statut
pm2 status
pm2 logs bussnessapp
```

## Étape 6 : Vérifier que ça fonctionne

```bash
# Depuis le serveur AWS
curl http://localhost:3003

# Depuis votre PC Windows (PowerShell)
curl http://52.47.146.19:3003
```

## Commandes utiles

### Voir les logs
```bash
pm2 logs bussnessapp
pm2 logs bussnessapp --lines 100
```

### Redémarrer l'application
```bash
pm2 restart bussnessapp
```

### Arrêter l'application
```bash
pm2 stop bussnessapp
```

### Mettre à jour le code
```bash
# Via Git
cd ~/BussnessApp/backend
git pull
npm install
pm2 restart bussnessapp

# Via SCP (transférer nouveau fichier depuis PC)
# Puis décompresser et redémarrer
```

### Vérifier quel processus utilise le port 3003
```bash
sudo lsof -i :3003
sudo netstat -tlnp | grep 3003
```

## Troubleshooting

### Problème : "Cannot connect to MongoDB"
- Vérifiez que l'URL MongoDB dans .env est correcte
- Vérifiez les logs : `pm2 logs bussnessapp`

### Problème : "Port 3003 already in use"
```bash
# Trouver le processus
sudo lsof -i :3003
# Tuer le processus (remplacez PID)
sudo kill -9 PID
# Redémarrer
pm2 restart bussnessapp
```

### Problème : L'application crash au démarrage
```bash
# Voir les erreurs détaillées
pm2 logs bussnessapp --err
# Ou tester manuellement
node server.js
```

## Checklist de déploiement

- [ ] Instance Lightsail en cours d'exécution
- [ ] IP statique 52.47.146.19 attachée
- [ ] Port 3003 ouvert dans le firewall
- [ ] Connexion SSH réussie
- [ ] Code transféré sur le serveur
- [ ] npm install effectué
- [ ] Fichier .env créé
- [ ] PM2 installé
- [ ] Application démarrée avec PM2
- [ ] Test curl réussi depuis le serveur
- [ ] Test curl réussi depuis votre PC
- [ ] Frontend mis à jour avec la nouvelle URL
