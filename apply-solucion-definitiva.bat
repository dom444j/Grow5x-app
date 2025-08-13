@echo off
echo ===============================================
echo SOLUCIÓN DEFINITIVA PARA PROBLEMA DE PUERTOS
echo ===============================================
echo.
echo ANÁLISIS: El problema se repite porque:
echo 1. No se identifica el puerto real del backend
echo 2. Se asume puerto 5000 sin verificar
echo 3. Configuraciones duplicadas interfieren
echo 4. No se hace limpieza completa
echo.
echo ESTA SOLUCIÓN:
echo ✅ Detecta automáticamente el puerto real
echo ✅ Limpia todas las configuraciones conflictivas
echo ✅ Crea configuración definitiva
echo ✅ Verifica que funcione antes de terminar
echo.
pause
echo.
echo Transfiriendo solución definitiva al servidor...
scp SOLUCION-DEFINITIVA-PUERTOS.sh root@grow5x.app:/tmp/
if %errorlevel% neq 0 (
    echo Error: No se pudo transferir el script
    pause
    exit /b 1
)

echo.
echo ===============================================
echo EJECUTANDO SOLUCIÓN DEFINITIVA
echo ===============================================
echo.
echo IMPORTANTE: Este script va a:
echo 1. Detectar el puerto real del backend (5000 o 5001)
echo 2. Crear backup de la configuración actual
echo 3. Eliminar configuraciones conflictivas
echo 4. Crear configuración limpia para el puerto correcto
echo 5. Verificar que backend y nginx respondan igual
echo.
echo Ejecutando...
ssh root@grow5x.app "chmod +x /tmp/SOLUCION-DEFINITIVA-PUERTOS.sh && /tmp/SOLUCION-DEFINITIVA-PUERTOS.sh"

echo.
echo ===============================================
echo SOLUCIÓN DEFINITIVA COMPLETADA
echo ===============================================
echo.
echo Si el script reportó "PROBLEMA DEFINITIVAMENTE RESUELTO":
echo ✅ El login debería funcionar ahora
echo ✅ No debería volver a fallar en futuros despliegues
echo.
echo Si aún hay problemas:
echo ❌ Revisar logs del backend: ssh root@grow5x.app "pm2 logs grow5x-backend"
echo ❌ Verificar que el backend esté corriendo: ssh root@grow5x.app "pm2 status"
echo.
echo PROBAR INMEDIATAMENTE:
echo 🌐 https://grow5x.app
echo 📧 negociosmillonaris1973@gmail.com
echo 🔑 Parent2024!
echo.
echo ===============================================
pause