# Lógica del Sistema de Comisiones - Grow5X

🚨 **ESTE ES EL ÚNICO DOCUMENTO VÁLIDO PARA COMISIONES Y REFERIDOS** 🚨

⚠️ **ADVERTENCIA IMPORTANTE** ⚠️
- Este documento junto con `REPORTE-OPTIMIZACION-SISTEMA-LICENCIAS-COMISIONES.md` contienen la ÚNICA información válida sobre el sistema de comisiones
- NO EXISTE ningún bono de $500 USD
- NO EXISTE ningún "assignment_bonus"
- CUALQUIER otra información en otros archivos que contradiga este documento ES FALSA
- DEJAR DE INVENTAR INFORMACIÓN QUE NO EXISTE EN EL PROYECTO

## 📋 Resumen Ejecutivo

Este documento consolida la **lógica exacta del sistema de comisiones** implementada en Grow5X, basada en el análisis del código fuente existente. Se documentan los porcentajes, reglas, tipos de comisión y flujos de procesamiento establecidos.

---

## 🎯 Tipos de Comisiones Establecidas

### 1. **Comisión Directa de Referidos** (`direct_referral`)
- **Porcentaje**: 10% del cashback total
- **Aplicación**: Se entrega al completar el 100% del cashback (al finalizar el primer ciclo de 8 días)
- **Modalidad**: Pago único por activación, se reactiva con renovaciones y nuevos paquetes
- **Base de cálculo**: 100% del cashback completado del usuario referido
- **Procesamiento**: Automático con opción de aprobación por admin
- **Archivo**: `backend/src/utils/benefitsCalculator.js` - función `calculateDirectReferralCommission`

```javascript
// 10% del cashback total al completar 100%
const commissionRate = 0.10;
return totalCashbackCompleted * commissionRate;
```

### 2. **Bono de Líder** (`leader_bonus`)
- **Porcentaje**: 5% del monto de todas las licencias de toda la plataforma
- **Aplicación**: Al finalizar el segundo ciclo de beneficios (día 17)
- **Modalidad**: Pago único por usuario nuevo (no se vuelve a pagar por el mismo usuario)
- **Distribución**: Tipo pool - 5% para CADA código líder (cada uno recibe 5% completo)
- **Base de cálculo**: Monto total de todas las licencias de toda la plataforma
- **Procesamiento**: Automático con opción de aprobación por admin
- **Fecha de pago**: Día 17 exacto del ciclo del usuario referido
- **Archivo**: `backend/src/controllers/specialCodes.controller.js` - función `processLeaderBonuses`

```javascript
// 5% del monto total de licencias - pago único por usuario
const leaderBonusAmount = totalLicensesAmount * 0.05;
```

### 3. **Bono de Padre** (`parent_bonus`)
- **Porcentaje**: 5% del monto de todas las licencias de toda la plataforma
- **Aplicación**: Al finalizar el segundo ciclo de beneficios (día 17)
- **Modalidad**: Pago único por usuario nuevo (no se vuelve a pagar por el mismo usuario)
- **Distribución**: Tipo pool - 5% para CADA código padre (cada uno recibe 5% completo)
- **Base de cálculo**: Monto total de todas las licencias de toda la plataforma
- **Mismo procesamiento que bono de líder**
- **Fecha de pago**: Día 17 exacto del ciclo del usuario referido
- **IMPORTANTE**: Solo referidos directos, sin niveles múltiples (NO ES MULTINIVEL)

### 4. **Bono de Asignación** (`assignment_bonus`)
- **Estado**: Eliminado del sistema
- **Nota**: Función removida del controlador, solo se mantienen comisiones del 5% para segunda semana

---

## ⚙️ Configuración de Niveles y Porcentajes

### Sistema de Beneficios sobre Licencias

**Beneficios Principales:**
- **12.5% diario** sobre el valor de la licencia personal durante 8 días
- **100% de cashback** completado en 8 días (primer ciclo)
- **5 ciclos totales** = 45 días en total
- **Potencial total**: 500% (100% cashback + 400% beneficios adicionales)
- **Día 9**: Día inactivo (fin de semana/ciclo)

