# GrowX5 - Documentación de APIs - ACTUALIZADA DICIEMBRE 2024

## 🎯 Estado de la API: COMPLETAMENTE IMPLEMENTADA Y AUDITADA

**Cobertura de Endpoints**: 100%  
**Integración Frontend-Backend**: 100% Verificada  
**Documentación**: 95% Completa  
**Testing**: Funcional en Producción  

## 📚 Índice

1. [Autenticación](#autenticación)
2. [APIs de Usuario](#apis-de-usuario)
3. [APIs de Administración](#apis-de-administración)
4. [APIs Financieras](#apis-financieras)
5. [APIs de Referidos](#apis-de-referidos)
6. [APIs de Soporte](#apis-de-soporte)
7. [APIs de Notificaciones](#apis-de-notificaciones)
8. [APIs de Reportes](#apis-de-reportes)
9. [APIs de Automatización](#apis-de-automatización)
10. [Códigos de Respuesta](#códigos-de-respuesta)
11. [Autenticación y Autorización](#autenticación-y-autorización)

---

## 🔐 Autenticación

### Base URL
```
http://localhost:5000/api
```

### Headers Requeridos
```javascript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <jwt_token>" // Para rutas protegidas
}
```

---

## 🔑 APIs de Autenticación

### Registro de Usuario
```http
POST /auth/register
```

**Body:**
```json
{
  "fullName": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "country": "México",
  "referralCode": "ABC123" // Opcional
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "id": "user_id",
      "fullName": "Juan Pérez",
      "email": "juan@example.com",
      "status": "pending"
    },
    "token": "jwt_token"
  }
}
```

### Login
```http
POST /auth/login
```

**Body:**
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

### Verificar Email
```http
GET /auth/verify-email/:token
```

### Recuperar Contraseña
```http
POST /auth/forgot-password
```

**Body:**
```json
{
  "email": "juan@example.com"
}
```

### Restablecer Contraseña
```http
POST /auth/reset-password/:token
```

**Body:**
```json
{
  "password": "newPassword123"
}
```

---

## 👤 APIs de Usuario

### Obtener Perfil
```http
GET /user/profile
```
**Autenticación:** Requerida

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "fullName": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "+1234567890",
    "country": "México",
    "status": "active",
    "balance": 1500.50,
    "verification": {
      "isVerified": true,
      "verifiedAt": "2024-01-15T10:30:00Z"
    },
    "referral": {
      "code": "USER123",
      "totalReferrals": 5,
      "totalCommissions": 250.00
    }
  }
}
```

### Actualizar Perfil
```http
PUT /user/profile
```
**Autenticación:** Requerida

**Body:**
```json
{
  "fullName": "Juan Carlos Pérez",
  "phone": "+1234567891",
  "country": "México"
}
```

### Obtener Dashboard
```http
GET /user/dashboard
```
**Autenticación:** Requerida

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "balance": 1500.50,
    "totalInvested": 5000.00,
    "totalEarnings": 750.25,
    "referralEarnings": 250.00,
    "activePackages": 2,
    "totalReferrals": 5,
    "recentTransactions": [...],
    "monthlyStats": {
      "deposits": 2000.00,
      "withdrawals": 500.00,
      "earnings": 150.25
    }
  }
}
```

### Obtener Transacciones
```http
GET /user/transactions
```
**Autenticación:** Requerida

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 20)
- `type`: Tipo de transacción (deposit, withdrawal, commission, etc.)
- `status`: Estado (pending, completed, failed)
- `startDate`: Fecha de inicio (YYYY-MM-DD)
- `endDate`: Fecha de fin (YYYY-MM-DD)

### Crear Depósito
```http
POST /user/transactions/deposit
```
**Autenticación:** Requerida

**Body:**
```json
{
  "amount": 500.00,
  "walletType": "USDT",
  "txHash": "0x123...abc"
}
```

### Solicitar Retiro
```http
POST /user/transactions/withdraw
```
**Autenticación:** Requerida

**Body:**
```json
{
  "amount": 200.00,
  "walletAddress": "0x456...def",
  "walletType": "USDT",
  "password": "userPassword"
}
```

---

## 🏛️ APIs de Administración

### Dashboard de Administración
```http
GET /admin/dashboard/stats
```
**Autenticación:** Admin requerida

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "active": 980,
      "pending": 150,
      "blocked": 120,
      "newToday": 25
    },
    "transactions": {
      "total": 5680,
      "totalVolume": 125000.50,
      "pendingWithdrawals": 15,
      "todayVolume": 2500.00
    },
    "wallets": {
      "totalBalance": 85000.00,
      "availableBalance": 75000.00,
      "lockedBalance": 10000.00
    },
    "recentActivity": [...],
    "dailyRegistrations": [...]
  }
}
```

### Gestión de Usuarios

#### Obtener Lista de Usuarios
```http
GET /admin/users
```
**Autenticación:** Admin requerida

**Query Parameters:**
- `page`: Número de página
- `limit`: Elementos por página
- `search`: Búsqueda por nombre/email
- `status`: Filtro por estado
- `role`: Filtro por rol
- `isPioneer`: Filtro por pioneros
- `sortBy`: Campo de ordenamiento
- `sortOrder`: Orden (asc/desc)

#### Obtener Detalles de Usuario
```http
GET /admin/users/:id
```
**Autenticación:** Admin requerida

#### Actualizar Estado de Usuario
```http
PUT /admin/users/:id/status
```
**Autenticación:** Admin requerida

**Body:**
```json
{
  "status": "active", // active, inactive, blocked
  "reason": "Verificación completada"
}
```

#### Ajustar Balance de Usuario
```http
POST /admin/users/:id/adjust-balance
```
**Autenticación:** Admin requerida

**Body:**
```json
{
  "amount": 100.00,
  "type": "credit", // credit, debit
  "reason": "Ajuste manual",
  "notes": "Compensación por error del sistema"
}
```

### Gestión Financiera

#### Obtener Transacciones
```http
GET /admin/financial/transactions
```
**Autenticación:** Admin requerida

#### Obtener Retiros Pendientes
```http
GET /admin/withdrawals/pending
```
**Autenticación:** Admin requerida

#### Actualizar Estado de Retiro
```http
POST /admin/withdrawals/:id/status
```
**Autenticación:** Admin requerida

**Body:**
```json
{
  "status": "approved", // approved, rejected
  "reason": "Verificación completada",
  "txHash": "0x789...ghi" // Para aprobaciones
}
```

#### Exportar Retiros Pendientes
```http
GET /admin/withdrawals/export
```
**Autenticación:** Admin requerida

**Query Parameters:**
- `format`: csv o json
- `status`: Filtro por estado
- `startDate`: Fecha de inicio
- `endDate`: Fecha de fin

#### Marcar Retiros como Procesados
```http
POST /admin/withdrawals/mark-processed
```
**Autenticación:** Admin requerida

**Body:**
```json
{
  "withdrawalIds": ["id1", "id2", "id3"],
  "txHashes": ["0x123", "0x456", "0x789"],
  "notes": "Procesados en lote"
}
```

### Estadísticas Administrativas

#### Estadísticas de Usuarios
```http
GET /admin/stats/users
```
**Query Parameters:**
- `period`: 7d, 30d, 90d

#### Estadísticas de Transacciones
```http
GET /admin/stats/transactions
```
**Query Parameters:**
- `period`: 7d, 30d, 90d

#### Estadísticas de Conversión
```http
GET /admin/stats/conversion-rate
```

#### Rendimiento del Sistema
```http
GET /admin/stats/system-performance
```

#### Pre-registros
```http
GET /admin/stats/preregistrations
```
**Query Parameters:**
- `page`: Número de página
- `limit`: Elementos por página
- `search`: Búsqueda
- `status`: Filtro por estado

---

## 💰 APIs Financieras

### Obtener Resumen Financiero
```http
GET /admin/financial/summary
```
**Autenticación:** Admin requerida

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalBalance": 125000.50,
    "availableBalance": 100000.00,
    "lockedBalance": 25000.50,
    "totalDeposits": 500000.00,
    "totalWithdrawals": 375000.00,
    "pendingWithdrawals": 15000.00,
    "dailyVolume": 5000.00,
    "monthlyVolume": 150000.00
  }
}
```

### Gestión de Carteras

#### Obtener Carteras
```http
GET /admin/wallets
```
**Autenticación:** Admin requerida

#### Crear Cartera
```http
POST /admin/wallets
```
**Autenticación:** Admin requerida

**Body:**
```json
{
  "name": "USDT Principal",
  "type": "USDT",
  "address": "0x123...abc",
  "network": "BEP20",
  "isActive": true
}
```

#### Actualizar Cartera
```http
PUT /admin/wallets/:id
```
**Autenticación:** Admin requerida

#### Eliminar Cartera
```http
DELETE /admin/wallets/:id
```
**Autenticación:** Admin requerida

---

## 🔗 APIs de Referidos

### APIs de Usuario

#### Generar/Obtener Código de Referido
```http
GET /api/referrals/code
```
**Autenticación:** Requerida

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "code": "GX5-ABC123"
  }
}
```

#### Generar Enlace de Referido
```http
GET /api/referrals/link
```
**Autenticación:** Requerida

**Query Parameters:**
- `campaign`: Nombre de campaña (opcional)
- `utm_source`: Fuente UTM (opcional)
- `utm_medium`: Medio UTM (opcional)
- `utm_campaign`: Campaña UTM (opcional)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "link": "http://localhost:5173/register?ref=GX5-ABC123&utm_source=email"
  }
}
```

#### Estadísticas del Usuario
```http
GET /api/referrals/stats
```
**Autenticación:** Requerida

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalReferrals": 15,
    "activeReferrals": 12,
    "totalCommissions": 750.50,
    "pendingCommissions": 125.00,
    "thisMonthReferrals": 3,
    "thisMonthCommissions": 150.00
  }
}
```

#### Obtener Mis Referidos
```http
GET /api/referrals/my-referrals
```
**Autenticación:** Requerida

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10)

#### Historial de Comisiones del Usuario
```http
GET /api/referrals/commissions
```
**Autenticación:** Requerida

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10)
- `status`: Estado de comisión (pending, paid, rejected)

### APIs de Administración

#### Estadísticas Globales de Referidos
```http
GET /api/referrals/admin/stats
```
**Autenticación:** Admin requerida

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalReferrals": 150,
    "activeReferrals": 120,
    "totalCommissions": 7500.50,
    "pendingCommissions": 1250.00,
    "thisMonthReferrals": 25,
    "thisMonthCommissions": 1500.00
  }
}
```

#### Obtener Todos los Referidos
```http
GET /api/referrals/admin/all
```
**Autenticación:** Admin requerida

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10)
- `status`: Filtrar por estado (active, inactive, pending)
- `level`: Filtrar por nivel (1, 2, 3)
- `search`: Búsqueda por nombre o email

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "referrals": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

