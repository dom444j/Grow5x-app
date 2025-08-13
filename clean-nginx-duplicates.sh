#!/bin/bash

# Script para limpiar líneas duplicadas en la configuración de Nginx
echo "🧹 LIMPIANDO LÍNEAS DUPLICADAS EN NGINX"
echo "====================================="

# Hacer backup
echo "📌 Creando backup..."
sudo cp /etc/nginx/sites-available/grow5x.app /etc/nginx/sites-available/grow5x.app.backup-$(date +%Y%m%d-%H%M%S)

# Mostrar problema actual
echo "📌 Problema actual (líneas duplicadas):"
sudo grep -A 10 "location /api/" /etc/nginx/sites-available/grow5x.app

echo ""
echo "📌 Eliminando líneas duplicadas..."

# Crear configuración limpia temporal
sudo tee /tmp/clean_api_block.txt > /dev/null << 'EOF'
    # API Proxy - CONFIGURACIÓN LIMPIA
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_redirect off;
    }
EOF

# Eliminar todo el bloque /api/ existente y reemplazarlo
sudo sed -i '/location \/api\//,/}/d' /etc/nginx/sites-available/grow5x.app

# Insertar el bloque limpio antes del último }
sudo sed -i '$i\    # API Proxy - CONFIGURACIÓN LIMPIA\n    location /api/ {\n        proxy_pass http://127.0.0.1:5000/;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_redirect off;\n    }' /etc/nginx/sites-available/grow5x.app

echo "✅ Líneas duplicadas eliminadas"

# Verificar configuración limpia
echo "📌 Configuración limpia:"
sudo grep -A 8 "location /api/" /etc/nginx/sites-available/grow5x.app

# Probar sintaxis y recargar
echo "📌 Probando sintaxis..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta, recargando..."
    sudo systemctl reload nginx
    echo "✅ Nginx recargado"
else
    echo "❌ Error de sintaxis, restaurando backup"
    sudo cp /etc/nginx/sites-available/grow5x.app.backup-$(date +%Y%m%d-%H%M%S) /etc/nginx/sites-available/grow5x.app
    exit 1
fi

# Prueba final
echo "📌 PRUEBA FINAL:"
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
    echo "✅ ¡PROBLEMA RESUELTO! Ambos responden igual: $BACKEND_STATUS"
    echo "🌐 El login desde el navegador debería funcionar ahora"
else
    echo "❌ Aún hay diferencia: Backend=$BACKEND_STATUS, Nginx=$NGINX_STATUS"
fi

echo ""
echo "🌐 PROBAR AHORA EN EL NAVEGADOR:"
echo "   https://grow5x.app"
echo "   negociosmillonaris1973@gmail.com"
echo "   Parent2024!"