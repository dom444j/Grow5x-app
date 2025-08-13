# Sistema de Administración

## Fecha de actualización: 23 de julio de 2025

## Resumen

Este documento detalla la implementación del sistema de administración para el proyecto Grow5X, incluyendo la estructura, funcionalidades, roles, permisos, interfaz de usuario y consideraciones técnicas.

## Objetivos del Sistema de Administración

1. **Gestión Centralizada**: Proporcionar una interfaz unificada para administrar todos los aspectos de la plataforma.
2. **Control Granular**: Implementar un sistema de roles y permisos que permita asignar responsabilidades específicas.
3. **Monitoreo y Análisis**: Ofrecer herramientas para supervisar la actividad de la plataforma y analizar métricas clave.
4. **Seguridad**: Garantizar que solo personal autorizado pueda acceder a funciones administrativas.
5. **Auditoría**: Mantener un registro detallado de todas las acciones administrativas para cumplimiento y seguridad.

## Estructura del Sistema

### Roles de Administración

El sistema implementará los siguientes roles administrativos:

1. **Super Administrador**
   - Acceso completo a todas las funcionalidades
   - Gestión de otros administradores
   - Configuración global del sistema

2. **Administrador de Usuarios**
   - Gestión de cuentas de usuario
   - Verificación de identidad
   - Resolución de problemas de acceso

3. **Administrador Financiero**
   - Aprobación de transacciones
   - Gestión de pagos y retiros
   - Revisión de comisiones de referidos

4. **Administrador de Contenido**
   - Gestión de textos y traducciones
   - Actualización de términos legales
   - Gestión de notificaciones y comunicaciones

5. **Analista**
   - Acceso de solo lectura a datos y métricas
   - Generación de informes
   - Sin capacidad de modificar configuraciones

### Permisos y Capacidades

| Permiso | Super Admin | Admin Usuarios | Admin Financiero | Admin Contenido | Analista |
|---------|-------------|----------------|------------------|-----------------|----------|
| Ver Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Gestionar Usuarios | ✓ | ✓ | - | - | - |
| Bloquear/Desbloquear Usuarios | ✓ | ✓ | - | - | - |
| Ver Transacciones | ✓ | ✓ | ✓ | - | ✓ |
| Aprobar Transacciones | ✓ | - | ✓ | - | - |
| Gestionar Planes | ✓ | - | ✓ | - | - |
| Gestionar Referidos | ✓ | - | ✓ | - | - |
| Editar Contenido | ✓ | - | - | ✓ | - |
| Gestionar Administradores | ✓ | - | - | - | - |
| Configuración del Sistema | ✓ | - | - | - | - |
| Ver Logs de Auditoría | ✓ | ✓ | ✓ | ✓ | ✓ |
| Exportar Datos | ✓ | ✓ | ✓ | ✓ | ✓ |

## Funcionalidades Principales

### 1. Dashboard Administrativo

**Descripción**: Panel central que muestra métricas clave y acceso rápido a las principales funciones administrativas.

**Componentes**:
- Resumen de usuarios (total, nuevos, activos)
- Resumen financiero (transacciones, volumen, comisiones)
- Alertas y notificaciones importantes
- Accesos rápidos a funciones frecuentes
- Gráficos de tendencias y actividad reciente

### 2. Gestión de Usuarios

**Descripción**: Herramientas para administrar cuentas de usuario, verificar identidades y resolver problemas.

**Componentes**:
- Listado de usuarios con filtros avanzados
- Vista detallada de perfil de usuario
- Herramientas de verificación de identidad
- Opciones para bloquear/desbloquear cuentas
- Historial de actividad del usuario
- Gestión de solicitudes de soporte

### 3. Gestión Financiera

**Descripción**: Funcionalidades para supervisar y gestionar todas las transacciones financieras en la plataforma.

