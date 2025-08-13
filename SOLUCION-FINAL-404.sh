#!/bin/bash

# SOLUCIÓN FINAL PARA EL ERROR 404 - BASADA EN DIAGNÓSTICO
# PROBLEMA CONFIRMADO: Nginx devuelve "Route not found" en lugar de enviar al backend

echo "🔧 SOLUCIÓN FINAL PARA ERROR 404 - NGINX NO ENVÍA AL BACKEND"
echo "========================================================"
echo "DIAGNÓSTICO: Nginx responde 'Route not found' en lugar de proxy al backend"
echo "CAUSA: Configuración de location /api/ incorrecta"
echo ""

# 1. Backup
echo "📌 1. Creando backup..."
sudo cp /etc/nginx/sites-available/grow5x.app /etc/nginx/sites-available/grow5x.app.backup-final-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup creado"

# 2. Mostrar configuración problemática actual
echo "📌 2. Configuración problemática actual:"
sudo grep -A 10 -B 2 "location /api/" /etc/nginx/sites-available/grow5x.app
echo ""

# 3. Eliminar COMPLETAMENTE el archivo y recrearlo desde cero
echo "📌 3. Recreando archivo de configuración desde cero..."
sudo tee /etc/nginx/sites-available/grow5x.app > /dev/null << 'EOF'
# CONFIGURACIÓN FINAL GROW5X.APP - SOLUCIÓN 404
# Fecha: $(date)
# Problema resuelto: Nginx no enviaba peticiones al backend

server {
    listen 80;
    server_name grow5x.app www.grow5x.app;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name grow5x.app www.grow5x.app;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/grow5x.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grow5x.app/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # Frontend
    root /var/www/grow5x/frontend/dist;
    index index.html;
    
    # API Proxy - CONFIGURACIÓN CORREGIDA PARA EVITAR 404
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        proxy_redirect off;
    }
    
    # Frontend routes (SPA) - DEBE IR DESPUÉS DE /api/
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

echo "✅ Archivo recreado completamente"

# 4. Verificar sintaxis
echo "📌 4. Verificando sintaxis..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error de sintaxis, restaurando backup"
    sudo cp /etc/nginx/sites-available/grow5x.app.backup-final-$(date +%Y%m%d-%H%M%S) /etc/nginx/sites-available/grow5x.app
    exit 1
fi

# 5. Recargar Nginx
echo "📌 5. Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

# 6. Esperar un momento para que se aplique
echo "📌 6. Esperando que se aplique la configuración..."
sleep 3

# 7. Prueba final
echo "📌 7. PRUEBA FINAL DEFINITIVA:"
echo "Backend directo:"
BACKEND_RESPONSE=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}")
echo "$BACKEND_RESPONSE"
echo ""

echo "Nginx (después de la corrección):"
NGINX_RESPONSE=$(curl -s -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}")
echo "$NGINX_RESPONSE"
echo ""

# 8. Verificar resultado
echo "========================================================"
if [[ "$BACKEND_RESPONSE" == *"401"* && "$NGINX_RESPONSE" == *"401"* ]]; then
    echo "✅ ¡PROBLEMA DEFINITIVAMENTE RESUELTO!"
    echo "✅ Ambos responden 401 (Invalid credentials)"
    echo "✅ Nginx ahora SÍ envía las peticiones al backend"
    echo "🌐 El login desde el navegador debería funcionar perfectamente"
elif [[ "$NGINX_RESPONSE" == *"404"* ]]; then
    echo "❌ AÚN PERSISTE EL PROBLEMA 404"
    echo "🔧 Nginx sigue sin enviar peticiones al backend"
    echo "📋 Revisar configuración manualmente"
else
    echo "⚠️  Respuesta inesperada, verificar manualmente:"
    echo "   Backend: $BACKEND_RESPONSE"
    echo "   Nginx: $NGINX_RESPONSE"
fi

echo ""
echo "📋 CONFIGURACIÓN APLICADA:"
echo "   ✅ Archivo recreado desde cero"
echo "   ✅ location /api/ ANTES de location /"
echo "   ✅ proxy_pass con barra final"
echo "   ✅ Headers correctos"
echo ""
echo "🌐 PROBAR EN EL NAVEGADOR:"
echo "   https://grow5x.app"
echo "   negociosmillonaris1973@gmail.com"
echo "   Parent2024!"
echo "========================================================"