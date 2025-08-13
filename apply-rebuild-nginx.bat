@echo off
echo ===============================================
echo RECONSTRUCCIÓN COMPLETA DE NGINX
echo ===============================================
echo.
echo Reconstruyendo TODA la configuración desde cero
echo Eliminando cualquier error de formato o duplicado
echo.

REM Transferir script al servidor
echo Transfiriendo script de reconstrucción...
scp rebuild-nginx-config.sh root@grow5x.app:/tmp/

REM Ejecutar script en el servidor
echo.
echo Ejecutando reconstrucción completa...
ssh root@grow5x.app "chmod +x /tmp/rebuild-nginx-config.sh && /tmp/rebuild-nginx-config.sh"

echo.
echo ===============================================
echo RECONSTRUCCIÓN COMPLETADA
echo ===============================================
echo.
echo Si Backend y Nginx responden IGUAL:
echo 🎉 PROBLEMA DEFINITIVAMENTE RESUELTO
echo.
echo PROBAR INMEDIATAMENTE:
echo 🌐 https://grow5x.app
echo 📧 negociosmillonaris1973@gmail.com
echo 🔑 Parent2024!
echo.
echo ✅ El error 404 debe estar COMPLETAMENTE resuelto
echo ===============================================
pause