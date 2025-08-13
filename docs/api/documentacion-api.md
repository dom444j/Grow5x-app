# Documentación de API de Grow5X

## Fecha de actualización: 23 de julio de 2025

## Resumen de la API

Este documento detalla los endpoints disponibles en la API de Grow5X, sus parámetros, respuestas y ejemplos de uso.

## Base URL

```
https://grow5x.app/api
```

## Autenticación

La mayoría de los endpoints requieren autenticación mediante token JWT. El token debe ser incluido en el header de la petición:

```
Authorization: Bearer <token>
```

### Obtener Token

```
POST /auth/login
```

**Parámetros**:

```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
}
```

**Respuesta**:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123456789",
      "email": "usuario@ejemplo.com",
      "name": "Usuario Ejemplo",
      "role": "user"
    }
  }
}
```

## Endpoints

### Usuarios

#### Registro de Usuario

```
POST /auth/register
```

**Parámetros**:

```json
{
  "name": "Nombre Completo",
  "email": "usuario@ejemplo.com",
  "password": "contraseña",
  "confirmPassword": "contraseña"
}
```

**Respuesta**:

```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "id": "123456789",
      "email": "usuario@ejemplo.com",
      "name": "Nombre Completo",
      "role": "user",
      "createdAt": "2025-07-23T12:00:00.000Z"
    }
  }
}
```

#### Obtener Perfil de Usuario

```
GET /users/profile
```

**Headers**:

```
Authorization: Bearer <token>
```

**Respuesta**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123456789",
      "email": "usuario@ejemplo.com",
      "name": "Nombre Completo",
      "role": "user",
      "createdAt": "2025-07-23T12:00:00.000Z",
      "pioneerStatus": "active",
      "pioneerPlan": "gold"
    }
  }
}
```

#### Actualizar Perfil de Usuario

```
PUT /users/profile
```

**Headers**:

```
Authorization: Bearer <token>
```

**Parámetros**:

```json
{
  "name": "Nuevo Nombre",
  "email": "nuevo@ejemplo.com"
}
```

**Respuesta**:

```json
{
  "success": true,
  "message": "Perfil actualizado exitosamente",
  "data": {
    "user": {
      "id": "123456789",
      "email": "nuevo@ejemplo.com",
      "name": "Nuevo Nombre",
      "role": "user"
    }
  }
}
```

### Planes Pioneros

#### Obtener Planes Disponibles

```
GET /pioneer/plans
```