**Componentes**:
- **TransactionHistory**: Historial completo de transacciones con datos relacionales
  - Integración con `adminService.getTransactions()` para autenticación segura
  - Filtrado avanzado por estado (completado, pendiente, fallido)
  - Filtrado por tipo de transacción (compra, retiro)
  - Búsqueda por ID, usuario, email, hash de pago
  - Manejo robusto de datos undefined/null para prevenir errores TypeError
  - Vista detallada con información de blockchain y metadatos
- Aprobación manual de retiros
- Revisión de depósitos
- Gestión de comisiones de referidos
- Generación de informes financieros
- Conciliación de pagos

**Mejoras Implementadas (Enero 2025)**:
- ✅ Corrección de errores 401 (Unauthorized) mediante uso de servicios autenticados
- ✅ Prevención de errores TypeError en filtrado de datos
- ✅ Integración completa con relaciones de base de datos (usuarios, productos, pagos)
- ✅ Actualización automática de datos con cambios en filtros
- ✅ Manejo seguro de propiedades undefined en transacciones

### 4. Gestión de Planes

**Descripción**: Herramientas para administrar los planes pioneros y futuros productos financieros.

**Componentes**:
- Creación y edición de planes
- Configuración de precios y características
- Activación/desactivación de planes
- Estadísticas de suscripción por plan
- Gestión de promociones y descuentos

### 5. Sistema de Referidos

**Descripción**: Administración del programa de referidos, incluyendo comisiones y estadísticas.

**Componentes**:
- Configuración de tasas de comisión
- Revisión y aprobación de comisiones
- Estadísticas del programa de referidos
- Identificación de usuarios top en referidos
- Detección de actividades sospechosas

### 6. Gestión de Contenido

**Descripción**: Herramientas para administrar textos, traducciones y documentos legales de la plataforma.

**Componentes**:
- Editor de textos para múltiples idiomas
- Gestión de documentos legales
- Configuración de notificaciones y emails
- Gestión de preguntas frecuentes
- Actualización de contenido de landing page

### 7. Configuración del Sistema

**Descripción**: Opciones para configurar parámetros globales del sistema.

**Componentes**:
- Gestión de roles y permisos
- Configuración de seguridad
- Parámetros de funcionamiento
- Integración con servicios externos
- Programación de tareas automáticas

### 8. Auditoría y Logs

**Descripción**: Sistema de registro detallado de todas las acciones administrativas.

**Componentes**:
- Registro cronológico de acciones
- Filtros por tipo de acción, usuario, fecha
- Detalles de cambios realizados
- Exportación de logs para análisis
- Alertas de acciones sensibles

## Implementación Técnica

### Modelos de Datos

#### Modelo de Administrador

```javascript
// backend/models/admin.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'user_admin', 'financial_admin', 'content_admin', 'analyst'],
    default: 'analyst'
  },
  permissions: [{
    type: String,
    enum: [
      'view_dashboard',
      'manage_users',
      'block_users',
      'view_transactions',
      'approve_transactions',
      'manage_plans',
      'manage_referrals',
      'edit_content',
      'manage_admins',
      'configure_system',
      'view_audit_logs',
      'export_data'
    ]
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'locked'],
    default: 'active'
  },
  lastLogin: {
    type: Date
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  }
}, {
  timestamps: true
});

// Método para comparar contraseñas
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Middleware para hashear la contraseña antes de guardar
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Asignar permisos basados en el rol
adminSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    this.permissions = this._getPermissionsByRole(this.role);
  }
  next();
});

// Método para obtener permisos según el rol
adminSchema.methods._getPermissionsByRole = function(role) {
  const permissionMap = {
    super_admin: [
      'view_dashboard', 'manage_users', 'block_users', 'view_transactions',
      'approve_transactions', 'manage_plans', 'manage_referrals', 'edit_content',
      'manage_admins', 'configure_system', 'view_audit_logs', 'export_data'
    ],
    user_admin: [
      'view_dashboard', 'manage_users', 'block_users', 'view_transactions',
      'view_audit_logs', 'export_data'
    ],
    financial_admin: [
      'view_dashboard', 'view_transactions', 'approve_transactions',
      'manage_plans', 'manage_referrals', 'view_audit_logs', 'export_data'
    ],
    content_admin: [
      'view_dashboard', 'edit_content', 'view_audit_logs', 'export_data'
    ],
    analyst: [
      'view_dashboard', 'view_audit_logs', 'export_data'
    ]
  };
  
  return permissionMap[role] || [];
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
```

