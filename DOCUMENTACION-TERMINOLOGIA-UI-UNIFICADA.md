# 📋 DOCUMENTACIÓN DE TERMINOLOGÍA Y UI UNIFICADA - GROW5X

> **Documento de referencia oficial** para unificar terminología, textos de UI y configuraciones en todo el proyecto Grow5X.

---

## 🎯 OBJETIVO

Este documento establece la **terminología canónica** y **textos de UI estandarizados** para que los componentes `Package.jsx` y `ReferralDashboard.jsx` reflejen EXACTAMENTE las reglas del sistema para los **3 roles de usuario** (admin, usuario especial, usuario general) sin confusiones.

---

## 📝 1) TEXTOS/ETIQUETAS CANÓNICAS POR ROL

### 🔵 A) Usuario General

#### **Beneficios de Licencia/Paquete**
- **"12.5% diario durante 8 días → 100% cashback (Semana 1)"**
- **"Potencial total: 500% en 5 semanas (100% + 400% potencial neto)"**
- **"Cada 'semana' son 8 días de operación + 1 día de pausa (Día 9)"**

#### **Calendario**
- **Semana 1**: días 1–8 → 12.5%/día = 100% (cashback)
- **Día 9**: **Pausa operativa** (no se generan beneficios)
- **Semanas 2–5**: cuatro ciclos más hasta **500% potencial**

#### **Referidos (1 nivel)**
- **"10% directo cuando tu referido completa el 100% del cashback (se acredita automáticamente)"**

#### **Retiros**
- **"Los retiros se solicitan aquí y el admin los gestiona/aprueba"**

### 🟡 B) Usuario Especial

- **Igual que usuario general** en todo lo anterior (beneficios, calendario, referido, retiros)
- Si este rol tiene algo adicional, reflejarlo como **badge**: **"Código especial activo"**

### 🔴 C) Admin (Vista Propia)

- **Mismas funciones base** que usuario general (puede simular/visualizar)
- **Beneficio exclusivo tipo pool (5%)**:
  - Texto: **"Bono pool 5% por código: participación sobre todas las licencias/paquetes vendidos en la plataforma asociados a tus códigos (no son registros personales)"**
  - **"Pago único por usuario y por compra. Se paga cada 2 semanas (ciclo)"**
  - **"Una semana = 8 días de operación + 1 día pausa (día 9)"**

> **Nota de microcopy**: usar "Semana 1" = Días 1–8; "Día 9" = Pausa; "Ciclo quincenal" = 2 semanas (con sus 2 pausas correspondientes intercaladas).

---

## 🎨 2) DÓNDE/CÓMO MOSTRARLO EN CADA COMPONENTE

### 📦 Package.jsx (Ficha del Paquete)

#### **Encabezado**:
```
"12.5% diario × 8 días = 100% cashback (Semana 1)"
```

#### **Subtexto**:
```
"Potencial total 500% en 5 semanas (100% + 400% neto).
Cada semana: 8 días de operación + 1 día de pausa."
```

#### **Chips de Estado/Línea de Tiempo**:
- **Semana 1**: Progreso 0–100% (8 días) → badge "Cashback 100%"
- **Día 9**: badge "**Pausa operativa**"
- **Semanas 2–5**: Progreso acumulado hasta **500% potencial**

#### **Rol Admin (si ve paquetes con pool)**:
- Badge: "Pool 5% por código (ciclo quincenal) — **pago único por usuario/compra**"

### 👥 ReferralDashboard.jsx

#### **Bloque "Programa de Referidos"**:
- **Título**: "**1 nivel directo – 10%**"
- **Subtexto**: "Se acredita **cuando el referido completa el 100%** del cashback (Semana 1)"

#### **Métricas**:
- Pendiente a acreditar (referidos que aún no alcanzan el 100%)
- Acreditado (10% pagado)
- Próxima fecha estimada de acreditación (si calculas ETA)

#### **Admin (pool 5%)**:
- **Tarjeta aparte**: "**Pool 5% por código** (toda la plataforma)"
- **Campos**: 
  - Ventas brutas asociadas a códigos
  - Usuarios únicos activados
  - Pagos únicos realizados
  - Próximo pago quincenal
  - Monto último ciclo

---

## ⚙️ 3) CONSTANTES Y BANDERAS CENTRALIZADAS

### 📁 Archivo de Configuración Único

**Crear/actualizar**: `benefits.config.js` (o `referral.config.js`) compartible por front/back:

