#!/bin/bash

# VERIFICACIÓN PROFUNDA - IDENTIFICAR POR QUÉ NGINX SIGUE DANDO 404
echo "🔍 VERIFICACIÓN PROFUNDA DEL PROBLEMA 404"
echo "=========================================="

# 1. Verificar TODOS los archivos de configuración de Nginx
echo "📌 1. TODOS LOS ARCHIVOS DE CONFIGURACIÓN:"
echo "Archivos en /etc/nginx/:"
sudo find /etc/nginx -type f -name "*.conf" | head -20
echo ""
echo "Archivos que contienen 'grow5x':"
sudo find /etc/nginx -type f -exec grep -l "grow5x" {} \; 2>/dev/null
echo ""

# 2. Verificar configuración COMPLETA cargada por Nginx
echo "📌 2. CONFIGURACIÓN COMPLETA CARGADA:"
echo "Todos los bloques server:"
sudo nginx -T | grep -A 30 "server {" | head -50
echo ""

# 3. Verificar si hay configuración por defecto interfiriendo
echo "📌 3. VERIFICAR CONFIGURACIÓN POR DEFECTO:"
echo "Archivo nginx.conf principal:"
sudo grep -A 10 -B 5 "include.*sites" /etc/nginx/nginx.conf
echo ""

# 4. Verificar enlaces simbólicos
echo "📌 4. ENLACES SIMBÓLICOS:"
echo "Sites-enabled:"
ls -la /etc/nginx/sites-enabled/
echo ""
echo "Destino del enlace:"
readlink -f /etc/nginx/sites-enabled/grow5x.app 2>/dev/null || echo "No existe enlace"
echo ""

# 5. Verificar si hay configuración en conf.d
echo "📌 5. CONFIGURACIÓN EN CONF.D:"
ls -la /etc/nginx/conf.d/ 2>/dev/null || echo "Directorio conf.d no existe"
echo ""

# 6. Probar con configuración mínima en puerto diferente
echo "📌 6. CREANDO CONFIGURACIÓN DE PRUEBA EN PUERTO 8080:"
sudo tee /etc/nginx/sites-available/test-proxy > /dev/null << 'EOF'
server {
    listen 8080;
    server_name localhost;
    
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
    }
    
    location / {
        return 200 "Test server working";
        add_header Content-Type text/plain;
    }
}
EOF

echo "Activando configuración de prueba..."
sudo ln -sf /etc/nginx/sites-available/test-proxy /etc/nginx/sites-enabled/test-proxy

echo "Probando sintaxis..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Configuración de prueba activada"
    
    echo "Probando puerto 8080..."
    sleep 2
    curl -s -X POST http://localhost:8080/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"identifier":"test","password":"test"}' \
      -w "\nStatus: %{http_code}\n"
else
    echo "❌ Error en configuración de prueba"
fi

# 7. Verificar logs de error específicos
echo "📌 7. LOGS DE ERROR ESPECÍFICOS:"
echo "Últimos errores relacionados con grow5x:"
sudo grep -i "grow5x\|api" /var/log/nginx/error.log | tail -10
echo ""

# 8. Verificar procesos de Nginx
echo "📌 8. PROCESOS DE NGINX:"
ps aux | grep nginx
echo ""

# 9. Verificar configuración SSL específica
echo "📌 9. VERIFICAR SSL:"
echo "Certificados SSL:"
ls -la /etc/letsencrypt/live/grow5x.app/ 2>/dev/null || echo "Certificados no encontrados"
echo ""

# 10. Verificar si el problema es específico de HTTPS
echo "📌 10. PROBAR HTTP vs HTTPS:"
echo "HTTP (puerto 80):"
curl -s -X POST http://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}\n" \
  --max-time 5 || echo "HTTP no responde"

echo "HTTPS (puerto 443):"
curl -s -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}' \
  -w "\nStatus: %{http_code}\n" \
  --max-time 5 || echo "HTTPS no responde"

# 11. Verificar configuración actual después de todos los cambios
echo "📌 11. CONFIGURACIÓN ACTUAL FINAL:"
echo "Contenido de grow5x.app:"
sudo cat /etc/nginx/sites-available/grow5x.app
echo ""

echo "=========================================="
echo "🔍 VERIFICACIÓN PROFUNDA COMPLETADA"
echo "Revisar los resultados para identificar el problema"
echo "=========================================="