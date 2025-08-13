# Sistema de Seguridad para Wallets

## 📋 Resumen

Este documento describe el sistema integral de seguridad implementado para la gestión de wallets en la aplicación GrowX5. El sistema incluye control de acceso basado en roles granulares, validaciones avanzadas, auditoría continua y medidas de protección específicas.

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **Modelos de Datos**
   - `WalletRole.model.js` - Definición de roles granulares
   - `UserWalletRole.model.js` - Asignación de roles a usuarios

2. **Middlewares de Seguridad**
   - `walletAuth.middleware.js` - Autenticación y autorización específica

3. **Validadores**
   - `walletValidator.js` - Validación de direcciones y detección de amenazas

4. **Scripts de Auditoría**
   - `wallet-security-audit.js` - Auditoría diaria automatizada
   - `init-wallet-roles.js` - Inicialización de roles
   - `setup-wallet-security.js` - Configuración completa del sistema

## 🔐 Sistema de Roles Granulares

### Roles Predefinidos

#### 1. `wallet_viewer`
- **Descripción**: Solo visualización de wallets y estadísticas
- **Permisos**:
  - ✅ Ver wallets
  - ✅ Ver detalles de wallets
  - ✅ Ver estadísticas
  - ❌ Crear/modificar/eliminar wallets

#### 2. `wallet_manager`
- **Descripción**: Gestión completa de wallets (excepto eliminación)
- **Permisos**:
  - ✅ Todos los permisos de `wallet_viewer`
  - ✅ Crear wallets (máximo 10/día)
  - ✅ Actualizar wallets
  - ✅ Actualizar balances
  - ✅ Liberar wallets
  - ✅ Agregar notas
  - ❌ Eliminar wallets
  - ❌ Gestionar roles

#### 3. `wallet_admin`
- **Descripción**: Control total sobre wallets y roles
- **Permisos**:
  - ✅ Todos los permisos anteriores
  - ✅ Eliminar wallets
  - ✅ Gestionar roles de wallet
  - ✅ Ejecutar auditorías
  - ✅ Crear hasta 50 wallets/día

### Restricciones por Rol

```javascript
// Ejemplo de restricciones para wallet_manager
{
  max_wallets_per_day: 10,
  max_total_wallets: 100,
  allowed_networks: ['BEP20', 'ERC20', 'TRC20', 'POLYGON'],
  time_restrictions: {
    enabled: true,
    allowed_hours: { start: 8, end: 18 },
    allowed_days: [1, 2, 3, 4, 5] // Lunes a Viernes
  }
}
```

## 🛡️ Validaciones de Seguridad

### Validación de Direcciones

1. **Formato por Red**
   - BEP20/ERC20/POLYGON: Formato Ethereum (0x...)
   - TRC20: Formato TRON (T...)
   - BTC: Formato Bitcoin (1..., 3..., bc1...)
   - LTC: Formato Litecoin (L..., M..., ltc1...)

2. **Verificación de Checksum**
   - Validación EIP-55 para direcciones Ethereum
   - Verificación Base58Check para Bitcoin/Litecoin

3. **Detección de Direcciones Sospechosas**
   - Lista negra de direcciones conocidas
   - Análisis de patrones sospechosos
   - Verificación contra listas de sanciones

### Límites y Restricciones

- **Límites de Creación**: Por día y total por usuario
- **Redes Permitidas**: Según el rol asignado
- **Restricciones de IP**: Opcional por usuario
- **Restricciones de Tiempo**: Horarios y días permitidos

## 📊 Sistema de Auditoría

### Auditoría Automática Diaria

El script `wallet-security-audit.js` ejecuta las siguientes verificaciones:

1. **Auditoría de Direcciones**
   - Validación de formato
   - Detección de duplicados
   - Identificación de direcciones sospechosas

2. **Auditoría de Actividad**
   - Patrones de creación inusuales
   - Actividad fuera de horarios permitidos
   - Exceso de límites establecidos

3. **Auditoría de Cumplimiento**
   - Roles expirados
   - Límites excedidos
   - Permisos inconsistentes

### Reportes de Auditoría