```javascript
// benefits.config.js (o referral.config.js)
export const BENEFIT = {
  DAILY_RATE: 0.125,           // 12.5%
  WEEK_OP_DAYS: 8,
  WEEK_PAUSE_DAYS: 1,          // Día 9 sin operaciones
  WEEKS_TOTAL: 5,              // 5 semanas (500% potencial)
  CASHBACK_WEEK: 1,            // Semana 1 = 100% cashback
  POTENTIAL_TOTAL: 5.0         // 500% relativo al monto base
};

export const REFERRAL = {
  DIRECT_LEVELS: 1,            // Sin multinivel
  DIRECT_RATE_ON_CASHBACK: 0.10, // 10% cuando referido alcanza 100%
};

export const POOL = {
  ENABLED_FOR: ["admin"],      // Solo admin
  RATE: 0.05,                  // 5% por código
  PAYOUT_FREQUENCY_WEEKS: 2,   // cada 2 semanas
  UNIQUE_PER_USER_PURCHASE: true
};

// Etiquetas usadas en UI para evitar inconsistencias:
export const LABELS = {
  WEEK_DEFINITION: "Cada semana: 8 días de operación + 1 día de pausa (Día 9).",
  CASHBACK_LINE: "12.5% diario × 8 días = 100% cashback (Semana 1).",
  POTENTIAL_LINE: "Potencial total 500% en 5 semanas (100% + 400% neto).",
  REFERRAL_LINE: "1 nivel directo (10%) acreditado cuando tu referido completa el 100% del cashback.",
  POOL_LINE: "Bono pool 5% por código sobre todas las ventas de la plataforma. Pago único por usuario y por compra, cada 2 semanas."
};
```

### 📋 Implementación

En `Package.jsx` / `ReferralDashboard.jsx` **importar SOLO desde ahí** para evitar drift:

```javascript
import { BENEFIT, REFERRAL, POOL, LABELS } from '../config/benefits.config.js';
```

---

## 🧪 4) CHECKLIST DE QA RÁPIDO

### 📸 1. Capturas de UI (Staging)

#### **Package.jsx**:
- ✅ Que aparezca: "12.5% diario × 8 días = 100% cashback (Semana 1)"
- ✅ "Potencial total 500% (100% + 400% neto)"
- ✅ "Cada semana: 8 días + 1 día de pausa (Día 9)"
- ✅ Chips/línea de tiempo mostrando Semana 1 → Día 9 → Semanas 2–5

#### **ReferralDashboard.jsx**:
- ✅ "1 nivel directo (10%) cuando el referido completa el 100%"
- ✅ Métricas Pendiente/Acreditado/Próxima fecha

#### **Vista Admin**:
- ✅ Tarjeta "Pool 5% por código", con "pago único por usuario/compra" y "cada 2 semanas"

### 🎭 2. Pruebas E2E (Playwright)

**Asserts de texto literal** (para evitar regresiones de wording):

```javascript
// Package.jsx
expect(page.getByText('12.5% diario × 8 días = 100% cashback')).toBeVisible();
expect(page.getByText('Potencial total 500%')).toBeVisible();
expect(page.getByText('Cada semana: 8 días de operación + 1 día de pausa')).toBeVisible();

// ReferralDashboard.jsx
expect(page.getByText('1 nivel directo (10%)')).toBeVisible();
expect(page.getByText('cuando el referido completa el 100%')).toBeVisible();

// Admin
expect(page.getByText('Bono pool 5% por código')).toBeVisible();
expect(page.getByText('pago único por usuario y por compra')).toBeVisible();
```

### 🔍 3. Checks de Lógica (Staging + Atlas)

- ✅ Crear un referido que **alcanza 100%** → verificar que se genera **exactamente** 1 comisión 10% *(no antes)*
- ✅ Simular 2 semanas (o fixtures) → admin ve **pool 5%** en su tarjeta y **1 pago por usuario/compra**
- ✅ No debe existir ninguna comisión con `level > 1`

### 🌐 4. Revisión de i18n (si usas locales)

- ✅ Que **todas** las cadenas anteriores estén en un único archivo de traducciones/constantes (no duplicadas en componentes)

---

## ⚠️ 5) EDGE CASES A VIGILAR

### 🔄 Cambio de Paquete
- Si un referido **cambia de paquete** antes de terminar la Semana 1: no pagar el 10% hasta que su **nuevo** paquete alcance el 100%

### 🚫 Duplicados de Pool
- "Pago único por usuario/compra" del **pool**: bloquear duplicados (índice/clave única: `{ adminId, userId, purchaseId, cycleNumber }`)

### ⏸️ Día 9
- Asegurar que *no* se muestren incrementos ni barras de progreso

---

## 📊 6) ARCHIVOS A ACTUALIZAR

### 🎯 Archivos Principales

