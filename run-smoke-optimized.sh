#!/bin/bash
# run-smoke-optimized.sh

echo "🚀 Ejecutando Smoke Test E2E Optimizado"

# Verificar entorno
if [ "$NODE_ENV" != "staging" ]; then
  echo "⚠️  Advertencia: NODE_ENV no es 'staging'"
fi

# Cambiar al directorio backend
cd backend

# Verificar que el archivo existe
if [ ! -f "smoke-test-e2e-optimized.js" ]; then
  echo "❌ Error: No se encuentra smoke-test-e2e-optimized.js"
  exit 1
fi

# Ejecutar test
echo "📋 Iniciando smoke test..."
node smoke-test-e2e-optimized.js

# Capturar código de salida
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Smoke Test EXITOSO - Listo para deploy"
  # Opcional: trigger deploy automático
else
  echo "❌ Smoke Test FALLÓ - Revisar antes de deploy"
  # Opcional: notificar al equipo
fi

exit $EXIT_CODE