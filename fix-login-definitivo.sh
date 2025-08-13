#!/bin/bash
# Script definitivo para corregir el acceso de login de admin y usuarios
# Soluciona el 404 en /api/auth/login y estabiliza la conexión tras deploys

set -euo pipefail

print_section() {
    printf "\n\n===== %s =====\n" "$1"
}

CONFIG_FILE="/etc/nginx/sites-available/grow5x.app"
BACKEND_DIR="/var/www/grow5x/backend"

print_section "DIAGNÓSTICO INICIAL"
echo "[Verificando puertos en escucha]"
ss -ltnp 2>/dev/null | egrep ':5000|:80|:443' || echo "No se encontraron puertos esperados"

echo "[Estado actual de PM2]"
pm2 ls || echo "PM2 no disponible o sin procesos"

echo "[Test de conectividad backend local]"
curl -s -o /dev/null -w "Local 5000 health: %{http_code}\n" http://127.0.0.1:5000/api/health || echo "Backend local no responde"

echo "[Test de conectividad público]"
curl -s -o /dev/null -w "Público health: %{http_code}\n" https://grow5x.app/api/health || echo "Endpoint público no responde"

print_section "BACKUP Y PREPARACIÓN"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERROR: No existe $CONFIG_FILE"
    exit 1
fi

echo "Creando backup de configuración Nginx..."
cp -a "$CONFIG_FILE" "${CONFIG_FILE}.backup-$(date +%Y%m%d-%H%M%S)"

print_section "CORRECCIÓN DE NGINX - PROXY /API SIN DUPLICACIÓN"
echo "Aplicando configuración correcta de location /api/..."

# Eliminar cualquier bloque location /api/ existente y agregar el correcto
sed -i '/location.*\/api\//,/}/d' "$CONFIG_FILE"

# Insertar el bloque correcto antes del location / final
sed -i '/location \/ {/i\    # API Proxy - Configuración corregida para preservar /api\n    location ^~ /api/ {\n        proxy_pass http://127.0.0.1:5000;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_http_version 1.1;\n        proxy_set_header Connection "";\n        proxy_buffering off;\n        proxy_read_timeout 300;\n        proxy_connect_timeout 300;\n    }\n' "$CONFIG_FILE"

echo "[Validando configuración Nginx]"
nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Configuración Nginx válida"
    systemctl reload nginx
    echo "✅ Nginx recargado exitosamente"
else
    echo "❌ Error en configuración Nginx"
    exit 1
fi

print_section "ESTABILIZACIÓN DEL BACKEND (PM2)"
if [ -d "$BACKEND_DIR" ]; then
    cd "$BACKEND_DIR"
    
    echo "[Verificando archivos de configuración]"
    if [ -f "ecosystem.config.js" ]; then
        echo "✅ ecosystem.config.js encontrado"
        head -n 50 ecosystem.config.js
    else
        echo "❌ ecosystem.config.js no encontrado"
        exit 1
    fi
    
    if [ -f ".env.production" ]; then
        echo "✅ .env.production encontrado"
        echo "[Variables críticas]"
        grep -E '^(PORT|NODE_ENV|JWT_SECRET)=' .env.production | sed 's/JWT_SECRET=.*/JWT_SECRET=***/' || true
    else
        echo "❌ .env.production no encontrado"
        exit 1
    fi
    
    echo "[Reiniciando backend con PM2]"
    pm2 startOrReload ecosystem.config.js --env production
    sleep 3
    
    echo "[Verificando estado post-reinicio]"
    pm2 ls
    
else
    echo "❌ Directorio backend no encontrado: $BACKEND_DIR"
    exit 1
fi

print_section "PRUEBAS DE CONECTIVIDAD POST-FIX"
echo "[Test health local]"
curl -s -o /dev/null -w "Local 5000 health: %{http_code}\n" http://127.0.0.1:5000/api/health || echo "❌ Backend local no responde"

echo "[Test health público]"
curl -s -o /dev/null -w "Público health: %{http_code}\n" https://grow5x.app/api/health || echo "❌ Endpoint público no responde"

echo "[Test login endpoint con credenciales dummy - debe dar 400/401, NO 404]"
curl -i -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test@test.com","password":"test123","userType":"user"}' \
  2>/dev/null | head -n 1 || echo "❌ Login endpoint no responde"

print_section "VERIFICACIÓN DE LOGS (SI HAY ERRORES)"
echo "[Últimos logs de PM2]"
pm2 logs --lines 50 2>/dev/null | tail -n 50 || echo "No se pudieron obtener logs de PM2"

echo "[Últimos logs de Nginx error]"
tail -n 50 /var/log/nginx/error.log 2>/dev/null || echo "No se pudieron obtener logs de Nginx"

print_section "RESUMEN DE CONFIGURACIÓN APLICADA"
echo "✅ Nginx configurado con location ^~ /api/ { proxy_pass http://127.0.0.1:5000; }"
echo "✅ Backend reiniciado con PM2 en modo producción"
echo "✅ Sin modificación de JWT_SECRET (sesiones preservadas)"
echo ""
echo "IMPORTANTE: Este script preserva el prefijo /api al reenviar al backend,"
echo "solucionando el 404 en /api/auth/login y estabilizando las conexiones."
echo ""
echo "Para uso futuro tras deploys, ejecuta: bash fix-login-definitivo.sh"

print_section "FIN DEL SCRIPT"