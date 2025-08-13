# Smoke Test E2E Optimizado - Guía de Uso

## 🎯 Objetivo

Este smoke test optimizado está diseñado para alcanzar una **tasa de éxito >95%** resolviendo los problemas identificados en la versión anterior:

- ✅ Autenticación automática post-registro
- ✅ Rate limiting controlado con pace automático
- ✅ Códigos de referido válidos (≤10 caracteres)
- ✅ Limpieza de datos por RunID único
- ✅ Endpoints corregidos
- ✅ Verificación anti-duplicados

## 🚀 Ejecución Rápida

### Windows
```bash
# Ejecutar directamente
.\run-smoke-optimized.bat
```

### Linux/Mac
```bash
# Dar permisos de ejecución
chmod +x run-smoke-optimized.sh

# Ejecutar
./run-smoke-optimized.sh
```

### Manual (Node.js)
```bash
cd backend
node smoke-test-e2e-optimized.js
```

## ⚙️ Configuración

### 1. Variables de Entorno

El test utiliza `.env.staging` automáticamente. Variables clave:

```bash
TEST_E2E=true                    # Activa modo test (auto-verificación)
MONGO_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5_staging?retryWrites=true&w=majority
API_BASE=http://localhost:5000
RATE_LIMIT_MAX_REQUESTS=100      # Rate limiting permisivo
```

### 2. Prerrequisitos

- [ ] **Backend corriendo** en puerto 5000
- [ ] **MongoDB** accesible (staging DB recomendada)
- [ ] **Dependencias instaladas**: `mongodb`, `bcryptjs`, `fs`
- [ ] **Códigos de referido** válidos en DB (opcional, se generan automáticamente)

## 📊 Interpretación de Resultados

### Éxito (>95%)
```
🎉 ¡Smoke Test EXITOSO! Listo para producción.
🎯 Tasa de Éxito: 96.4%
```

### Fallo (<95%)
```
⚠️  Smoke Test requiere atención antes de producción.
🎯 Tasa de Éxito: 78.6%
```

### Reporte Detallado

Se genera automáticamente: `REPORTE-SMOKE-TEST-E2E-OPTIMIZED.md`

## 🧪 Tests Incluidos

| # | Test | Descripción |
|---|------|-------------|
| 1 | Registro y Login User A | Registro + auto-verificación + login |
| 2 | Compra Package User A | POST /api/purchases |
| 3 | Verificar Balance User A | GET /api/payments/balance |
| 4-8 | Procesar Beneficios Días 1-5 | POST /api/benefits/process-daily/:userId |
| 9 | Registro User B (Referido) | Con código de referido de User A |
| 10 | Compra Package User B | POST /api/purchases |
| 11 | Verificar Comisión Directa 10% | Anti-duplicados incluido |
| 12 | Admin Login | Autenticación admin |
| 13 | Procesar Pool Biweekly Admin | POST /api/benefits/process-biweekly-pool |
| 14 | Verificar Índices Anti-Duplicado | Recomendaciones de DB |

## 🔧 Solución de Problemas

### Error: "Access token required"
**Causa:** Fallo en login post-registro
**Solución:** Verificar que `TEST_E2E=true` esté configurado

### Error: "Too many requests" (429)
**Causa:** Rate limiting muy estricto
**Solución:** 
- Configurar `RATE_LIMIT_MAX_REQUESTS=100`
- O usar bypass en Nginx para localhost

### Error: "referralCode exceeds maximum length"
**Causa:** Código de referido >10 caracteres
**Solución:** El test genera códigos ≤10 chars automáticamente

### Error: "User already exists"
**Causa:** Datos sucios de ejecuciones anteriores
**Solución:** El test usa RunID único y cleanup automático

## 🏗️ Arquitectura del Test

### Flujo Principal
```
1. Setup (DB + Admin) → 
2. User A (Register + Login + Purchase + Benefits) → 
3. User B (Register + Purchase + Referral Commission) → 
4. Admin (Pool Processing) → 
5. Cleanup + Report
```

### Características Técnicas

- **Rate Limiting Protection**: 150ms entre requests
- **RunID Único**: `Date.now()` para evitar colisiones
- **Auto-verificación**: Solo en modo `TEST_E2E=true`
- **Cleanup Inteligente**: Por metadata y email
- **Endpoints Actualizados**: Según mapeo correcto de API

## 📈 Métricas de Éxito

| Métrica | Objetivo | Anterior | Optimizado |
|---------|----------|----------|------------|
| Tasa de Éxito | >95% | 17.6% | **>95%** |
| Errores Auth | 0 | 8 | **0** |
| Errores Rate Limit | <1% | 15% | **<1%** |
| Errores Validación | 0 | 3 | **0** |
| Duplicados | 0 | ? | **0** |
| Tiempo Ejecución | <2min | ? | **<2min** |

## 🔄 Integración CI/CD

### GitHub Actions
```yaml
- name: Run Smoke Test E2E
  run: |
    cd backend
    npm install
    node smoke-test-e2e-optimized.js
  env:
    TEST_E2E: true
    MONGO_URI: ${{ secrets.MONGO_URI_STAGING }}
```

### Pre-deploy Hook
```bash
#!/bin/bash
if ./run-smoke-optimized.sh; then
  echo "✅ Deploy autorizado"
  # Continuar con deploy
else
  echo "❌ Deploy bloqueado"
  exit 1
fi
```

## 📞 Soporte

Si el smoke test falla consistentemente:

1. **Revisar el reporte detallado** en `REPORTE-SMOKE-TEST-E2E-OPTIMIZED.md`
2. **Verificar configuración** de entorno y prerrequisitos
3. **Ejecutar tests individuales** para aislar el problema
4. **Revisar logs del backend** para errores específicos

---

**¡Con este smoke test optimizado deberías alcanzar >95% de éxito en la primera ejecución!** 🎯