#### Modelo de Log de Auditoría

```javascript
// backend/models/auditLog.model.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  entity: {
    type: String,
    required: true,
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  previousState: mongoose.Schema.Types.Mixed,
  newState: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  details: String,
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success'
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, entity: 1 });
auditLogSchema.index({ adminId: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
```

### Servicios Backend

#### Servicio de Auditoría

```javascript
// backend/services/audit.service.js
const AuditLog = require('../models/auditLog.model');

class AuditService {
  /**
   * Registra una acción administrativa en el log de auditoría
   */
  async logAction(adminId, action, entity, entityId, previousState, newState, details, status = 'success', req) {
    try {
      const ipAddress = req ? this._getIpAddress(req) : null;
      const userAgent = req ? req.headers['user-agent'] : null;
      
      const log = await AuditLog.create({
        adminId,
        action,
        entity,
        entityId,
        previousState,
        newState,
        ipAddress,
        userAgent,
        details,
        status
      });
      
      return log;
    } catch (error) {
      console.error('Error logging admin action:', error);
      // No lanzamos el error para evitar interrumpir el flujo principal
      return null;
    }
  }
  
  /**
   * Obtiene la dirección IP real del cliente
   */
  _getIpAddress(req) {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           req.connection.socket.remoteAddress;
  }
  
  /**
   * Obtiene logs de auditoría con filtros
   */
  async getLogs(filters = {}, options = {}) {
    const { adminId, action, entity, entityId, status, startDate, endDate } = filters;
    const { page = 1, limit = 50, sort = { createdAt: -1 } } = options;
    
    const query = {};
    
    if (adminId) query.adminId = adminId;
    if (action) query.action = action;
    if (entity) query.entity = entity;
    if (entityId) query.entityId = entityId;
    if (status) query.status = status;
    
    // Filtro por fecha
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const total = await AuditLog.countDocuments(query);
    
    const logs = await AuditLog.find(query)
      .populate('adminId', 'username firstName lastName role')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);
    
    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Obtiene estadísticas de acciones administrativas
   */
  async getActionStats(filters = {}) {
    const { startDate, endDate } = filters;
    
    const query = {};
    
    // Filtro por fecha
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Estadísticas por tipo de acción
    const actionStats = await AuditLog.aggregate([
      { $match: query },
      { $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Estadísticas por administrador
    const adminStats = await AuditLog.aggregate([
      { $match: query },
      { $group: {
          _id: '$adminId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Poblar información de administradores
    const Admin = require('../models/admin.model');
    for (const stat of adminStats) {
      if (stat._id) {
        const admin = await Admin.findById(stat._id, 'username firstName lastName role');
        if (admin) {
          stat.admin = admin;
        }
      }
    }
    
    return {
      actionStats,
      adminStats
    };
  }
}

module.exports = new AuditService();
```

#### Servicio de Administración

