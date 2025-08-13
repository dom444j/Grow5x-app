#!/bin/bash

# Script definitivo para corregir el proxy de Nginx y validar el login
# Pasos exactos para resolver el 404 en /api/auth/login

echo "🔧 CORRIGIENDO PROXY DE NGINX - SOLUCIÓN DEFINITIVA"
echo "==============================================="

# 1) Ver qué config de Nginx está activa para grow5x.app
echo "📌 1. Verificando configuración actual de Nginx..."
sudo nginx -T | sed -n '/server_name grow5x.app/,/}/p'

echo ""
echo "📌 2. Localizando archivo de configuración..."
CONFIG_FILE=""
if [ -f "/etc/nginx/sites-available/grow5x.app" ]; then
    CONFIG_FILE="/etc/nginx/sites-available/grow5x.app"
else
    echo "❌ Archivo de configuración no encontrado"
    exit 1
fi

echo "✅ Usando archivo: $CONFIG_FILE"

# 2) Hacer backup
echo "📌 3. Creando backup..."
sudo cp "$CONFIG_FILE" "$CONFIG_FILE.backup-$(date +%Y%m%d-%H%M%S)"
echo "✅ Backup creado"

# 3) Corregir el bloque /api/ con la configuración EXACTA
echo "📌 4. Corrigiendo bloque /api/ con configuración exacta..."
sudo tee /tmp/api_block.conf > /dev/null << 'EOF'
    # API Proxy - CONFIGURACIÓN CORREGIDA
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;   # <= barra final OBLIGATORIA
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_redirect off;
    }
EOF

# Reemplazar el bloque /api/ existente
sudo sed -i '/location \/api\//,/}/c\    # API Proxy - CONFIGURACIÓN CORREGIDA\n    location /api/ {\n        proxy_pass http://127.0.0.1:5000/;   # <= barra final OBLIGATORIA\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_redirect off;\n    }' "$CONFIG_FILE"

echo "✅ Bloque /api/ corregido"

# 4) Probar sintaxis y recargar Nginx
echo "📌 5. Probando sintaxis y recargando Nginx..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Nginx recargado correctamente"
else
    echo "❌ Error de sintaxis, restaurando backup"
    sudo cp "$CONFIG_FILE.backup-$(date +%Y%m%d-%H%M%S)" "$CONFIG_FILE"
    exit 1
fi

# 5) Probar backend directo
echo "📌 6. Probando backend directo..."
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health)
echo "Backend health directo: $BACKEND_HEALTH"
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo "✅ Backend responde correctamente"
else
    echo "⚠️ Backend no responde como esperado"
fi

# 6) Probar login DIRECTO al backend
echo "📌 7. Probando login directo al backend..."
BACKEND_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"negociosmillonaris1973@gmail.com","password":"Parent2024!","userType":"user"}')
echo "Backend login directo: $BACKEND_LOGIN"

if [ "$BACKEND_LOGIN" = "404" ]; then
    echo "❌ Backend roto - devuelve 404"
else
    echo "✅ Backend funciona - responde $BACKEND_LOGIN (200/400/401 está bien)"
fi

# 7) Probar vía Nginx
echo "📌 8. Probando vía Nginx (dominio)..."
NGINX_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://grow5x.app/api/health)
echo "Nginx health: $NGINX_HEALTH"

NGINX_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"negociosmillonaris1973@gmail.com","password":"Parent2024!","userType":"user"}')
echo "Nginx login: $NGINX_LOGIN"

# 8) Análisis de resultados
echo ""
echo "=== ANÁLISIS DE RESULTADOS ==="
if [ "$BACKEND_LOGIN" = "404" ]; then
    echo "❌ PROBLEMA EN BACKEND: El backend no tiene las rutas montadas"
    echo "📋 Verificar: app.use('/api', require('./routes/auth.routes'));"
    echo "📋 Verificar: pm2 status y logs"
elif [ "$NGINX_LOGIN" = "404" ] && [ "$BACKEND_LOGIN" != "404" ]; then
    echo "❌ PROBLEMA EN PROXY: Backend funciona pero Nginx no"
    echo "📋 Verificar: proxy_pass debe tener barra final"
elif [ "$NGINX_LOGIN" = "$BACKEND_LOGIN" ]; then
    echo "✅ PROBLEMA RESUELTO: Nginx y backend responden igual"
    echo "✅ El login desde el navegador debería funcionar ahora"
else
    echo "⚠️ Resultados inconsistentes - revisar configuración"
fi

echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Abrir https://grow5x.app en el navegador"
echo "2. Intentar login con: negociosmillonaris1973@gmail.com"
echo "3. Password: Parent2024!"
echo "4. Verificar que NO aparece error 404"
echo ""
echo "=== FIN DE LA CORRECCIÓN ==="