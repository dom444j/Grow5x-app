# 📡 API FINANCIERA - GROWX5

**Versión:** 1.1.0  
**Fecha:** 31 de Enero, 2025  
**Base URL:** `/api/finance` y `/api/payments`  

---

## 🎯 RESUMEN DE LA API

La API Financiera de GrowX5 proporciona endpoints seguros para la gestión de transacciones, balances, wallets, solicitudes de retiro y métodos de pago de los usuarios.

### 🔐 Autenticación
Todos los endpoints requieren autenticación mediante JWT token:
```javascript
Headers: {
  'Authorization': 'Bearer <jwt_token>',
  'Content-Type': 'application/json'
}
```

---

## 📊 ENDPOINTS DE USUARIO

### 1. Resumen Financiero del Usuario

#### `GET /api/finance/users/:userId/summary`

**Descripción**: Obtiene el resumen financiero completo del usuario.

**Parámetros**:
- `userId` (string): ID del usuario

**Respuesta Exitosa** (200):
```json
{
  "success": true,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "balance": {
      "available": 1250.75,
      "pending": 100.00,
      "total": 1350.75
    },
    "currency": "USDT",
    "totalEarnings": 2500.50,
    "totalWithdrawals": 1149.75,
    "totalCommissions": 450.25,
    "pendingWithdrawals": 1,
    "lastTransactionDate": "2025-01-31T10:30:00Z",
    "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db4C4C4b4C4C",
    "statistics": {
      "transactionsThisMonth": 15,
      "earningsThisMonth": 450.00,
      "withdrawalsThisMonth": 200.00
    }
  }
}
```

**Errores**:
- `401`: Token inválido o expirado
- `403`: Acceso denegado (usuario no autorizado)
- `404`: Usuario no encontrado
- `500`: Error interno del servidor

---

### 2. Historial de Transacciones

#### `GET /api/finance/users/:userId/transactions`

**Descripción**: Obtiene el historial de transacciones del usuario con paginación.

**Parámetros de Query**:
- `page` (number, opcional): Página actual (default: 1)
- `limit` (number, opcional): Elementos por página (default: 20, max: 100)
- `type` (string, opcional): Filtrar por tipo (`earning`, `commission`, `withdrawal`, `deposit`)
- `status` (string, opcional): Filtrar por estado (`pending`, `completed`, `failed`, `cancelled`)
- `startDate` (string, opcional): Fecha de inicio (ISO 8601)
- `endDate` (string, opcional): Fecha de fin (ISO 8601)

**Ejemplo de Request**:
```
GET /api/finance/users/507f1f77bcf86cd799439011/transactions?page=1&limit=10&type=earning&status=completed
```

