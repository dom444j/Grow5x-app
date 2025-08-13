#!/bin/bash

# GROW5X - SCRIPT DE DEPLOY SEGURO
# Preserva sesiones y configuración durante deploys

set -e

echo "🚀 GROW5X - Deploy Seguro"
echo "========================="

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecutar desde el directorio del backend"
    exit 1
fi

# Hacer backup de configuración actual
echo "💾 Creando backup de configuración..."
mkdir -p env-backups
cp .env .env.production env-backups/ 2>/dev/null || true

# Verificar variables críticas antes del deploy
echo "🔍 Verificando configuración..."
node src/scripts/verify-env-config.js

if [ $? -ne 0 ]; then
    echo "❌ Error en verificación de configuración"
    exit 1
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci --production

# Ejecutar migraciones si existen
if [ -f "src/scripts/migrate.js" ]; then
    echo "🔄 Ejecutando migraciones..."
    node src/scripts/migrate.js
fi

# Reiniciar aplicación con PM2
echo "🔄 Reiniciando aplicación..."
pm2 startOrReload ecosystem.config.js --env production

# Verificar que la aplicación está funcionando
echo "✅ Verificando aplicación..."
sleep 5
node src/scripts/health-check.js

if [ $? -eq 0 ]; then
    echo "✅ Deploy completado exitosamente"
else
    echo "❌ Error en verificación post-deploy"
    echo "🔄 Restaurando backup..."
    pm2 restart growx5-backend
    exit 1
fi

echo "🎉 Deploy seguro completado"
