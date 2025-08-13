# MAPEO COMPLETO DE CONEXIONES FINANCIERAS - GROWX5

## 📋 RESUMEN EJECUTIVO

Este documento mapea todas las conexiones financieras del sistema GrowX5, incluyendo comisiones reales, gestión de usuarios y administradores, backend y tablas de datos reales.

---

## 🏗️ ARQUITECTURA FINANCIERA

### 1. MODELOS DE DATOS PRINCIPALES

#### 📊 Transaction.model.js
```javascript
// Estructura principal de transacciones
{
  userId: ObjectId,
  type: ['deposit', 'withdrawal', 'earning', 'commission'],
  subtype: String, // Específico para comisiones: 'direct', 'leader_bonus', 'parent_bonus'
  amount: Number,
  currency: String,
  status: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
  paymentDetails: {
    method: String,
    transactionHash: String,
    walletAddress: String,
    network: String
  },
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

#### 💰 Commission.model.js
```javascript
// Estructura de comisiones
{
  userId: ObjectId, // Usuario que recibe la comisión
  referredUserId: ObjectId, // Usuario referido
  transactionId: ObjectId, // Transacción relacionada
  type: ['direct', 'leader_bonus', 'parent_bonus'],
  amount: Number,
  currency: String,
  percentage: Number,
  status: ['pending', 'approved', 'paid'],
  weekNumber: Number, // 1 o 2 para timing de pagos
  isReinvestment: Boolean,
  processedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### 🏦 Wallet.model.js
```javascript
// Estructura de billeteras
{
  userId: ObjectId,
  address: String,
  network: String,
  currency: String,
  type: ['main', 'production'],
  balance: {
    available: Number,
    pending: Number,
    total: Number
  },
  isActive: Boolean,
  lastTransactionAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### 📤 WithdrawalRequest.js
```javascript
// Estructura de solicitudes de retiro
{
  userId: ObjectId,
  amount: Number,
  currency: String,
  status: ['pending', 'processing', 'completed', 'cancelled', 'failed'],
  withdrawalMethod: ['crypto', 'bank_transfer', 'card'],
  destinationAddress: String, // Para crypto
  network: String,
  bankDetails: Object,
  transactionHash: String,
  fee: Number,
  netAmount: Number,
  reason: String,
  adminNotes: String,
  processedBy: ObjectId,
  processedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  failedAt: Date,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔄 FLUJO DE COMISIONES

### 1. PROCESAMIENTO AUTOMÁTICO

#### 📁 BenefitsProcessor.js
- **Función Principal**: `processDailyBenefits()`
- **Timing**: Ejecuta diariamente
- **Lógica**:
  - Día 8: Pago de comisión directa (10%)
  - Día 17: Pago de bonos líder (3%) y padre (5%)
  - Validación de duplicados
  - Actualización de balances

#### 🔧 Funciones Auxiliares
```javascript
// Validaciones implementadas
hasUserCompletedFullCashback(userId)
getUserTotalCashback(userId)
hasUserCompletedSecondCycle(userId)
getUserTotalLicensesAmount(userId)
```

### 2. GESTIÓN MANUAL (ADMIN)

#### 📋 admin.controller.js
```javascript
// Funciones administrativas
getPendingCommissions() // Obtener comisiones pendientes
processCommissionPayments(commissionIds) // Procesar pagos manualmente
```

---

## 🌐 CONEXIONES FRONTEND-BACKEND

### 1. SERVICIOS DE FRONTEND

#### 💼 finance.service.js
- `getFinancialSummary(userId)` → `/finance/users/${userId}/summary`
- `getUserWallets(userId)` → `/finance/users/${userId}/wallets`
- `getTransactionHistory(userId)` → `/finance/users/${userId}/transactions`
- `createWithdrawalRequest(userId, data)` → `/finance/users/${userId}/withdrawals`

#### 📊 adminFinancial.service.js
- `getFinancialSummary()` → `/admin/financial/summary`
- `getPendingWithdrawals()` → `/admin/financial/withdrawals/pending`
- `processWithdrawal(withdrawalId, action)` → `/admin/financial/withdrawals/${withdrawalId}/process`

---

## 🆕 NUEVAS FUNCIONALIDADES IMPLEMENTADAS (2025)

### 1. TABLA DE TRANSACCIONES RECIENTES CON DATOS REALES

#### 📋 Características Implementadas
- **Ubicación**: `frontend/src/pages/user/finance/FinancePage.jsx`
- **Datos Reales**: Conectada a la API `/finance/users/${userId}/transactions`
- **Funcionalidades**:
  - Muestra transacciones reales del usuario
  - Filtrado por tipo de transacción
  - Paginación automática
  - Estados de transacción en tiempo real
  - Formato de moneda y fechas

#### 🔧 Estructura de Datos
```javascript
// Respuesta de la API
{
  transactions: [
    {
      _id: "transaction_id",
      type: "earning|commission|withdrawal|deposit",
      subtype: "auto_earnings|referral_commission|direct_commission",
      amount: 150.00,
      currency: "USDT",
      status: "completed|pending|failed",
      description: "Descripción de la transacción",
      createdAt: "2025-01-31T10:30:00Z",
      metadata: {
        source: "system|manual|api",
        reference: "ref_id"
      }
    }
  ],
  pagination: {
    currentPage: 1,
    totalPages: 5,
    totalTransactions: 47,
    hasMore: true
  }
}
```

#### 🎨 Componentes UI
- **TransactionCard**: Tarjeta individual de transacción
- **TransactionFilters**: Filtros por tipo y estado
- **LoadingStates**: Estados de carga y error
- **EmptyState**: Estado cuando no hay transacciones

### 2. MODAL DE RETIRO FUNCIONAL

#### 💸 Características del Modal
- **Ubicación**: `frontend/src/pages/user/finance/FinancePage.jsx`
- **Validaciones Implementadas**:
  - Verificación de balance disponible
  - Monto mínimo de retiro ($50 USDT)
  - Validación de dirección de wallet
  - Verificación de red blockchain

#### 🔄 Flujo de Solicitud de Retiro
```javascript
// Proceso completo implementado
1. Usuario abre modal de retiro
2. Selecciona método de retiro (crypto/bank/card)
3. Ingresa monto y dirección de destino
4. Sistema valida:
   - Balance suficiente
   - Monto mínimo
   - Formato de dirección
5. Crea solicitud en base de datos
6. Notifica al admin para aprobación
7. Actualiza balance del usuario
```

#### 📡 API Endpoint Implementado
```javascript
// POST /api/finance/users/:userId/withdrawals
{
  amount: 100.00,
  currency: "USDT",
  withdrawalMethod: "crypto",
  destinationAddress: "0x742d35Cc6634C0532925a3b8D4C9db4C4C4b4C4C",
  network: "BSC",
  fee: 5.00,
  netAmount: 95.00
}
```

#### ✅ Validaciones del Backend
- **Permisos**: Verificación de usuario autenticado
- **Balance**: Verificación de fondos suficientes
- **Límites**: Monto mínimo y máximo
- **Formato**: Validación de dirección de wallet
- **Duplicados**: Prevención de solicitudes duplicadas

### 3. GESTIÓN ADMINISTRATIVA DE RETIROS

#### 🔧 Panel de Administración
- **Vista**: Solicitudes de retiro pendientes
- **Acciones**: Aprobar, rechazar, procesar
- **Seguimiento**: Estado de cada solicitud
- **Notificaciones**: Alertas de nuevas solicitudes

#### 📊 Estados de Solicitudes
- **pending**: Solicitud creada, esperando revisión
- **processing**: En proceso de verificación
- **completed**: Retiro completado exitosamente
- **cancelled**: Cancelado por admin o usuario
- **failed**: Falló el procesamiento

### 4. DATOS DE PRUEBA GENERADOS

#### 🧪 Scripts de Datos Implementados
- **`seed-transactions.js`**: Genera 300 transacciones de prueba
  - 150 transacciones de compra de licencias
  - 50 transacciones de comisión
  - 100 transacciones de ganancias automáticas

- **`update-user-balances.js`**: Actualiza balances de usuarios
  - Calcula balances basados en transacciones
  - Genera solicitudes de retiro de prueba
  - Actualiza estadísticas financieras

#### 📈 Estadísticas Generadas
- **Usuarios con Balance**: 6 usuarios activos
- **Solicitudes de Retiro**: 3 solicitudes de prueba
- **Transacciones Totales**: 300+ transacciones
- **Balance Total del Sistema**: $15,000+ USDT
- `getAllTransactions()` → `/admin/financial/transactions`
- `getPendingWithdrawals()` → `/admin/financial/withdrawals/pending`
- `approveWithdrawal(id)` → `/admin/financial/withdrawals/${id}/approve`

#### 🎯 adminReferrals.service.js
- `getPendingCommissions()` → `/admin/referrals/commissions/pending`
- `processCommissionPayment(ids)` → `/admin/referrals/commissions/process`
- `getCommissionHistory()` → `/admin/referrals/commissions/history`

### 2. RUTAS DE BACKEND

#### 💰 finance.routes.js
```javascript
// Rutas principales de finanzas
GET /finance/users/:userId/summary
GET /finance/users/:userId/wallets
GET /finance/users/:userId/transactions
POST /finance/users/:userId/withdrawals
```

#### 🔗 referral.routes.js
```javascript
// Rutas de comisiones
GET /referrals/commissions
GET /referrals/commissions/history
POST /referrals/commissions/calculate
POST /referrals/commissions/process
```

#### 🛠️ payment.routes.js
```javascript
// Rutas de pagos
GET /payments/plans
POST /payments/process
GET /payments/status/:id
POST /payments/verify/:id
```

---

## 👥 GESTIÓN DE USUARIOS Y ADMINISTRADORES

### 1. PANEL DE USUARIO

#### 📱 ReferralDashboard.jsx
- **Estadísticas de referidos**
- **Lista de comisiones** (CommissionList.jsx)
- **Historial de transacciones**
- **Solicitudes de retiro**

#### 💳 Componentes Financieros
- `FinancialSummary`: Resumen de balance
- `TransactionHistory`: Historial completo
- `WithdrawalRequests`: Gestión de retiros

### 2. PANEL DE ADMINISTRACIÓN

#### 🏢 FinanceManagement.jsx
- **Gestión de transacciones**
- **Aprobación de retiros**
- **Estadísticas financieras**
- **Exportación de reportes**

#### 🏦 WalletManagement.jsx
- **Gestión de billeteras**
- **Generación de QR codes**
- **Monitoreo de transacciones**

#### 📈 TransactionHistory.jsx
- **Historial completo de transacciones**
- **Filtros avanzados**
- **Verificación manual**

---

## 🔐 SEGURIDAD Y VALIDACIONES

### 1. VALIDACIONES DE BACKEND

#### 🛡️ validation.js
- Validación de montos de retiro
- Verificación de direcciones de wallet
- Límites de transacciones
- Validación de PIN de retiro

#### 🔍 helpers.js
- Validación de direcciones BEP20
- Verificación de duplicados
- Cálculos de comisiones

### 2. AUTENTICACIÓN

#### 👤 Usuario
- JWT tokens para autenticación
- Verificación de PIN para retiros
- Límites de retiro por usuario

#### 👨‍💼 Administrador
- Tokens de administrador separados
- Registro de acciones administrativas
- Permisos granulares

---

## 📊 REPORTES Y ESTADÍSTICAS

### 1. MÉTRICAS DE USUARIO

#### 💹 Estadísticas Financieras
- Balance total y disponible
- Historial de transacciones
- Comisiones ganadas por tipo
- Retiros pendientes y completados

#### 🎯 Estadísticas de Referidos
- Total de referidos directos/indirectos
- Tasa de conversión
- Comisiones por semana
- Estado de pagos

### 2. MÉTRICAS ADMINISTRATIVAS

#### 📈 Dashboard Financiero
- Resumen consolidado de finanzas
- Transacciones pendientes
- Retiros por aprobar
- Estadísticas de comisiones

#### 📋 Reportes Exportables
- Transacciones por período
- Comisiones procesadas
- Estados de retiro
- Actividad de usuarios

---

## 🔄 AUTOMATIZACIÓN

### 1. PROCESOS AUTOMÁTICOS

#### ⏰ Cron Jobs
- Procesamiento diario de beneficios
- Cálculo automático de comisiones
- Verificación de transacciones blockchain
- Limpieza de datos temporales

#### 🔔 Notificaciones
- WebSocket para actualizaciones en tiempo real
- Notificaciones de Telegram
- Emails de confirmación
- Alertas administrativas

### 2. INTEGRACIONES

#### 🌐 Blockchain
- Verificación de transacciones BEP20
- Monitoreo de direcciones de wallet
- Confirmación automática de pagos

#### 📧 Comunicaciones
- Templates de email
- Notificaciones push
- Mensajes de Telegram

---

## 🚀 PRÓXIMOS PASOS

### 1. MEJORAS INMEDIATAS
- [ ] Implementar cache para consultas frecuentes
- [ ] Optimizar queries de base de datos
- [ ] Añadir más validaciones de seguridad
- [ ] Mejorar logging y monitoreo

### 2. FUNCIONALIDADES FUTURAS
- [ ] Dashboard en tiempo real
- [ ] API para terceros
- [ ] Integración con más redes blockchain
- [ ] Sistema de alertas avanzado

---

## 📝 NOTAS TÉCNICAS

### Estado Actual
- ✅ Sistema de comisiones corregido y funcional
- ✅ Validaciones de duplicados implementadas
- ✅ Timing de pagos corregido
- ✅ Funciones auxiliares añadidas
- ✅ Documentación unificada

### Archivos Clave Modificados
- `backend/src/services/BenefitsProcessor.js`
- `backend/src/controllers/commissions.controller.js`
- `optimizacion/LOGICA-SISTEMA-COMISIONES.md`

---

*Documento generado el: $(date)*
*Versión: 1.0*
*Estado: Completo y Actualizado*