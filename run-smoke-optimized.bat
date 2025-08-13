@echo off
echo 🚀 Ejecutando Smoke Test E2E Optimizado

REM Verificar entorno
if not "%NODE_ENV%"=="staging" (
    echo ⚠️  Advertencia: NODE_ENV no es 'staging'
)

REM Cambiar al directorio backend
cd /d "%~dp0\backend"

REM Verificar que el archivo existe
if not exist "smoke-test-e2e-optimized.js" (
    echo ❌ Error: No se encuentra smoke-test-e2e-optimized.js
    pause
    exit /b 1
)

REM Cargar variables de entorno de staging
if exist ".env.staging" (
    echo 📋 Cargando configuración de staging...
    for /f "usebackq tokens=1,2 delims==" %%a in (".env.staging") do (
        if not "%%a"=="" if not "%%a:~0,1"=="#" set %%a=%%b
    )
)

REM Ejecutar test
echo 📋 Iniciando smoke test...
node smoke-test-e2e-optimized.js

REM Capturar código de salida
set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE%==0 (
    echo ✅ Smoke Test EXITOSO - Listo para deploy
    echo.
    echo 📊 Revisa el reporte: REPORTE-SMOKE-TEST-E2E-OPTIMIZED.md
) else (
    echo ❌ Smoke Test FALLÓ - Revisar antes de deploy
    echo.
    echo 📊 Revisa el reporte para más detalles: REPORTE-SMOKE-TEST-E2E-OPTIMIZED.md
)

echo.
echo Presiona cualquier tecla para continuar...
pause >nul
exit /b %EXIT_CODE%