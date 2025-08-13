#!/bin/bash

# DIAGNÓSTICO FINAL - IDENTIFICAR POR QUÉ NGINX SIGUE DANDO 404
echo "🔍 DIAGNÓSTICO FINAL DEL PROBLEMA 404"
echo "======================================"

# 1. Verificar configuración exacta de Nginx
echo "📌 1. CONFIGURACIÓN ACTUAL DE NGINX:"
echo "Archivo: /etc/nginx/sites-available/grow5x.app"
echo "Bloque location /api/:"
sudo grep -A 10 -B 2 "location /api/" /etc/nginx/sites-available/grow5x.app
echo ""

# 2. Verificar qué archivos están activos
echo "📌 2. ARCHIVOS ACTIVOS EN NGINX:"
echo "Sites-enabled:"
ls -la /etc/nginx/sites-enabled/
echo ""
echo "Contenido del enlace simbólico:"
readlink -f /etc/nginx/sites-enabled/grow5x.app
echo ""

# 3. Verificar configuración completa cargada
echo "📌 3. CONFIGURACIÓN CARGADA POR NGINX:"
echo "Buscando todos los bloques server_name grow5x.app:"
sudo nginx -T | grep -A 20 -B 5 "server_name grow5x.app"
echo ""

# 4. Verificar logs de error en tiempo real
echo "📌 4. LOGS DE ERROR DE NGINX:"
echo "Últimos errores:"
sudo tail -20 /var/log/nginx/error.log
echo ""

# 5. Hacer una prueba con logs en tiempo real
echo "📌 5. PRUEBA CON MONITOREO DE LOGS:"
echo "Iniciando monitoreo de logs..."
(
    sudo tail -f /var/log/nginx/access.log &
    TAIL_PID=$!
    sleep 2
    echo "Haciendo petición de prueba..."
    curl -X POST https://grow5x.app/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"identifier":"test","password":"test"}' \
      -w "\nStatus: %{http_code}\n" \
      -s
    sleep 2
    kill $TAIL_PID
) &
wait
echo ""

# 6. Verificar si hay múltiples configuraciones
echo "📌 6. VERIFICAR MÚLTIPLES CONFIGURACIONES:"
echo "Buscando todos los archivos que contengan 'grow5x.app':"
sudo find /etc/nginx -name "*.conf" -o -name "grow5x*" | xargs sudo grep -l "grow5x.app" 2>/dev/null
echo ""

# 7. Verificar sintaxis específica del proxy_pass
echo "📌 7. VERIFICAR PROXY_PASS ESPECÍFICO:"
echo "Todas las líneas proxy_pass en la configuración:"
sudo grep -n "proxy_pass" /etc/nginx/sites-available/grow5x.app
echo ""

# 8. Crear configuración mínima de prueba
echo "📌 8. CREANDO CONFIGURACIÓN MÍNIMA DE PRUEBA:"
sudo tee /tmp/test-minimal.conf > /dev/null << 'EOF'
server {
    listen 8080;
    server_name localhost;
    
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
    }
}
EOF

echo "Configuración mínima creada en /tmp/test-minimal.conf"
echo "Probando sintaxis de configuración mínima:"
sudo nginx -t -c /tmp/test-minimal.conf
echo ""

# 9. Verificar que el backend realmente esté en puerto 5000
echo "📌 9. VERIFICACIÓN FINAL DEL BACKEND:"
echo "Procesos en puerto 5000:"
sudo netstat -tlnp | grep :5000
echo ""
echo "Respuesta del backend:"
curl -v http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  2>&1 | head -20
echo ""

# 10. Diagnóstico de la diferencia exacta
echo "📌 10. DIAGNÓSTICO DE LA DIFERENCIA:"
echo "Backend directo:"
BACKEND_RESPONSE=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "Status: %{http_code}")
echo "$BACKEND_RESPONSE"
echo ""
echo "Nginx:"
NGINX_RESPONSE=$(curl -s -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "Status: %{http_code}")
echo "$NGINX_RESPONSE"
echo ""

echo "======================================"
echo "🔍 RESUMEN DEL DIAGNÓSTICO:"
echo "Backend: $BACKEND_RESPONSE"
echo "Nginx: $NGINX_RESPONSE"
if [[ "$BACKEND_RESPONSE" == *"401"* && "$NGINX_RESPONSE" == *"404"* ]]; then
    echo "❌ PROBLEMA CONFIRMADO: Nginx no está enviando las peticiones al backend"
    echo "🔧 CAUSA PROBABLE: Error en proxy_pass o configuración de location"
else
    echo "✅ Los códigos son diferentes al esperado, revisar manualmente"
fi
echo "======================================"