```javascript
// backend/services/admin.service.js
const Admin = require('../models/admin.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const AuditService = require('./audit.service');

class AdminService {
  /**
   * Autentica a un administrador y devuelve un token JWT
   */
  async login(username, password, req) {
    // Buscar administrador por nombre de usuario
    const admin = await Admin.findOne({ username }).select('+password');
    
    if (!admin) {
      throw new Error('Credenciales inválidas');
    }
    
    // Verificar si la cuenta está bloqueada
    if (admin.status === 'locked') {
      throw new Error('Cuenta bloqueada. Contacte al administrador del sistema.');
    }
    
    // Verificar si la cuenta está inactiva
    if (admin.status === 'inactive') {
      throw new Error('Cuenta inactiva. Contacte al administrador del sistema.');
    }
    
    // Verificar contraseña
    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      // Incrementar contador de intentos fallidos
      admin.failedLoginAttempts += 1;
      
      // Bloquear cuenta después de 5 intentos fallidos
      if (admin.failedLoginAttempts >= 5) {
        admin.status = 'locked';
        await admin.save();
        
        // Registrar en log de auditoría
        await AuditService.logAction(
          admin._id,
          'account_locked',
          'admin',
          admin._id,
          { status: 'active', failedLoginAttempts: admin.failedLoginAttempts - 1 },
          { status: 'locked', failedLoginAttempts: admin.failedLoginAttempts },
          'Cuenta bloqueada después de 5 intentos fallidos de inicio de sesión',
          'warning',
          req
        );
        
        throw new Error('Cuenta bloqueada después de múltiples intentos fallidos.');
      }
      
      await admin.save();
      
      // Registrar intento fallido en log de auditoría
      await AuditService.logAction(
        admin._id,
        'login_failed',
        'admin',
        admin._id,
        null,
        null,
        'Intento fallido de inicio de sesión',
        'failure',
        req
      );
      
      throw new Error('Credenciales inválidas');
    }
    
    // Resetear contador de intentos fallidos
    admin.failedLoginAttempts = 0;
    admin.lastLogin = new Date();
    await admin.save();
    
    // Generar token JWT
    const token = this._generateToken(admin);
    
    // Registrar inicio de sesión exitoso en log de auditoría
    await AuditService.logAction(
      admin._id,
      'login_success',
      'admin',
      admin._id,
      null,
      null,
      'Inicio de sesión exitoso',
      'success',
      req
    );
    
    return {
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        permissions: admin.permissions,
        lastLogin: admin.lastLogin
      }
    };
  }
  
  /**
   * Genera un token JWT para un administrador
   */
  _generateToken(admin) {
    return jwt.sign(
      { 
        id: admin._id,
        role: admin.role,
        permissions: admin.permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
  }
  
  /**
   * Crea un nuevo administrador
   */
  async createAdmin(adminData, creatorId, req) {
    const { username, email, password, firstName, lastName, role } = adminData;
    
    // Verificar si el nombre de usuario o email ya existen
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingAdmin) {
      throw new Error('El nombre de usuario o email ya están en uso');
    }
    
    // Crear nuevo administrador
    const admin = await Admin.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role
    });
    
    // Registrar en log de auditoría
    await AuditService.logAction(
      creatorId,
      'admin_created',
      'admin',
      admin._id,
      null,
      { username, email, firstName, lastName, role },
      `Administrador creado: ${username} (${role})`,
      'success',
      req
    );
    
    return {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      permissions: admin.permissions,
      status: admin.status,
      createdAt: admin.createdAt
    };
  }
  
  /**
   * Actualiza un administrador existente
   */
  async updateAdmin(adminId, updateData, updaterId, req) {
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      throw new Error('Administrador no encontrado');
    }
    
    // Guardar estado anterior para auditoría
    const previousState = {
      username: admin.username,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      status: admin.status
    };
    
    // Actualizar campos
    const allowedUpdates = ['firstName', 'lastName', 'role', 'status'];
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        admin[field] = updateData[field];
      }
    });
    
    // Si se proporciona una nueva contraseña, actualizarla
    if (updateData.password) {
      admin.password = updateData.password;
    }
    
    await admin.save();
    
    // Registrar en log de auditoría
    await AuditService.logAction(
      updaterId,
      'admin_updated',
      'admin',
      admin._id,
      previousState,
      {
        username: admin.username,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        status: admin.status
      },
      `Administrador actualizado: ${admin.username}`,
      'success',
      req
    );
    
    return {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      permissions: admin.permissions,
      status: admin.status,
      updatedAt: admin.updatedAt
    };
  }
  
  /**
   * Obtiene todos los administradores con filtros
   */
  async getAdmins(filters = {}, options = {}) {
    const { username, email, role, status } = filters;
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    
    const query = {};
    
    if (username) query.username = { $regex: username, $options: 'i' };
    if (email) query.email = { $regex: email, $options: 'i' };
    if (role) query.role = role;
    if (status) query.status = status;
    
    const total = await Admin.countDocuments(query);
    
    const admins = await Admin.find(query)
      .select('-password -twoFactorSecret -resetPasswordToken -resetPasswordExpires')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);
    
    return {
      admins,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Desbloquea una cuenta de administrador
   */
  async unlockAdmin(adminId, unlockerId, req) {
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      throw new Error('Administrador no encontrado');
    }
    
    if (admin.status !== 'locked') {
      throw new Error('La cuenta no está bloqueada');
    }
    
    // Guardar estado anterior para auditoría
    const previousState = {
      status: admin.status,
      failedLoginAttempts: admin.failedLoginAttempts
    };
    
    // Desbloquear cuenta
    admin.status = 'active';
    admin.failedLoginAttempts = 0;
    await admin.save();
    
    // Registrar en log de auditoría
    await AuditService.logAction(
      unlockerId,
      'admin_unlocked',
      'admin',
      admin._id,
      previousState,
      {
        status: 'active',
        failedLoginAttempts: 0
      },
      `Cuenta de administrador desbloqueada: ${admin.username}`,
      'success',
      req
    );
    
    return {
      id: admin._id,
      username: admin.username,
      status: admin.status,
      updatedAt: admin.updatedAt
    };
  }
  
  /**
   * Inicia el proceso de restablecimiento de contraseña
   */
  async initiatePasswordReset(email, req) {
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      // No revelar si el email existe o no por seguridad
      return { message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.' };
    }
    
    // Generar token de restablecimiento
    const resetToken = crypto.randomBytes(32).toString('hex');
    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await admin.save();
    
    // Registrar en log de auditoría
    await AuditService.logAction(
      admin._id,
      'password_reset_requested',
      'admin',
      admin._id,
      null,
      null,
      'Solicitud de restablecimiento de contraseña iniciada',
      'success',
      req
    );
    
    // En una implementación real, aquí se enviaría un email con el token
    // Por ahora, solo devolvemos el token para pruebas
    return { 
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.',
      resetToken // Solo para pruebas, no incluir en producción
    };
  }
  
  /**
   * Completa el proceso de restablecimiento de contraseña
   */
  async completePasswordReset(token, newPassword, req) {
    const admin = await Admin.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!admin) {
      throw new Error('Token inválido o expirado');
    }
    
    // Actualizar contraseña
    admin.password = newPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();
    
    // Registrar en log de auditoría
    await AuditService.logAction(
      admin._id,
      'password_reset_completed',
      'admin',
      admin._id,
      null,
      null,
      'Contraseña restablecida exitosamente',
      'success',
      req
    );
    
    return { message: 'Contraseña restablecida exitosamente' };
  }
}

module.exports = new AdminService();
```

