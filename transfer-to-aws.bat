@echo off
echo ========================================
echo Script de transfert BussnessApp Backend
echo vers AWS Lightsail
echo ========================================
echo.

REM Définir les chemins
set "BACKEND_PATH=C:\Users\Cheetoh\Desktop\Projet\BussnessApp\backend"
set "TEMP_ZIP=C:\Users\Cheetoh\Desktop\backend-deploy.zip"
set "SSH_KEY=C:\Users\Cheetoh\.ssh\LightsailDefaultKey-eu-west-3.pem"
set "SERVER=ubuntu@52.47.146.19"

echo Etape 1/3 : Creation de l'archive...
powershell -Command "Compress-Archive -Path '%BACKEND_PATH%\*' -DestinationPath '%TEMP_ZIP%' -Force"

if not exist "%TEMP_ZIP%" (
    echo ❌ Erreur : Impossible de creer l'archive
    pause
    exit /b 1
)

echo ✅ Archive creee : %TEMP_ZIP%
echo.

echo Etape 2/3 : Transfert vers AWS Lightsail...
echo (Cela peut prendre 1-2 minutes selon la taille)
echo.

REM Vérifier si la clé SSH existe
if not exist "%SSH_KEY%" (
    echo ❌ Erreur : Cle SSH non trouvee
    echo.
    echo Telecharger votre cle SSH depuis :
    echo https://lightsail.aws.amazon.com/
    echo Account ^> SSH Keys ^> Download
    echo.
    echo Puis placez-la dans : %SSH_KEY%
    pause
    exit /b 1
)

REM Transférer via SCP
scp -i "%SSH_KEY%" "%TEMP_ZIP%" %SERVER%:~/backend.zip

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Erreur lors du transfert
    echo.
    echo Verifiez :
    echo - Votre instance AWS est bien demarree
    echo - L'IP 52.47.146.19 est correcte
    echo - La cle SSH est valide
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Fichier transfere avec succes !
echo.

echo Etape 3/3 : Connexion SSH pour deployer...
echo.
echo Une fois connecte, executez ces commandes :
echo.
echo   cd ~
echo   unzip -o backend.zip -d backend
echo   cd backend
echo   npm install
echo   nano .env   (copier le contenu de votre .env local)
echo   pm2 start server.js --name bussnessapp
echo   pm2 save
echo   pm2 logs bussnessapp
echo.
echo ========================================
pause
echo.
echo Connexion SSH...
ssh -i "%SSH_KEY%" %SERVER%
