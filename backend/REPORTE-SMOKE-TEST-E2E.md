# 🧪 REPORTE SMOKE TEST E2E - GROW5X

## 📋 RESUMEN EJECUTIVO

**Fecha:** 2025-08-10T08:23:54.158Z
**Total Tests:** 18
**Exitosos:** 4
**Fallidos:** 14
**Tasa de Éxito:** 22.2%

## 🎯 CASOS DE PRUEBA CRÍTICOS

### ✅ Especificaciones Verificadas

1. **Compra de paquete y confirmación de 100% cashback en día 8**
2. **Activación de referido y validación de que el 10% se paga sólo al completar el cashback**
3. **Ciclo de 2 semanas para admin con verificación de pago único del pool**

## 📊 RESULTADOS DETALLADOS

### 1. ✅ Setup - Conexión DB

**Estado:** EXITOSO
**Detalles:** MongoDB conectado exitosamente
**Timestamp:** 2025-08-10T08:23:54.251Z

### 2. ❌ 1.1 - Registro Usuario A

**Estado:** FALLIDO
**Detalles:** {
  "success": false,
  "message": "Validation failed",
  "timestamp": "2025-08-10T08:23:54.307Z",
  "data": {
    "errors": [
      {
        "field": "referralCode",
        "message": "\"referralCode\" length must be less than or equal to 10 characters long",
        "value": "GROW5X-FATHER-001",
        "type": "string.max"
      }
    ],
    "errorCount": 1
  },
  "errors": "VALIDATION_ERROR"
}
**Timestamp:** 2025-08-10T08:23:54.314Z

### 3. ❌ 2.1 - Estado inicial wallet

**Estado:** FALLIDO
**Detalles:** {
  "success": false,
  "message": "Access token required",
  "timestamp": "2025-08-10T08:23:54.318Z",
  "errors": "MISSING_TOKEN"
}
**Timestamp:** 2025-08-10T08:23:54.320Z

### 4. ❌ 2.2.1 - Beneficio día 1

**Estado:** FALLIDO
**Detalles:** {
  "success": false,
  "message": "Access token required"
}
**Timestamp:** 2025-08-10T08:23:54.328Z

### 5. ❌ 2.2.2 - Beneficio día 2

**Estado:** FALLIDO
**Detalles:** {
  "success": false,
  "message": "Access token required"
}
**Timestamp:** 2025-08-10T08:23:54.332Z

### 6. ❌ 2.2.3 - Beneficio día 3

**Estado:** FALLIDO
**Detalles:** {
  "success": false,
  "message": "Access token required"
}
**Timestamp:** 2025-08-10T08:23:54.338Z

### 7. ❌ 2.2.4 - Beneficio día 4

**Estado:** FALLIDO
**Detalles:** {
  "success": false,
  "message": "Access token required"
}
**Timestamp:** 2025-08-10T08:23:54.342Z

### 8. ❌ 2.2.5 - Beneficio día 5

**Estado:** FALLIDO
**Detalles:** {
  "success": false,
  "message": "Access token required"
}
**Timestamp:** 2025-08-10T08:23:54.346Z

### 9. ❌ 2.2.6 - Beneficio día 6

**Estado:** FALLIDO
**Detalles:** {
  "success": false,
  "message": "Access token required"
}
**Timestamp:** 2025-08-10T08:23:54.350Z

### 10. ❌ 2.2.7 - Beneficio día 7

**Estado:** FALLIDO
**Detalles:** {
  "success": false,
  "message": "Access token required"
}
**Timestamp:** 2025-08-10T08:23:54.355Z

### 11. ❌ 2.3 - Día 8 - Completar cashback

**Estado:** FALLIDO
**Detalles:** {
  "success": false,
  "message": "Access token required"
}
**Timestamp:** 2025-08-10T08:23:54.361Z

### 12. ✅ 3.1 - Registro Usuario B (referido)

**Estado:** EXITOSO
**Detalles:** Usuario B registrado como referido
**Timestamp:** 2025-08-10T08:23:59.088Z

### 13. ❌ 3.X - Error general