### Middleware de Autenticación y Autorización

```javascript
// backend/middleware/admin.middleware.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');
const AuditService = require('../services/audit.service');

/**
 * Middleware para proteger rutas administrativas
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Verificar si hay token en los headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ error: 'No estás autorizado para acceder a esta ruta' });
    }
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar si el administrador existe
    const admin = await Admin.findById(decoded.id);
    
    if (!admin) {
      return res.status(401).json({ error: 'No estás autorizado para acceder a esta ruta' });
    }
    
    // Verificar si la cuenta está activa
    if (admin.status !== 'active') {
      return res.status(403).json({ error: 'Tu cuenta no está activa' });
    }
    
    // Añadir información del administrador al request
    req.admin = {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      permissions: admin.permissions
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    console.error('Error en middleware de autenticación:', error);
    res.status(500).json({ error: 'Error de autenticación' });
  }
};

/**
 * Middleware para verificar permisos
 */
exports.hasPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'No estás autenticado' });
    }
    
    if (!req.admin.permissions.includes(requiredPermission)) {
      // Registrar intento de acceso no autorizado
      AuditService.logAction(
        req.admin.id,
        'permission_denied',
        'admin',
        req.admin.id,
        null,
        null,
        `Intento de acceso sin permiso: ${requiredPermission}`,
        'failure',
        req
      );
      
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
    }
    
    next();
  };
};

/**
 * Middleware para verificar rol
 */
exports.hasRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'No estás autenticado' });
    }
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    if (!roles.includes(req.admin.role)) {
      // Registrar intento de acceso no autorizado
      AuditService.logAction(
        req.admin.id,
        'role_access_denied',
        'admin',
        req.admin.id,
        null,
        null,
        `Intento de acceso con rol insuficiente. Requerido: ${roles.join(', ')}`,
        'failure',
        req
      );
      
      return res.status(403).json({ error: 'No tienes el rol necesario para realizar esta acción' });
    }
    
    next();
  };
};
```

