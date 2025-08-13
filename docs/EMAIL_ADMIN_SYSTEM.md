# Sistema de Administración de Emails - GrowX5

## Descripción General

Este documento describe el sistema completo de administración de emails implementado en GrowX5, que incluye logging detallado, funciones administrativas y monitoreo de emails.

## Componentes Implementados

### 1. Modelo EmailLog (`backend/src/models/EmailLog.model.js`)

**Propósito**: Registrar y rastrear todos los envíos de email del sistema.

**Campos principales**:
- `recipient`: Email del destinatario
- `userId`: ID del usuario (opcional)
- `emailType`: Tipo de email (verification, welcome, recovery, etc.)
- `subject`: Asunto del email
- `status`: Estado (pending, sent, failed)
- `messageId`: ID único del mensaje
- `attempts`: Número de intentos de envío
- `lastError`: Último error registrado
- `provider`: Proveedor SMTP utilizado
- `metadata`: Información adicional
- `sentAt`: Fecha de envío exitoso
- `failedAt`: Fecha de fallo final

**Métodos estáticos**:
- `getStats(days)`: Estadísticas de emails por período
- `getRecentErrors(limit)`: Errores recientes
- `getUserEmailLogs(userId, limit)`: Logs por usuario
- `cleanupOldLogs(days)`: Limpieza de logs antiguos

### 2. Integración en Sistema de Email (`backend/src/utils/email.js`)

**Funcionalidades agregadas**:
- Logging automático de todos los envíos
- Rastreo de intentos y errores
- Actualización de estado en tiempo real
- Soporte para múltiples proveedores SMTP

**Funciones actualizadas**:
- `sendEmail()`: Ahora incluye logging completo
- `sendVerificationEmail()`: Acepta userId para mejor rastreo
- `sendWelcomeEmail()`: Acepta userId para mejor rastreo

### 3. Controladores de Administración (`backend/src/controllers/admin.controller.js`)

#### 3.1 Reenvío de Email de Verificación

**Endpoint**: `POST /api/admin/email/resend-verification`

**Parámetros**:
```json
{
  "userId": "string (required)"
}
```

**Funcionalidad**:
- Valida que el usuario existe
- Verifica que el email no esté ya verificado
- Genera nuevo token de verificación
- Envía email de verificación
- Registra acción administrativa

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "data": {
    "userId": "string",
    "email": "string",
    "tokenExpires": "date"
  }
}
```

#### 3.2 Forzar Verificación de Email

**Endpoint**: `POST /api/admin/email/force-verification`

**Parámetros**:
```json
{
  "userId": "string (required)",
  "reason": "string (required, min 10 chars)"
}
```

**Funcionalidad**:
- Valida usuario y razón
- Marca email como verificado manualmente
- Registra auditoría completa
- Actualiza estado del usuario

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Email verification forced successfully",
  "data": {
    "userId": "string",
    "email": "string",
    "verifiedAt": "date",
    "verifiedBy": "string",
    "reason": "string"
  }
}
```

#### 3.3 Obtener Errores de Email

**Endpoint**: `GET /api/admin/email/errors`

**Parámetros de consulta**:
- `limit`: Número máximo de errores (default: 50)
- `page`: Página para paginación (default: 1)

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "errors": [
      {
        "recipient": "string",
        "emailType": "string",
        "status": "failed",
        "lastError": "string",
        "attempts": "number",
        "failedAt": "date"
      }
    ],
    "pagination": {
      "total": "number",
      "page": "number",
      "limit": "number",
      "pages": "number"
    }
  }
}
```

#### 3.4 Obtener Estadísticas de Email

**Endpoint**: `GET /api/admin/email/stats`

**Parámetros de consulta**:
- `days`: Período en días (default: 7)

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalEmails": "number",
      "successfulEmails": "number",
      "failedEmails": "number",
      "pendingEmails": "number",
      "successRate": "number",
      "byType": {
        "verification": "number",
        "welcome": "number",
        "recovery": "number"
      },
      "byProvider": {
        "default": "number",
        "welcome": "number",
        "recovery": "number"
      }
    },
    "period": "string"
  }
}
```

### 4. Rutas de Administración (`backend/src/routes/admin.routes.js`)

**Rutas agregadas**:
- `POST /api/admin/email/resend-verification`
- `POST /api/admin/email/force-verification`
- `GET /api/admin/email/errors`
- `GET /api/admin/email/stats`

**Autenticación**: Todas las rutas requieren:
- Token JWT válido
- Rol de administrador
- Rate limiting aplicado

### 5. Configuración de Producción

#### 5.1 Variables de Entorno (`.env.production`)

```env
# SMTP Configuration - General
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMTP Configuration - Welcome Emails
SMTP_WELCOME_HOST=smtp.gmail.com
SMTP_WELCOME_PORT=587
SMTP_WELCOME_SECURE=false
SMTP_WELCOME_USER=welcome@growx5.com
SMTP_WELCOME_PASS=welcome-app-password

# SMTP Configuration - Recovery Emails
SMTP_RECOVERY_HOST=smtp.gmail.com
SMTP_RECOVERY_PORT=587
SMTP_RECOVERY_SECURE=false
SMTP_RECOVERY_USER=recovery@growx5.com
SMTP_RECOVERY_PASS=recovery-app-password

# Email Verification
EMAIL_VERIFICATION_ENABLED=true
EMAIL_VERIFICATION_EXPIRY=24h

# Logging
LOG_EMAIL_EVENTS=true
LOG_LEVEL=info
```

