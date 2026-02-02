#!/bin/bash
# Script de déploiement automatique BussnessApp Backend sur AWS Lightsail
# À exécuter sur le serveur AWS après connexion SSH

echo "======================================"
echo "Déploiement BussnessApp Backend"
echo "======================================"
echo ""

# 1. Mettre à jour le système
echo "📦 Étape 1/7 : Mise à jour du système..."
sudo apt update -y
sudo apt upgrade -y

# 2. Vérifier Node.js
echo ""
echo "📦 Étape 2/7 : Vérification de Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Installation..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js est installé : $(node --version)"
fi

# 3. Installer PM2
echo ""
echo "📦 Étape 3/7 : Installation de PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo "✅ PM2 installé"
else
    echo "✅ PM2 est déjà installé"
fi

# 4. Installer unzip si nécessaire
echo ""
echo "📦 Étape 4/7 : Vérification de unzip..."
if ! command -v unzip &> /dev/null; then
    sudo apt install unzip -y
fi

# 5. Créer le dossier backend
echo ""
echo "📦 Étape 5/7 : Préparation du dossier backend..."
mkdir -p ~/backend
cd ~/backend

# 6. Afficher les instructions pour le transfert de fichiers
echo ""
echo "📦 Étape 6/7 : Transfert du code..."
echo ""
echo "⚠️  IMPORTANT : Vous devez maintenant transférer votre code depuis votre PC"
echo ""
echo "Sur votre PC Windows (PowerShell), exécutez :"
echo "------------------------------------------------------------"
echo "cd C:\Users\Cheetoh\Desktop\Projet\BussnessApp"
echo "Compress-Archive -Path 'backend\*' -DestinationPath 'backend.zip' -Force"
echo "scp -i \"C:\Users\Cheetoh\.ssh\LightsailDefaultKey-eu-west-3.pem\" backend.zip ubuntu@52.47.146.19:~/backend/"
echo "------------------------------------------------------------"
echo ""
echo "Puis REVENEZ ICI et appuyez sur Entrée pour continuer..."
read -p "Appuyez sur Entrée quand le fichier est transféré..."

# 7. Décompresser et installer
if [ -f ~/backend/backend.zip ]; then
    echo ""
    echo "📦 Étape 7/7 : Installation du backend..."
    unzip -o ~/backend/backend.zip -d ~/backend
    cd ~/backend
    
    # Installer les dépendances
    echo "Installation des dépendances npm..."
    npm install
    
    # Créer le fichier .env si non existant
    if [ ! -f .env ]; then
        echo ""
        echo "⚠️  Création du fichier .env..."
        cat > .env << 'EOF'
MONGODB_URI=mongodb+srv://easDatabase:oDqCMD5pRdMBLImo@eas.sg9meiv.mongodb.net/
JWT_SECRET=your-secret-key-change-this-in-production
PORT=3003
NODE_ENV=production
EOF
        echo "✅ Fichier .env créé"
    fi
    
    # Arrêter PM2 existant si présent
    pm2 delete bussnessapp 2>/dev/null || true
    
    # Démarrer avec PM2
    echo ""
    echo "🚀 Démarrage de l'application..."
    pm2 start server.js --name bussnessapp
    pm2 save
    
    # Configurer le démarrage automatique
    pm2 startup | grep 'sudo' | bash
    
    echo ""
    echo "======================================"
    echo "✅ Déploiement terminé !"
    echo "======================================"
    echo ""
    echo "Votre API devrait maintenant être accessible sur :"
    echo "👉 http://52.47.146.19:3003"
    echo ""
    echo "Commandes utiles :"
    echo "  pm2 status           - Voir l'état de l'application"
    echo "  pm2 logs bussnessapp - Voir les logs"
    echo "  pm2 restart bussnessapp - Redémarrer l'application"
    echo ""
else
    echo ""
    echo "❌ Erreur : Le fichier backend.zip n'a pas été trouvé dans ~/backend/"
    echo "Veuillez transférer le fichier et réessayer."
fi