## Interfaz de Usuario

### Dashboard Principal

```jsx
// frontend/src/pages/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUsers, FaMoneyBillWave, FaExchangeAlt, FaUserPlus, FaChartLine } from 'react-icons/fa';
import api from '../../services/api';
import StatCard from '../../components/admin/StatCard';
import RecentActivityList from '../../components/admin/RecentActivityList';
import UserChart from '../../components/admin/UserChart';
import TransactionChart from '../../components/admin/TransactionChart';
import AlertsList from '../../components/admin/AlertsList';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Obtener estadísticas generales
        const statsResponse = await api.get('/admin/dashboard/stats');
        setStats(statsResponse.data);
        
        // Obtener actividad reciente
        const activityResponse = await api.get('/admin/audit-logs', {
          params: { limit: 10 }
        });
        setRecentActivity(activityResponse.data.logs);
        
        // Obtener alertas
        const alertsResponse = await api.get('/admin/dashboard/alerts');
        setAlerts(alertsResponse.data.alerts);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }
  
  return (
    <div className="admin-dashboard">
      <h1 className="dashboard-title">{t('admin.dashboard.title')}</h1>
      
      <div className="stats-grid">
        <StatCard 
          icon={<FaUsers />}
          title={t('admin.dashboard.totalUsers')}
          value={stats.userStats.total}
          change={stats.userStats.change}
          changeLabel={t('admin.dashboard.fromLastWeek')}
        />
        
        <StatCard 
          icon={<FaUserPlus />}
          title={t('admin.dashboard.newUsers')}
          value={stats.userStats.new}
          change={stats.userStats.newChange}
          changeLabel={t('admin.dashboard.fromLastWeek')}
        />
        
        <StatCard 
          icon={<FaMoneyBillWave />}
          title={t('admin.dashboard.totalRevenue')}
          value={`$${stats.financialStats.revenue.toFixed(2)}`}
          change={stats.financialStats.revenueChange}
          changeLabel={t('admin.dashboard.fromLastMonth')}
        />
        
        <StatCard 
          icon={<FaExchangeAlt />}
          title={t('admin.dashboard.transactions')}
          value={stats.financialStats.transactions}
          change={stats.financialStats.transactionsChange}
          changeLabel={t('admin.dashboard.fromLastWeek')}
        />
      </div>
      
      <div className="dashboard-grid">
        <div className="chart-container">
          <h2>
            <FaChartLine className="section-icon" />
            {t('admin.dashboard.userGrowth')}
          </h2>
          <UserChart data={stats.userGrowthData} />
        </div>
        
        <div className="chart-container">
          <h2>
            <FaMoneyBillWave className="section-icon" />
            {t('admin.dashboard.revenueOverTime')}
          </h2>
          <TransactionChart data={stats.revenueData} />
        </div>
        
        <div className="activity-container">
          <h2>{t('admin.dashboard.recentActivity')}</h2>
          <RecentActivityList activities={recentActivity} />
        </div>
        
        <div className="alerts-container">
          <h2>{t('admin.dashboard.alerts')}</h2>
          <AlertsList alerts={alerts} />
        </div>
      </div>
      
      <div className="quick-actions">
        <h2>{t('admin.dashboard.quickActions')}</h2>
        <div className="actions-grid">
          <button className="action-button" onClick={() => window.location.href = '/admin/users'}>
            {t('admin.dashboard.manageUsers')}
          </button>
          <button className="action-button" onClick={() => window.location.href = '/admin/transactions'}>
            {t('admin.dashboard.reviewTransactions')}
          </button>
          <button className="action-button" onClick={() => window.location.href = '/admin/plans'}>
            {t('admin.dashboard.managePlans')}
          </button>
          <button className="action-button" onClick={() => window.location.href = '/admin/content'}>
            {t('admin.dashboard.editContent')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
```

