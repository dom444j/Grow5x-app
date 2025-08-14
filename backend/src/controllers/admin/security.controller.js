const mongoose = require('mongoose');
const AdminLog = require('../../models/AdminLog.model');
const User = require('../../models/User');
const LoginAttempt = require('../../models/LoginAttempt.model');
const SecurityEvent = require('../../models/SecurityEvent.model');
const logger = require('../../utils/logger');
const { validationResult } = require('express-validator');

// Función helper para registrar acciones de admin
const logAdminAction = async (adminId, action, targetType, targetId, details, metadata, severity = 'medium') => {
  try {
    await AdminLog.create({
      adminId,
      action,
      targetType,
      targetId,
      details,
      metadata,
      severity
    });
  } catch (error) {
    logger.error('Error logging admin action:', error);
  }
};

// Obtener logs de administrador
const getAdminLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      adminId = '',
      action = '',
      targetType = '',
      severity = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const filters = {};
    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      filters.adminId = new mongoose.Types.ObjectId(adminId);
    }
    if (action) filters.action = { $regex: action, $options: 'i' };
    if (targetType) filters.targetType = targetType;
    if (severity) filters.severity = severity;

    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);
    }

    // Configurar ordenamiento
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const logs = await AdminLog.find(filters)
      .populate('adminId', 'fullName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await AdminLog.countDocuments(filters);

    // Estadísticas de logs
    const stats = await AdminLog.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          severityBreakdown: {
            $push: '$severity'
          },
          actionBreakdown: {
            $push: '$action'
          }
        }
      },
      {
        $project: {
          totalLogs: 1,
          severityStats: {
            $reduce: {
              input: '$severityBreakdown',
              initialValue: { low: 0, medium: 0, high: 0, critical: 0 },
              in: {
                low: { $cond: [{ $eq: ['$$this', 'low'] }, { $add: ['$$value.low', 1] }, '$$value.low'] },
                medium: { $cond: [{ $eq: ['$$this', 'medium'] }, { $add: ['$$value.medium', 1] }, '$$value.medium'] },
                high: { $cond: [{ $eq: ['$$this', 'high'] }, { $add: ['$$value.high', 1] }, '$$value.high'] },
                critical: { $cond: [{ $eq: ['$$this', 'critical'] }, { $add: ['$$value.critical', 1] }, '$$value.critical'] }
              }
            }
          }
        }
      }
    ]);

    await logAdminAction(
      req.user.id,
      'view_admin_logs',
      'admin_log_list',
      null,
      `Viewed admin logs - Page ${page}`,
      { page, limit, total, filters },
      'low'
    );

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum
        },
        stats: stats[0] || {
          totalLogs: 0,
          severityStats: { low: 0, medium: 0, high: 0, critical: 0 }
        }
      }
    });

  } catch (error) {
    logger.error('Error getting admin logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener eventos de seguridad
const getSecurityEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId = '',
      eventType = '',
      severity = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const filters = {};
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filters.userId = new mongoose.Types.ObjectId(userId);
    }
    if (eventType) filters.eventType = eventType;
    if (severity) filters.severity = severity;

    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);
    }

    // Configurar ordenamiento
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const events = await SecurityEvent.find(filters)
      .populate('userId', 'fullName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await SecurityEvent.countDocuments(filters);

    // Estadísticas de eventos de seguridad
    const stats = await SecurityEvent.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          eventTypeBreakdown: {
            $push: '$eventType'
          },
          severityBreakdown: {
            $push: '$severity'
          }
        }
      }
    ]);

    await logAdminAction(
      req.user.id,
      'view_security_events',
      'security_event_list',
      null,
      `Viewed security events - Page ${page}`,
      { page, limit, total, filters },
      'low'
    );

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum
        },
        stats: stats[0] || {
          totalEvents: 0,
          eventTypeBreakdown: [],
          severityBreakdown: []
        }
      }
    });

  } catch (error) {
    logger.error('Error getting security events:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener intentos de login
const getLoginAttempts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId = '',
      success = '',
      ipAddress = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const filters = {};
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filters.userId = new mongoose.Types.ObjectId(userId);
    }
    if (success !== '') filters.success = success === 'true';
    if (ipAddress) filters.ipAddress = { $regex: ipAddress, $options: 'i' };

    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);
    }

    // Configurar ordenamiento
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const attempts = await LoginAttempt.find(filters)
      .populate('userId', 'fullName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await LoginAttempt.countDocuments(filters);

    // Estadísticas de intentos de login
    const stats = await LoginAttempt.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          successfulAttempts: {
            $sum: { $cond: ['$success', 1, 0] }
          },
          failedAttempts: {
            $sum: { $cond: ['$success', 0, 1] }
          },
          uniqueIPs: { $addToSet: '$ipAddress' },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          totalAttempts: 1,
          successfulAttempts: 1,
          failedAttempts: 1,
          uniqueIPCount: { $size: '$uniqueIPs' },
          uniqueUserCount: { $size: '$uniqueUsers' },
          successRate: {
            $multiply: [
              { $divide: ['$successfulAttempts', '$totalAttempts'] },
              100
            ]
          }
        }
      }
    ]);

    await logAdminAction(
      req.user.id,
      'view_login_attempts',
      'login_attempt_list',
      null,
      `Viewed login attempts - Page ${page}`,
      { page, limit, total, filters },
      'low'
    );

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum
        },
        stats: stats[0] || {
          totalAttempts: 0,
          successfulAttempts: 0,
          failedAttempts: 0,
          uniqueIPCount: 0,
          uniqueUserCount: 0,
          successRate: 0
        }
      }
    });

  } catch (error) {
    logger.error('Error getting login attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Bloquear usuario por seguridad
const blockUserForSecurity = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { userId, reason, duration } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (user.status === 'blocked') {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya está bloqueado'
      });
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Actualizar usuario
        user.status = 'blocked';
        user.blockedAt = new Date();
        user.blockedBy = req.user.id;
        user.blockReason = reason;
        
        if (duration) {
          user.blockedUntil = new Date(Date.now() + duration * 60 * 60 * 1000); // duration en horas
        }
        
        await user.save({ session });

        // Crear evento de seguridad
        const securityEvent = new SecurityEvent({
          userId,
          eventType: 'user_blocked',
          severity: 'high',
          description: `User blocked by admin. Reason: ${reason}`,
          metadata: {
            blockedBy: req.user.id,
            reason,
            duration,
            blockedUntil: user.blockedUntil
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        await securityEvent.save({ session });
      });

      await logAdminAction(
        req.user.id,
        'block_user_security',
        'user',
        userId,
        `Blocked user ${user.email} for security reasons. Reason: ${reason}`,
        {
          userId,
          userEmail: user.email,
          reason,
          duration,
          blockedUntil: user.blockedUntil
        },
        'high'
      );

      res.json({
        success: true,
        message: 'Usuario bloqueado exitosamente por razones de seguridad',
        data: {
          userId,
          status: 'blocked',
          blockedAt: user.blockedAt,
          blockedUntil: user.blockedUntil,
          reason
        }
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    logger.error('Error blocking user for security:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Desbloquear usuario
const unblockUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { userId, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (user.status !== 'blocked') {
      return res.status(400).json({
        success: false,
        message: 'El usuario no está bloqueado'
      });
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Actualizar usuario
        user.status = 'active';
        user.unblockedAt = new Date();
        user.unblockedBy = req.user.id;
        user.unblockReason = reason;
        user.blockedUntil = undefined;
        
        await user.save({ session });

        // Crear evento de seguridad
        const securityEvent = new SecurityEvent({
          userId,
          eventType: 'user_unblocked',
          severity: 'medium',
          description: `User unblocked by admin. Reason: ${reason}`,
          metadata: {
            unblockedBy: req.user.id,
            reason
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        await securityEvent.save({ session });
      });

      await logAdminAction(
        req.user.id,
        'unblock_user',
        'user',
        userId,
        `Unblocked user ${user.email}. Reason: ${reason}`,
        {
          userId,
          userEmail: user.email,
          reason
        },
        'medium'
      );

      res.json({
        success: true,
        message: 'Usuario desbloqueado exitosamente',
        data: {
          userId,
          status: 'active',
          unblockedAt: user.unblockedAt,
          reason
        }
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    logger.error('Error unblocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Limpiar logs antiguos
const cleanOldLogs = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { daysToKeep = 90, logType = 'all' } = req.body;
    
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    let deletedCounts = {};
    
    if (logType === 'all' || logType === 'admin') {
      const adminLogResult = await AdminLog.deleteMany({
        createdAt: { $lt: cutoffDate },
        severity: { $in: ['low', 'medium'] } // Mantener logs críticos y altos
      });
      deletedCounts.adminLogs = adminLogResult.deletedCount;
    }
    
    if (logType === 'all' || logType === 'login') {
      const loginAttemptResult = await LoginAttempt.deleteMany({
        createdAt: { $lt: cutoffDate },
        success: true // Solo eliminar intentos exitosos antiguos
      });
      deletedCounts.loginAttempts = loginAttemptResult.deletedCount;
    }
    
    if (logType === 'all' || logType === 'security') {
      const securityEventResult = await SecurityEvent.deleteMany({
        createdAt: { $lt: cutoffDate },
        severity: { $in: ['low', 'medium'] } // Mantener eventos críticos y altos
      });
      deletedCounts.securityEvents = securityEventResult.deletedCount;
    }

    await logAdminAction(
      req.user.id,
      'clean_old_logs',
      'system_maintenance',
      null,
      `Cleaned old logs older than ${daysToKeep} days. Type: ${logType}`,
      {
        daysToKeep,
        logType,
        cutoffDate,
        deletedCounts
      },
      'medium'
    );

    res.json({
      success: true,
      message: 'Logs antiguos limpiados exitosamente',
      data: {
        daysToKeep,
        logType,
        cutoffDate,
        deletedCounts
      }
    });

  } catch (error) {
    logger.error('Error cleaning old logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAdminLogs,
  getSecurityEvents,
  getLoginAttempts,
  blockUserForSecurity,
  unblockUser,
  cleanOldLogs
};