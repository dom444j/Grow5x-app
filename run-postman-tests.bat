@echo off
echo ========================================
echo GROW5X - PRUEBAS E2E API (POSTMAN)
echo ========================================
echo.

echo [1/3] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js detectado

echo.
echo [2/3] Instalando Newman (Postman CLI)...
npm install -g newman newman-reporter-html
if %errorlevel% neq 0 (
    echo ERROR: Fallo la instalacion de Newman
    pause
    exit /b 1
)
echo ✅ Newman instalado

echo.
echo [3/3] Ejecutando pruebas E2E API...
echo IMPORTANTE: Las pruebas validaran el flujo completo de API
echo Presiona cualquier tecla para continuar...
pause >nul

echo.
echo Ejecutando coleccion de Postman...
newman run grow5x-e2e-api-tests.postman_collection.json ^|
    --reporters cli,html ^|
    --reporter-html-export e2e-api-report.html ^|
    --delay-request 1000 ^|
    --timeout-request 10000 ^|
    --insecure

if %errorlevel% equ 0 (
    echo.
    echo ✅ TODAS LAS PRUEBAS API PASARON EXITOSAMENTE!
) else (
    echo.
    echo ❌ Algunas pruebas API fallaron
)

echo.
echo ========================================
echo PRUEBAS API COMPLETADAS
echo ========================================
echo Revisa el reporte generado:
echo - e2e-api-report.html (reporte HTML detallado)
echo.
echo Abriendo reporte en el navegador...
start e2e-api-report.html

echo.
pause