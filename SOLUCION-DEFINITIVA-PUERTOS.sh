#!/bin/bash

# SOLUCIÓN DEFINITIVA PARA EL PROBLEMA RECURRENTE DE PUERTOS
# Análisis de todas las soluciones previas y corrección final

echo "🔧 SOLUCIÓN DEFINITIVA - ANÁLISIS COMPLETO DE PUERTOS"
echo "================================================="
echo "Fecha: $(date)"
echo ""

# PASO 1: DIAGNÓSTICO COMPLETO
echo "📌 1. DIAGNÓSTICO COMPLETO DEL SISTEMA..."
echo "Backend PM2:"
pm2 list | grep grow5x || echo "❌ Backend no encontrado en PM2"
echo ""
echo "Puertos en uso:"
netstat -tlnp | grep :5000 || echo "❌ Puerto 5000 no está en uso"
netstat -tlnp | grep :5001 || echo "❌ Puerto 5001 no está en uso"
echo ""
echo "Procesos Node.js:"
ps aux | grep node | grep -v grep || echo "❌ No hay procesos Node.js"
echo ""

# PASO 2: IDENTIFICAR EL PUERTO REAL DEL BACKEND
echo "📌 2. IDENTIFICANDO PUERTO REAL DEL BACKEND..."
BACKEND_PORT=""

# Verificar puerto 5000
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health | grep -q "200\|404\|401"; then
    BACKEND_PORT="5000"
    echo "✅ Backend encontrado en puerto 5000"
fi

# Verificar puerto 5001 si 5000 no responde
if [ -z "$BACKEND_PORT" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/api/health | grep -q "200\|404\|401"; then
        BACKEND_PORT="5001"
        echo "✅ Backend encontrado en puerto 5001"
    fi
fi

# Si no se encuentra en ningún puerto
if [ -z "$BACKEND_PORT" ]; then
    echo "❌ Backend no responde en puerto 5000 ni 5001"
    echo "Verificando PM2..."
    pm2 restart grow5x-backend || echo "❌ No se pudo reiniciar el backend"
    sleep 5
    
    # Verificar nuevamente después del reinicio
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health | grep -q "200\|404\|401"; then
        BACKEND_PORT="5000"
        echo "✅ Backend reiniciado y funcionando en puerto 5000"
    else
        echo "❌ Backend no responde después del reinicio"
        exit 1
    fi
fi

echo "🎯 PUERTO DEFINITIVO DEL BACKEND: $BACKEND_PORT"
echo ""

# PASO 3: BACKUP Y LIMPIEZA COMPLETA
echo "📌 3. BACKUP Y LIMPIEZA COMPLETA..."
sudo cp /etc/nginx/sites-available/grow5x.app /etc/nginx/sites-available/grow5x.app.backup-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup creado"

# Eliminar configuraciones conflictivas
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/ip-http-only.conf
echo "✅ Configuraciones conflictivas eliminadas"

# PASO 4: CREAR CONFIGURACIÓN DEFINITIVA
echo "📌 4. CREANDO CONFIGURACIÓN DEFINITIVA..."
sudo tee /etc/nginx/sites-available/grow5x.app > /dev/null << EOF
# CONFIGURACIÓN DEFINITIVA GROW5X.APP
# Puerto backend: $BACKEND_PORT
# Fecha: $(date)

server {
    listen 80;
    server_name grow5x.app www.grow5x.app;
    return 301 https://\$server_name\$request_uri;
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
    
    # Frontend routes (SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # API Proxy - CONFIGURACIÓN DEFINITIVA
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
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

echo "✅ Configuración definitiva creada para puerto $BACKEND_PORT"

# PASO 5: ACTIVAR Y VERIFICAR
echo "📌 5. ACTIVANDO CONFIGURACIÓN..."
sudo ln -sf /etc/nginx/sites-available/grow5x.app /etc/nginx/sites-enabled/

echo "📌 6. VERIFICANDO SINTAXIS..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta"
    sudo systemctl reload nginx
    echo "✅ Nginx recargado"
else
    echo "❌ Error de sintaxis, restaurando backup"
    sudo cp /etc/nginx/sites-available/grow5x.app.backup-$(date +%Y%m%d-%H%M%S) /etc/nginx/sites-available/grow5x.app
    exit 1
fi

# PASO 6: PRUEBAS DEFINITIVAS
echo "📌 7. PRUEBAS DEFINITIVAS..."
echo "Backend directo (puerto $BACKEND_PORT):"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:$BACKEND_PORT/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}')
echo "Status: $BACKEND_STATUS"

echo "Nginx (dominio):"
NGINX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}')
echo "Status: $NGINX_STATUS"

echo ""
echo "================================================="
if [ "$BACKEND_STATUS" = "$NGINX_STATUS" ]; then
    echo "✅ ¡PROBLEMA DEFINITIVAMENTE RESUELTO!"
    echo "✅ Backend y Nginx responden igual: $BACKEND_STATUS"
    echo "✅ Puerto configurado: $BACKEND_PORT"
    echo "🌐 El login desde el navegador debería funcionar"
else
    echo "❌ AÚN HAY PROBLEMA:"
    echo "   Backend (puerto $BACKEND_PORT): $BACKEND_STATUS"
    echo "   Nginx: $NGINX_STATUS"
    echo "   Revisar configuración manualmente"
fi

echo ""
echo "📋 CONFIGURACIÓN FINAL:"
echo "   Puerto backend: $BACKEND_PORT"
echo "   Archivo config: /etc/nginx/sites-available/grow5x.app"
echo "   Backup en: /etc/nginx/sites-available/grow5x.app.backup-$(date +%Y%m%d-%H%M%S)"
echo ""
echo "🌐 PROBAR EN EL NAVEGADOR:"
echo "   https://grow5x.app"
echo "   negociosmillonaris1973@gmail.com"
echo "   Parent2024!"
echo "================================================="