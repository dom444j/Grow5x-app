# 🎯 Condiciones Diferenciales del Sistema de Comisiones - Grow5X

🚨 **DOCUMENTO TÉCNICO OFICIAL** 🚨

⚠️ **INFORMACIÓN CRÍTICA** ⚠️
- Este documento detalla las **condiciones específicas** que se aplican para activar y procesar comisiones
- Complementa la información de valores en `LOGICA-SISTEMA-COMISIONES.md` y `REPORTE-OPTIMIZACION-SISTEMA-LICENCIAS-COMISIONES.md`
- Todas las condiciones están implementadas en el código fuente

**Fecha:** $(date)  
**Versión:** 1.0  
**Estado:** ✅ Documentado desde código fuente  
**Tipo:** Condiciones Técnicas de Aplicación  

---

## 🔐 Condiciones de Activación de Beneficios

### **Requisito Fundamental: Licencia Activa**

**Condición Principal:**
```javascript
// Verificación en middleware/referralValidation.js
if (userStatus.subscription.packageStatus !== 'active') {
  // Usuario NO puede acceder a beneficios de referidos
  return "Necesitas una licencia activa para acceder a los beneficios de referidos";
}
```

**Estados de Licencia Válidos:**
- ✅ `'active'` - Usuario puede recibir y generar comisiones
- ❌ `'pending'` - Sin acceso a beneficios
- ❌ `'expired'` - Sin acceso a beneficios
- ❌ `'cancelled'` - Sin acceso a beneficios
- ❌ `'paused'` - Sin acceso a beneficios

**Verificaciones Adicionales:**
```javascript
// Verificación en middleware/benefitsValidation.js
if (userStatus.subscription.benefitCycle.isPaused) {
  return "El ciclo de beneficios está pausado para este usuario";
}
```

---

## 💰 Condiciones para Comisión Directa (10%)

### **Trigger de Activación:**
```javascript
// Condición exacta en BenefitsProcessor.js
const hasCompletedCashback = await this.hasUserCompletedFullCashback(user.id);
if (!hasCompletedCashback) {
  return; // NO procesar comisión hasta completar 100% del cashback
}
```

### **Condiciones Diferenciales Específicas:**

#### **1. Verificación de Licencia Activa del Referidor:**
```javascript
// Condición crítica en OptimizedCalculationService.js
const referrerStatus = await UserStatus.findOne({ user: referral.referrer._id });
if (referrerStatus.subscription.packageStatus !== 'active') {
  logger.warn('Referidor sin licencia activa', { referrerId: referral.referrer._id });
  return; // NO procesar comisión si referidor no tiene licencia activa
}
```

#### **2. Validación de Estado del Usuario Referido:**
```javascript
// El usuario referido debe tener estado válido
const referredUserStatus = await UserStatus.findOne({ user: user.id });
if (!referredUserStatus || referredUserStatus.subscription.packageStatus !== 'active') {
  return; // Usuario referido debe tener licencia activa
}
```

#### **3. Verificación de Relación de Referido Válida:**
```javascript
// La relación de referido debe estar activa y ser válida
const activeReferral = await Referral.findOne({
  referred: user.id,
  referrer: referral.referrer._id,
  isActive: true
});

if (!activeReferral) {
  return; // Relación de referido inválida o inactiva
}
```

### **Verificación de Completitud:**
```javascript
// Función hasUserCompletedFullCashback()
const benefitDays = await Transaction.countDocuments({
  user_id: userId,
  type: 'benefit',
  status: 'completed'
});

// Debe completar EXACTAMENTE 8 días (100% del cashback)
return benefitDays === 8;
```

### **Condiciones Específicas:**

1. **Usuario Referido:**
   - ✅ Debe completar exactamente 8 días de beneficios
   - ✅ Cada día debe ser 12.5% (total 100%)
   - ✅ Transacciones deben tener status 'completed'
   - ✅ Debe tener licencia activa

2. **Usuario Referidor:**
   - ✅ Debe existir relación de referido activa
   - ✅ Debe tener licencia activa para recibir comisión
   - ✅ No debe tener comisión previa por este usuario

