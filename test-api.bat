@echo off
echo ========================================
echo Test de l'API BussnessApp
echo ========================================
echo.

echo Test 1 : Ping du serveur
ping -n 2 52.47.146.19
echo.

echo Test 2 : Connexion HTTP port 80
powershell -Command "try { Invoke-WebRequest -Uri 'http://52.47.146.19' -TimeoutSec 5 -UseBasicParsing | Select-Object StatusCode } catch { Write-Host 'Erreur : ' $_.Exception.Message }"
echo.

echo Test 3 : Connexion API port 3003
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://52.47.146.19:3003' -TimeoutSec 5 -UseBasicParsing; Write-Host '✅ Succes ! Status:' $response.StatusCode; Write-Host 'Contenu:' $response.Content } catch { Write-Host '❌ Erreur : ' $_.Exception.Message }"
echo.

echo Test 4 : Test d'une route API (si disponible)
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://52.47.146.19:3003/api/health' -TimeoutSec 5 -UseBasicParsing; Write-Host '✅ Health check OK:' $response.Content } catch { Write-Host 'Route /api/health non disponible (normal si pas implementee)' }"
echo.

echo ========================================
echo Tests termines !
echo ========================================
pause
