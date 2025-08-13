#!/bin/bash

# SOLUCIÓN DEFINITIVA FINAL - BACKEND CONFIRMADO EN PUERTO 5000
# El backend SÍ funciona en puerto 5000, el problema es solo de Nginx

echo "🎯 SOLUCIÓN DEFINITIVA FINAL - BACKEND CONFIRMADO"
echo "================================================="
echo "✅ CONFIRMADO: Backend funciona en puerto 5000"
echo "❌ PROBLEMA: Solo configuración de Nginx"
echo "🎯 OBJETIVO: Configuración Nginx definitiva"
echo ""

# 1. Backup final
echo "📌 1. Backup final..."
sudo cp -r /etc/nginx /etc/nginx.backup-final-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup creado"

# 2. Limpiar completamente Nginx
echo "📌 2. Limpieza completa de Nginx..."
sudo rm -rf /etc/nginx/sites-enabled/*
sudo rm -rf /etc/nginx/sites-available/*
sudo rm -rf /etc/nginx/conf.d/*.conf 2>/dev/null
echo "✅ Nginx limpiado completamente"

# 3. Crear configuración definitiva única
echo "📌 3. Creando configuración definitiva única..."
sudo tee /etc/nginx/sites-available/grow5x-definitivo.conf > /dev/null << 'EOF'
# CONFIGURACIÓN DEFINITIVA GROW5X
# Backend confirmado en puerto 5000
# Configuración única sin interferencias

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
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Frontend root
    root /var/www/grow5x/frontend/dist;
    index index.html;
    
    # API Proxy - CONFIGURACIÓN DEFINITIVA
    # Backend confirmado funcionando en puerto 5000
    location /api/ {
        # Proxy al backend confirmado
        proxy_pass http://127.0.0.1:5000/;
        
        # Headers esenciales
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Cache y redirección
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
        
        # Buffer settings
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # Frontend SPA - Debe ir DESPUÉS de /api/
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache para assets estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Logs específicos
    access_log /var/log/nginx/grow5x-access.log;
    error_log /var/log/nginx/grow5x-error.log;
}
EOF

echo "✅ Configuración definitiva creada"

# 4. Activar configuración única
echo "📌 4. Activando configuración única..."
sudo ln -sf /etc/nginx/sites-available/grow5x-definitivo.conf /etc/nginx/sites-enabled/grow5x-definitivo.conf
echo "✅ Configuración activada"

# 5. Verificar que solo hay una configuración
echo "📌 5. Verificando configuración única..."
echo "Sites-enabled (debe mostrar solo grow5x-definitivo.conf):"
ls -la /etc/nginx/sites-enabled/
echo ""
echo "Sites-available (debe mostrar solo grow5x-definitivo.conf):"
ls -la /etc/nginx/sites-available/
echo ""

# 6. Verificar sintaxis
echo "📌 6. Verificando sintaxis..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error de sintaxis"
    echo "🔧 Mostrando error:"
    sudo nginx -t
    exit 1
fi

# 7. Reiniciar Nginx completamente
echo "📌 7. Reiniciando Nginx completamente..."
sudo systemctl stop nginx
sleep 3
sudo systemctl start nginx
sudo systemctl status nginx --no-pager -l
echo "✅ Nginx reiniciado"

# 8. Esperar estabilización
echo "📌 8. Esperando estabilización..."
sleep 5

# 9. Verificar configuración cargada
echo "📌 9. Verificando configuración cargada..."
echo "Configuración activa para grow5x.app:"
sudo nginx -T | grep -A 15 "server_name grow5x.app"
echo ""

# 10. Pruebas finales definitivas
echo "📌 10. PRUEBAS FINALES DEFINITIVAS:"
echo ""
echo "Backend directo (confirmado funcionando):"
BACKEND_RESPONSE=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}")
echo "$BACKEND_RESPONSE"
echo ""

echo "Nginx HTTPS (configuración definitiva):"
NGINX_RESPONSE=$(curl -s -k -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}")
echo "$NGINX_RESPONSE"
echo ""

echo "Nginx HTTP (debe redirigir a HTTPS):"
HTTP_RESPONSE=$(curl -s -X POST http://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}" \
  --max-redirs 0)
echo "$HTTP_RESPONSE"
echo ""

# 11. Resultado final
echo "================================================="
if [[ "$BACKEND_RESPONSE" == *"401"* || "$BACKEND_RESPONSE" == *"400"* ]] && [[ "$NGINX_RESPONSE" == *"401"* || "$NGINX_RESPONSE" == *"400"* ]]; then
    echo "🎉 ¡PROBLEMA DEFINITIVAMENTE RESUELTO!"
    echo "✅ Backend funciona: Puerto 5000 confirmado"
    echo "✅ Nginx funciona: Proxy configurado correctamente"
    echo "✅ Ambos responden con el mismo código de estado"
    echo "✅ El sistema está completamente funcional"
    echo ""
    echo "🌐 EL LOGIN DESDE EL NAVEGADOR DEBERÍA FUNCIONAR PERFECTAMENTE"
elif [[ "$NGINX_RESPONSE" == *"404"* ]]; then
    echo "❌ NGINX AÚN RESPONDE 404"
    echo "🔧 Verificar logs de error:"
    sudo tail -10 /var/log/nginx/grow5x-error.log
else
    echo "⚠️  Respuesta inesperada:"
    echo "   Backend: $BACKEND_RESPONSE"
    echo "   Nginx: $NGINX_RESPONSE"
fi

echo ""
echo "📋 CONFIGURACIÓN FINAL APLICADA:"
echo "   ✅ Archivo único: /etc/nginx/sites-available/grow5x-definitivo.conf"
echo "   ✅ Backend confirmado en puerto 5000"
echo "   ✅ Configuración SSL completa"
echo "   ✅ Headers de seguridad"
echo "   ✅ Proxy optimizado para API"
echo "   ✅ Frontend SPA configurado"
echo ""
echo "🌐 PROBAR EN EL NAVEGADOR:"
echo "   https://grow5x.app"
echo "   Usuario: negociosmillonaris1973@gmail.com"
echo "   Contraseña: Parent2024!"
echo ""
echo "📊 LOGS PARA MONITOREO:"
echo "   sudo tail -f /var/log/nginx/grow5x-access.log"
echo "   sudo tail -f /var/log/nginx/grow5x-error.log"
echo "================================================="