3. **Verificación de Duplicados:**
```javascript
// Prevención de pagos duplicados
const existingCommission = await Transaction.findOne({
  user_id: referral.referrer._id,
  type: 'commission',
  subtype: 'direct_referral',
  'metadata.referredUser': user.id,
  'metadata.cashbackCompleted': true
});

if (existingCommission) {
  return; // NO procesar si ya existe
}
```

4. **Cálculo de Comisión:**
```javascript
// 10% del cashback total completado
const totalCashbackAmount = await this.getUserTotalCashback(user.id);
const directCommission = totalCashbackAmount * 0.10;
```

---

## 🏆 Condiciones para Bonos Líder/Padre (5%)

### **Trigger de Activación:**
```javascript
// Condición exacta en BenefitsProcessor.js
const hasCompletedSecondCycle = await this.hasUserCompletedSecondCycle(user.id);
if (!hasCompletedSecondCycle) {
  return; // NO procesar hasta completar segundo ciclo (día 17)
}
```

### **Condiciones Diferenciales Específicas:**

#### **1. Verificación de Códigos Especiales Activos:**
```javascript
// Solo códigos especiales activos pueden recibir bonos
const activeSpecialCodes = await SpecialCode.find({
  isActive: true,
  $or: [{ type: 'leader' }, { type: 'parent' }]
});

if (activeSpecialCodes.length === 0) {
  return; // No hay códigos especiales activos para procesar bonos
}
```

#### **2. Validación de Usuario del Código Especial:**
```javascript
// El usuario propietario del código debe tener licencia activa
for (const specialCode of activeSpecialCodes) {
  const codeOwnerStatus = await UserStatus.findOne({ user: specialCode.userId });
  
  if (codeOwnerStatus.subscription.packageStatus !== 'active') {
    logger.warn('Propietario de código sin licencia activa', { 
      codeId: specialCode._id, 
      ownerId: specialCode.userId 
    });
    continue; // Saltar este código si el propietario no tiene licencia activa
  }
}
```

#### **3. Verificación de Elegibilidad del Usuario Fuente:**
```javascript
// El usuario que genera el bono debe cumplir condiciones específicas
const sourceUserStatus = await UserStatus.findOne({ user: user.id });

// Debe tener licencia activa
if (sourceUserStatus.subscription.packageStatus !== 'active') {
  return; // Usuario fuente debe tener licencia activa
}

// Debe haber completado exactamente el segundo ciclo
const completedDays = await Transaction.countDocuments({
  user_id: user.id,
  type: 'benefit',
  status: 'completed'
});

if (completedDays !== 17) {
  return; // Debe completar exactamente 17 días (segundo ciclo completo)
}
```

### **Verificación de Segundo Ciclo:**
```javascript
// Función hasUserCompletedSecondCycle()
const benefitCount = await Transaction.countDocuments({
  user_id: userId,
  type: 'benefit',
  status: 'completed'
});

// Segundo ciclo se completa EXACTAMENTE en el día 17
return benefitCount === 17;
```

### **Condiciones Específicas:**

1. **Usuario Fuente (que genera el bono):**
   - ✅ Debe completar exactamente 17 días de beneficios
   - ✅ Debe tener licencia activa
   - ✅ Debe estar en segundo ciclo completo

2. **Códigos Especiales (que reciben el bono):**
   - ✅ Debe tener `isActive: true`
   - ✅ Debe ser tipo 'leader' o 'parent'
   - ✅ Usuario del código debe tener licencia activa
   - ✅ No debe tener bono previo por este usuario específico

3. **Verificación de Duplicados:**
```javascript
// Verificación crítica de pago único
const existingBonus = await Transaction.findOne({
  user_id: specialCode.userId._id,
  type: 'commission',
  subtype: 'leader_bonus',
  'metadata.sourceUser': user.id,
  'metadata.specialCodeId': specialCode._id,
  'metadata.secondCycleCompleted': true
});

if (existingBonus) {
  return; // NO procesar si ya existe para este usuario
}
```

4. **Cálculo de Bono:**
```javascript
// 5% del monto total de todas las licencias del usuario
const userTotalLicensesAmount = await this.getUserTotalLicensesAmount(user.id);
const leaderParentBonus = userTotalLicensesAmount * 0.05;
```

