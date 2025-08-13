# Script para iniciar el backend localmente
Write-Host "====================================" -ForegroundColor Green
Write-Host "INICIANDO BACKEND LOCAL EN PUERTO 3000" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Verificar Node.js
Write-Host "[1/5] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado o no está en PATH" -ForegroundColor Red
    exit 1
}

# Verificar directorio backend
Write-Host "[2/5] Verificando directorio backend..." -ForegroundColor Yellow
if (Test-Path "backend") {
    Write-Host "✅ Directorio backend encontrado" -ForegroundColor Green
    Set-Location backend
} else {
    Write-Host "❌ Directorio backend no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar package.json
Write-Host "[3/5] Verificando package.json..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "✅ package.json encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ package.json no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar node_modules
Write-Host "[4/5] Verificando dependencias..." -ForegroundColor Yellow
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

# Verificar archivo .env
Write-Host "[5/5] Verificando configuración..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ Archivo .env encontrado" -ForegroundColor Green
    $envContent = Get-Content ".env" | Select-String "PORT="
    if ($envContent) {
        Write-Host "   Puerto configurado: $($envContent.Line)" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Archivo .env no encontrado, usando configuración por defecto" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "INICIANDO SERVIDOR..." -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Cyan
Write-Host ""

# Iniciar el servidor
try {
    node server.js
} catch {
    Write-Host "❌ Error iniciando el servidor: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}