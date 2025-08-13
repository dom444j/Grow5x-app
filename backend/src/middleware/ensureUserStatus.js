/**
 * 🛡️ MIDDLEWARE: ENSURE USER STATUS
 * 
 * Este middleware garantiza que cada usuario autenticado tenga un UserStatus
 * correspondiente, creándolo automáticamente si no existe.
 * 
 * PROPÓSITO:
 * - Prevenir usuarios sin UserStatus en el futuro
 * - Auto-crear UserStatus cuando sea necesario
 * - Mantener consistencia de datos
 * - Logging de auto-creaciones para auditoría
 * 
 * USO:
 * - Aplicar en rutas que requieren UserStatus
 * - Especialmente en rutas de administración
 * - En endpoints de gestión de usuarios
 */

const UserStatus = require('../models/UserStatus');
const UserStatusService = require('../services/UserStatusService');
const logger = require('../utils/logger');

/**
 * Middleware para asegurar que el usuario tenga UserStatus
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const ensureUserStatus = async (req, res, next) => {
  try {
    // Solo procesar si hay usuario autenticado
    if (!req.user || !req.user.id) {
      return next();
    }
    
    const userId = req.user.id;
    
    // Verificar si ya existe UserStatus
    let userStatus = await UserStatus.findOne({ user: userId });
    
    if (!userStatus) {
      // Auto-crear UserStatus
      logger.info(`Auto-creando UserStatus para usuario: ${userId}`, {
        userId,
        userEmail: req.user.email,
        route: req.route?.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
      
      try {
        userStatus = await UserStatusService.getOrCreateUserStatus(userId);
        
        logger.info(`UserStatus auto-creado exitosamente para usuario: ${userId}`, {
          userId,
          userStatusId: userStatus._id,
          createdAt: userStatus.createdAt
        });
        
        // Agregar flag para indicar que fue auto-creado
        req.userStatusAutoCreated = true;
        
      } catch (createError) {
        logger.error(`Error auto-creando UserStatus para usuario: ${userId}`, {
          userId,
          error: createError.message,
          stack: createError.stack
        });
        
        // No fallar la request, solo loggear el error
        req.userStatusError = createError.message;
      }
    }
    
    // Adjuntar UserStatus al request para uso posterior
    if (userStatus) {
      req.userStatus = userStatus;
    }
    
    next();
    
  } catch (error) {
    logger.error('Error en middleware ensureUserStatus:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      route: req.route?.path
    });
    
    // No fallar la request por errores del middleware
    next();
  }
};

/**
 * Middleware específico para rutas administrativas
 * Más estricto y con logging adicional
 */
const ensureUserStatusAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next();
    }
    
    const userId = req.user.id;
    
    // Para administradores, siempre verificar UserStatus
    let userStatus = await UserStatus.findOne({ user: userId }).populate('user');
    
    if (!userStatus) {
      logger.warn(`Administrador sin UserStatus detectado: ${userId}`, {
        userId,
        userEmail: req.user.email,
        userRole: req.user.role,
        route: req.route?.path,
        adminAction: true
      });
      
      // Auto-crear con prioridad alta para administradores
      userStatus = await UserStatusService.getOrCreateUserStatus(userId);
      
      // Marcar como que necesita atención administrativa
      userStatus.adminFlags.needsAttention = true;
      userStatus.adminFlags.attentionReason = 'UserStatus auto-creado para administrador';
      userStatus.adminFlags.priority = 'high';
      userStatus.adminFlags.adminNotes.push({
        note: 'UserStatus auto-creado durante acceso administrativo',
        addedBy: userId,
        addedAt: new Date(),
        category: 'system'
      });
      
      await userStatus.save();
      
      logger.info(`UserStatus auto-creado para administrador: ${userId}`, {
        userId,
        userStatusId: userStatus._id,
        adminAutoCreated: true
      });
    }
    
    req.userStatus = userStatus;
    next();
    
  } catch (error) {
    logger.error('Error en middleware ensureUserStatusAdmin:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      route: req.route?.path
    });
    
    // Para rutas admin, es más crítico, pero aún no fallar
    next();
  }
};

/**
 * Middleware para verificar UserStatus en operaciones críticas
 * Falla la request si no se puede crear UserStatus
 */