**Respuesta Exitosa** (200):
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "type": "earning",
        "subtype": "auto_earnings",
        "amount": 150.00,
        "currency": "USDT",
        "status": "completed",
        "description": "Ganancia automática del sistema",
        "createdAt": "2025-01-31T10:30:00Z",
        "updatedAt": "2025-01-31T10:30:00Z",
        "metadata": {
          "source": "system",
          "reference": "auto_earning_daily",
          "packageId": "507f1f77bcf86cd799439013"
        }
      },
      {
        "_id": "507f1f77bcf86cd799439014",
        "type": "commission",
        "subtype": "referral_commission",
        "amount": 75.50,
        "currency": "USDT",
        "status": "completed",
        "description": "Comisión por referido directo",
        "createdAt": "2025-01-30T15:20:00Z",
        "updatedAt": "2025-01-30T15:20:00Z",
        "metadata": {
          "source": "referral",
          "referredUserId": "507f1f77bcf86cd799439015",
          "commissionRate": 0.10
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalTransactions": 47,
      "hasMore": true,
      "limit": 10
    },
    "summary": {
      "totalAmount": 2250.75,
      "transactionCount": 47,
      "averageAmount": 47.89
    }
  }
}
```

---

### 3. Información de Wallets

#### `GET /api/finance/users/:userId/wallets`

**Descripción**: Obtiene información de las wallets del usuario.

**Respuesta Exitosa** (200):
```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "_id": "507f1f77bcf86cd799439016",
        "address": "0x742d35Cc6634C0532925a3b8D4C9db4C4C4b4C4C",
        "network": "BSC",
        "currency": "USDT",
        "type": "main",
        "balance": {
          "available": 1250.75,
          "pending": 100.00,
          "total": 1350.75
        },
        "isActive": true,
        "lastTransactionAt": "2025-01-31T10:30:00Z",
        "createdAt": "2025-01-15T08:00:00Z"
      }
    ],
    "totalBalance": 1350.75,
    "mainWallet": "0x742d35Cc6634C0532925a3b8D4C9db4C4C4b4C4C"
  }
}
```

---

### 4. Crear Solicitud de Retiro

#### `POST /api/finance/users/:userId/withdrawals`

**Descripción**: Crea una nueva solicitud de retiro.

**Body Parameters**:
```json
{
  "amount": 100.00,
  "currency": "USDT",
  "withdrawalMethod": "crypto",
  "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db4C4C4b4C4C",
  "network": "BSC",
  "bankDetails": {
    "bankName": "Banco Nacional",
    "accountNumber": "1234567890",
    "accountHolder": "Juan Pérez"
  }
}
```

**Validaciones**:
- `amount`: Número positivo, mínimo $50 USDT
- `currency`: Debe ser "USDT"
- `withdrawalMethod`: "crypto", "bank_transfer", o "card"
- `destinationAddress`: Requerido si method es "crypto"
- `network`: Requerido si method es "crypto"
- `bankDetails`: Requerido si method es "bank_transfer"

**Respuesta Exitosa** (201):
```json
{
  "success": true,
  "message": "Solicitud de retiro creada exitosamente",
  "data": {
    "withdrawalRequest": {
      "id": "507f1f77bcf86cd799439017",
      "amount": 100.00,
      "currency": "USDT",
      "withdrawalMethod": "crypto",
      "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db4C4C4b4C4C",
      "network": "BSC",
      "fee": 5.00,
      "netAmount": 95.00,
      "status": "pending",
      "createdAt": "2025-01-31T11:00:00Z",
      "estimatedProcessingTime": "24-48 horas"
    },
    "updatedBalance": {
      "available": 1150.75,
      "pending": 200.00,
      "total": 1350.75
    }
  }
}
```

**Errores**:
- `400`: Datos inválidos o balance insuficiente
- `401`: Token inválido
- `403`: Acceso denegado
- `409`: Solicitud duplicada (muy reciente)
- `500`: Error interno

**Ejemplos de Errores**:
```json
{
  "success": false,
  "error": "Balance insuficiente",
  "details": {
    "requested": 100.00,
    "available": 75.50,
    "currency": "USDT"
  }
}
```

---

## 🔧 ENDPOINTS ADMINISTRATIVOS

### 1. Resumen Financiero Global

#### `GET /api/admin/financial/summary`

**Descripción**: Obtiene estadísticas financieras globales del sistema.

**Permisos**: Solo administradores

**Respuesta Exitosa** (200):
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "activeUsers": 890,
    "totalBalance": 125000.75,
    "totalEarnings": 250000.50,
    "totalWithdrawals": 124999.25,
    "pendingWithdrawals": {
      "count": 15,
      "totalAmount": 5500.00
    },
    "transactionsToday": 45,
    "withdrawalsToday": 8,
    "systemHealth": {
      "status": "healthy",
      "lastUpdate": "2025-01-31T11:00:00Z"
    }
  }
}
```

### 2. Solicitudes de Retiro Pendientes

#### `GET /api/admin/financial/withdrawals/pending`

**Descripción**: Obtiene todas las solicitudes de retiro pendientes.

**Parámetros de Query**:
- `page` (number): Página actual
- `limit` (number): Elementos por página
- `sortBy` (string): Campo para ordenar (`createdAt`, `amount`, `userId`)
- `sortOrder` (string): Orden (`asc`, `desc`)

