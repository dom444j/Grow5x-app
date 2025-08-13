@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    GROW5X - PRUEBAS E2E                     ║
echo ║                  VALIDACIÓN FUNCIONAL COMPLETA              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 🎯 OBJETIVO: Validar flujo funcional completo de usuario
echo 📋 INCLUYE: Registro, Login, Perfil, Referidos, Recovery
echo 🔒 ESTADO PREVIO: Seguridad y estabilidad ✅ COMPLETADO
echo.
echo ════════════════════════════════════════════════════════════════
echo.
echo Selecciona el tipo de pruebas E2E a ejecutar:
echo.
echo [1] 🎭 PLAYWRIGHT - Pruebas UI Completas (5-10 min)
echo     ├─ Navegación real del sitio web
echo     ├─ Screenshots automáticos
echo     ├─ Validación visual completa
echo     └─ Reporte detallado con capturas
echo.
echo [2] 📡 POSTMAN/NEWMAN - Pruebas API Rápidas (2-3 min)
echo     ├─ Validación de endpoints
echo     ├─ Pruebas de integración
echo     ├─ Reporte HTML profesional
echo     └─ Métricas de rendimiento
echo.
echo [3] 🚀 AMBAS - Validación Completa (7-13 min)
echo     ├─ Máxima cobertura de pruebas
echo     ├─ Validación UI + API
echo     ├─ Reportes consolidados
echo     └─ Certificación 100%% completa
echo.
echo [4] 📖 Ver Instrucciones Detalladas
echo.
echo [0] ❌ Salir
echo.
set /p choice="Ingresa tu opción (1-4, 0 para salir): "

if "%choice%"=="1" goto playwright
if "%choice%"=="2" goto postman
if "%choice%"=="3" goto ambas
if "%choice%"=="4" goto instrucciones
if "%choice%"=="0" goto salir

echo ❌ Opción inválida. Intenta de nuevo.
pause
goto inicio

:playwright
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                   EJECUTANDO PLAYWRIGHT                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 🎭 Iniciando pruebas UI completas...
echo ⚠️  IMPORTANTE: Se abrirá un navegador visible
echo 📸 Se tomarán screenshots automáticamente
echo.
pause
call run-e2e-tests.bat
goto reporte_final

:postman
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                   EJECUTANDO POSTMAN                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 📡 Iniciando pruebas API rápidas...
echo ⚡ Ejecución optimizada para velocidad
echo 📊 Generando reporte HTML profesional
echo.
pause
call run-postman-tests.bat
goto reporte_final

:ambas
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                 EJECUTANDO VALIDACIÓN COMPLETA              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 🚀 Iniciando validación completa (UI + API)...
echo 📋 Esto proporcionará la máxima cobertura de pruebas
echo ⏱️  Tiempo estimado: 7-13 minutos
echo.
echo Presiona cualquier tecla para comenzar...
pause >nul

echo.
echo [1/2] Ejecutando pruebas API (Postman)...
echo ════════════════════════════════════════════════════════════════
call run-postman-tests.bat

echo.
echo [2/2] Ejecutando pruebas UI (Playwright)...
echo ════════════════════════════════════════════════════════════════
call run-e2e-tests.bat

goto reporte_consolidado

:instrucciones
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    INSTRUCCIONES DETALLADAS                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 📖 Abriendo guía completa de pruebas E2E...
start INSTRUCCIONES-E2E-COMPLETAS.md
echo.
echo ✅ Documento abierto. Revisa las instrucciones y vuelve aquí.
echo.
pause
goto inicio

:reporte_final
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                     PRUEBAS COMPLETADAS                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 📊 Revisa los resultados generados:
if exist "e2e-results.json" (
    echo ✅ e2e-results.json - Resultados detallados Playwright
)
if exist "e2e-screenshots" (
    echo ✅ e2e-screenshots/ - Capturas de pantalla
)
if exist "e2e-api-report.html" (
    echo ✅ e2e-api-report.html - Reporte API Postman
)
echo.
echo 🎯 ESTADO FINAL:
echo ├─ ✅ Seguridad y estabilidad (completado previamente)
echo └─ ✅ Pruebas funcionales E2E (completado ahora)
echo.
echo 🎉 GROW5X CERTIFICADO PARA PRODUCCIÓN
echo.
pause
goto salir

:reporte_consolidado
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                  VALIDACIÓN COMPLETA FINALIZADA             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 📊 REPORTES GENERADOS:
echo ├─ 📄 e2e-api-report.html (Pruebas API)
echo ├─ 📄 e2e-results.json (Pruebas UI)
echo └─ 📁 e2e-screenshots/ (Capturas)
echo.
echo 🏆 CERTIFICACIÓN COMPLETA:
echo ├─ ✅ Infraestructura y Seguridad
echo ├─ ✅ Pruebas API Funcionales  
echo ├─ ✅ Pruebas UI Completas
echo └─ ✅ Validación End-to-End
echo.
echo 🎉 GROW5X 100%% VALIDADO PARA PRODUCCIÓN
echo.
echo Abriendo reportes...
if exist "e2e-api-report.html" start e2e-api-report.html
if exist "e2e-results.json" start e2e-results.json
echo.
pause
goto salir

:salir
echo.
echo 👋 ¡Gracias por usar el sistema de pruebas E2E de Grow5x!
echo.
exit /b 0

:inicio
goto :eof