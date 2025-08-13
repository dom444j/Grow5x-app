#!/bin/bash

# Script para reconstruir configuración simple de Nginx
echo "🔧 RECONSTRUYENDO CONFIGURACIÓN SIMPLE DE NGINX"
echo "============================================="

# Hacer backup
echo "📌 Creando backup..."
sudo cp /etc/nginx/sites-available/grow5x.app /etc/nginx/sites-available/grow5x.app.backup-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup creado"

# Crear configuración simple y funcional
echo "📌 Creando configuración simple..."
sudo tee /etc/nginx/sites-available/grow5x.app > /dev/null << 'EOF'
# Configuración SIMPLE para grow5x.app
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
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Frontend
    root /var/www/grow5x/frontend/dist;
    index index.html;

    # API Proxy - CONFIGURACIÓN CORRECTA
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # SPA Configuration
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

echo "✅ Configuración simple creada"

# Verificar sintaxis
echo "📌 Verificando sintaxis..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta"
    sudo systemctl reload nginx
    echo "✅ Nginx recargado"
else
    echo "❌ Error de sintaxis"
    exit 1
fi

# Mostrar configuración final
echo "📌 Configuración /api/ final:"
sudo grep -A 8 "location /api/" /etc/nginx/sites-available/grow5x.app

# Prueba definitiva
echo ""
echo "📌 PRUEBA DEFINITIVA:"
echo "Backend directo:"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}')
echo "Status: $BACKEND_STATUS"

echo "Nginx (dominio):"
NGINX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}')
echo "Status: $NGINX_STATUS"

echo ""
if [ "$BACKEND_STATUS" = "$NGINX_STATUS" ]; then
    echo "🎉 ¡ÉXITO! Backend: $BACKEND_STATUS, Nginx: $NGINX_STATUS"
    echo "✅ El problema del 404 está RESUELTO"
else
    echo "❌ Diferencia: Backend=$BACKEND_STATUS, Nginx=$NGINX_STATUS"
fi

echo ""
echo "🌐 PROBAR EN EL NAVEGADOR:"
echo "   https://grow5x.app"
echo "   negociosmillonaris1973@gmail.com"
echo "   Parent2024!"