### Configuración de Niveles de Usuario

**Requisito**: Los usuarios deben **comprar paquetes de licencia** para habilitar/activar los beneficios

```javascript
COMMISSION_CONFIG: {
  direct_referral: {
    rate: 0.10, // 10% del cashback completado - pago único por activación
    trigger: 'cashback_completion' // Al completar 100% del cashback
  },
  leader_bonus: {
    rate: 0.05, // 5% tipo pool - pago único por usuario
    trigger: 'second_cycle_completion' // Al finalizar segundo ciclo (día 17)
  },
  parent_bonus: {
    rate: 0.05, // 5% tipo pool - pago único por usuario
    trigger: 'second_cycle_completion' // Al finalizar segundo ciclo (día 17)
  },
  daily_benefit_rate: 0.125, // 12.5% diario
  cycle_days: 8, // 8 días por ciclo
  total_cycles: 5, // 5 ciclos totales
  inactive_day: 9, // Día inactivo entre ciclos
  total_potential: 5.0, // 500% potencial total
  min_commission: 0.01, // Mínimo $0.01
  max_commission_per_sale: 1000.00 // Máximo $1000 por venta
}
```

### Niveles de Usuario y Activación

```javascript
USER_LEVELS: {
  FATHER: {
    commission_rate: 0.05, // 5% tipo pool
    requires_license: true, // Debe comprar licencia
    bonus_type: 'unique_per_user', // Pago único por usuario
    activation_trigger: 'license_purchase'
  },
  LEADER: {
    commission_rate: 0.05, // 5% tipo pool
    requires_license: true, // Debe comprar licencia
    bonus_type: 'unique_per_user', // Pago único por usuario
    activation_trigger: 'license_purchase'
  },
  MEMBER: {
    commission_rate: 0.10, // 10% al completar cashback
    requires_license: true, // Debe comprar licencia
    bonus_type: 'reactivable', // Se reactiva con renovaciones
    activation_trigger: 'cashback_completion'
  }
}
```

---

## 🔄 Flujos de Procesamiento

### 1. **Comisión Directa de Referidos**

**Trigger**: Usuario referido completa 100% del cashback (8 días)
**Condiciones**:
- Usuario referido debe completar el primer ciclo completo (8 días)
- Cashback debe alcanzar 100% (12.5% x 8 días)
- Usuario referidor debe existir y estar activo
- Usuario referido debe tener licencia activa

**Proceso**:
1. Verificar completitud del cashback (`isCashbackCompleted`)
2. Calcular 10% del cashback total completado
3. Crear registro en modelo `Commission` con estado 'pending'
4. Procesar automáticamente con opción de aprobación admin
5. Notificar al usuario referidor
6. Marcar como elegible para reactivación en futuras compras

### 2. **Bonos de Líder/Padre (Pago Único)**

**Trigger**: Usuario referido finaliza segundo ciclo de beneficios (día 17)
**Condiciones**:
- Usuario debe tener código especial activo (líder o padre)
- Usuario referido debe completar segundo ciclo (día 17)
- No debe existir bono previo para este usuario específico
- Sistema tipo pool sin niveles

**Proceso**:
1. Identificar usuarios que finalizan segundo ciclo (día 17)
2. Calcular 5% del monto total de todas las licencias del usuario
3. Verificar que no existe pago previo para este usuario
4. Crear registro automático de comisión con estado 'pending'
5. Procesar automáticamente con opción de aprobación admin
6. Marcar usuario como 'ya procesado' para evitar duplicados

### 3. **Ciclo de Beneficios (Sistema Principal)**

**Trigger**: Usuario adquiere licencia
**Condiciones**:
- Usuario debe comprar paquete de licencia
- Licencia debe estar activa y validada
- Usuario debe estar en estado válido

