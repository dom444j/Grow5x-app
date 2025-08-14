# Guía de API Admin Modular

## Descripción General

Esta guía documenta las nuevas rutas modulares del sistema de administración, disponibles bajo el prefijo `/admin/v2`. Estas rutas proporcionan una interfaz más organizada y mantenible para las operaciones administrativas.

## Base URL

Todas las rutas modulares están disponibles bajo:
```
BASE_URL/admin/v2
```

## Autenticación

Todas las rutas requieren:
- **Token de autenticación** en el header `Authorization: Bearer <token>`
- **Permisos de administrador** (role: 'admin')
- **Rate limiting** aplicado (100 requests por 15 minutos por IP)

## Módulos Disponibles

### 1. Gestión de Usuarios (`/users`)

#### Obtener lista de usuarios
```http
GET /admin/v2/users
```

**Query Parameters:**
- `page` (number, default: 1) - Página actual
- `limit` (number, default: 20, max: 100) - Elementos por página
- `status` (string) - Filtrar por estado: 'active', 'inactive', 'suspended', 'blocked'
- `role` (string) - Filtrar por rol
- `search` (string) - Buscar por email, username o nombre
- `dateFrom` (string, ISO date) - Fecha de inicio
- `dateTo` (string, ISO date) - Fecha de fin
- `sortBy` (string, default: 'createdAt') - Campo para ordenar
- `sortOrder` (string, default: 'desc') - Orden: 'asc' o 'desc'