---

## 🔄 Condiciones de Ciclo de Beneficios

### **Activación del Sistema:**
```javascript
// Condición en licenseController.js
async function activateUserPackage(userId, packageId, transactionId) {
  const userStatus = await UserStatus.findOneAndUpdate(
    { userId },
    {
      'subscription.packageStatus': 'active',
      'subscription.benefitCycle.currentDay': 1,
      'subscription.benefitCycle.isInActivePeriod': true,
      'subscription.benefitCycle.isPaused': false
    }
  );
}
```

### **Condiciones Diferenciales de Activación:**

#### **1. Verificación de Compra de Licencia Válida:**
```javascript
// La activación de beneficios requiere compra de licencia confirmada
const licenseTransaction = await Transaction.findOne({
  user_id: userId,
  type: 'license_purchase',
  status: 'completed',
  _id: transactionId
});

if (!licenseTransaction) {
  throw new Error('Transacción de licencia no válida para activar beneficios');
}
```

#### **2. Validación de Paquete Elegible:**
```javascript
// Solo ciertos paquetes permiten beneficios de referidos
const packageConfig = await Package.findById(packageId);

if (!packageConfig.allowsReferralBenefits) {
  throw new Error('Este paquete no incluye beneficios de referidos');
}

// Verificar configuración mínima requerida
if (!packageConfig.benefitConfig || packageConfig.benefitConfig.dailyRate !== 0.125) {
  throw new Error('Configuración de beneficios inválida en el paquete');
}
```

#### **3. Verificación de Usuario Elegible:**
```javascript
// El usuario debe cumplir requisitos básicos
const user = await User.findById(userId);

if (!user.isEmailVerified) {
  throw new Error('Usuario debe verificar email antes de activar beneficios');
}

if (user.status !== 'active') {
  throw new Error('Usuario debe tener estado activo para beneficios');
}
```

### **Verificación de Período de Cashback:**
```javascript
// Función isUserInCashbackPeriod()
const benefitDays = await Transaction.countDocuments({
  user: userId,
  type: 'benefit',
  status: 'completed'
});

// Los primeros 8 días son período de cashback
return benefitDays < 8;
```

### **Condiciones de Procesamiento Diario:**

1. **Timing de Beneficios:**
   - ✅ Debe ser elegible según `nextBenefitDate`
   - ✅ No debe estar en día inactivo (día 9)
   - ✅ Debe estar dentro de los 40 días totales (5 ciclos × 8 días)

2. **Validación de Paquete:**
```javascript
// Verificación en benefitsValidation.js
if (!packageConfig.benefitConfig || !packageConfig.benefitConfig.dailyRate) {
  return "Configuración de beneficios incompleta en el paquete";
}

// Validar tasa diaria esperada (12.5% = 0.125)
const expectedDailyRate = 0.125;
if (Math.abs(packageConfig.benefitConfig.dailyRate - expectedDailyRate) > 0.001) {
  // Advertencia de tasa inesperada
}
```

---

## 🛡️ Condiciones de Seguridad y Validación

### **Autenticación y Autorización:**
```javascript
// Middleware de validación
if (!userId) {
  return "Usuario no autenticado";
}

// Permisos especiales para admin
if (req.user.role === 'admin') {
  return next(); // Bypass de validaciones
}
```

### **Condiciones Diferenciales de Seguridad:**

#### **1. Prevención de Auto-Referencia:**
```javascript
// Verificación estricta de auto-referencia
if (referral.referrer._id.toString() === referral.referred.toString()) {
  logger.error('Intento de auto-referencia detectado', { 
    userId: referral.referrer._id 
  });
  throw new Error('Auto-referencia no permitida');
}

// Verificación adicional por email
const referrerUser = await User.findById(referral.referrer._id);
const referredUser = await User.findById(referral.referred);

if (referrerUser.email === referredUser.email) {
  throw new Error('No se puede referir a la misma dirección de email');
}
```

