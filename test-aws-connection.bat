@echo off
echo ========================================
echo Test de connexion AWS Lightsail
echo ========================================
echo.
echo Test 1 : Ping de l'IP statique
ping -n 4 52.47.146.19
echo.
echo ========================================
echo Test 2 : Test du port SSH (22)
powershell -Command "Test-NetConnection -ComputerName 52.47.146.19 -Port 22"
echo.
echo ========================================
echo Test 3 : Test du port API (3003)
powershell -Command "Test-NetConnection -ComputerName 52.47.146.19 -Port 3003"
echo.
echo ========================================
echo Test 4 : Tentative de connexion HTTP
curl http://52.47.146.19:3003
echo.
echo ========================================
echo Tests terminés !
echo.
pause
