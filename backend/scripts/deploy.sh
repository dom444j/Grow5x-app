#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/grow5x/backend"
API="http://127.0.0.1:5000"
LOCK="/tmp/grow5x-deploy.lock"

# Verificar si hay otro deploy en curso
[[ -f "$LOCK" ]] && { echo "❌ Otro deploy en curso"; exit 1; }
trap 'rm -f "$LOCK"' EXIT; touch "$LOCK"

echo "🚀 Iniciando deploy de GrowX5 Backend"
echo "📁 Directorio: $APP_DIR"
echo "🔗 API: $API"
echo ""

echo "1️⃣ Sincronizar código"
cd "$APP_DIR"
# git pull --rebase || true  # Descomenta si usas Git
npm ci --omit=dev
echo "✅ Código sincronizado"

echo "2️⃣ Configurar entorno de producción"
cp -f .env.production .env
echo "✅ Entorno configurado"

echo "3️⃣ Limpiar puerto 5000 y procesos huérfanos"
# Matar procesos Node.js huérfanos en puerto 5000
pids=$(lsof -t -i:5000 -sTCP:LISTEN 2>/dev/null || true)
if [[ -n "$pids" ]]; then
  echo "⚠️  Matando procesos huérfanos en puerto 5000: $pids"
  kill -9 $pids || true
  sleep 1
fi
echo "✅ Puerto 5000 liberado"

echo "4️⃣ Reload atómico con PM2"
pm2 startOrReload ecosystem.config.js --env production
sleep 3
echo "✅ PM2 reload completado"

echo "5️⃣ Health check del servidor"
for i in {1..15}; do
  echo -n "🔍 Verificando salud del servidor (intento $i/15)... "
  code=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/health" 2>/dev/null || echo "000")
  if [[ "$code" = "200" ]]; then
    echo "✅ OK"
    break
  else
    echo "❌ Código: $code"
    if [[ $i -eq 15 ]]; then
      echo "💥 Health check FALLÓ después de 15 intentos"
      echo "📋 Logs de PM2:"
      pm2 logs --lines 20
      exit 1
    fi
    sleep 1
  fi
done

echo "6️⃣ Smoke test de autenticación"
EMAIL="synthetic.user+ci@grow5x.app"
PASS="Abc12345!"

echo "🔐 Creando usuario de prueba (si no existe)..."
# Crear usuario de prueba (acepta 200/201/409 - ya existe)
register_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"fullName\":\"CI Test User\",
    \"email\":\"$EMAIL\",
    \"password\":\"$PASS\",
    \"confirmPassword\":\"$PASS\",
    \"country\":\"VE\",
    \"acceptedTerms\":true,
    \"acceptedRisk\":true
  }" 2>/dev/null || echo "000")

if [[ "$register_code" =~ ^(200|201|409)$ ]]; then
  echo "✅ Usuario de prueba listo (código: $register_code)"
else
  echo "⚠️  Registro falló (código: $register_code), continuando..."
fi

echo "📧 Verificando email del usuario de prueba..."
# Verificar email usando mongosh si está disponible
if command -v mongosh >/dev/null 2>&1 && [[ -n "${MONGODB_URI:-}" ]]; then
  mongosh "$MONGODB_URI" --quiet --eval \
    'db.users.updateOne({email:"'"$EMAIL"'"},{$set:{emailVerified:true}})' >/dev/null 2>&1 || true
  echo "✅ Email verificado"
else
  echo "⚠️  mongosh no disponible, saltando verificación de email"
fi

echo "🔑 Probando login..."
login_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{
    \"identifier\":\"$EMAIL\",
    \"password\":\"$PASS\",
    \"userType\":\"user\"
  }" 2>/dev/null || echo "000")

if [[ "$login_code" = "200" ]]; then
  echo "✅ Login exitoso"
else
  echo "💥 Login FALLÓ (código: $login_code)"
  echo "📋 Logs de PM2:"
  pm2 logs --lines 20
  exit 1
fi

echo ""
echo "🎉 Deploy completado exitosamente"
echo "📊 Estado del servidor:"
pm2 list
echo ""
echo "🔗 API disponible en: $API"
echo "📅 Deploy completado: $(date)"