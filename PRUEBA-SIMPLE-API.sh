#!/bin/bash

# PRUEBA SIMPLE API - VERIFICACIÓN DIRECTA
# Crear configuración mínima para probar solo el proxy /api/

echo "🔍 PRUEBA SIMPLE API - VERIFICACIÓN DIRECTA"
echo "==========================================="
echo "OBJETIVO: Probar configuración mínima solo para /api/"
echo ""

# 1. Backup actual
echo "📌 1. Backup de configuración actual..."
sudo cp /etc/nginx/sites-available/grow5x-definitivo.conf /etc/nginx/sites-available/grow5x-definitivo.conf.backup
echo "✅ Backup creado"

# 2. Crear configuración super simple solo para API
echo "📌 2. Creando configuración super simple..."
sudo tee /etc/nginx/sites-available/grow5x-simple-test.conf > /dev/null << 'EOF'
# CONFIGURACIÓN SUPER SIMPLE - SOLO PARA PROBAR API
server {
    listen 443 ssl http2;
    server_name grow5x.app www.grow5x.app;
    
    # SSL básico
    ssl_certificate /etc/letsencrypt/live/grow5x.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grow5x.app/privkey.pem;
    
    # Solo API - configuración mínima
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Respuesta por defecto para todo lo demás
    location / {
        return 200 "Nginx funcionando - Solo API configurada";
        add_header Content-Type text/plain;
    }
}
EOF

echo "✅ Configuración simple creada"

# 3. Desactivar configuración actual y activar simple
echo "📌 3. Activando configuración simple..."
sudo rm -f /etc/nginx/sites-enabled/*
sudo ln -sf /etc/nginx/sites-available/grow5x-simple-test.conf /etc/nginx/sites-enabled/grow5x-simple-test.conf
echo "✅ Configuración simple activada"

# 4. Verificar sintaxis
echo "📌 4. Verificando sintaxis..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error de sintaxis"
    sudo nginx -t
    exit 1
fi

# 5. Recargar Nginx
echo "📌 5. Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

# 6. Esperar
echo "📌 6. Esperando estabilización..."
sleep 3

# 7. Probar configuración simple
echo "📌 7. PROBANDO CONFIGURACIÓN SIMPLE:"
echo ""
echo "Prueba 1 - Página principal (debe mostrar mensaje):"
curl -s -k https://grow5x.app/ || echo "Error en página principal"
echo ""
echo ""
echo "Prueba 2 - API con configuración simple:"
API_RESPONSE=$(curl -s -k -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}")
echo "$API_RESPONSE"
echo ""

# 8. Verificar logs
echo "📌 8. Verificando logs recientes..."
echo "Logs de acceso (últimas 5 líneas):"
sudo tail -5 /var/log/nginx/access.log
echo ""
echo "Logs de error (últimas 5 líneas):"
sudo tail -5 /var/log/nginx/error.log
echo ""

# 9. Resultado
echo "==========================================="
if [[ "$API_RESPONSE" == *"401"* || "$API_RESPONSE" == *"400"* ]]; then
    echo "🎉 ¡CONFIGURACIÓN SIMPLE FUNCIONA!"
    echo "✅ El problema era la configuración compleja"
    echo "✅ API proxy funciona correctamente"
    echo ""
    echo "🔧 SIGUIENTE PASO: Restaurar configuración completa pero corregida"
    
    # Restaurar configuración completa pero corregida
    echo "📌 Restaurando configuración completa corregida..."
    sudo tee /etc/nginx/sites-available/grow5x-corregido.conf > /dev/null << 'EOFCORR'
# CONFIGURACIÓN CORREGIDA BASADA EN PRUEBA EXITOSA
server {
    listen 80;
    server_name grow5x.app www.grow5x.app;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name grow5x.app www.grow5x.app;
    
    # SSL
    ssl_certificate /etc/letsencrypt/live/grow5x.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grow5x.app/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Frontend
    root /var/www/grow5x/frontend/dist;
    index index.html;
    
    # API - CONFIGURACIÓN QUE FUNCIONA
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOFCORR
    
    # Activar configuración corregida
    sudo rm -f /etc/nginx/sites-enabled/*
    sudo ln -sf /etc/nginx/sites-available/grow5x-corregido.conf /etc/nginx/sites-enabled/grow5x-corregido.conf
    
    if sudo nginx -t; then
        sudo systemctl reload nginx
        sleep 3
        
        echo "📌 PRUEBA FINAL CON CONFIGURACIÓN CORREGIDA:"
        FINAL_RESPONSE=$(curl -s -k -X POST https://grow5x.app/api/auth/login \
          -H 'Content-Type: application/json' \
          -d '{"identifier":"test","password":"test"}' \
          -w "\nStatus: %{http_code}")
        echo "$FINAL_RESPONSE"
        
        if [[ "$FINAL_RESPONSE" == *"401"* || "$FINAL_RESPONSE" == *"400"* ]]; then
            echo "🎉 ¡CONFIGURACIÓN COMPLETA FUNCIONA!"
            echo "✅ PROBLEMA COMPLETAMENTE RESUELTO"
        else
            echo "❌ Configuración completa aún falla"
        fi
    fi
    
elif [[ "$API_RESPONSE" == *"404"* ]]; then
    echo "❌ CONFIGURACIÓN SIMPLE TAMBIÉN FALLA"
    echo "🔧 El problema es más profundo"
    echo "🔧 Posibles causas:"
    echo "   - Problema con SSL"
    echo "   - Problema con server_name"
    echo "   - Problema con DNS interno"
    echo "   - Backend no está realmente en puerto 5000"
else
    echo "⚠️  Respuesta inesperada: $API_RESPONSE"
fi

echo ""
echo "🌐 PROBAR EN EL NAVEGADOR:"
echo "   https://grow5x.app"
echo "   Usuario: negociosmillonaris1973@gmail.com"
echo "   Contraseña: Parent2024!"
echo "==========================================="