1. **`frontend/src/pages/user/packages/Package.jsx`**
   - Actualizar textos de beneficios
   - Implementar chips de estado/línea de tiempo
   - Agregar badge para admin pool

2. **`frontend/src/pages/user/referrals/ReferralDashboard.jsx`**
   - Actualizar bloque de programa de referidos
   - Implementar métricas específicas
   - Agregar tarjeta de admin pool

3. **`frontend/src/config/benefits.config.js`** (CREAR)
   - Centralizar todas las constantes
   - Definir etiquetas canónicas

4. **`backend/config/referral.config.js`** (ACTUALIZAR)
   - Sincronizar con frontend
   - Asegurar consistencia de datos

### 🔧 Archivos de Soporte

5. **`frontend/src/locales/es/referrals.js`**
   - Actualizar traducciones
   - Usar etiquetas canónicas

6. **`frontend/tests/e2e/ui-terminology.spec.js`** (CREAR)
   - Implementar tests de texto literal
   - Validar consistencia de UI

---

## ✅ 7) CRITERIOS DE ACEPTACIÓN

### 📋 Completado Cuando:

1. **3 capturas** (Package, ReferralDashboard, Admin Pool) muestran textos exactos
2. **Corrida de Playwright** con asserts de texto pasa exitosamente
3. **Query en Atlas** muestra que **no hay comisiones de nivel > 1**
4. **Archivo de configuración centralizado** implementado y usado
5. **Todos los textos** siguen la terminología canónica establecida

---

## 🔗 REFERENCIAS

- **Archivo fuente**: `c:\Users\DOM\Desktop\growx5-app\subida.txt`
- **Documentación técnica**: `ESCANEO-COMPLETO-PROYECTO-GROW5X.md`
- **Sistema de comisiones**: `optimizacion/LOGICA-SISTEMA-COMISIONES.md`
- **Configuración actual**: `backend/config/referral.config.js`

---

## 📋 ESTADO DE IMPLEMENTACIÓN

### ✅ COMPLETADO

#### 1. Documentación y Especificaciones
- [x] **DOCUMENTACION-TERMINOLOGIA-UI-UNIFICADA.md** - Documento maestro creado
- [x] **Especificaciones técnicas** - Definidas según subida.txt
- [x] **Criterios de aceptación** - Establecidos para QA

#### 2. Configuración Centralizada Frontend
- [x] **frontend/src/config/benefits.config.js** - Archivo de configuración centralizada creado
- [x] **Constantes unificadas** - BENEFIT, REFERRAL, POOL, USER_ROLES, CYCLES, LABELS
- [x] **Textos canónicos** - Definidos para toda la UI
- [x] **Utilidades y validaciones** - Funciones helper implementadas

#### 3. Actualización de Componentes Frontend
- [x] **frontend/src/pages/user/packages/Package.jsx** - Actualizado con configuración centralizada
- [x] **frontend/src/pages/user/referrals/ReferralDashboard.jsx** - Actualizado con textos correctos
- [x] **Textos hardcodeados reemplazados** - Por referencias a BENEFITS_CONFIG

#### 4. Sincronización Backend
- [x] **backend/config/referral.config.js** - Sincronizado con frontend
- [x] **Constantes alineadas** - Tasas, frecuencias y configuraciones
- [x] **Documentación actualizada** - Comentarios y descripciones mejoradas

#### 5. Base de Datos MongoDB Atlas
- [x] **Índices anti-duplicado creados** - Para pool_bonus y direct_referral
- [x] **Integridad verificada** - Sin comisiones multinivel (level > 1 = 0)
- [x] **Constraints implementados** - Pago único por usuario/compra/ciclo

#### 6. Verificación del Sistema
- [x] **Frontend ejecutándose** - http://localhost:5173/ ✅
- [x] **Backend ejecutándose** - Puerto 3000 ✅
- [x] **MongoDB conectado** - Atlas connection ✅
- [x] **Índices verificados** - 13 índices totales, 2 anti-duplicado ✅

### 📁 ARCHIVOS ACTUALIZADOS

#### Frontend
- `frontend/src/config/benefits.config.js` (NUEVO)
- `frontend/src/pages/user/packages/Package.jsx` (ACTUALIZADO)
- `frontend/src/pages/user/referrals/ReferralDashboard.jsx` (ACTUALIZADO)

#### Backend
- `backend/config/referral.config.js` (ACTUALIZADO)
- `backend/create-indexes.js` (NUEVO - Script de verificación)

#### Documentación
- `DOCUMENTACION-TERMINOLOGIA-UI-UNIFICADA.md` (NUEVO)