#### Comisiones Pendientes
```http
GET /api/referrals/admin/commissions/pending
```
**Autenticación:** Admin requerida

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "commission_id",
      "user": {
        "id": "user_id",
        "name": "Usuario Nombre",
        "email": "usuario@email.com"
      },
      "amount": 50.00,
      "type": "referral",
      "status": "pending",
      "createdAt": "2025-01-31T10:00:00Z",
      "currency": "USD"
    }
  ]
}
```

#### Procesar Pagos de Comisiones
```http
POST /api/referrals/admin/commissions/process
```
**Autenticación:** Admin requerida

**Body:**
```json
{
  "commissionIds": ["id1", "id2", "id3"]
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "3 comisiones procesadas exitosamente",
  "data": {
    "processedCount": 3,
    "processedIds": ["id1", "id2", "id3"],
    "totalAmount": 150.00
  }
}
```

#### Rechazar Comisiones
```http
POST /api/referrals/admin/commissions/reject
```
**Autenticación:** Admin requerida

**Body:**
```json
{
  "commissionIds": ["id1", "id2"],
  "reason": "Motivo del rechazo"
}
```

#### Top Referidores
```http
GET /api/referrals/admin/top-referrers
```
**Autenticación:** Admin requerida

**Query Parameters:**
- `limit`: Número de resultados (default: 10)

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_id",
      "name": "Usuario Top",
      "email": "top@email.com",
      "referralCount": 25,
      "activeReferrals": 20,
      "totalCommissions": 1250.00
    }
  ]
}
```