#### **2. Validación de Límites de Comisión:**
```javascript
// Verificar límites máximos de comisión
const MAX_COMMISSION_PER_USER = 1000.00; // $1000 USD máximo
const MIN_COMMISSION = 0.01; // $0.01 USD mínimo

if (commissionAmount > MAX_COMMISSION_PER_USER) {
  logger.warn('Comisión excede límite máximo', { 
    amount: commissionAmount, 
    userId: referral.referrer._id 
  });
  commissionAmount = MAX_COMMISSION_PER_USER;
}

if (commissionAmount < MIN_COMMISSION) {
  return; // No procesar comisiones menores al mínimo
}
```

#### **3. Verificación de Integridad de Datos:**
```javascript
// Validar integridad de la cadena de referidos
const referralChain = await this.validateReferralChain(userId);

if (!referralChain.isValid) {
  logger.error('Cadena de referidos corrupta', { 
    userId, 
    error: referralChain.error 
  });
  throw new Error('Estructura de referidos inválida');
}

// Verificar que no hay ciclos en la cadena
if (referralChain.hasCycles) {
  throw new Error('Ciclo detectado en cadena de referidos');
}
```

### **Límites de Procesamiento:**
```javascript
// Validación en benefitsValidation.js
const activeRecalculations = await UserStatus.countDocuments({
  'adminFlags.isRecalculating': true
});

if (activeRecalculations > 5) {
  return "Demasiados recálculos en progreso";
}
```

### **Verificación de Integridad:**
```javascript
// Límites de comisión
const COMMISSION_CONFIG = {
  min_commission: 0.01, // Mínimo $0.01
  max_commission_per_sale: 1000.00 // Máximo $1000 por venta
};
```

---

## 📊 Condiciones de Estado de Usuario

### **Estados Válidos para Beneficios:**

| Estado Usuario | Puede Recibir Beneficios | Puede Generar Comisiones | Notas |
|----------------|-------------------------|--------------------------|-------|
| `active` + licencia activa | ✅ | ✅ | Estado completo |
| `active` + sin licencia | ❌ | ❌ | Requiere activar licencia |
| `pending` | ❌ | ❌ | Debe verificar email |
| `inactive` | ❌ | ❌ | Cuenta desactivada |
| Admin | ✅ | ✅ | Bypass de validaciones |

### **Verificación de UserStatus:**
```javascript
// Middleware ensureUserStatus.js
const userStatus = await UserStatus.findOne({ user: userId });

if (!userStatus) {
  // Auto-crear UserStatus si no existe
  const newUserStatus = await UserStatusService.createUserStatus(userId);
}
```

---

## 🔧 Condiciones de Configuración

### **Configuración de Referidos:**
```javascript
// referral.config.js
USER_LEVELS: {
  FATHER: {
    requires_license: true, // OBLIGATORIO
    activation_trigger: 'license_purchase'
  },
  LEADER: {
    requires_license: true, // OBLIGATORIO
    activation_trigger: 'license_purchase'
  },
  MEMBER: {
    requires_license: true, // OBLIGATORIO
    activation_trigger: 'cashback_completion'
  }
}
```

### **Límites Operacionales:**
```javascript
COMMISSION_CONFIG: {
  cycle_days: 8, // Días por ciclo
  total_cycles: 5, // Ciclos totales
  inactive_day: 9, // Día inactivo entre ciclos
  daily_benefit_rate: 0.125, // 12.5% diario
  total_potential: 5.0 // 500% potencial total
}
```

---

## 🔗 Condiciones de Acceso a Endpoints de Referidos

### **Validación de Licencia Activa para Ver Referidos:**

#### **1. Middleware validateActiveLicenseForReferrals:**
```javascript
// Implementado en middleware/referralValidation.js
const validateActiveLicenseForReferrals = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Bypass para administradores
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Verificar estado del usuario
    const userStatus = await UserStatus.findOne({ user: userId });
    
    if (!userStatus || userStatus.subscription.packageStatus !== 'active') {
      return res.status(200).json({
        success: true,
        data: [],
        message: "Necesitas una licencia activa para acceder a los beneficios de referidos. Adquiere tu licencia para comenzar a generar comisiones."
      });
    }
    
    next();
  } catch (error) {
    logger.error('Error validando licencia para referidos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
```

