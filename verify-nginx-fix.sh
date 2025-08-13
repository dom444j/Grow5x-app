#!/bin/bash

# Script de verificación post-fix para Nginx

echo "=== Verificación Post-Fix Nginx ==="

# 1. Verificar estado de Nginx
echo "1. Estado de Nginx:"
systemctl status nginx --no-pager -l

# 2. Verificar configuración activa
echo "\n2. Configuración activa de grow5x.app:"
cat /etc/nginx/sites-available/grow5x.app

# 3. Verificar que el sitio está habilitado
echo "\n3. Verificando sitio habilitado:"
ls -l /etc/nginx/sites-enabled/grow5x.app

# 4. Verificar archivos en dist/
echo "\n4. Archivos en directorio dist/:"
ls -la /var/www/grow5x/frontend/dist/

# 5. Verificar permisos
echo "\n5. Permisos del directorio dist/:"
ls -ld /var/www/grow5x/frontend/dist/
ls -l /var/www/grow5x/frontend/dist/index.html

# 6. Test de conectividad local
echo "\n6. Test de conectividad local:"
echo "Probando HTTP 127.0.0.1:"
curl -s -o /dev/null -w "Status: %{http_code}\nContent-Type: %{content_type}\nSize: %{size_download} bytes\n" http://127.0.0.1/

echo "\nProbando index.html directo:"
curl -s -o /dev/null -w "Status: %{http_code}\nContent-Type: %{content_type}\nSize: %{size_download} bytes\n" http://127.0.0.1/index.html

# 7. Verificar logs recientes
echo "\n7. Últimos logs de error de Nginx:"
tail -n 10 /var/log/nginx/error.log

echo "\n8. Últimos logs de acceso:"
tail -n 5 /var/log/nginx/access.log

# 8. Test de contenido
echo "\n9. Verificando contenido HTML (primeras líneas):"
curl -s http://127.0.0.1/ | head -n 10

echo "\n=== Verificación completada ==="
echo "Si ves 'Status: 200' y 'Content-Type: text/html', el fix funcionó correctamente."
echo "Prueba en navegador: https://grow5x.app/?v=$(date +%s)"