**Proceso**:
1. Activar sistema de beneficios al comprar licencia
2. Iniciar ciclo de 8 días con 12.5% diario
3. Procesar día inactivo (día 9) entre ciclos
4. Repetir por 5 ciclos totales (45 días)
5. Calcular potencial total de 500%
6. Activar comisiones según completitud de cashback

---

## 📊 Estructura de Datos

### Modelo Commission (`backend/src/models/Commission.model.js`)

```javascript
{
  userId: ObjectId, // Usuario que recibe la comisión
  fromUserId: ObjectId, // Usuario que generó la comisión
  commissionType: String, // 'direct_referral', 'leader_bonus', 'parent_bonus'
  amount: Number, // Monto de la comisión
  currency: String, // 'USD', 'EUR', 'BTC', 'ETH'
  status: String, // 'pending', 'paid', 'cancelled'
  specialCodeId: ObjectId, // Para bonos de líder/padre
  paymentInfo: {
    paidAt: Date,
    paidBy: ObjectId,
    paymentMethod: String,
    notes: String
  },
  metadata: {
    weekNumber: Number,
    percentage: Number,
    baseAmount: Number,
    description: String
  }
}
```

---

## 🎯 Reglas de Negocio Críticas

### ✅ **Reglas Confirmadas**

1. **Comisión Directa**: 10% del cashback total al completar 100% (8 días)
2. **Reactivación**: Se reactiva con renovaciones y nuevos paquetes del mismo usuario
3. **Bono Líder/Padre**: 5% del monto de todas las licencias de toda la plataforma, pago único por usuario nuevo
4. **Sistema Pool**: Sin niveles, 5% para cada código líder/padre
5. **Ciclo de Beneficios**: 12.5% diario x 8 días = 100% cashback por ciclo
6. **Potencial Total**: 5 ciclos = 500% (100% cashback + 400% beneficios)
7. **Automatización**: Procesamiento automático con opción de aprobación admin
8. **Activación**: Requiere compra de paquete de licencia para habilitar beneficios

### ⚠️ **Restricciones Importantes**

1. **Pago Único L/P**: Códigos líder/padre reciben bono una sola vez por usuario referido
2. **No Renovación L/P**: Sin pagos adicionales por renovaciones del mismo usuario
3. **Activación Requerida**: Usuario debe comprar licencia para activar sistema
4. **Cashback Completo**: Comisión directa solo se paga al completar 100% del cashback
5. **Día Inactivo**: Día 9 es inactivo entre ciclos (descanso)
6. **Códigos Activos**: Solo códigos especiales activos generan bonos
7. **Límites**: Mínimo $0.01, máximo $1000 por venta

---

## 🔧 Archivos Clave del Sistema

### Backend - Lógica de Negocio
- `backend/config/referral.config.js` - Configuración de porcentajes
- `backend/src/utils/benefitsCalculator.js` - Cálculos de comisiones
- `backend/src/controllers/specialCodes.controller.js` - Procesamiento de bonos
- `backend/src/models/Commission.model.js` - Estructura de datos
- `backend/src/services/BenefitsProcessor.js` - Procesamiento de beneficios

### Frontend - Interfaz de Usuario
- `frontend/src/services/referrals.service.js` - API de referidos
- `frontend/src/services/adminReferrals.service.js` - Administración
- `frontend/src/pages/user/referrals/ReferralDashboard.jsx` - Dashboard

---

## 📈 Métricas y Seguimiento

### KPIs del Sistema
- Total de comisiones pagadas
- Tasa de conversión de referidos
- Promedio de comisiones por usuario
- Rendimiento de códigos especiales

### Tracking Configurado
```javascript
STATS: {
  track_clicks: true,
  track_registrations: true,
  track_conversions: true,
  track_commissions: true,
  metrics: [
    'total_clicks',
    'total_registrations',
    'conversion_rate',
    'total_commissions',
    'active_referrals',
    'monthly_performance'
  ]
}
```

---

## ✅ Estado de Implementación