### Gestión de Usuarios

```jsx
// frontend/src/pages/admin/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSearch, FaFilter, FaUserEdit, FaUserLock, FaUserCheck, FaEye } from 'react-icons/fa';
import api from '../../services/api';
import UserTable from '../../components/admin/UserTable';
import UserFilters from '../../components/admin/UserFilters';
import Pagination from '../../components/common/Pagination';
import UserDetailsModal from '../../components/admin/UserDetailsModal';
import UserEditModal from '../../components/admin/UserEditModal';

const UserManagement = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    registrationDate: '',
    hasReferrals: ''
  });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, filters]);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const response = await api.get('/admin/users', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: filters.search,
          status: filters.status,
          registrationDate: filters.registrationDate,
          hasReferrals: filters.hasReferrals
        }
      });
      
      setUsers(response.data.users);
      setPagination(response.data.pagination);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };
  
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };
  
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };
  
  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
  };
  
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };
  
  const handleBlockUser = async (userId, isBlocked) => {
    try {
      const action = isBlocked ? 'unblock' : 'block';
      await api.put(`/admin/users/${userId}/${action}`);
      
      // Actualizar lista de usuarios
      fetchUsers();
    } catch (error) {
      console.error(`Error ${isBlocked ? 'unblocking' : 'blocking'} user:`, error);
    }
  };
  
  const handleUserUpdated = () => {
    setIsEditModalOpen(false);
    fetchUsers();
  };
  
  return (
    <div className="user-management">
      <h1 className="page-title">{t('admin.users.title')}</h1>
      
      <div className="actions-bar">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-container">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder={t('admin.users.searchPlaceholder')}
              className="search-input"
            />
            <button type="submit" className="search-button">
              <FaSearch />
            </button>
          </div>
        </form>
        
        <button 
          className="filter-button"
          onClick={() => document.getElementById('filters-panel').classList.toggle('open')}
        >
          <FaFilter />
          {t('admin.users.filters')}
        </button>
      </div>
      
      <div id="filters-panel" className="filters-panel">
        <UserFilters filters={filters} onFilterChange={handleFilterChange} />
      </div>
      
      {loading ? (
        <div className="loading">{t('common.loading')}</div>
      ) : (
        <>
          <UserTable 
            users={users} 
            onViewDetails={handleViewDetails}
            onEditUser={handleEditUser}
            onBlockUser={handleBlockUser}
          />
          
          <Pagination 
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={handlePageChange}
          />
        </>
      )}
      
      {isDetailsModalOpen && selectedUser && (
        <UserDetailsModal 
          user={selectedUser} 
          onClose={() => setIsDetailsModalOpen(false)} 
        />
      )}
      
      {isEditModalOpen && selectedUser && (
        <UserEditModal 
          user={selectedUser} 
          onClose={() => setIsEditModalOpen(false)}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  );
};

export default UserManagement;
```

