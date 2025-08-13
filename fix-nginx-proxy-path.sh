#!/bin/bash

# Script para corregir el proxy_pass de Nginx que está causando el 404 en /api/auth/login
# El problema: proxy_pass sin barra final duplica el path (/api/api/auth/login)

echo "🔧 CORRIGIENDO PROXY_PASS DE NGINX..."
echo "==============================================="

# 1. Verificar configuración actual
echo "📌 1. Verificando configuración actual de Nginx..."
sudo nginx -T | sed -n '/server_name grow5x.app/,/}/p' | sed -n '/location \/api\//,/}/p'

echo ""
echo "📌 2. Buscando archivos de configuración..."
CONFIG_FILE=""
if [ -f "/etc/nginx/sites-available/grow5x.app" ]; then
    CONFIG_FILE="/etc/nginx/sites-available/grow5x.app"
elif [ -f "/etc/nginx/sites-available/default" ]; then
    CONFIG_FILE="/etc/nginx/sites-available/default"
elif [ -f "/etc/nginx/conf.d/grow5x.app.conf" ]; then
    CONFIG_FILE="/etc/nginx/conf.d/grow5x.app.conf"
else
    echo "❌ No se encontró archivo de configuración"
    exit 1
fi

echo "✅ Usando archivo: $CONFIG_FILE"

# 2. Hacer backup
echo "📌 3. Creando backup..."
sudo cp "$CONFIG_FILE" "$CONFIG_FILE.backup-$(date +%Y%m%d-%H%M%S)"
echo "✅ Backup creado"

# 3. Corregir proxy_pass (agregar barra final si no la tiene)
echo "📌 4. Corrigiendo proxy_pass..."
sudo sed -i 's|proxy_pass http://127.0.0.1:5000;|proxy_pass http://127.0.0.1:5000/;|g' "$CONFIG_FILE"
sudo sed -i 's|proxy_pass http://localhost:5000;|proxy_pass http://127.0.0.1:5000/;|g' "$CONFIG_FILE"
echo "✅ proxy_pass corregido"

# 4. Verificar sintaxis
echo "📌 5. Verificando sintaxis de Nginx..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error de sintaxis, restaurando backup"
    sudo cp "$CONFIG_FILE.backup-$(date +%Y%m%d-%H%M%S)" "$CONFIG_FILE"
    exit 1
fi

# 5. Recargar Nginx
echo "📌 6. Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

# 6. Verificar que el backend esté funcionando
echo "📌 7. Verificando backend directo..."
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health)
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo "✅ Backend responde correctamente (200)"
else
    echo "⚠️ Backend responde: $BACKEND_HEALTH"
fi

# 7. Probar login directo al backend
echo "📌 8. Probando login directo al backend..."
BACKEND_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test@example.com","password":"Test123!","userType":"user"}')
echo "Backend login directo: $BACKEND_LOGIN"

# 8. Probar a través de Nginx
echo "📌 9. Probando a través de Nginx..."
NGINX_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://grow5x.app/api/health)
echo "Nginx health: $NGINX_HEALTH"

NGINX_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test@example.com","password":"Test123!","userType":"user"}')
echo "Nginx login: $NGINX_LOGIN"

# 9. Resumen final
echo ""
echo "=== RESUMEN FINAL ==="
if [ "$NGINX_LOGIN" != "404" ]; then
    echo "✅ PROBLEMA RESUELTO: Login ya no devuelve 404"
    echo "✅ El frontend debería poder hacer login ahora"
else
    echo "❌ Login sigue devolviendo 404"
    echo "📋 Verificar logs: pm2 logs grow5x-backend"
    echo "📋 Verificar rutas en server.js"
fi

echo ""
echo "📋 Para probar desde el navegador:"
echo "   1. Abrir https://grow5x.app"
echo "   2. Intentar login con: negociosmillonaris1973@gmail.com / Parent2024!"
echo "   3. Verificar en DevTools que ya no aparece el error 404"
echo ""
echo "=== FIN DE LA CORRECCIÓN ==="