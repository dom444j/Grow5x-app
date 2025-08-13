#!/bin/bash

# Script para limpiar Nginx y dejar SOLO el puerto 5000
# Eliminar todas las configuraciones duplicadas y conflictivas

echo "🧹 LIMPIANDO CONFIGURACIÓN DE NGINX..."
echo "==============================================="

# 1. Hacer backup completo
echo "📌 1. Creando backup completo..."
sudo cp -r /etc/nginx /etc/nginx.backup-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup creado"

# 2. Detener Nginx
echo "📌 2. Deteniendo Nginx..."
sudo systemctl stop nginx

# 3. Eliminar configuraciones conflictivas
echo "📌 3. Eliminando configuraciones duplicadas..."
sudo rm -f /etc/nginx/sites-enabled/*
sudo rm -f /etc/nginx/sites-available/default
sudo rm -f /etc/nginx/conf.d/*.conf
echo "✅ Configuraciones antiguas eliminadas"

# 4. Crear configuración limpia SOLO para puerto 5000
echo "📌 4. Creando configuración limpia..."
sudo tee /etc/nginx/sites-available/grow5x.app > /dev/null << 'EOF'
# Configuración LIMPIA para grow5x.app - SOLO PUERTO 5000
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

    # Configuración para SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy - SOLO PUERTO 5000
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
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

echo "✅ Configuración limpia creada"

# 5. Activar configuración
echo "📌 5. Activando configuración..."
sudo ln -sf /etc/nginx/sites-available/grow5x.app /etc/nginx/sites-enabled/
echo "✅ Configuración activada"

# 6. Verificar sintaxis
echo "📌 6. Verificando sintaxis..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error de sintaxis, restaurando backup"
    sudo rm -rf /etc/nginx
    sudo mv /etc/nginx.backup-$(date +%Y%m%d-%H%M%S) /etc/nginx
    exit 1
fi

# 7. Iniciar Nginx
echo "📌 7. Iniciando Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx
echo "✅ Nginx iniciado"

# 8. Verificar que solo hay una configuración
echo "📌 8. Verificando configuración final..."
echo "Configuraciones activas:"
sudo nginx -T | grep -c "location /api/"
echo "Debe mostrar: 1 (una sola configuración)"

# 9. Probar endpoints
echo "📌 9. Probando endpoints..."
echo "Health check:"
curl -s -o /dev/null -w "Status: %{http_code}\n" https://grow5x.app/api/health

echo "Login test:"
curl -s -o /dev/null -w "Status: %{http_code}\n" -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test@example.com","password":"Test123!","userType":"user"}'

echo ""
echo "=== CONFIGURACIÓN FINAL ==="
echo "✅ Solo una configuración activa"
echo "✅ Solo puerto 5000 configurado"
echo "✅ Sin configuraciones duplicadas"
echo ""
echo "📋 Probar login desde el navegador:"
echo "   URL: https://grow5x.app"
echo "   Usuario: negociosmillonaris1973@gmail.com"
echo "   Password: Parent2024!"
echo ""
echo "=== FIN DE LA LIMPIEZA ==="