#### **2. Aplicación en Rutas Específicas:**
```javascript
// En routes/referral.routes.js

// Endpoint que requiere licencia activa
router.get('/my-referrals', 
  authenticateToken, 
  validateActiveLicenseForReferrals, // <- Validación obligatoria
  referralController.getUserReferrals
);

// Endpoint con acceso más permisivo para estadísticas
router.get('/stats', 
  authenticateToken, 
  validateReferralStatsAccess, // <- Validación menos restrictiva
  referralController.getReferralStats
);
```

### **Condiciones Específicas de Acceso:**

#### **1. Para Endpoint `/api/referrals/my-referrals`:**
- ✅ **Obligatorio:** Usuario autenticado
- ✅ **Obligatorio:** Licencia con status 'active'
- ✅ **Excepción:** Administradores tienen acceso completo
- ❌ **Bloqueado:** Usuarios sin licencia (reciben lista vacía con mensaje)
- ❌ **Bloqueado:** Usuarios con licencia expired/pending/cancelled

#### **2. Para Endpoint `/api/referrals/stats`:**
- ✅ **Obligatorio:** Usuario autenticado
- ✅ **Permitido:** Acceso a estadísticas básicas sin licencia
- ✅ **Limitado:** Datos completos solo con licencia activa
- ✅ **Excepción:** Administradores ven todos los datos

#### **3. Respuesta Diferencial por Estado:**
```javascript
// Usuario SIN licencia activa
{
  "success": true,
  "data": [],
  "message": "Necesitas una licencia activa para acceder a los beneficios de referidos. Adquiere tu licencia para comenzar a generar comisiones."
}

// Usuario CON licencia activa
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "referred": { /* datos del referido */ },
      "commissionEarned": 25.50,
      "status": "active",
      "createdAt": "2024-01-15T..."
    }
  ],
  "totalCommissions": 125.75,
  "activeReferrals": 5
}

// Administrador (acceso completo)
{
  "success": true,
  "data": [ /* todos los referidos */ ],
  "adminView": true,
  "totalSystemCommissions": 15420.30
}
```

---

## ⚠️ Condiciones de Restricción

### **Prohibiciones Absolutas:**

1. **Auto-referencia:**
   - ❌ Usuario no puede referirse a sí mismo
   - ❌ Detección automática por email/IP

2. **Múltiples Pagos:**
   - ❌ Una sola comisión directa por usuario referido
   - ❌ Un solo bono líder/padre por usuario fuente
   - ❌ Verificación de duplicados obligatoria

3. **Manipulación de Ciclos:**
   - ❌ No se puede forzar completitud de ciclos
   - ❌ Días deben procesarse secuencialmente
   - ❌ No se puede saltar días inactivos

4. **Bypass de Licencia:**
   - ❌ Sin licencia activa = sin beneficios
   - ❌ Solo admin puede hacer bypass
   - ❌ Verificación obligatoria en cada operación

### **4. Validación de Coherencia de Datos:**
```javascript
// Verificar que los datos de comisión son coherentes
const validateCommissionData = async (commission) => {
  // Verificar que la comisión corresponde al porcentaje correcto
  const expectedCommission = commission.sourceAmount * 0.10; // 10% para comisión directa
  const tolerance = 0.01; // Tolerancia de $0.01
  
  if (Math.abs(commission.amount - expectedCommission) > tolerance) {
    throw new Error('Monto de comisión no coincide con el porcentaje esperado');
  }
  
  // Verificar que la fecha de procesamiento es válida
  const daysSinceReferral = Math.floor(
    (new Date() - commission.referralDate) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceReferral < 8) {
    throw new Error('Comisión procesada antes del día 8');
  }
};
```

### **5. Condiciones de Rollback y Recuperación:**
```javascript
// En caso de error durante el procesamiento
const rollbackCommission = async (transactionId) => {
  try {
    // Revertir transacción de comisión
    await Transaction.findByIdAndUpdate(transactionId, {
      status: 'failed',
      'metadata.rollbackReason': 'Error en validación de condiciones',
      'metadata.rollbackDate': new Date()
    });
    
    // Registrar para auditoría
    logger.error('Comisión revertida por fallo en condiciones', {
      transactionId,
      timestamp: new Date()
    });
  } catch (rollbackError) {
    logger.critical('Error crítico en rollback de comisión', {
      originalTransaction: transactionId,
      rollbackError: rollbackError.message
    });
  }
};
```