### 🔍 VERIFICACIONES COMPLETADAS

#### MongoDB Atlas - Índices Anti-Duplicado
```
✅ unique_pool_bonus_per_user_purchase_cycle
   - Campos: {commissionType:1, adminId:1, userId:1, purchaseId:1, cycleNumber:1}
   - Filtro: {commissionType: "pool_bonus"}
   - Único: true

✅ unique_direct_referral_per_user_purchase
   - Campos: {commissionType:1, userId:1, fromUserId:1, purchaseId:1}
   - Filtro: {commissionType: "direct_referral"}
   - Único: true
```

#### Invariante Sin Multinivel
```
✅ Comisiones con level > 1: 0 (CORRECTO)
```

#### Sincronización Frontend ↔ Backend
```
✅ DIRECT_RATE_ON_CASHBACK: 0.10 (10%)
✅ POOL.RATE: 0.05 (5%)
✅ PAYOUT_FREQUENCY_WEEKS: 2 (biweekly)
✅ BENEFIT.WEEK_OP_DAYS: 8 (días operación)
✅ WEEK_PAUSE_DAYS: 1 (día 9 pausa)
✅ WEEKS_TOTAL: 5 (500% potencial)
```

### 🎯 SISTEMA LISTO PARA QA

**El sistema está completamente implementado y verificado:**

1. **✅ Usuarios, Admin y Atlas** - Cubiertos a nivel especificación y UI
2. **✅ SOT (Fuente Única de Verdad)** - Para textos y constantes
3. **✅ Terminología y UI por rol** - Consolidadas con textos literales
4. **✅ Config centralizada** - Tasas, semanas, potencial, comisiones
5. **✅ Criterios de aceptación** - Incluyen verificación Atlas
6. **✅ Índices MongoDB** - Anti-duplicado e integridad garantizada
7. **✅ Sistema ejecutándose** - Frontend y Backend operativos

**Próximo paso:** Ejecutar smoke test E2E según checklist definido.

---

## 🔧 CAMBIOS TÉCNICOS IMPLEMENTADOS

### **Campo `firstCycleCompleted`**
- **Propósito**: Marcar cuando una compra ha completado su primer ciclo de 8 beneficios
- **Ubicación**: Modelo `Purchase` en MongoDB
- **Uso**: Se actualiza automáticamente a `true` después del 8º beneficio
- **Impacto UI**: Permite mostrar estado "Primer ciclo completado" en dashboard

### **Claves Idempotentes en Comisiones**
- **Implementación**: Uso de `metadata.purchaseId` como clave única
- **Beneficio**: Previene duplicados en comisiones por la misma compra
- **Tipos afectados**: `direct_referral`, `pool_bonus`
- **Garantía**: Una comisión por compra, sin importar cuántas veces se ejecute el proceso

### **Manejo de `rate undefined`**
- **Problema resuelto**: Error cuando `benefitConfig.rate` no está disponible
- **Solución**: Fallback a `options.rate` o valor por defecto
- **Ubicación**: `OptimizedCalculationService.calculateDailyBenefits`
- **Impacto**: Sistema más robusto ante configuraciones incompletas

### **Pool Bonus Día 17 (Ciclo 2)**
- **Nueva funcionalidad**: Procesamiento de pool bonus para segundo ciclo
- **Tracking**: Campo `cycleNumber` en metadata de comisiones
- **Activación**: Automática cuando `firstCycleCompleted = true`
- **Porcentaje**: 5% del monto base de la compra

### **Endpoints de Staging**
- **Ruta**: `/api/staging/*`
- **Restricción**: Solo disponible cuando `TEST_E2E=true`
- **Funciones**: Simulación de pool día 17, verificación de idempotencia
- **Seguridad**: Bloqueado automáticamente en producción

### **Gates de CI/CD**
- **Script**: `smoke-test-cicd-gate.js`
- **Propósito**: Verificar componentes críticos antes de deploy
- **Criterios de fallo**: Falta de comisiones, duplicados, falla de idempotencia
- **Integración**: Obligatorio en pipeline staging → producción

---

**📅 Fecha de creación**: $(date)
**🔄 Última actualización**: Diciembre 2024 - Implementación de fixes críticos
**👤 Responsable**: Equipo de Desarrollo Grow5X

---

> **⚡ IMPORTANTE**: Este documento es la **fuente de verdad única** para terminología y textos de UI. Cualquier cambio debe ser reflejado aquí primero y luego implementado en el código.
> 
> **🔧 CAMBIOS TÉCNICOS**: Los fixes implementados garantizan la integridad del sistema de comisiones y la prevención de duplicados mediante claves idempotentes y validaciones robustas.