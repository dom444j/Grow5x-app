#!/bin/bash

# Script para corregir el error 403 de Nginx
# Aplica la Opción A: Apuntar Nginx directo a dist/

echo "=== Fix Nginx 403 Error - Opción A ==="
echo "Aplicando configuración para apuntar root a /var/www/grow5x/frontend/dist"

# 1. Verificar ubicación del index.html
echo "\n1. Verificando ubicación de archivos..."
echo "Contenido de /var/www/html:"
ls -l /var/www/html

echo "\nContenido de /var/www/grow5x/frontend:"
ls -l /var/www/grow5x/frontend

echo "\nVerificando index.html en dist/:"
ls -l /var/www/grow5x/frontend/dist/index.html

# 2. Crear backup de la configuración actual
echo "\n2. Creando backup de configuración actual..."
cp /etc/nginx/sites-available/grow5x.app /etc/nginx/sites-available/grow5x.app.backup.$(date +%Y%m%d_%H%M%S)

# 3. Aplicar nueva configuración
echo "\n3. Aplicando nueva configuración de Nginx..."
cat > /etc/nginx/sites-available/grow5x.app << 'EOF'
server {
  listen 80;
  server_name grow5x.app;

  root /var/www/grow5x/frontend/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:5000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
EOF

# 4. Verificar configuración
echo "\n4. Verificando configuración de Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuración válida. Aplicando cambios..."
    systemctl reload nginx
    echo "✅ Nginx recargado exitosamente."
else
    echo "❌ Error en configuración. Restaurando backup..."
    cp /etc/nginx/sites-available/grow5x.app.backup.$(date +%Y%m%d)* /etc/nginx/sites-available/grow5x.app
    exit 1
fi

# 5. Ajustar permisos
echo "\n5. Ajustando permisos..."
chown -R www-data:www-data /var/www/grow5x/frontend
find /var/www/grow5x/frontend -type d -exec chmod 755 {} \;
find /var/www/grow5x/frontend -type f -exec chmod 644 {} \;
echo "✅ Permisos ajustados."

# 6. Verificar funcionamiento
echo "\n6. Verificando funcionamiento..."
echo "Probando respuesta del servidor local:"
curl -I http://127.0.0.1/

echo "\nProbando index.html:"
curl -I http://127.0.0.1/index.html

# 7. Verificar que no hay reglas deny
echo "\n7. Verificando reglas deny en configuración..."
grep -R "deny all" /etc/nginx/sites-available/ || echo "✅ No se encontraron reglas 'deny all'."

echo "\n=== Fix completado ==="
echo "Ahora puedes probar en el navegador:"
echo "https://grow5x.app/?v=$(date +%s)"
echo "\nSi aún hay problemas, revisa los logs:"
echo "tail -f /var/log/nginx/error.log"