**Respuesta Exitosa** (200):
```json
{
  "success": true,
  "data": {
    "withdrawals": [
      {
        "_id": "507f1f77bcf86cd799439017",
        "userId": "507f1f77bcf86cd799439011",
        "userInfo": {
          "username": "juan.perez",
          "email": "juan@example.com",
          "fullName": "Juan Pérez"
        },
        "amount": 100.00,
        "currency": "USDT",
        "withdrawalMethod": "crypto",
        "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db4C4C4b4C4C",
        "network": "BSC",
        "fee": 5.00,
        "netAmount": 95.00,
        "status": "pending",
        "createdAt": "2025-01-31T11:00:00Z",
        "priority": "normal"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalWithdrawals": 15
    },
    "summary": {
      "totalPendingAmount": 5500.00,
      "averageAmount": 366.67,
      "oldestRequest": "2025-01-29T10:00:00Z"
    }
  }
}
```

### 3. Procesar Solicitud de Retiro

#### `POST /api/admin/financial/withdrawals/:withdrawalId/process`

**Descripción**: Procesa una solicitud de retiro (aprobar, rechazar, completar).

**Body Parameters**:
```json
{
  "action": "approve",
  "adminNotes": "Solicitud aprobada - documentación verificada",
  "transactionHash": "0x1234567890abcdef..."
}
```

**Acciones Disponibles**:
- `approve`: Aprobar solicitud
- `reject`: Rechazar solicitud
- `complete`: Marcar como completada
- `cancel`: Cancelar solicitud

**Respuesta Exitosa** (200):
```json
{
  "success": true,
  "message": "Solicitud procesada exitosamente",
  "data": {
    "withdrawalId": "507f1f77bcf86cd799439017",
    "previousStatus": "pending",
    "newStatus": "processing",
    "processedBy": "507f1f77bcf86cd799439018",
    "processedAt": "2025-01-31T12:00:00Z",
    "adminNotes": "Solicitud aprobada - documentación verificada"
  }
}
```

---

## 📊 CÓDIGOS DE ESTADO

### Estados de Transacciones
- `pending`: Transacción pendiente de procesamiento
- `processing`: En proceso de verificación/ejecución
- `completed`: Completada exitosamente
- `failed`: Falló el procesamiento
- `cancelled`: Cancelada por usuario o admin

### Estados de Solicitudes de Retiro
- `pending`: Solicitud creada, esperando revisión admin
- `processing`: Aprobada por admin, en proceso de transferencia
- `completed`: Transferencia completada exitosamente
- `cancelled`: Cancelada por admin o usuario
- `failed`: Falló el procesamiento de la transferencia

---

## 🔒 SEGURIDAD

### Validaciones Implementadas
1. **Autenticación JWT**: Todos los endpoints requieren token válido
2. **Autorización**: Verificación de permisos por usuario/admin
3. **Validación de Datos**: Sanitización y validación de entrada
4. **Rate Limiting**: Límites de requests por IP/usuario
5. **Logging**: Registro completo de todas las operaciones

### Medidas de Seguridad
- Encriptación de datos sensibles
- Validación de direcciones de wallet
- Prevención de inyección SQL/NoSQL
- Verificación de balance en tiempo real
- Auditoría completa de transacciones

---

## 🚨 MANEJO DE ERRORES

### Estructura de Respuesta de Error
```json
{
  "success": false,
  "error": "Descripción del error",
  "code": "ERROR_CODE",
  "details": {
    "field": "campo específico con error",
    "value": "valor que causó el error",
    "expected": "valor esperado"
  },
  "timestamp": "2025-01-31T12:00:00Z",
  "requestId": "req_1234567890"
}
```

### Códigos de Error Comunes
- `INSUFFICIENT_BALANCE`: Balance insuficiente
- `INVALID_AMOUNT`: Monto inválido
- `INVALID_ADDRESS`: Dirección de wallet inválida
- `DUPLICATE_REQUEST`: Solicitud duplicada
- `USER_NOT_FOUND`: Usuario no encontrado
- `UNAUTHORIZED`: No autorizado
- `VALIDATION_ERROR`: Error de validación
- `INTERNAL_ERROR`: Error interno del servidor

---

## 📈 MÉTRICAS Y MONITOREO

### Métricas Disponibles
- Tiempo de respuesta de endpoints
- Tasa de éxito/error por endpoint
- Volumen de transacciones por período
- Tiempo promedio de procesamiento de retiros
- Distribución de métodos de retiro

