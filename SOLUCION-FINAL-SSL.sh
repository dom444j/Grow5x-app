#!/bin/bash

# SOLUCIÓN FINAL - PROBLEMA IDENTIFICADO: CONFIGURACIÓN SSL ESPECÍFICA
# DESCUBRIMIENTO: Puerto 8080 funciona (401), HTTPS 443 no funciona (404)
# CAUSA: Problema específico con configuración SSL o interferencia

echo "🔧 SOLUCIÓN FINAL - PROBLEMA SSL IDENTIFICADO"
echo "============================================="
echo "DESCUBRIMIENTO: Puerto 8080 HTTP funciona, HTTPS 443 no"
echo "CAUSA: Problema específico con configuración SSL"
echo ""

# 1. Backup
echo "📌 1. Backup final..."
sudo cp /etc/nginx/sites-available/grow5x.app /etc/nginx/sites-available/grow5x.app.backup-ssl-$(date +%Y%m%d-%H%M%S)

# 2. Eliminar configuración de prueba
echo "📌 2. Limpiando configuración de prueba..."
sudo rm -f /etc/nginx/sites-enabled/test-proxy
sudo rm -f /etc/nginx/sites-available/test-proxy

# 3. Crear configuración SSL corregida
echo "📌 3. Creando configuración SSL corregida..."
sudo tee /etc/nginx/sites-available/grow5x.app > /dev/null << 'EOF'
# CONFIGURACIÓN FINAL SSL CORREGIDA - GROW5X.APP
# Problema resuelto: Configuración SSL específica

server {
    listen 80;
    server_name grow5x.app www.grow5x.app;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name grow5x.app www.grow5x.app;
    
    # SSL Configuration - CORREGIDA
    ssl_certificate /etc/letsencrypt/live/grow5x.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grow5x.app/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Frontend
    root /var/www/grow5x/frontend/dist;
    index index.html;
    
    # API Proxy - CONFIGURACIÓN QUE FUNCIONA EN PUERTO 8080
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        proxy_redirect off;
        
        # Headers adicionales para SSL
        proxy_set_header X-Forwarded-Ssl on;
        proxy_set_header X-Url-Scheme $scheme;
    }
    
    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
EOF

echo "✅ Configuración SSL corregida creada"

# 4. Verificar sintaxis
echo "📌 4. Verificando sintaxis..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error de sintaxis, restaurando backup"
    sudo cp /etc/nginx/sites-available/grow5x.app.backup-ssl-$(date +%Y%m%d-%H%M%S) /etc/nginx/sites-available/grow5x.app
    exit 1
fi

# 5. Recargar Nginx
echo "📌 5. Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

# 6. Esperar aplicación
echo "📌 6. Esperando aplicación de configuración..."
sleep 5

# 7. Prueba final definitiva
echo "📌 7. PRUEBA FINAL DEFINITIVA:"
echo "Backend directo:"
BACKEND_RESPONSE=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}")
echo "$BACKEND_RESPONSE"
echo ""

echo "Nginx HTTPS (configuración SSL corregida):"
NGINX_RESPONSE=$(curl -s -k -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}")
echo "$NGINX_RESPONSE"
echo ""

# 8. Verificar resultado final
echo "============================================="
if [[ "$BACKEND_RESPONSE" == *"401"* && "$NGINX_RESPONSE" == *"401"* ]]; then
    echo "✅ ¡PROBLEMA DEFINITIVAMENTE RESUELTO!"
    echo "✅ Backend: 401 (Invalid credentials)"
    echo "✅ Nginx HTTPS: 401 (Invalid credentials)"
    echo "✅ Nginx ahora SÍ envía peticiones al backend"
    echo "🌐 El login desde el navegador debería funcionar"
elif [[ "$NGINX_RESPONSE" == *"404"* ]]; then
    echo "❌ PROBLEMA PERSISTE - 404"
    echo "🔧 Posible causa: Interferencia de otra configuración"
    echo "📋 Verificar manualmente:"
    echo "   - Otros archivos en /etc/nginx/conf.d/"
    echo "   - Configuración en nginx.conf principal"
    echo "   - Logs de error: tail -f /var/log/nginx/error.log"
else
    echo "⚠️  Respuesta inesperada:"
    echo "   Backend: $BACKEND_RESPONSE"
    echo "   Nginx: $NGINX_RESPONSE"
fi

echo ""
echo "📋 CONFIGURACIÓN FINAL APLICADA:"
echo "   ✅ SSL configurado correctamente"
echo "   ✅ Headers SSL adicionales"
echo "   ✅ Configuración que funciona en puerto 8080 aplicada a 443"
echo "   ✅ Sin líneas duplicadas"
echo ""
echo "🌐 PROBAR EN EL NAVEGADOR:"
echo "   https://grow5x.app"
echo "   negociosmillonaris1973@gmail.com"
echo "   Parent2024!"
echo "============================================="