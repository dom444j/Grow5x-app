#!/bin/bash

# DIAGNÓSTICO NGINX.CONF PRINCIPAL - ÚLTIMA VERIFICACIÓN
# El problema persiste incluso sin interferencias
# Verificar nginx.conf principal y puerto real del backend

echo "🔍 DIAGNÓSTICO NGINX.CONF PRINCIPAL - ÚLTIMA VERIFICACIÓN"
echo "========================================================="
echo "SITUACIÓN: Configuración limpia creada, pero 404 persiste"
echo "OBJETIVO: Verificar nginx.conf principal y puerto real"
echo ""

# 1. Verificar nginx.conf principal completo
echo "📌 1. NGINX.CONF PRINCIPAL COMPLETO:"
echo "-----------------------------------"
sudo cat /etc/nginx/nginx.conf
echo ""
echo "-----------------------------------"
echo ""

# 2. Verificar includes específicos
echo "📌 2. VERIFICANDO INCLUDES:"
echo "Include sites-enabled:"
sudo grep -n "include.*sites" /etc/nginx/nginx.conf
echo ""
echo "Include conf.d:"
sudo grep -n "include.*conf.d" /etc/nginx/nginx.conf
echo ""

# 3. Verificar que NO hay server blocks en nginx.conf principal
echo "📌 3. VERIFICANDO SERVER BLOCKS EN NGINX.CONF:"
echo "Server blocks en nginx.conf principal (NO debería haber):"
sudo grep -n "server {" /etc/nginx/nginx.conf
echo ""

# 4. Verificar puerto real del backend
echo "📌 4. VERIFICANDO PUERTO REAL DEL BACKEND:"
echo "Procesos en puerto 5000:"
sudo netstat -tlnp | grep :5000
echo ""
echo "Procesos en puerto 5001:"
sudo netstat -tlnp | grep :5001
echo ""
echo "Procesos Node.js/Python activos:"
sudo ps aux | grep -E "(node|python|npm)" | grep -v grep
echo ""

# 5. Probar puertos directamente
echo "📌 5. PROBANDO PUERTOS DIRECTAMENTE:"
echo "Puerto 5000:"
curl -s -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}" || echo "Puerto 5000 no responde"
echo ""

echo "Puerto 5001:"
curl -s -X POST http://127.0.0.1:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}" || echo "Puerto 5001 no responde"
echo ""

# 6. Verificar logs de error de Nginx en tiempo real
echo "📌 6. LOGS DE ERROR DE NGINX (últimas 20 líneas):"
sudo tail -20 /var/log/nginx/error.log
echo ""

# 7. Hacer una petición y monitorear logs
echo "📌 7. PETICIÓN CON MONITOREO DE LOGS:"
echo "Iniciando monitoreo de logs..."
(
  sleep 2
  echo "Haciendo petición a Nginx..."
  curl -s -k -X POST https://grow5x.app/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"identifier":"test","password":"test"}' \
    -w "\nStatus: %{http_code}"
) &

# Monitorear logs durante la petición
sudo timeout 5 tail -f /var/log/nginx/error.log &
sudo timeout 5 tail -f /var/log/nginx/access.log &
wait
echo ""

# 8. Verificar configuración exacta cargada
echo "📌 8. CONFIGURACIÓN EXACTA CARGADA POR NGINX:"
echo "Location /api/ en configuración cargada:"
sudo nginx -T | grep -A 10 -B 2 "location /api"
echo ""

# 9. Crear configuración de prueba directa en nginx.conf
echo "📌 9. CREANDO CONFIGURACIÓN DE PRUEBA DIRECTA:"
echo "Backup de nginx.conf..."
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup-principal

# Crear nginx.conf con configuración directa
sudo tee /etc/nginx/nginx.conf > /dev/null << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    # Gzip
    gzip on;
    
    # CONFIGURACIÓN DIRECTA EN NGINX.CONF - SIN INCLUDES
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
        
        # API - CONFIGURACIÓN DIRECTA
        location /api/ {
            proxy_pass http://127.0.0.1:5000/;
            proxy_http_version 1.1;
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
}
EOF

echo "✅ Configuración directa creada en nginx.conf"

# 10. Verificar y aplicar
echo "📌 10. VERIFICANDO Y APLICANDO CONFIGURACIÓN DIRECTA:"
if sudo nginx -t; then
    echo "✅ Sintaxis correcta"
    sudo systemctl reload nginx
    echo "✅ Nginx recargado con configuración directa"
    
    sleep 3
    
    echo "📌 PRUEBA CON CONFIGURACIÓN DIRECTA:"
    DIRECT_TEST=$(curl -s -k -X POST https://grow5x.app/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"identifier":"test","password":"test"}' \
      -w "\nStatus: %{http_code}")
    echo "$DIRECT_TEST"
    
    if [[ "$DIRECT_TEST" == *"401"* ]]; then
        echo "✅ ¡CONFIGURACIÓN DIRECTA FUNCIONA!"
        echo "✅ El problema era con los includes o sites-enabled"
        echo "✅ Mantener esta configuración directa"
    else
        echo "❌ Configuración directa tampoco funciona"
        echo "🔧 Restaurando nginx.conf original..."
        sudo cp /etc/nginx/nginx.conf.backup-principal /etc/nginx/nginx.conf
        sudo systemctl reload nginx
    fi
else
    echo "❌ Error de sintaxis en configuración directa"
    echo "🔧 Restaurando nginx.conf original..."
    sudo cp /etc/nginx/nginx.conf.backup-principal /etc/nginx/nginx.conf
fi

echo ""
echo "========================================================="
echo "📋 DIAGNÓSTICO COMPLETADO"
echo "🔧 Si la configuración directa funciona, el problema era:"
echo "   - Includes mal configurados"
echo "   - Conflictos en sites-enabled"
echo "   - Orden de configuración"
echo ""
echo "🌐 PROBAR EN EL NAVEGADOR:"
echo "   https://grow5x.app"
echo "   negociosmillonaris1973@gmail.com"
echo "   Parent2024!"
echo "========================================================="