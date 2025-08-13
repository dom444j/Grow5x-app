@echo off
echo === DIAGNOSTICO BACKEND 502 - GROW5X ===
echo Transferiendo script de diagnostico al servidor...
echo.

REM Transferir el script de diagnostico
scp fix-backend-502.sh root@grow5x.app:/tmp/
if %errorlevel% neq 0 (
    echo Error: No se pudo transferir el script
    pause
    exit /b 1
)

echo Script transferido exitosamente
echo.
echo Ejecutando diagnostico en el servidor...
echo ========================================

REM Ejecutar el script de diagnostico
ssh root@grow5x.app "chmod +x /tmp/fix-backend-502.sh && /tmp/fix-backend-502.sh"

echo.
echo ========================================
echo Diagnostico completado
echo.
echo Si el backend no esta corriendo, ejecuta:
echo ssh root@grow5x.app "cd /var/www/grow5x/backend && pm2 start server.js --name grow5x-backend && pm2 save"
echo.
echo Para verificar logs:
echo ssh root@grow5x.app "pm2 logs grow5x-backend --lines 50"
echo.
pause