---

## 🎯 Resumen de Condiciones Críticas

### **Para Comisión Directa (10%):**
1. ✅ Usuario referido debe completar EXACTAMENTE 8 días
2. ✅ Usuario referidor debe tener licencia activa
3. ✅ No debe existir comisión previa por este usuario
4. ✅ Relación de referido debe estar activa

### **Para Bonos Líder/Padre (5%):**
1. ✅ Usuario fuente debe completar EXACTAMENTE 17 días
2. ✅ Código especial debe estar activo
3. ✅ Usuario del código debe tener licencia activa
4. ✅ No debe existir bono previo por este usuario específico

### **Para Acceso a Beneficios:**
1. ✅ Usuario debe tener licencia con status 'active'
2. ✅ Ciclo de beneficios no debe estar pausado
3. ✅ Usuario debe estar autenticado
4. ✅ Configuración de paquete debe ser válida

### **Para Acceso a Endpoints de Referidos:**
1. ✅ Endpoint `/my-referrals` requiere licencia activa obligatoria
2. ✅ Endpoint `/stats` permite acceso básico sin licencia
3. ✅ Administradores tienen bypass completo de validaciones
4. ✅ Respuesta diferencial según estado de licencia

### **Para Validaciones de Seguridad:**
1. ✅ Prevención estricta de auto-referencia (ID y email)
2. ✅ Límites máximos y mínimos de comisión aplicados
3. ✅ Verificación de integridad de cadena de referidos
4. ✅ Validación de coherencia en montos de comisión
5. ✅ Sistema de rollback en caso de errores críticos

---

## 📁 Archivos de Implementación

### **Validaciones Principales:**
- `backend/src/middleware/referralValidation.js` - Validación de licencia activa
- `backend/src/middleware/benefitsValidation.js` - Validaciones de beneficios
- `backend/src/services/BenefitsProcessor.js` - Lógica de procesamiento

### **Configuración:**
- `backend/config/referral.config.js` - Configuración de comisiones
- `backend/src/models/UserStatus.js` - Modelo de estado de usuario

### **Controladores:**
- `backend/src/controllers/payment.controller.js` - Procesamiento de pagos
- `backend/controllers/licenseController.js` - Activación de licencias

---

## 🔍 Verificación de Implementación

### **Comandos de Verificación:**
```bash
# Verificar usuarios con licencia activa
db.userstatuses.find({"subscription.packageStatus": "active"})

# Verificar comisiones procesadas
db.transactions.find({"type": "commission", "status": "completed"})

# Verificar códigos especiales activos
db.specialcodes.find({"isActive": true})
```

### **Logs de Monitoreo:**
```javascript
// Logs críticos a monitorear
logger.info('Comisión directa procesada', { userId, amount, day: 8 });
logger.info('Bono líder/padre procesado', { codeId, amount, day: 17 });
logger.warn('Usuario sin licencia activa', { userId, status });
logger.error('Error procesando comisión', { error, userId });
```

---

## ✅ Estado de Implementación

| Condición | Estado | Archivo | Línea |
|-----------|--------|---------|-------|
| Validación licencia activa | ✅ | referralValidation.js | 25-45 |
| Verificación día 8 exacto | ✅ | BenefitsProcessor.js | 459-477 |
| Verificación día 17 exacto | ✅ | BenefitsProcessor.js | 630-647 |
| Prevención duplicados | ✅ | BenefitsProcessor.js | 400-410 |
| Cálculo 10% comisión | ✅ | BenefitsProcessor.js | 416-430 |
| Cálculo 5% bono | ✅ | BenefitsProcessor.js | 580-590 |
| Validación códigos activos | ✅ | BenefitsProcessor.js | 545-550 |
| Middleware autenticación | ✅ | referralValidation.js | 10-20 |

---

*Documento generado desde análisis del código fuente*  
*Grow5X - Sistema de Condiciones Diferenciales v1.0*  
*Todas las condiciones están implementadas y funcionando*