### Logs de Auditoría
Todas las operaciones financieras se registran con:
- Timestamp exacto
- Usuario que ejecuta la acción
- Detalles de la operación
- IP de origen
- Resultado de la operación

---

## 💳 ENDPOINTS DE MÉTODOS DE PAGO

### 1. Obtener Métodos de Pago del Usuario

#### `GET /api/payments/methods`

**Descripción**: Obtiene todos los métodos de pago configurados por el usuario.

**Headers**:
```javascript
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

**Respuesta Exitosa** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "method_12345",
      "userId": "user_67890",
      "type": "crypto",
      "name": "Mi Wallet Principal",
      "details": {
        "address": "0x742d35Cc6634C0532925a3b8D4C9db4C4C4b4C4C",
        "network": "BSC",
        "currency": "USDT"
      },
      "isDefault": true,
      "isActive": true,
      "createdAt": "2025-01-31T10:30:00Z",
      "updatedAt": "2025-01-31T10:30:00Z"
    },
    {
      "id": "method_67890",
      "userId": "user_67890",
      "type": "bank",
      "name": "Cuenta Bancaria Principal",
      "details": {
        "bankName": "Banco Nacional",
        "accountNumber": "****1234",
        "accountType": "savings",
        "currency": "USD"
      },
      "isDefault": false,
      "isActive": true,
      "createdAt": "2025-01-30T15:20:00Z",
      "updatedAt": "2025-01-30T15:20:00Z"
    }
  ]
}
```

**Errores**:
- `401`: Token inválido o expirado
- `500`: Error interno del servidor

---

### 2. Añadir Nuevo Método de Pago

#### `POST /api/payments/methods`

**Descripción**: Crea un nuevo método de pago para el usuario.

**Headers**:
```javascript
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

**Parámetros del Body**:
```json
{
  "type": "crypto",
  "name": "Mi Nueva Wallet",
  "details": {
    "address": "0x742d35Cc6634C0532925a3b8D4C9db4C4C4b4C4C",
    "network": "BSC",
    "currency": "USDT"
  },
  "isDefault": false
}
```

**Tipos de Métodos Soportados**:

**Crypto Wallet**:
```json
{
  "type": "crypto",
  "name": "Nombre del método",
  "details": {
    "address": "0x...",
    "network": "BSC|ETH|TRX",
    "currency": "USDT|USDC|BTC|ETH"
  }
}
```

**Cuenta Bancaria**:
```json
{
  "type": "bank",
  "name": "Nombre del método",
  "details": {
    "bankName": "Nombre del banco",
    "accountNumber": "Número de cuenta",
    "accountType": "savings|checking",
    "currency": "USD|EUR|MXN",
    "routingNumber": "Número de ruta (opcional)"
  }
}
```

**Tarjeta**:
```json
{
  "type": "card",
  "name": "Nombre del método",
  "details": {
    "cardNumber": "****1234",
    "cardType": "debit|credit",
    "expiryMonth": "12",
    "expiryYear": "2027",
    "currency": "USD"
  }
}
```

**Respuesta Exitosa** (201):
```json
{
  "success": true,
  "message": "Método de pago creado exitosamente",
  "data": {
    "id": "method_new123",
    "userId": "user_67890",
    "type": "crypto",
    "name": "Mi Nueva Wallet",
    "details": {
      "address": "0x742d35Cc6634C0532925a3b8D4C9db4C4C4b4C4C",
      "network": "BSC",
      "currency": "USDT"
    },
    "isDefault": false,
    "isActive": true,
    "createdAt": "2025-01-31T11:00:00Z",
    "updatedAt": "2025-01-31T11:00:00Z"
  }
}
```

**Errores**:
- `400`: Datos inválidos o método duplicado
- `401`: Token inválido o expirado
- `422`: Validación fallida (dirección de wallet inválida, etc.)
- `500`: Error interno del servidor

---

### 3. Actualizar Método de Pago

#### `PUT /api/payments/methods/:id`

**Descripción**: Actualiza un método de pago existente del usuario.

**Parámetros**:
- `id` (string): ID del método de pago a actualizar

**Headers**:
```javascript
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