**Respuesta**:

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "bronze",
        "name": "Bronze Pioneer",
        "price": 100,
        "features": [
          "Acceso temprano a la plataforma",
          "5% de descuento en comisiones",
          "Soporte prioritario"
        ]
      },
      {
        "id": "silver",
        "name": "Silver Pioneer",
        "price": 250,
        "features": [
          "Acceso temprano a la plataforma",
          "10% de descuento en comisiones",
          "Soporte prioritario",
          "Acceso a webinars exclusivos"
        ]
      },
      {
        "id": "gold",
        "name": "Gold Pioneer",
        "price": 500,
        "features": [
          "Acceso temprano a la plataforma",
          "15% de descuento en comisiones",
          "Soporte prioritario VIP",
          "Acceso a webinars exclusivos",
          "Consultoría personalizada"
        ]
      }
    ]
  }
}
```

#### Comprar Plan Pionero

```
POST /pioneer/purchase
```

**Headers**:

```
Authorization: Bearer <token>
```

**Parámetros**:

```json
{
  "planId": "gold",
  "paymentMethod": "credit_card",
  "paymentDetails": {
    "cardNumber": "4111111111111111",
    "expiryMonth": "12",
    "expiryYear": "2028",
    "cvv": "123"
  }
}
```

**Respuesta**:

```json
{
  "success": true,
  "message": "Plan pionero adquirido exitosamente",
  "data": {
    "transaction": {
      "id": "tx123456789",
      "amount": 500,
      "currency": "USD",
      "status": "completed",
      "createdAt": "2025-07-23T12:00:00.000Z"
    },
    "pioneerStatus": {
      "planId": "gold",
      "activatedAt": "2025-07-23T12:00:00.000Z",
      "expiresAt": null
    }
  }
}
```

### Dashboard

#### Obtener Resumen Financiero

```
GET /dashboard/summary
```

**Headers**:

```
Authorization: Bearer <token>
```

**Respuesta**:

```json
{
  "success": true,
  "data": {
    "balance": 1250.75,
    "totalInvested": 1000.00,
    "totalReturns": 250.75,
    "returnRate": 25.07,
    "portfolioDistribution": [
      {
        "category": "Crypto",
        "percentage": 40
      },
      {
        "category": "Stocks",
        "percentage": 30
      },
      {
        "category": "Forex",
        "percentage": 20
      },
      {
        "category": "Commodities",
        "percentage": 10
      }
    ],
    "recentTransactions": [
      {
        "id": "tx123456",
        "type": "deposit",
        "amount": 500.00,
        "status": "completed",
        "date": "2025-07-20T10:30:00.000Z"
      },
      {
        "id": "tx123457",
        "type": "return",
        "amount": 125.50,
        "status": "completed",
        "date": "2025-07-22T14:15:00.000Z"
      }
    ]
  }
}
```

#### Obtener Historial de Transacciones

```
GET /dashboard/transactions?page=1&limit=10
```

**Headers**:

```
Authorization: Bearer <token>
```

**Parámetros de Query**:
- `page`: Número de página (default: 1)
- `limit`: Número de transacciones por página (default: 10)
- `type`: Filtrar por tipo de transacción (opcional: deposit, withdrawal, return)
- `startDate`: Filtrar desde fecha (opcional, formato: YYYY-MM-DD)
- `endDate`: Filtrar hasta fecha (opcional, formato: YYYY-MM-DD)

**Respuesta**:

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx123456",
        "type": "deposit",
        "amount": 500.00,
        "status": "completed",
        "date": "2025-07-20T10:30:00.000Z",
        "description": "Depósito inicial"
      },
      {
        "id": "tx123457",
        "type": "return",
        "amount": 125.50,
        "status": "completed",
        "date": "2025-07-22T14:15:00.000Z",
        "description": "Retorno semanal"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "pages": 3
    }
  }
}
```

### Documentos Legales

#### Obtener Términos y Condiciones

```
GET /legal/terms
```

**Parámetros de Query**:
- `lang`: Código de idioma (default: en, opciones: en, es)

**Respuesta**:

```json
{
  "success": true,
  "data": {
    "title": "Terms and Conditions",
    "lastUpdated": "2025-07-23",
    "content": "<html content of terms and conditions>"
  }
}
```

#### Obtener Política de Privacidad

```
GET /legal/privacy
```

**Parámetros de Query**:
- `lang`: Código de idioma (default: en, opciones: en, es)

**Respuesta**:

```json
{
  "success": true,
  "data": {
    "title": "Privacy Policy",
    "lastUpdated": "2025-07-23",
    "content": "<html content of privacy policy>"
  }
}
```

#### Obtener Divulgación de Riesgos

```
GET /legal/risk-disclosure
```

**Parámetros de Query**:
- `lang`: Código de idioma (default: en, opciones: en, es)

**Respuesta**:

```json
{
  "success": true,
  "data": {
    "title": "Risk Disclosure",
    "lastUpdated": "2025-07-23",
    "content": "<html content of risk disclosure>"
  }
}
```

## Códigos de Estado

- `200 OK`: La petición se ha completado exitosamente.
- `201 Created`: El recurso ha sido creado exitosamente.
- `400 Bad Request`: La petición contiene parámetros inválidos o faltantes.
- `401 Unauthorized`: No se ha proporcionado un token válido.
- `403 Forbidden`: El token es válido pero no tiene permisos para acceder al recurso.
- `404 Not Found`: El recurso solicitado no existe.
- `500 Internal Server Error`: Error interno del servidor.

## Manejo de Errores

En caso de error, la API devolverá una respuesta con el siguiente formato:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción del error"
  }
}
```

## Limitación de Tasa

La API tiene un límite de 100 peticiones por minuto por IP. Si se excede este límite, se devolverá un código de estado `429 Too Many Requests`.

## Notas Adicionales

- Todas las fechas están en formato ISO 8601 (YYYY-MM-DDTHH:MM:SS.sssZ).
- Todos los montos están en USD a menos que se especifique lo contrario.
- La API está en constante evolución y pueden añadirse nuevos endpoints o modificarse los existentes.