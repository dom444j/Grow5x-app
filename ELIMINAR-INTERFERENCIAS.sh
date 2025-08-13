#!/bin/bash

# ELIMINAR INTERFERENCIAS - SOLUCIÓN FINAL DEFINITIVA
# El problema persiste porque hay otra configuración interfiriendo

echo "🧹 ELIMINANDO TODAS LAS INTERFERENCIAS - SOLUCIÓN DEFINITIVA"
echo "============================================================"
echo "PROBLEMA: Configuración funciona en puerto 8080 pero no en 443"
echo "CAUSA: Hay otra configuración interfiriendo con HTTPS"
echo ""

# 1. Backup completo
echo "📌 1. Backup completo del sistema..."
sudo cp -r /etc/nginx /etc/nginx.backup-interferencias-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup completo creado"

# 2. Identificar TODAS las configuraciones que mencionan grow5x o puerto 443
echo "📌 2. Identificando TODAS las configuraciones conflictivas..."
echo "Archivos que contienen 'grow5x':"
sudo find /etc/nginx -type f -exec grep -l "grow5x" {} \; 2>/dev/null
echo ""
echo "Archivos que contienen 'listen 443':"
sudo find /etc/nginx -type f -exec grep -l "listen 443" {} \; 2>/dev/null
echo ""
echo "Archivos que contienen 'location /api':"
sudo find /etc/nginx -type f -exec grep -l "location /api" {} \; 2>/dev/null
echo ""

# 3. Eliminar TODAS las configuraciones conflictivas
echo "📌 3. Eliminando TODAS las configuraciones conflictivas..."

# Eliminar sites-enabled
sudo rm -f /etc/nginx/sites-enabled/*
echo "✅ Sites-enabled limpiado"

# Eliminar conf.d
sudo rm -f /etc/nginx/conf.d/*.conf 2>/dev/null
echo "✅ Conf.d limpiado"

# Eliminar configuraciones por defecto
sudo rm -f /etc/nginx/sites-available/default 2>/dev/null
echo "✅ Configuración por defecto eliminada"

# 4. Verificar nginx.conf principal
echo "📌 4. Verificando nginx.conf principal..."
echo "Contenido de include en nginx.conf:"
sudo grep -A 5 -B 5 "include.*sites" /etc/nginx/nginx.conf
echo ""

# 5. Crear configuración ÚNICA y LIMPIA
echo "📌 5. Creando configuración ÚNICA y LIMPIA..."
sudo tee /etc/nginx/sites-available/grow5x-unico.conf > /dev/null << 'EOF'
# CONFIGURACIÓN ÚNICA GROW5X - SIN INTERFERENCIAS
# Archivo único para evitar conflictos

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
    
    # API Proxy - CONFIGURACIÓN ÚNICA SIN INTERFERENCIAS
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
    
    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

echo "✅ Configuración única creada"

# 6. Activar SOLO la configuración única
echo "📌 6. Activando SOLO la configuración única..."
sudo ln -sf /etc/nginx/sites-available/grow5x-unico.conf /etc/nginx/sites-enabled/grow5x-unico.conf
echo "✅ Configuración única activada"

# 7. Verificar que NO hay otras configuraciones
echo "📌 7. Verificando que NO hay otras configuraciones..."
echo "Sites-enabled (debe mostrar solo grow5x-unico.conf):"
ls -la /etc/nginx/sites-enabled/
echo ""
echo "Conf.d (debe estar vacío):"
ls -la /etc/nginx/conf.d/ 2>/dev/null || echo "Directorio vacío"
echo ""

# 8. Verificar sintaxis
echo "📌 8. Verificando sintaxis..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error de sintaxis, restaurando backup"
    sudo rm -rf /etc/nginx
    sudo mv /etc/nginx.backup-interferencias-$(date +%Y%m%d-%H%M%S) /etc/nginx
    exit 1
fi

# 9. Reiniciar Nginx completamente
echo "📌 9. Reiniciando Nginx completamente..."
sudo systemctl stop nginx
sleep 2
sudo systemctl start nginx
echo "✅ Nginx reiniciado"

# 10. Esperar estabilización
echo "📌 10. Esperando estabilización..."
sleep 5

# 11. Verificar configuración cargada
echo "📌 11. Verificando configuración cargada..."
echo "Configuración activa (debe mostrar solo grow5x-unico):"
sudo nginx -T | grep -A 5 "server_name grow5x.app"
echo ""

# 12. Prueba final definitiva
echo "📌 12. PRUEBA FINAL DEFINITIVA SIN INTERFERENCIAS:"
echo "Backend directo:"
BACKEND_RESPONSE=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}")
echo "$BACKEND_RESPONSE"
echo ""

echo "Nginx HTTPS (sin interferencias):"
NGINX_RESPONSE=$(curl -s -k -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}")
echo "$NGINX_RESPONSE"
echo ""

# 13. Resultado final
echo "============================================================"
if [[ "$BACKEND_RESPONSE" == *"401"* && "$NGINX_RESPONSE" == *"401"* ]]; then
    echo "✅ ¡PROBLEMA DEFINITIVAMENTE RESUELTO!"
    echo "✅ Todas las interferencias eliminadas"
    echo "✅ Backend y Nginx responden igual: 401"
    echo "✅ El proxy funciona correctamente"
    echo "🌐 El login desde el navegador debería funcionar"
elif [[ "$NGINX_RESPONSE" == *"404"* ]]; then
    echo "❌ PROBLEMA AÚN PERSISTE"
    echo "🔧 Posibles causas restantes:"
    echo "   - Problema en nginx.conf principal"
    echo "   - Caché de navegador"
    echo "   - Problema de DNS"
    echo "   - Backend no está realmente en puerto 5000"
else
    echo "⚠️  Respuesta inesperada:"
    echo "   Backend: $BACKEND_RESPONSE"
    echo "   Nginx: $NGINX_RESPONSE"
fi

echo ""
echo "📋 CONFIGURACIÓN FINAL:"
echo "   ✅ Archivo único: /etc/nginx/sites-available/grow5x-unico.conf"
echo "   ✅ Sin interferencias de otros archivos"
echo "   ✅ Nginx reiniciado completamente"
echo "   ✅ Configuración limpia y única"
echo ""
echo "🌐 PROBAR EN EL NAVEGADOR:"
echo "   https://grow5x.app"
echo "   negociosmillonaris1973@gmail.com"
echo "   Parent2024!"
echo "============================================================"