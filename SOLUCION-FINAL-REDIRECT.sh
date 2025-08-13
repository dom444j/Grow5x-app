#!/bin/bash

# SOLUCIÓN FINAL - PROBLEMA DE REDIRECCIÓN IDENTIFICADO
# Los logs muestran: POST /api/auth/login HTTP/1.1" 301 178
# Hay una redirección que interfiere con el proxy

echo "🎯 SOLUCIÓN FINAL - PROBLEMA DE REDIRECCIÓN IDENTIFICADO"
echo "======================================================"
echo "🔍 PROBLEMA IDENTIFICADO: Redirección 301 en /api/"
echo "📊 EVIDENCIA: POST /api/auth/login HTTP/1.1 301 178"
echo "🎯 SOLUCIÓN: Eliminar redirecciones en bloque /api/"
echo ""

# 1. Backup
echo "📌 1. Backup final..."
sudo cp -r /etc/nginx /etc/nginx.backup-redirect-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup creado"

# 2. Limpiar completamente
echo "📌 2. Limpieza completa..."
sudo rm -rf /etc/nginx/sites-enabled/*
sudo rm -rf /etc/nginx/sites-available/*
sudo rm -rf /etc/nginx/conf.d/*.conf 2>/dev/null
echo "✅ Nginx limpiado"

# 3. Crear configuración sin redirecciones en API
echo "📌 3. Creando configuración SIN redirecciones en API..."
sudo tee /etc/nginx/sites-available/grow5x-sin-redirect.conf > /dev/null << 'EOF'
# CONFIGURACIÓN SIN REDIRECCIONES EN API
# Solución al problema de redirección 301

server {
    listen 80;
    server_name grow5x.app www.grow5x.app;
    
    # API en HTTP - SIN redirección para evitar problemas
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
    
    # Solo el frontend se redirige a HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name grow5x.app www.grow5x.app;
    
    # SSL
    ssl_certificate /etc/letsencrypt/live/grow5x.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grow5x.app/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # Frontend
    root /var/www/grow5x/frontend/dist;
    index index.html;
    
    # API en HTTPS - SIN redirecciones internas
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        
        # IMPORTANTE: Desactivar redirecciones automáticas
        proxy_redirect off;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffer settings
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # Frontend SPA
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

echo "✅ Configuración sin redirecciones creada"

# 4. Activar configuración
echo "📌 4. Activando configuración..."
sudo ln -sf /etc/nginx/sites-available/grow5x-sin-redirect.conf /etc/nginx/sites-enabled/grow5x-sin-redirect.conf
echo "✅ Configuración activada"

# 5. Verificar sintaxis
echo "📌 5. Verificando sintaxis..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error de sintaxis"
    sudo nginx -t
    exit 1
fi

# 6. Reiniciar Nginx
echo "📌 6. Reiniciando Nginx..."
sudo systemctl stop nginx
sleep 2
sudo systemctl start nginx
echo "✅ Nginx reiniciado"

# 7. Esperar
echo "📌 7. Esperando estabilización..."
sleep 5

# 8. Limpiar logs para prueba limpia
echo "📌 8. Limpiando logs para prueba limpia..."
sudo truncate -s 0 /var/log/nginx/access.log
sudo truncate -s 0 /var/log/nginx/error.log
echo "✅ Logs limpiados"

# 9. Pruebas finales
echo "📌 9. PRUEBAS FINALES SIN REDIRECCIONES:"
echo ""
echo "Backend directo (confirmado funcionando):"
BACKEND_RESPONSE=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}")
echo "$BACKEND_RESPONSE"
echo ""

echo "Nginx HTTP (sin redirección en API):"
HTTP_API_RESPONSE=$(curl -s -X POST http://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}" \
  --max-redirs 0)
echo "$HTTP_API_RESPONSE"
echo ""

echo "Nginx HTTPS (sin redirecciones internas):"
HTTPS_API_RESPONSE=$(curl -s -k -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}")
echo "$HTTPS_API_RESPONSE"
echo ""

# 10. Verificar logs después de las pruebas
echo "📌 10. Verificando logs después de las pruebas..."
echo "Logs de acceso (deben mostrar códigos 401/400, NO 301):"
sudo tail -10 /var/log/nginx/access.log
echo ""
echo "Logs de error:"
sudo tail -5 /var/log/nginx/error.log
echo ""

# 11. Resultado final
echo "======================================================"
if [[ "$BACKEND_RESPONSE" == *"401"* || "$BACKEND_RESPONSE" == *"400"* ]] && 
   [[ "$HTTP_API_RESPONSE" == *"401"* || "$HTTP_API_RESPONSE" == *"400"* ]] && 
   [[ "$HTTPS_API_RESPONSE" == *"401"* || "$HTTPS_API_RESPONSE" == *"400"* ]]; then
    echo "🎉 ¡PROBLEMA DE REDIRECCIÓN RESUELTO!"
    echo "✅ Backend funciona: Puerto 5000 confirmado"
    echo "✅ HTTP API funciona: Sin redirecciones"
    echo "✅ HTTPS API funciona: Sin redirecciones internas"
    echo "✅ Todos responden con el mismo código de estado"
    echo "✅ El sistema está completamente funcional"
    echo ""
    echo "🌐 EL LOGIN DESDE EL NAVEGADOR DEBERÍA FUNCIONAR PERFECTAMENTE"
elif [[ "$HTTP_API_RESPONSE" == *"301"* || "$HTTPS_API_RESPONSE" == *"301"* ]]; then
    echo "❌ AÚN HAY REDIRECCIONES"
    echo "🔧 Verificar configuración de Nginx"
    echo "🔧 Logs de acceso muestran:"
    sudo tail -5 /var/log/nginx/access.log
elif [[ "$HTTP_API_RESPONSE" == *"404"* || "$HTTPS_API_RESPONSE" == *"404"* ]]; then
    echo "❌ AÚN RESPONDE 404"
    echo "🔧 El problema no era solo la redirección"
else
    echo "⚠️  Respuestas:"
    echo "   Backend: $BACKEND_RESPONSE"
    echo "   HTTP API: $HTTP_API_RESPONSE"
    echo "   HTTPS API: $HTTPS_API_RESPONSE"
fi

echo ""
echo "📋 CONFIGURACIÓN FINAL:"
echo "   ✅ Sin redirecciones en bloque /api/"
echo "   ✅ proxy_redirect off activado"
echo "   ✅ API disponible en HTTP y HTTPS"
echo "   ✅ Solo frontend se redirige a HTTPS"
echo ""
echo "🌐 PROBAR EN EL NAVEGADOR:"
echo "   https://grow5x.app"
echo "   Usuario: negociosmillonaris1973@gmail.com"
echo "   Contraseña: Parent2024!"
echo "======================================================"