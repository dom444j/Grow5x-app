@echo off
echo ===============================================
echo SOLUCIÓN DEFINITIVA AUTOMÁTICA - PUERTOS
echo ===============================================
echo.
echo Transfiriendo solución definitiva al servidor...
scp SOLUCION-DEFINITIVA-PUERTOS.sh root@grow5x.app:/tmp/
if %errorlevel% neq 0 (
    echo Error: No se pudo transferir el script
    exit /b 1
)

echo.
echo ===============================================
echo EJECUTANDO SOLUCIÓN DEFINITIVA
echo ===============================================
echo.
echo Detectando puerto real del backend...
echo Limpiando configuraciones conflictivas...
echo Creando configuración definitiva...
echo.
ssh root@grow5x.app "chmod +x /tmp/SOLUCION-DEFINITIVA-PUERTOS.sh && /tmp/SOLUCION-DEFINITIVA-PUERTOS.sh"

echo.
echo ===============================================
echo SOLUCIÓN COMPLETADA
echo ===============================================
echo.
echo PROBAR INMEDIATAMENTE:
echo 🌐 https://grow5x.app
echo 📧 negociosmillonaris1973@gmail.com
echo 🔑 Parent2024!
echo.
echo Si funciona: PROBLEMA RESUELTO DEFINITIVAMENTE
echo Si no funciona: Revisar logs del backend
echo ===============================================