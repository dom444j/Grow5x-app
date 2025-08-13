#!/bin/bash

# Script final para corregir ESPECÍFICAMENTE el proxy_pass
echo "🔧 CORRECCIÓN FINAL DEL PROXY_PASS"
echo "================================="

# Verificar configuración actual
echo "📌 Configuración actual:"
sudo grep -A 5 "location /api/" /etc/nginx/sites-available/grow5x.app

echo ""
echo "📌 Aplicando corrección ESPECÍFICA..."

# Reemplazar ESPECÍFICAMENTE proxy_pass sin barra por proxy_pass con barra
sudo sed -i 's|proxy_pass http://127.0.0.1:5000;|proxy_pass http://127.0.0.1:5000/;|g' /etc/nginx/sites-available/grow5x.app

# También corregir cualquier variante
sudo sed -i 's|proxy_pass http://localhost:5000;|proxy_pass http://127.0.0.1:5000/;|g' /etc/nginx/sites-available/grow5x.app
sudo sed -i 's|proxy_pass http://localhost:5000/;|proxy_pass http://127.0.0.1:5000/;|g' /etc/nginx/sites-available/grow5x.app

echo "✅ Corrección aplicada"

# Verificar cambio
echo "📌 Configuración después de la corrección:"
sudo grep -A 5 "location /api/" /etc/nginx/sites-available/grow5x.app

# Probar sintaxis y recargar
echo "📌 Probando sintaxis..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta, recargando..."
    sudo systemctl reload nginx
    echo "✅ Nginx recargado"
else
    echo "❌ Error de sintaxis"
    exit 1
fi

# Probar inmediatamente
echo "📌 PRUEBA INMEDIATA:"
echo "Backend directo:"
curl -s -o /dev/null -w "Status: %{http_code}\n" -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}'

echo "Nginx (dominio):"
curl -s -o /dev/null -w "Status: %{http_code}\n" -X POST https://grow5x.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"test","password":"test"}'

echo ""
echo "✅ Si ambos dan el MISMO código (no 404), el problema está RESUELTO"
echo "🌐 Probar ahora en el navegador: https://grow5x.app"