#### 5.2 Configuración PM2 (`ecosystem.config.js`)

**Características**:
- Modo cluster con 2 instancias
- Reinicio automático
- Logging detallado
- Variables de entorno de producción
- Configuración de despliegue

**Comandos útiles**:
```bash
# Iniciar en producción
pm2 start ecosystem.config.js --env production

# Ver logs
pm2 logs growx5-backend

# Monitorear
pm2 monit

# Recargar sin downtime
pm2 reload growx5-backend
```

## Flujo de Trabajo

### 1. Envío Normal de Email

1. **Solicitud**: Usuario registra cuenta
2. **Logging**: Se crea registro en EmailLog con status 'pending'
3. **Envío**: Sistema intenta enviar email
4. **Actualización**: Status se actualiza a 'sent' o 'failed'
5. **Reintentos**: Si falla, se incrementan attempts hasta máximo
6. **Auditoría**: Todos los eventos quedan registrados

### 2. Administración de Problemas

1. **Detección**: Admin revisa estadísticas y errores
2. **Análisis**: Identifica usuarios con problemas de verificación
3. **Acción**: Reenvía email o fuerza verificación
4. **Seguimiento**: Monitorea resultados en logs

### 3. Monitoreo Continuo

1. **Estadísticas diarias**: Revisión de tasas de éxito
2. **Alertas**: Identificación de patrones de fallo
3. **Optimización**: Ajuste de configuraciones SMTP
4. **Limpieza**: Eliminación de logs antiguos

## Seguridad y Auditoría

### Registros de Auditoría

- **AdminLog**: Todas las acciones administrativas
- **EmailLog**: Todos los envíos de email
- **Logger**: Eventos del sistema y errores

### Controles de Acceso

- **Autenticación**: JWT requerido
- **Autorización**: Rol admin requerido
- **Rate Limiting**: Protección contra abuso
- **Validación**: Parámetros validados

### Información Sensible

- **Passwords SMTP**: Almacenados en variables de entorno
- **Tokens**: No se exponen en logs
- **Emails**: Solo se registran para auditoría

## Monitoreo y Alertas

### Métricas Clave

1. **Tasa de éxito de emails**: > 95%
2. **Tiempo de respuesta**: < 5 segundos
3. **Errores por hora**: < 10
4. **Reintentos**: < 3 por email

### Alertas Recomendadas

1. **Tasa de fallo alta**: > 10% en 1 hora
2. **Proveedor SMTP caído**: 5 fallos consecutivos
3. **Cola de emails pendientes**: > 100 emails
4. **Errores de autenticación SMTP**: Inmediato

## Mantenimiento

### Tareas Diarias

- Revisar estadísticas de email
- Verificar errores recientes
- Monitorear tasas de éxito

### Tareas Semanales

- Limpiar logs antiguos
- Revisar configuraciones SMTP
- Analizar patrones de fallo

### Tareas Mensuales

- Optimizar configuraciones
- Revisar políticas de reintento
- Actualizar documentación

## Troubleshooting

### Problemas Comunes

1. **Emails no se envían**
   - Verificar configuración SMTP
   - Revisar logs de error
   - Comprobar conectividad

2. **Alta tasa de fallos**
   - Verificar límites del proveedor
   - Revisar autenticación
   - Comprobar reputación del dominio

3. **Emails en spam**
   - Configurar SPF, DKIM, DMARC
   - Revisar contenido del email
   - Verificar reputación IP

### Comandos de Diagnóstico

```bash
# Ver logs de email en tiempo real
pm2 logs growx5-backend | grep EMAIL

# Verificar estado del sistema
node test-email-admin.js

# Revisar configuración SMTP
node -e "console.log(process.env.SMTP_HOST)"
```

## Testing

### Script de Pruebas (`test-email-admin.js`)

**Funcionalidades**:
- Login administrativo
- Prueba de todas las funciones
- Verificación de integración
- Reporte de resultados

**Uso**:
```bash
node test-email-admin.js
```

### Pruebas Manuales

1. **Registro de usuario**: Verificar email de bienvenida
2. **Verificación**: Comprobar email de verificación
3. **Recuperación**: Probar reset de contraseña
4. **Administración**: Usar funciones admin

## Conclusión

El sistema de administración de emails de GrowX5 proporciona:

✅ **Logging completo** de todos los envíos
✅ **Herramientas administrativas** para gestión
✅ **Monitoreo en tiempo real** de estadísticas
✅ **Auditoría completa** de acciones
✅ **Configuración flexible** para producción
✅ **Testing automatizado** para validación

Este sistema asegura la confiabilidad y trazabilidad de todas las comunicaciones por email de la plataforma.