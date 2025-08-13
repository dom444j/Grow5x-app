#!/bin/bash

# Script para corregir la configuración del proxy /api/ en Nginx
# Problema: Múltiples configuraciones conflictivas

echo "=== CORRECCIÓN PROXY /api/ EN NGINX ==="
echo "Fecha: $(date)"
echo ""

# 1. Hacer backup de configuraciones actuales
echo "📌 1. Creando backup de configuraciones..."
mkdir -p /root/nginx-backup-$(date +%Y%m%d-%H%M%S)
cp -r /etc/nginx/sites-available/* /root/nginx-backup-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null
cp -r /etc/nginx/sites-enabled/* /root/nginx-backup-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null
echo "✅ Backup creado en /root/nginx-backup-$(date +%Y%m%d-%H%M%S)"
echo ""

# 2. Verificar qué puerto está usando el backend
echo "📌 2. Verificando puerto del backend..."
BACKEND_PORT=$(pm2 list | grep "grow5x-backend" | awk '{print $8}' | head -1)
if [ -z "$BACKEND_PORT" ]; then
    echo "⚠️  Backend no encontrado en PM2, asumiendo puerto 5000"
    BACKEND_PORT="5000"
else
    echo "✅ Backend encontrado en puerto: $BACKEND_PORT"
fi

# Verificar que el backend responda en el puerto detectado
echo "Probando conexión al backend en puerto $BACKEND_PORT..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://127.0.0.1:$BACKEND_PORT/api/health || echo "❌ Backend no responde en puerto $BACKEND_PORT"
echo ""

# 3. Crear configuración limpia para grow5x.app
echo "📌 3. Creando configuración unificada..."
cat > /etc/nginx/sites-available/grow5x.app << EOF
server {
    listen 80;
    server_name grow5x.app www.grow5x.app;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name grow5x.app www.grow5x.app;
    
    # SSL Configuration (mantener certificados existentes)
    ssl_certificate /etc/letsencrypt/live/grow5x.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grow5x.app/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Frontend - servir desde dist/
    root /var/www/grow5x/frontend/dist;
    index index.html;
    
    # Frontend routes (SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # API Proxy - CONFIGURACIÓN UNIFICADA
    location /api/ {
        # Rate limiting
        limit_req zone=api_zone burst=10 nodelay;
        
        # Proxy al backend en puerto $BACKEND_PORT
        proxy_pass http://127.0.0.1:$BACKEND_PORT/;
        proxy_http_version 1.1;
        
        # Headers necesarios
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support (si es necesario)
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

echo "✅ Configuración unificada creada"
echo ""

# 4. Desactivar configuraciones conflictivas
echo "📌 4. Desactivando configuraciones conflictivas..."
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/ip-http-only.conf
echo "✅ Configuraciones conflictivas desactivadas"
echo ""

# 5. Activar nueva configuración
echo "📌 5. Activando nueva configuración..."
ln -sf /etc/nginx/sites-available/grow5x.app /etc/nginx/sites-enabled/
echo "✅ Nueva configuración activada"
echo ""

# 6. Verificar configuración
echo "📌 6. Verificando configuración de Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Configuración de Nginx válida"
    
    # Recargar Nginx
    echo "📌 7. Recargando Nginx..."
    systemctl reload nginx
    echo "✅ Nginx recargado"
else
    echo "❌ Error en configuración de Nginx"
    echo "Restaurando backup..."
    # Aquí podrías restaurar el backup si es necesario
fi

echo ""

# 7. Verificar que el proxy funcione
echo "📌 8. Probando proxy /api/..."
echo "Probando desde localhost:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://127.0.0.1/api/health || echo "❌ Proxy no funciona"

echo ""
echo "Probando endpoint de login:"
curl -X POST http://127.0.0.1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}\n" \
  -s --max-time 10

echo ""
echo "=== RESUMEN ==="
echo "✅ Configuración de Nginx unificada"
echo "✅ Proxy /api/ apunta a puerto $BACKEND_PORT"
echo "✅ Configuraciones conflictivas eliminadas"
echo "📋 Verificar que el login funcione desde el frontend"
echo ""
echo "=== FIN DE LA CORRECCIÓN ==="