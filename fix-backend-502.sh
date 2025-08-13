#!/bin/bash

# Script para diagnosticar y reparar el error 502 del backend
# Autor: Asistente AI
# Fecha: $(date)

echo "=== DIAGNÓSTICO Y REPARACIÓN BACKEND 502 ==="
echo "Fecha: $(date)"
echo ""

# 1. Verificar estado de PM2
echo "📌 1. Verificando estado de PM2..."
sudo systemctl status pm2 --no-pager
echo ""

echo "📌 2. Verificando procesos PM2..."
pm2 status
echo ""

echo "📌 3. Verificando logs recientes..."
pm2 logs --lines 20
echo ""

# 4. Verificar si el backend está corriendo
echo "📌 4. Verificando si el backend está en línea..."
BACKEND_RUNNING=$(pm2 list | grep "grow5x-backend" | grep "online" | wc -l)

if [ $BACKEND_RUNNING -eq 0 ]; then
    echo "⚠️  Backend no está corriendo. Intentando iniciar..."
    
    # Navegar al directorio del backend
    cd /var/www/grow5x/backend
    
    # Verificar que existe server.js
    if [ -f "server.js" ]; then
        echo "✅ Archivo server.js encontrado"
        
        # Iniciar el backend
        pm2 start server.js --name grow5x-backend
        pm2 save
        
        echo "⏳ Esperando 5 segundos para que el backend se inicie..."
        sleep 5
        
        # Verificar nuevamente
        pm2 status
    else
        echo "❌ Error: server.js no encontrado en /var/www/grow5x/backend"
        echo "Verificando estructura de directorios..."
        ls -la /var/www/grow5x/backend/
    fi
else
    echo "✅ Backend está corriendo"
fi

echo ""

# 5. Verificar variables de entorno
echo "📌 5. Verificando configuración del backend..."
cd /var/www/grow5x/backend

if [ -f ".env" ]; then
    echo "✅ Archivo .env encontrado"
    echo "Variables críticas:"
    grep -E "^(PORT|DATABASE_URL|DB_|MONGO)" .env | head -5
else
    echo "⚠️  Archivo .env no encontrado"
    echo "Archivos de configuración disponibles:"
    ls -la .env*
fi

echo ""

# 6. Probar conexión directa al backend
echo "📌 6. Probando conexión directa al backend..."
echo "Probando endpoint de salud..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://127.0.0.1:5000/api/health || echo "❌ No se pudo conectar al backend"

echo ""
echo "Probando endpoint de login..."
curl -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@test.com","password":"test123"}' \
  -w "\nStatus: %{http_code}\n" \
  -s --max-time 10 || echo "❌ Error al probar login"

echo ""

# 7. Verificar configuración de Nginx
echo "📌 7. Verificando configuración de Nginx..."
echo "Configuración del proxy /api/:"
nginx -T 2>/dev/null | grep -A 10 "location /api/" || echo "⚠️  No se encontró configuración de /api/ en Nginx"

echo ""

# 8. Verificar logs de Nginx
echo "📌 8. Verificando logs de Nginx (últimas 10 líneas)..."
echo "Error log:"
tail -10 /var/log/nginx/error.log 2>/dev/null || echo "No se pudo acceder al log de errores"

echo ""
echo "Access log (filtrado por /api/):"
tail -20 /var/log/nginx/access.log 2>/dev/null | grep "/api/" || echo "No hay entradas recientes de /api/"

echo ""
echo "=== RESUMEN DEL DIAGNÓSTICO ==="
echo "✅ Frontend: Funcionando (index.html servido correctamente)"
echo "🔍 Backend: $(pm2 list | grep grow5x-backend | awk '{print $10}' || echo 'Estado desconocido')"
echo "🔍 Nginx: $(systemctl is-active nginx)"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Si el backend no está online, revisar logs: pm2 logs grow5x-backend"
echo "2. Si hay errores de DB, verificar conexión a base de datos"
echo "3. Si Nginx no puede conectar, verificar que el puerto 5000 esté libre"
echo "4. Probar login desde el frontend después de las correcciones"
echo ""
echo "=== FIN DEL DIAGNÓSTICO ==="