**Parámetros del Body**:
```json
{
  "name": "Wallet Actualizada",
  "details": {
    "address": "0x742d35Cc6634C0532925a3b8D4C9db4C4C4b4C4C",
    "network": "ETH",
    "currency": "USDC"
  },
  "isDefault": true
}
```

**Respuesta Exitosa** (200):
```json
{
  "success": true,
  "message": "Método de pago actualizado exitosamente",
  "data": {
    "id": "method_12345",
    "userId": "user_67890",
    "type": "crypto",
    "name": "Wallet Actualizada",
    "details": {
      "address": "0x742d35Cc6634C0532925a3b8D4C9db4C4C4b4C4C",
      "network": "ETH",
      "currency": "USDC"
    },
    "isDefault": true,
    "isActive": true,
    "createdAt": "2025-01-31T10:30:00Z",
    "updatedAt": "2025-01-31T11:15:00Z"
  }
}
```

**Errores**:
- `400`: Datos inválidos
- `401`: Token inválido o expirado
- `403`: No autorizado para modificar este método
- `404`: Método de pago no encontrado
- `422`: Validación fallida
- `500`: Error interno del servidor

---

### 4. Eliminar Método de Pago

#### `DELETE /api/payments/methods/:id`

**Descripción**: Elimina un método de pago del usuario.

**Parámetros**:
- `id` (string): ID del método de pago a eliminar

**Headers**:
```javascript
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Respuesta Exitosa** (200):
```json
{
  "success": true,
  "message": "Método de pago eliminado exitosamente"
}
```

**Errores**:
- `401`: Token inválido o expirado
- `403`: No autorizado para eliminar este método
- `404`: Método de pago no encontrado
- `409`: No se puede eliminar el método por defecto (cambiar primero)
- `500`: Error interno del servidor

---

### 5. Validaciones y Reglas de Negocio

#### 🛡️ Validaciones de Seguridad

**Direcciones de Wallet Crypto**:
- ✅ Validación de formato según la red (BSC, ETH, TRX)
- ✅ Verificación de checksum para direcciones Ethereum
- ✅ Prevención de direcciones duplicadas

**Cuentas Bancarias**:
- ✅ Validación de formato de número de cuenta
- ✅ Verificación de códigos bancarios
- ✅ Sanitización de datos sensibles

**Tarjetas**:
- ✅ Validación de número de tarjeta (algoritmo Luhn)
- ✅ Verificación de fechas de expiración
- ✅ Enmascaramiento automático de números

#### 📋 Reglas de Negocio

- **Límite de Métodos**: Máximo 10 métodos por usuario
- **Método por Defecto**: Solo uno puede ser marcado como predeterminado
- **Eliminación**: No se puede eliminar el último método activo
- **Duplicados**: No se permiten métodos idénticos
- **Activación**: Nuevos métodos se crean como activos por defecto

#### 🔄 Rate Limiting

- **GET /methods**: 60 requests/minuto
- **POST /methods**: 10 requests/minuto
- **PUT /methods**: 20 requests/minuto
- **DELETE /methods**: 5 requests/minuto

---

## 🔧 CONFIGURACIÓN

### Variables de Entorno
```bash
# Configuración de la API Financiera
FINANCE_API_ENABLED=true
MIN_WITHDRAWAL_AMOUNT=50
MAX_WITHDRAWAL_AMOUNT=10000
WITHDRAWAL_FEE_PERCENTAGE=0.05
WITHDRAWAL_PROCESSING_TIME=24

# Límites de Rate Limiting
RATE_LIMIT_WINDOW=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100

# Configuración de Logging
FINANCE_LOG_LEVEL=info
FINANCE_LOG_FILE=logs/finance.log
```

---

## 📞 SOPORTE

Para soporte técnico o reportar problemas con la API Financiera:

- **Documentación**: Este archivo
- **Logs**: `backend/logs/finance.log`
- **Monitoreo**: Dashboard administrativo
- **Testing**: Endpoints de prueba disponibles en desarrollo

**🎯 API completamente funcional y lista para producción.**