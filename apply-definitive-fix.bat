@echo off
echo ===============================================
echo CORRECCIÓN DEFINITIVA DEL PROXY DE NGINX
echo ===============================================
echo.
echo Aplicando la solución exacta para el error 404
echo Corrigiendo proxy_pass con barra final obligatoria
echo.

REM Transferir script al servidor
echo Transfiriendo script definitivo...
scp fix-proxy-and-test.sh root@grow5x.app:/tmp/

REM Ejecutar script en el servidor
echo.
echo Ejecutando corrección definitiva...
ssh root@grow5x.app "chmod +x /tmp/fix-proxy-and-test.sh && /tmp/fix-proxy-and-test.sh"

echo.
echo ===============================================
echo CORRECCIÓN DEFINITIVA APLICADA
echo ===============================================
echo.
echo RESULTADOS ESPERADOS:
echo - Backend directo: 200/400/401 (cualquiera está bien)
echo - Nginx: Debe responder igual que backend directo
echo - Si ambos responden igual: PROBLEMA RESUELTO
echo.
echo PROBAR INMEDIATAMENTE:
echo 1. Abrir https://grow5x.app
echo 2. Login: negociosmillonaris1973@gmail.com
echo 3. Password: Parent2024!
echo 4. NO debe aparecer error 404
echo.
echo ===============================================
pause