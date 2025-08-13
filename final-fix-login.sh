#!/bin/bash

# Script final para resolver el problema de login 502 Bad Gateway
# El problema está en la configuración SSL/HTTPS de Nginx

echo "=== SOLUCIÓN FINAL PARA LOGIN 502 ==="
echo "Fecha: $(date)"
echo ""

# 1. Verificar estado actual
echo "📌 1. Estado actual del sistema..."
echo "Backend PM2:"
pm2 list | grep grow5x-backend || echo "❌ Backend no encontrado"
echo ""
echo "Nginx:"
systemctl status nginx --no-pager | head -3
echo ""

# 2. Verificar certificados SSL
echo "📌 2. Verificando certificados SSL..."
if [ -f "/etc/letsencrypt/live/grow5x.app/fullchain.pem" ]; then
    echo "✅ Certificado SSL encontrado"
    openssl x509 -in /etc/letsencrypt/live/grow5x.app/fullchain.pem -text -noout | grep "Not After" || echo "⚠️  No se pudo verificar expiración"
else
    echo "❌ Certificado SSL no encontrado"
fi
echo ""

# 3. Crear configuración simplificada que funcione
echo "📌 3. Creando configuración simplificada..."
cat > /etc/nginx/sites-available/grow5x-simple.conf << 'EOF'
# Configuración simplificada para grow5x.app
server {
    listen 80;
    server_name grow5x.app www.grow5x.app;
    
    # Frontend
    root /var/www/grow5x/frontend/dist;
    index index.html;
    
    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API Proxy - DIRECTO SIN SSL
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}

# HTTPS con configuración corregida
server {
    listen 443 ssl http2;
    server_name grow5x.app www.grow5x.app;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/grow5x.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grow5x.app/privkey.pem;
    
    # SSL Settings optimizados
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Frontend
    root /var/www/grow5x/frontend/dist;
    index index.html;
    
    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API Proxy - CONFIGURACIÓN CORREGIDA PARA HTTPS
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        
        # Headers esenciales para HTTPS
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Port 443;
        
        # Headers adicionales para SSL
        proxy_set_header X-Forwarded-Ssl on;
        proxy_set_header X-Url-Scheme https;
        
        # Timeouts aumentados
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
EOF

echo "✅ Configuración simplificada creada"
echo ""

# 4. Aplicar nueva configuración
echo "📌 4. Aplicando nueva configuración..."
# Desactivar configuración actual
rm -f /etc/nginx/sites-enabled/grow5x.app
rm -f /etc/nginx/sites-enabled/default

# Activar nueva configuración
ln -sf /etc/nginx/sites-available/grow5x-simple.conf /etc/nginx/sites-enabled/
echo "✅ Nueva configuración activada"
echo ""

# 5. Verificar y recargar Nginx
echo "📌 5. Verificando configuración..."
nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Configuración válida"
    systemctl reload nginx
    echo "✅ Nginx recargado"
else
    echo "❌ Error en configuración"
    exit 1
fi
echo ""

# 6. Verificar que el backend responda
echo "📌 6. Verificando backend..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ Backend responde correctamente"
else
    echo "⚠️  Backend no responde (status: $BACKEND_STATUS)"
    echo "Reiniciando backend..."
    cd /var/www/grow5x/backend
    pm2 restart grow5x-backend || pm2 start server.js --name grow5x-backend
    sleep 3
fi
echo ""

# 7. Pruebas finales
echo "📌 7. Pruebas finales..."
echo "Probando HTTP:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/health || echo "000")
echo "Status HTTP: $HTTP_STATUS"

echo "Probando HTTPS:"
HTTPS_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" https://127.0.0.1/api/health || echo "000")
echo "Status HTTPS: $HTTPS_STATUS"

echo ""
echo "=== RESUMEN FINAL ==="
if [ "$HTTP_STATUS" = "200" ] && [ "$HTTPS_STATUS" = "200" ]; then
    echo "✅ ¡PROBLEMA RESUELTO!"
    echo "✅ HTTP funciona: $HTTP_STATUS"
    echo "✅ HTTPS funciona: $HTTPS_STATUS"
    echo "🎯 El login debería funcionar ahora desde https://grow5x.app"
else
    echo "⚠️  Aún hay problemas:"
    echo "   HTTP: $HTTP_STATUS"
    echo "   HTTPS: $HTTPS_STATUS"
    echo "📋 Verificar logs: pm2 logs grow5x-backend"
fi
echo ""
echo "=== FIN DE LA SOLUCIÓN ==="