```javascript
// Estructura del reporte
{
  timestamp: "2024-01-15T10:30:00Z",
  summary: {
    total_wallets: 150,
    suspicious_wallets: 2,
    invalid_addresses: 0,
    duplicate_addresses: 1
  },
  findings: [
    {
      type: "SUSPICIOUS_WALLET",
      severity: "HIGH",
      wallet_id: "...",
      reason: "Dirección en lista negra"
    }
  ],
  recommendations: [
    "Revisar wallet ID: 507f1f77bcf86cd799439011",
    "Actualizar lista negra de direcciones"
  ]
}
```

## 🔧 Configuración e Instalación

### 1. Instalación Inicial

```bash
# Ejecutar script de configuración completa
node src/scripts/setup-wallet-security.js
```

### 2. Inicialización Manual de Roles

```bash
# Solo crear roles por defecto
node src/scripts/init-wallet-roles.js
```

### 3. Auditoría Manual

```bash
# Ejecutar auditoría inmediata
node src/scripts/wallet-security-audit.js
```

## 🚀 Uso del Sistema

### Asignación de Roles

```javascript
// POST /api/admin/user-wallet-roles
{
  "userId": "507f1f77bcf86cd799439011",
  "walletRoleId": "507f1f77bcf86cd799439012",
  "restrictions": {
    "max_wallets_per_day": 5,
    "allowed_networks": ["BEP20", "ERC20"]
  },
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### Protección de Rutas

```javascript
// Ejemplo de uso en rutas
router.post('/wallets', 
  requireWalletPermission('create_wallet'),
  checkWalletCreationLimits,
  checkAllowedNetwork,
  walletController.createWallet,
  incrementWalletCreationCounter
);
```

### Validación de Direcciones

```javascript
const { validateWalletAddress } = require('../utils/walletValidator');

const result = await validateWalletAddress(
  '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
  'ERC20'
);

if (!result.isValid) {
  console.log('Errores:', result.errors);
  console.log('Advertencias:', result.warnings);
}
```

## 📈 Monitoreo y Alertas

### Eventos Registrados

- Creación/modificación/eliminación de wallets
- Asignación/revocación de roles
- Intentos de acceso no autorizado
- Detección de direcciones sospechosas
- Exceso de límites establecidos

### Alertas Automáticas

- Actividad sospechosa detectada
- Límites excedidos
- Roles expirados
- Fallos en validaciones

## 🔒 Mejores Prácticas de Seguridad

### Para Administradores

1. **Principio de Menor Privilegio**
   - Asignar solo los permisos mínimos necesarios
   - Revisar roles periódicamente

2. **Segregación de Funciones**
   - Separar roles de visualización, gestión y administración
   - Evitar concentración de permisos

3. **Auditoría Regular**
   - Ejecutar auditorías diarias
   - Revisar reportes de seguridad
   - Investigar actividades sospechosas

### Para Desarrolladores

1. **Validación Estricta**
   - Validar todas las entradas
   - Verificar permisos en cada operación
   - Registrar todas las acciones

2. **Manejo de Errores**
   - No exponer información sensible
   - Registrar errores para auditoría
   - Implementar rate limiting

## 🚨 Respuesta a Incidentes

### Detección de Actividad Sospechosa

1. **Investigación Inmediata**
   - Revisar logs de auditoría
   - Identificar origen de la actividad
   - Evaluar impacto potencial

2. **Medidas de Contención**
   - Suspender cuentas comprometidas
   - Revocar permisos temporalmente
   - Bloquear direcciones IP sospechosas

3. **Recuperación**
   - Restaurar desde backups si es necesario
   - Actualizar medidas de seguridad
   - Documentar lecciones aprendidas

## 📚 Referencias

- [Documentación de Roles de Usuario](./user-roles.md)
- [Guía de Auditoría](./audit-guide.md)
- [Procedimientos de Emergencia](./emergency-procedures.md)
- [API de Administración](./admin-api.md)

## 🔄 Actualizaciones y Mantenimiento

### Actualizaciones Regulares

- Revisar y actualizar listas negras
- Actualizar validadores de red
- Mejorar algoritmos de detección
- Optimizar rendimiento de auditorías

### Mantenimiento Preventivo

- Limpieza de logs antiguos
- Optimización de índices de base de datos
- Verificación de integridad de datos
- Pruebas de recuperación ante desastres

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2024  
**Mantenido por**: Equipo de Seguridad GrowX5