**Respuesta:**
```json
{
  "success": true,
  "message": "Usuarios obtenidos exitosamente",
  "data": [
    {
      "_id": "user_id",
      "username": "usuario123",
      "email": "usuario@email.com",
      "status": "active",
      "role": "user",
      "balances": {
        "available": 1000.50,
        "pending": 50.00
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastLogin": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 200,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Obtener detalles de usuario
```http
GET /admin/v2/users/:userId
```

**Validaciones:**
- `userId` debe ser un ObjectId válido de MongoDB

#### Actualizar estado de usuario
```http
PUT /admin/v2/users/:userId/status
```

**Body:**
```json
{
  "status": "suspended",
  "reason": "Actividad sospechosa detectada"
}
```

**Validaciones:**
- `status` (required): 'active', 'inactive', 'suspended', 'blocked'
- `reason` (optional): string, motivo del cambio

#### Ajustar balance de usuario
```http
PUT /admin/v2/users/:userId/balance
```

**Body:**
```json
{
  "amount": 100.50,
  "type": "add",
  "reason": "Compensación por error del sistema"
}
```

**Validaciones:**
- `amount` (required): number, monto a ajustar
- `type` (required): 'add', 'subtract', 'set'
- `reason` (required): string, motivo del ajuste

### 2. Gestión de Pagos (`/payments`)

#### Obtener pagos pendientes y beneficios
```http
GET /admin/v2/payments/pending
```

**Query Parameters:**
- `page`, `limit` - Paginación estándar
- `type` (string) - Tipo de pago
- `status` (string) - Estado del pago
- `dateFrom`, `dateTo` - Filtros de fecha

#### Forzar activación de beneficio
```http
POST /admin/v2/payments/force-benefit
```

**Body:**
```json
{
  "transactionId": "transaction_id",
  "reason": "Activación manual por soporte"
}
```

#### Unificar duplicados por hash de transacción
```http
POST /admin/v2/payments/unify-duplicates
```

**Body:**
```json
{
  "txHash": "0x1234567890abcdef",
  "canonicalId": "payment_id",
  "reason": "Unificación de pagos duplicados"
}
```

### 3. Gestión de Transacciones (`/transactions`)

#### Obtener todas las transacciones
```http
GET /admin/v2/transactions
```

**Query Parameters:**
- Paginación estándar
- `status` - Estado de transacción
- `type` - Tipo de transacción
- `userId` - Filtrar por usuario
- `amountMin`, `amountMax` - Rango de montos
- Filtros de fecha

#### Obtener detalles de transacción
```http
GET /admin/v2/transactions/:transactionId
```

#### Actualizar estado de transacción
```http
PUT /admin/v2/transactions/:transactionId/status
```

**Body:**
```json
{
  "status": "completed",
  "reason": "Verificación manual completada"
}
```

#### Crear transacción manual
```http
POST /admin/v2/transactions
```

**Body:**
```json
{
  "userId": "user_id",
  "amount": 500.00,
  "type": "deposit",
  "description": "Depósito manual",
  "reference": "REF123456"
}
```

### 4. Gestión de Retiros (`/withdrawals`)

#### Obtener todos los retiros
```http
GET /admin/v2/withdrawals
```

#### Obtener detalles de retiro
```http
GET /admin/v2/withdrawals/:withdrawalId
```

#### Aprobar retiro
```http
PUT /admin/v2/withdrawals/:withdrawalId/approve
```

**Body:**
```json
{
  "notes": "Retiro aprobado después de verificación"
}
```

#### Rechazar retiro
```http
PUT /admin/v2/withdrawals/:withdrawalId/reject
```

**Body:**
```json
{
  "reason": "Documentación insuficiente",
  "notes": "Se requiere verificación adicional"
}
```

#### Completar retiro
```http
PUT /admin/v2/withdrawals/:withdrawalId/complete
```

**Body:**
```json
{
  "txHash": "0x1234567890abcdef",
  "notes": "Retiro procesado exitosamente"
}
```

### 5. Configuración del Sistema (`/system`)

#### Obtener configuración del sistema
```http
GET /admin/v2/system/config
```

#### Actualizar configuración del sistema
```http
PUT /admin/v2/system/config
```

**Body:**
```json
{
  "maintenanceMode": false,
  "registrationEnabled": true,
  "limits": {
    "minWithdrawal": 10,
    "maxWithdrawal": 10000,
    "minDeposit": 1,
    "maxDeposit": 50000
  },
  "fees": {
    "withdrawalPercentage": 2.5,
    "withdrawalFixed": 1.0
  }
}
```

#### Activar/Desactivar modo mantenimiento
```http
PUT /admin/v2/system/maintenance
```

**Body:**
```json
{
  "enabled": true,
  "message": "Sistema en mantenimiento programado",
  "estimatedDuration": 120
}
```

#### Actualizar límites del sistema
```http
PUT /admin/v2/system/limits
```

#### Actualizar tarifas del sistema
```http
PUT /admin/v2/system/fees
```

#### Activar/Desactivar característica del sistema
```http
PUT /admin/v2/system/features/:featureName
```

### 6. Gestión de Seguridad (`/security`)

#### Obtener logs de administrador
```http
GET /admin/v2/security/admin-logs
```

**Query Parameters:**
- Paginación estándar
- `adminId` - Filtrar por administrador
- `action` - Filtrar por acción
- `targetType` - Filtrar por tipo de objetivo
- `severity` - Filtrar por severidad
- Filtros de fecha

#### Obtener eventos de seguridad
```http
GET /admin/v2/security/events
```

#### Obtener intentos de login
```http
GET /admin/v2/security/login-attempts
```

#### Bloquear usuario por seguridad
```http
POST /admin/v2/security/block-user
```

**Body:**
```json
{
  "userId": "user_id",
  "reason": "Actividad sospechosa detectada",
  "duration": 24
}
```

#### Desbloquear usuario
```http
POST /admin/v2/security/unblock-user
```

**Body:**
```json
{
  "userId": "user_id",
  "reason": "Revisión completada, usuario verificado"
}
```

#### Limpiar logs antiguos
```http
POST /admin/v2/security/clean-logs
```

**Body:**
```json
{
  "olderThanDays": 90,
  "logTypes": ["admin_logs", "security_events"]
}
```

## Información del Módulo

#### Obtener información del módulo admin
```http
GET /admin/v2/info
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "module": "admin",
    "version": "2.0.0",
    "description": "Módulo de administración refactorizado",
    "availableEndpoints": [
      "/users",
      "/payments",
      "/transactions",
      "/withdrawals",
      "/system",
      "/security"
    ],
    "features": [
      "Gestión modular de usuarios",
      "Control de pagos y transacciones",
      "Configuración del sistema",
      "Monitoreo de seguridad",
      "Logging centralizado",
      "Validaciones estandarizadas"
    ]
  }
}
```

## Códigos de Respuesta

- **200 OK** - Operación exitosa
- **201 Created** - Recurso creado exitosamente
- **400 Bad Request** - Datos de entrada inválidos
- **401 Unauthorized** - Token de autenticación inválido o faltante
- **403 Forbidden** - Permisos insuficientes
- **404 Not Found** - Recurso no encontrado
- **422 Unprocessable Entity** - Errores de validación
- **429 Too Many Requests** - Rate limit excedido
- **500 Internal Server Error** - Error interno del servidor

## Formato de Errores

```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": [
    {
      "field": "campo_con_error",
      "message": "Descripción específica del error",
      "code": "ERROR_CODE"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Ejemplos de Uso

### JavaScript/Node.js

```javascript
const axios = require('axios');

const adminAPI = axios.create({
  baseURL: 'http://localhost:3000/admin/v2',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }
});

// Obtener usuarios
const users = await adminAPI.get('/users', {
  params: {
    page: 1,
    limit: 50,
    status: 'active'
  }
});

// Actualizar estado de usuario
const updateStatus = await adminAPI.put('/users/USER_ID/status', {
  status: 'suspended',
  reason: 'Violación de términos de servicio'
});

// Aprobar retiro
const approveWithdrawal = await adminAPI.put('/withdrawals/WITHDRAWAL_ID/approve', {
  notes: 'Documentación verificada correctamente'
});
```

### cURL

```bash
# Obtener lista de usuarios
curl -X GET "http://localhost:3000/admin/v2/users?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Actualizar configuración del sistema
curl -X PUT "http://localhost:3000/admin/v2/system/config" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "maintenanceMode": false,
    "registrationEnabled": true
  }'

# Obtener logs de seguridad
curl -X GET "http://localhost:3000/admin/v2/security/admin-logs?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Notas Importantes

1. **Compatibilidad**: Las rutas originales (`/admin/*`) siguen funcionando para mantener compatibilidad hacia atrás.

2. **Rate Limiting**: Todas las rutas tienen rate limiting aplicado. Si se excede el límite, se recibirá un error 429.

3. **Logging**: Todas las acciones administrativas se registran automáticamente en los logs del sistema.

4. **Validaciones**: Todas las entradas se validan usando express-validator. Los errores de validación se devuelven en formato estándar.

5. **Paginación**: La paginación está limitada a un máximo de 100 elementos por página para optimizar el rendimiento.

6. **Filtros de Fecha**: Las fechas deben estar en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ).

7. **ObjectIds**: Todos los IDs de MongoDB se validan automáticamente antes del procesamiento.

Esta API modular proporciona una interfaz más robusta y mantenible para las operaciones administrativas, con mejor organización, validaciones mejoradas y logging centralizado.