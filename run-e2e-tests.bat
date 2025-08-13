@echo off
echo ========================================
echo GROW5X - PRUEBAS E2E FUNCIONALES
echo ========================================
echo.

echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js detectado

echo.
echo [2/4] Instalando dependencias...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Fallo la instalacion de dependencias
    pause
    exit /b 1
)
echo ✅ Dependencias instaladas

echo.
echo [3/4] Instalando navegadores Playwright...
npx playwright install
if %errorlevel% neq 0 (
    echo ERROR: Fallo la instalacion de navegadores
    pause
    exit /b 1
)
echo ✅ Navegadores instalados

echo.
echo [4/4] Ejecutando pruebas E2E funcionales...
echo IMPORTANTE: Las pruebas se ejecutaran en modo visible
echo Presiona cualquier tecla para continuar...
pause >nul

node e2e-functional-tests.js

echo.
echo ========================================
echo PRUEBAS COMPLETADAS
echo ========================================
echo Revisa los archivos generados:
echo - e2e-results.json (resultados detallados)
echo - e2e-screenshots/ (capturas de pantalla)
echo.
pause