| Componente | Estado | Completitud | Notas |
|------------|--------|-------------|-------|
| Configuración de Porcentajes | ✅ Implementado | 100% | Actualizado en referral.config.js |
| Cálculo de Comisiones Directas | ✅ Corregido | 100% | BenefitsProcessor actualizado - pago único al 100% |
| Procesamiento de Bonos L/P | ✅ Corregido | 100% | Timing corregido al día 17 exacto |
| Modelo de Datos | ✅ Implementado | 100% | Commission.model.js completo |
| Automatización | ✅ Corregido | 100% | Validación de duplicados implementada |
| Interfaz de Usuario | ✅ Implementado | 95% | Terminología unificada |
| Función Legacy | ⚠️ Deprecada | N/A | calculateCommission() marcada como deprecada |

---

## 🔧 Correcciones Implementadas

### **Discrepancias Corregidas:**

#### 1. **Timing de Comisión Directa**
- **Antes**: Pago diario durante período de cashback
- **Después**: ✅ Pago único al completar 100% del cashback (día 8)
- **Archivo**: `BenefitsProcessor.js` - función `processReferralCommissions`

#### 2. **Timing de Bonos Líder/Padre**
- **Antes**: Pago en "segunda semana" (impreciso)
- **Después**: ✅ Pago exacto en día 17 (segundo ciclo completo)
- **Archivo**: `BenefitsProcessor.js` - función `processLeaderParentBonuses`

#### 3. **Porcentajes en calculateCommission()**
- **Antes**: Bono padre 3% (incorrecto)
- **Después**: ✅ Bono padre 5% (corregido según documentación)
- **Archivo**: `commissions.controller.js` - función marcada como DEPRECADA

#### 4. **Validación de Duplicados**
- **Implementado**: ✅ Verificación de pagos existentes antes de procesar
- **Previene**: Pagos duplicados por el mismo usuario
- **Metadatos**: `cashbackCompleted: true` y `secondCycleCompleted: true`

#### 5. **Funciones Auxiliares Agregadas**
- ✅ `hasUserCompletedFullCashback()` - Verifica día 8 exacto
- ✅ `getUserTotalCashback()` - Calcula cashback total completado
- ✅ `hasUserCompletedSecondCycle()` - Verifica día 17 exacto
- ✅ `getUserTotalLicensesAmount()` - Obtiene monto total de licencias

### **Archivos Modificados:**
1. `backend/src/services/BenefitsProcessor.js` - Lógica principal corregida
2. `backend/src/controllers/commissions.controller.js` - Función legacy actualizada
3. `optimizacion/LOGICA-SISTEMA-COMISIONES.md` - Documentación unificada

---

## 🚀 Próximos Pasos

### **Inmediatos (Post-Corrección):**
1. **Probar en desarrollo** las nuevas funciones auxiliares
2. **Validar timing** de pagos en día 8 y día 17
3. **Verificar prevención** de pagos duplicados
4. **Migrar código legacy** que use `calculateCommission()`

### **Futuras Mejoras:**
1. **Conectar datos reales** en lugar de mocks
2. **Optimizar consultas** de base de datos
3. **Implementar cron jobs** para automatización completa
4. **Añadir webhooks** para eventos en tiempo real
5. **Remover función deprecada** `calculateCommission()` tras migración completa

---

## 📝 Historial de Versiones

**v2.0** - Correcciones Implementadas (Diciembre 2024)
- ✅ Timing de comisiones corregido (día 8 y día 17)
- ✅ Porcentajes actualizados (padre: 3% → 5%)
- ✅ Validación de duplicados implementada
- ✅ Funciones auxiliares agregadas
- ✅ Función legacy marcada como deprecada

**v1.0** - Análisis Inicial (Noviembre 2024)
- 📋 Documentación del sistema existente
- 🔍 Identificación de discrepancias
- 📊 Mapeo de archivos clave

---

*Documento actualizado: Diciembre 2024*  
*Basado en análisis y corrección del código fuente*  
*Versión: 2.0 - CORREGIDO Y UNIFICADO*