const requireUserStatus = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    const userId = req.user.id;
    
    let userStatus = await UserStatus.findOne({ user: userId });
    
    if (!userStatus) {
      logger.warn(`UserStatus requerido pero no existe para usuario: ${userId}`, {
        userId,
        route: req.route?.path,
        method: req.method,
        critical: true
      });
      
      try {
        userStatus = await UserStatusService.getOrCreateUserStatus(userId);
        
        logger.info(`UserStatus creado en operación crítica para usuario: ${userId}`, {
          userId,
          userStatusId: userStatus._id,
          criticalOperation: true
        });
        
      } catch (createError) {
        logger.error(`Error crítico creando UserStatus para usuario: ${userId}`, {
          userId,
          error: createError.message,
          stack: createError.stack
        });
        
        return res.status(500).json({
          success: false,
          message: 'Error interno: No se pudo inicializar el estado del usuario',
          code: 'USER_STATUS_CREATION_FAILED'
        });
      }
    }
    
    req.userStatus = userStatus;
    next();
    
  } catch (error) {
    logger.error('Error en middleware requireUserStatus:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      route: req.route?.path
    });
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'USER_STATUS_MIDDLEWARE_ERROR'
    });
  }
};

/**
 * Middleware para verificar y crear UserStatus para usuarios específicos
 * Útil en operaciones administrativas sobre otros usuarios
 */
const ensureTargetUserStatus = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId || req.body.userId || req.query.userId;
    
    if (!targetUserId) {
      return next(); // No hay usuario objetivo, continuar
    }
    
    let targetUserStatus = await UserStatus.findOne({ user: targetUserId });
    
    if (!targetUserStatus) {
      logger.info(`Auto-creando UserStatus para usuario objetivo: ${targetUserId}`, {
        targetUserId,
        adminUserId: req.user?.id,
        route: req.route?.path,
        adminOperation: true
      });
      
      try {
        targetUserStatus = await UserStatusService.getOrCreateUserStatus(targetUserId);
        
        // Agregar nota administrativa
        targetUserStatus.adminFlags.adminNotes.push({
          note: `UserStatus auto-creado durante operación administrativa por ${req.user?.email}`,
          addedBy: req.user?.id,
          addedAt: new Date(),
          category: 'admin_operation'
        });
        
        await targetUserStatus.save();
        
        logger.info(`UserStatus auto-creado para usuario objetivo: ${targetUserId}`, {
          targetUserId,
          userStatusId: targetUserStatus._id,
          adminUserId: req.user?.id
        });
        
      } catch (createError) {
        logger.error(`Error auto-creando UserStatus para usuario objetivo: ${targetUserId}`, {
          targetUserId,
          adminUserId: req.user?.id,
          error: createError.message
        });
        
        // No fallar la operación administrativa
      }
    }
    
    if (targetUserStatus) {
      req.targetUserStatus = targetUserStatus;
    }
    
    next();
    
  } catch (error) {
    logger.error('Error en middleware ensureTargetUserStatus:', {
      error: error.message,
      stack: error.stack,
      targetUserId: req.params.userId,
      adminUserId: req.user?.id
    });
    
    next(); // No fallar operaciones administrativas
  }
};

/**
 * Middleware para logging de estadísticas de UserStatus
 * Útil para monitoreo y debugging
 */
const logUserStatusStats = async (req, res, next) => {
  try {
    // Solo ejecutar en rutas específicas o con flag
    if (!req.query.includeStats && !req.logUserStatusStats) {
      return next();
    }
    
    const stats = await Promise.all([
      UserStatus.countDocuments({}),
      UserStatus.countDocuments({ 'subscription.packageStatus': 'active' }),
      UserStatus.countDocuments({ 'adminFlags.needsAttention': true }),
      UserStatus.countDocuments({ 'pioneer.isActive': true })
    ]);
    
    const [total, activePackages, needsAttention, pioneers] = stats;
    
    logger.info('UserStatus Statistics', {
      total,
      activePackages,
      needsAttention,
      pioneers,
      route: req.route?.path,
      timestamp: new Date().toISOString()
    });
    
    // Adjuntar stats al request si se solicita
    if (req.query.includeStats) {
      req.userStatusStats = {
        total,
        activePackages,
        needsAttention,
        pioneers
      };
    }
    
    next();
    
  } catch (error) {
    logger.error('Error en middleware logUserStatusStats:', error);
    next(); // No fallar por errores de logging
  }
};

module.exports = {
  ensureUserStatus,
  ensureUserStatusAdmin,
  requireUserStatus,
  ensureTargetUserStatus,
  logUserStatusStats
};

/**
 * GUÍA DE USO:
 * 
 * 1. ensureUserStatus - Uso general, no falla requests
 *    app.use('/api/user', ensureUserStatus, userRoutes);
 * 
 * 2. ensureUserStatusAdmin - Para rutas administrativas
 *    app.use('/api/admin', ensureUserStatusAdmin, adminRoutes);
 * 
 * 3. requireUserStatus - Para operaciones críticas
 *    router.post('/activate-package', requireUserStatus, controller.activatePackage);
 * 
 * 4. ensureTargetUserStatus - Para operaciones sobre otros usuarios
 *    router.put('/users/:userId/status', ensureTargetUserStatus, controller.updateUserStatus);
 * 
 * 5. logUserStatusStats - Para monitoreo
 *    router.get('/dashboard', logUserStatusStats, controller.getDashboard);
 */