**Estado:** FALLIDO
**Detalles:** Cannot read properties of undefined (reading 'token')
**Timestamp:** 2025-08-10T08:23:59.091Z

### 14. ✅ 4.1 - Verificar admin existe

**Estado:** EXITOSO
**Detalles:** Admin encontrado
**Timestamp:** 2025-08-10T08:23:59.094Z

### 15. ❌ 4.3 - Calcular pool esperado

**Estado:** FALLIDO
**Detalles:** Total licencias: $0, Pool esperado: $0
**Timestamp:** 2025-08-10T08:23:59.098Z

### 16. ❌ 4.4 - Procesar pool biweekly

**Estado:** FALLIDO
**Detalles:** {
  "success": false,
  "message": "Access token required",
  "timestamp": "2025-08-10T08:23:59.101Z",
  "errors": "MISSING_TOKEN"
}
**Timestamp:** 2025-08-10T08:23:59.102Z

### 17. ❌ 4.5 - Verificar pago único por usuario

**Estado:** FALLIDO
**Detalles:** Esperado: 2 comisiones, Encontrado: 0
**Timestamp:** 2025-08-10T08:23:59.105Z

### 18. ✅ 4.6 - Prevenir duplicados

**Estado:** EXITOSO
**Detalles:** Duplicados prevenidos correctamente
**Timestamp:** 2025-08-10T08:23:59.108Z


## 🔍 VERIFICACIONES DE INTEGRIDAD

### MongoDB Atlas - Índices Anti-Duplicado
- ✅ **unique_pool_bonus_per_user_purchase_cycle** - Previene duplicados en pool
- ✅ **unique_direct_referral_per_user_purchase** - Previene duplicados en referidos
- ✅ **Invariante sin multinivel** - level > 1 = 0

### Sincronización Frontend ↔ Backend
- ✅ **DIRECT_RATE_ON_CASHBACK:** 0.10 (10%)
- ✅ **POOL.RATE:** 0.05 (5%)
- ✅ **PAYOUT_FREQUENCY_WEEKS:** 2 (biweekly)
- ✅ **BENEFIT.WEEK_OP_DAYS:** 8 (días operación)
- ✅ **WEEKS_TOTAL:** 5 (500% potencial)

## 🚨 ERRORES ENCONTRADOS

1. {
  "success": false,
  "message": "Validation failed",
  "timestamp": "2025-08-10T08:23:54.307Z",
  "data": {
    "errors": [
      {
        "field": "referralCode",
        "message": "\"referralCode\" length must be less than or equal to 10 characters long",
        "value": "GROW5X-FATHER-001",
        "type": "string.max"
      }
    ],
    "errorCount": 1
  },
  "errors": "VALIDATION_ERROR"
}
2. {
  "success": false,
  "message": "Access token required",
  "timestamp": "2025-08-10T08:23:54.318Z",
  "errors": "MISSING_TOKEN"
}
3. {
  "success": false,
  "message": "Access token required"
}
4. {
  "success": false,
  "message": "Access token required"
}
5. {
  "success": false,
  "message": "Access token required"
}
6. {
  "success": false,
  "message": "Access token required"
}
7. {
  "success": false,
  "message": "Access token required"
}
8. {
  "success": false,
  "message": "Access token required"
}
9. {
  "success": false,
  "message": "Access token required"
}
10. {
  "success": false,
  "message": "Access token required"
}
11. Cannot read properties of undefined (reading 'token')
12. Total licencias: $0, Pool esperado: $0
13. {
  "success": false,
  "message": "Access token required",
  "timestamp": "2025-08-10T08:23:59.101Z",
  "errors": "MISSING_TOKEN"
}
14. Esperado: 2 comisiones, Encontrado: 0

## 🎉 CONCLUSIONES

**⚠️ 14 TEST(S) FALLARON**

Se requiere revisión antes de pasar a producción.

### Próximos Pasos

1. Revisar y corregir tests fallidos
2. Re-ejecutar smoke test
3. Validación adicional requerida

---

**Generado automáticamente por Smoke Test E2E - Grow5X**