## Consideraciones de Seguridad

### Protección de Acceso

1. **Autenticación Robusta**
   - Uso de JWT con tiempo de expiración corto (8 horas)
   - Bloqueo de cuenta después de 5 intentos fallidos
   - Opción para habilitar autenticación de dos factores

2. **Control de Sesiones**
   - Registro de direcciones IP y user agents
   - Detección de sesiones simultáneas sospechosas
   - Cierre de sesión automático por inactividad

3. **Segregación de Funciones**
   - Sistema de roles y permisos granular
   - Principio de mínimo privilegio
   - Separación de responsabilidades críticas

### Auditoría y Trazabilidad

1. **Registro Detallado**
   - Logging de todas las acciones administrativas
   - Registro de cambios (antes/después)
   - Timestamps precisos

2. **Alertas de Seguridad**
   - Notificaciones para acciones sensibles
   - Alertas de patrones sospechosos
   - Monitoreo de actividad inusual

3. **Reportes de Auditoría**
   - Informes periódicos de actividad administrativa
   - Análisis de tendencias
   - Exportación de logs para revisión externa

## Métricas y Análisis

### Métricas Clave

1. **Crecimiento de Usuarios**
   - Nuevos registros por día/semana/mes
   - Tasa de conversión de preregistros
   - Retención de usuarios

2. **Métricas Financieras**
   - Volumen de transacciones
   - Ingresos por tipo de plan
   - Comisiones generadas

3. **Rendimiento del Sistema**
   - Tiempo de respuesta de API
   - Uso de recursos del servidor
   - Errores y excepciones

### Dashboard Analítico

El panel analítico incluirá visualizaciones avanzadas:

1. **Gráficos de Tendencias**
   - Crecimiento de usuarios en el tiempo
   - Evolución de ingresos
   - Actividad de referidos

2. **Mapas de Calor**
   - Distribución geográfica de usuarios
   - Horarios de mayor actividad
   - Patrones de uso

3. **Informes Personalizables**
   - Filtros avanzados
   - Exportación en múltiples formatos
   - Programación de informes automáticos

## Próximos Pasos

1. **Implementación Backend** (3 semanas)
   - Desarrollo de modelos, servicios y controladores
   - Configuración de middleware de autenticación y autorización
   - Implementación de sistema de auditoría

2. **Implementación Frontend** (3 semanas)
   - Desarrollo de componentes de UI
   - Integración con API backend
   - Implementación de gráficos y visualizaciones

3. **Pruebas** (2 semanas)
   - Pruebas unitarias y de integración
   - Pruebas de seguridad y penetración
   - Pruebas de usabilidad

4. **Documentación y Capacitación** (1 semana)
   - Manual de administración
   - Guías de procedimientos
   - Capacitación para administradores

## Conclusión

El sistema de administración de Grow5X está diseñado para proporcionar un control completo y seguro sobre todos los aspectos de la plataforma. La implementación de roles y permisos granulares garantiza que cada administrador tenga acceso solo a las funcionalidades necesarias para su trabajo, mientras que el sistema de auditoría asegura la trazabilidad de todas las acciones.

La interfaz intuitiva y las herramientas analíticas avanzadas permitirán a los administradores gestionar eficientemente la plataforma y tomar decisiones basadas en datos. La seguridad es una prioridad en todo el diseño, con múltiples capas de protección para prevenir accesos no autorizados y detectar actividades sospechosas.

El desarrollo modular permitirá implementar el sistema por fases, comenzando con las funcionalidades básicas y expandiendo gradualmente según las necesidades del negocio.