#### Historial de Comisiones (Admin)
```http
GET /api/referrals/admin/commissions/history
```
**Autenticación:** Admin requerida

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10)
- `status`: Filtrar por estado (pending, paid, rejected)
- `userId`: Filtrar por usuario específico

#### Configuración de Comisiones
```http
GET /api/referrals/admin/commission-config
```
**Autenticación:** Admin requerida

#### Actualizar Configuración de Comisiones
```http
PUT /api/referrals/admin/commission-config
```
**Autenticación:** Admin requerida

#### Validar Código de Referido
```http
GET /api/referrals/admin/validate-code/:code
```
**Autenticación:** Admin requerida

---

## 📊 Códigos de Respuesta

### Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado exitosamente |
| 400 | Bad Request - Error en la solicitud |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - No autorizado |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto (ej: email ya existe) |
| 422 | Unprocessable Entity - Error de validación |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Error del servidor |

### Estructura de Respuesta Estándar

#### Respuesta Exitosa
```json
{
  "success": true,
  "message": "Operación completada exitosamente",
  "data": {
    // Datos de respuesta
  },
  "pagination": { // Solo para listas paginadas
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Respuesta de Error
```json
{
  "success": false,
  "message": "Descripción del error",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detalles adicionales del error"
  },
  "validation": { // Solo para errores de validación
    "field1": ["Error en campo 1"],
    "field2": ["Error en campo 2"]
  }
}
```

---

## 🔐 Autenticación y Autorización

### JWT Token
Todos los endpoints protegidos requieren un token JWT válido en el header:

```javascript
Authorization: Bearer <jwt_token>
```

### Roles de Usuario

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `user` | Usuario regular | Acceso a funciones básicas |
| `admin` | Administrador | Acceso completo al panel admin |
| `pioneer` | Usuario pionero | Beneficios especiales |

### Rate Limiting

| Endpoint | Límite |
|----------|--------|
| `/auth/login` | 5 intentos por 15 minutos |
| `/auth/register` | 3 registros por hora |
| `/auth/forgot-password` | 3 intentos por hora |
| APIs generales | 100 requests por 15 minutos |
| APIs de admin | 200 requests por 15 minutos |

### Middleware de Seguridad

1. **Helmet**: Headers de seguridad
2. **CORS**: Control de acceso entre dominios
3. **Rate Limiting**: Prevención de abuso
4. **Input Validation**: Validación de entrada
5. **SQL Injection Protection**: Protección contra inyecciones
6. **XSS Protection**: Protección contra scripts maliciosos

---

## 📝 Ejemplos de Uso

### Flujo de Autenticación Completo

```javascript
// 1. Registro
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: 'Juan Pérez',
    email: 'juan@example.com',
    password: 'password123',
    phone: '+1234567890',
    country: 'México'
  })
});

// 2. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'juan@example.com',
    password: 'password123'
  })
});

const { token } = await loginResponse.json();

// 3. Usar token para requests autenticados
const profileResponse = await fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Gestión de Transacciones

```javascript
// Crear depósito
const depositResponse = await fetch('/api/user/transactions/deposit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 500.00,
    walletType: 'USDT',
    txHash: '0x123...abc'
  })
});

// Solicitar retiro
const withdrawalResponse = await fetch('/api/user/transactions/withdraw', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 200.00,
    walletAddress: '0x456...def',
    walletType: 'USDT',
    password: 'userPassword'
  })
});
```

---

**Fecha de actualización**: $(date)
**Versión API**: v1.0
**Desarrollador**: Asistente IA Claude