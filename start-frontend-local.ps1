# Script para iniciar el frontend localmente
Write-Host "====================================" -ForegroundColor Green
Write-Host "INICIANDO FRONTEND LOCAL EN PUERTO 5173" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Verificar directorio frontend
Write-Host "[1/4] Verificando directorio frontend..." -ForegroundColor Yellow
if (Test-Path "frontend") {
    Write-Host "✅ Directorio frontend encontrado" -ForegroundColor Green
    Set-Location frontend
} else {
    Write-Host "❌ Directorio frontend no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar package.json
Write-Host "[2/4] Verificando package.json..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "✅ package.json encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ package.json no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar node_modules
Write-Host "[3/4] Verificando dependencias..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ node_modules encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠️  node_modules no encontrado, instalando dependencias..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error instalando dependencias" -ForegroundColor Red
        exit 1
    }
}

# Verificar configuración de desarrollo
Write-Host "[4/4] Verificando configuración..." -ForegroundColor Yellow
if (Test-Path ".env.example") {
    Write-Host "✅ Archivo .env.example encontrado" -ForegroundColor Green
}
if (Test-Path "vite.config.js") {
    Write-Host "✅ Configuración de Vite encontrada" -ForegroundColor Green
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "INICIANDO SERVIDOR DE DESARROLLO..." -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "El frontend estará disponible en: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend debe estar corriendo en: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Cyan
Write-Host ""

# Iniciar el servidor de desarrollo
try {
    npm run dev
} catch {
    Write-Host "❌ Error iniciando el servidor: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}