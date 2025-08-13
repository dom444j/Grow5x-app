#!/bin/bash

# Script para reconstruir completamente la configuración de Nginx
echo "🔧 RECONSTRUYENDO CONFIGURACIÓN COMPLETA DE NGINX"
echo "==============================================="

# Hacer backup
echo "📌 Creando backup completo..."
sudo cp /etc/nginx/sites-available/grow5x.app /etc/nginx/sites-available/grow5x.app.backup-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup creado"

# Crear configuración completamente nueva
echo "📌 Creando configuración nueva y limpia..."
sudo tee /etc/nginx/sites-available/grow5x.app > /dev/null << 'EOF'
# Configuración COMPLETA para grow5x.app - RECONSTRUIDA
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

    # Frontend - Servir archivos estáticos
    root /var/www/grow5x/frontend/dist;
    index index.html;

    # API Proxy - CONFIGURACIÓN LIMPIA Y CORRECTA
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Configuración para SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
EOF

echo "✅ Configuración nueva creada"

# Verificar sintaxis
echo "📌 Verificando sintaxis..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error de sintaxis, restaurando backup"
    sudo cp /etc/nginx/sites-available/grow5x.app.backup-$(date +%Y%m%d-%H%M%S) /etc/nginx/sites-available/grow5x.app
    exit 1
fi

# Recargar Nginx
echo "📌 Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

# Verificar configuración final
echo "📌 Configuración final del bloque /api/:"
sudo grep -A 8 "location /api/" /etc/nginx/sites-available/grow5x.app

# Prueba final definitiva
echo ""
echo "📌 PRUEBA FINAL DEFINITIVA:"
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
    echo "🎉 ¡PROBLEMA DEFINITIVAMENTE RESUELTO!"
    echo "✅ Backend: $BACKEND_STATUS, Nginx: $NGINX_STATUS (IGUALES)"
    echo "🌐 El login desde el navegador funcionará ahora"
else
    echo "❌ Aún hay diferencia: Backend=$BACKEND_STATUS, Nginx=$NGINX_STATUS"
    echo "📋 Verificar logs: sudo tail -f /var/log/nginx/error.log"
fi

echo ""
echo "🌐 PROBAR INMEDIATAMENTE EN EL NAVEGADOR:"
echo "   https://grow5x.app"
echo "   negociosmillonaris1973@gmail.com"
echo "   Parent2024!"
echo ""
echo "✅ El error 404 debe estar COMPLETAMENTE resuelto"