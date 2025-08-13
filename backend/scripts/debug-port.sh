#!/usr/bin/env bash
# Script de depuración para problemas con el puerto 5000
# Uso: bash debug-port.sh [action]
# Acciones: check, kill, restart, status

set -euo pipefail

PORT=5000
APP_NAME="growx5-backend"

function show_help() {
  echo "🔧 Script de depuración para puerto $PORT"
  echo ""
  echo "Uso: bash debug-port.sh [acción]"
  echo ""
  echo "Acciones disponibles:"
  echo "  check    - Verificar qué está usando el puerto $PORT"
  echo "  kill     - Matar procesos huérfanos en puerto $PORT"
  echo "  restart  - Reinicio limpio con PM2"
  echo "  status   - Estado de PM2 y procesos"
  echo "  logs     - Mostrar logs recientes"
  echo "  health   - Verificar salud del API"
  echo ""
}

function check_port() {
  echo "🔍 Verificando puerto $PORT..."
  echo ""
  
  echo "📊 Procesos escuchando en puerto $PORT:"
  ss -ltnp | grep ":$PORT" || echo "❌ Ningún proceso escuchando en puerto $PORT"
  echo ""
  
  echo "📋 Detalles con lsof:"
  lsof -i :$PORT || echo "❌ Ningún proceso encontrado con lsof"
  echo ""
  
  echo "🔍 Procesos Node.js activos:"
  ps aux | grep node | grep -v grep || echo "❌ No hay procesos Node.js activos"
  echo ""
}

function kill_orphans() {
  echo "💀 Matando procesos huérfanos en puerto $PORT..."
  
  # Obtener PIDs de procesos escuchando en el puerto
  pids=$(lsof -t -i:$PORT -sTCP:LISTEN 2>/dev/null || true)
  
  if [[ -n "$pids" ]]; then
    echo "⚠️  Procesos encontrados: $pids"
    for pid in $pids; do
      echo "🔫 Matando proceso $pid..."
      kill -9 $pid 2>/dev/null || echo "❌ No se pudo matar proceso $pid"
    done
    sleep 1
    echo "✅ Procesos eliminados"
  else
    echo "✅ No hay procesos huérfanos en puerto $PORT"
  fi
  
  # Verificar que el puerto esté libre
  if lsof -i :$PORT >/dev/null 2>&1; then
    echo "❌ El puerto $PORT aún está en uso"
    lsof -i :$PORT
  else
    echo "✅ Puerto $PORT liberado"
  fi
}

function restart_clean() {
  echo "🔄 Reinicio limpio del servidor..."
  
  # Detener PM2
  echo "🛑 Deteniendo PM2..."
  pm2 stop $APP_NAME 2>/dev/null || echo "⚠️  App no estaba corriendo en PM2"
  pm2 delete $APP_NAME 2>/dev/null || echo "⚠️  App no existía en PM2"
  
  # Matar huérfanos
  kill_orphans
  
  # Iniciar con PM2
  echo "🚀 Iniciando con PM2..."
  cd /var/www/grow5x/backend
  pm2 startOrReload ecosystem.config.js --env production
  
  sleep 3
  
  echo "✅ Reinicio completado"
  pm2_status
}

function pm2_status() {
  echo "📊 Estado de PM2:"
  pm2 list
  echo ""
  
  echo "📋 Logs recientes de PM2:"
  pm2 logs --lines 10
}

function show_logs() {
  echo "📋 Logs del servidor:"
  echo ""
  
  if [[ -f "/var/www/grow5x/backend/logs/combined.log" ]]; then
    echo "🔍 Últimas 20 líneas del log combinado:"
    tail -20 /var/www/grow5x/backend/logs/combined.log
  fi
  
  echo ""
  echo "🔍 Logs de PM2:"
  pm2 logs --lines 15
}

function health_check() {
  echo "🏥 Verificando salud del API..."
  
  API_URL="http://127.0.0.1:$PORT"
  
  # Verificar endpoint de salud
  echo "🔍 Probando $API_URL/api/health..."
  response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health" 2>/dev/null || echo "000")
  
  if [[ "$response" = "200" ]]; then
    echo "✅ API responde correctamente (200)"
  else
    echo "❌ API no responde (código: $response)"
  fi
  
  # Verificar endpoint de login
  echo "🔍 Probando endpoint de login..."
  login_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"identifier":"test","password":"test","userType":"user"}' 2>/dev/null || echo "000")
  
  if [[ "$login_response" =~ ^(400|401|422)$ ]]; then
    echo "✅ Endpoint de login responde (código: $login_response)"
  else
    echo "❌ Endpoint de login no responde correctamente (código: $login_response)"
  fi
}

# Función principal
case "${1:-help}" in
  "check")
    check_port
    ;;
  "kill")
    kill_orphans
    ;;
  "restart")
    restart_clean
    ;;
  "status")
    pm2_status
    ;;
  "logs")
    show_logs
    ;;
  "health")
    health_check
    ;;
  "help"|*)
    show_help
    ;;
esac