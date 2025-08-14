const AdminLog = require('../../models/AdminLog.model');
const logger = require('../../utils/logger');

/**
 * Servicio centralizado para el registro de acciones de administrador
 * Proporciona funciones reutilizables para logging y auditoría
 */
class AdminLoggerService {
  /**
   * Registra una acción de administrador
   * @param {string} adminId - ID del administrador
   * @param {string} action - Acción realizada
   * @param {string} targetType - Tipo de objetivo (user, transaction, etc.)
   * @param {string} targetId - ID del objetivo
   * @param {string} details - Detalles de la acción
   * @param {Object} metadata - Metadatos adicionales
   * @param {string} severity - Nivel de severidad (low, medium, high, critical)
   * @returns {Promise<Object>} Log creado
   */
  static async logAction(adminId, action, targetType, targetId, details, metadata = {}, severity = 'medium') {
    try {
      // Mapear categoría basada en el tipo de objetivo
      const categoryMap = {
        'user': 'user_management',
        'email': 'communication',
        'transaction': 'financial',
        'system': 'system'
      };

      const logEntry = await AdminLog.create({
        admin: adminId,
        action,
        category: categoryMap[targetType] || 'system',
        description: `${action} performed on ${targetType}`,
        entityType: targetType === 'user' ? 'User' : targetType,
        entityId: targetId !== 'bulk' ? targetId : null,
        details: {
          ...details,
          metadata: {
            ...metadata,
            timestamp: new Date(),
            userAgent: metadata.userAgent || 'Unknown'
          }
        },
        session: {
          ipAddress: metadata.ipAddress || 'Unknown',
          userAgent: metadata.userAgent || 'Unknown'
        },
        severity
      });

      // Log crítico también se registra en el logger del sistema
      if (severity === 'critical') {
        logger.warn(`CRITICAL ADMIN ACTION: ${action} by ${adminId} on ${targetType}:${targetId}`, {
          adminId,
          action,
          targetType,
          targetId,
          details,
          metadata
        });
      }

      return logEntry;
    } catch (error) {
      logger.error('Error logging admin action:', {
        error: error.message,
        adminId,
        action,
        targetType,
        targetId
      });
      throw error;
    }
  }

  /**
   * Registra múltiples acciones en lote
   * @param {Array} actions - Array de objetos de acción
   * @returns {Promise<Array>} Logs creados
   */
  static async logBatchActions(actions) {
    try {
      const logEntries = actions.map(action => ({
        adminId: action.adminId,
        action: action.action,
        targetType: action.targetType,
        targetId: action.targetId,
        details: action.details,
        metadata: {
          ...action.metadata,
          timestamp: new Date(),
          batchOperation: true
        },
        severity: action.severity || 'medium'
      }));

      const createdLogs = await AdminLog.insertMany(logEntries);
      
      // Log críticos en el sistema
      const criticalActions = actions.filter(a => a.severity === 'critical');
      if (criticalActions.length > 0) {
        logger.warn(`CRITICAL BATCH ADMIN ACTIONS: ${criticalActions.length} critical actions executed`, {
          criticalActions: criticalActions.map(a => ({
            adminId: a.adminId,
            action: a.action,
            targetType: a.targetType,
            targetId: a.targetId
          }))
        });
      }

      return createdLogs;
    } catch (error) {
      logger.error('Error logging batch admin actions:', error);
      throw error;
    }
  }

  /**
   * Obtiene logs de un administrador específico
   * @param {string} adminId - ID del administrador
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Array>} Logs del administrador
   */
  static async getAdminLogs(adminId, options = {}) {
    try {
      const {
        limit = 50,
        skip = 0,
        severity,
        action,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const filters = { adminId };
      
      if (severity) filters.severity = severity;
      if (action) filters.action = { $regex: action, $options: 'i' };
      
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filters.createdAt.$lte = new Date(dateTo);
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      return await AdminLog.find(filters)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (error) {
      logger.error('Error getting admin logs:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de actividad de administradores
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Object>} Estadísticas
   */
  static async getAdminActivityStats(options = {}) {
    try {
      const {
        dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días atrás
        dateTo = new Date()
      } = options;

      const stats = await AdminLog.aggregate([
        {
          $match: {
            createdAt: {
              $gte: dateFrom,
              $lte: dateTo
            }
          }
        },
        {
          $group: {
            _id: {
              adminId: '$adminId',
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              }
            },
            totalActions: { $sum: 1 },
            severityBreakdown: {
              $push: '$severity'
            },
            actionTypes: {
              $addToSet: '$action'
            }
          }
        },
        {
          $group: {
            _id: '$_id.adminId',
            dailyActivity: {
              $push: {
                date: '$_id.date',
                totalActions: '$totalActions',
                severityBreakdown: '$severityBreakdown',
                actionTypes: '$actionTypes'
              }
            },
            totalActions: { $sum: '$totalActions' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'adminInfo'
          }
        },
        {
          $project: {
            adminId: '$_id',
            adminInfo: { $arrayElemAt: ['$adminInfo', 0] },
            totalActions: 1,
            dailyActivity: 1,
            avgDailyActions: {
              $divide: ['$totalActions', { $size: '$dailyActivity' }]
            }
          }
        }
      ]);

      return stats;
    } catch (error) {
      logger.error('Error getting admin activity stats:', error);
      throw error;
    }
  }

  /**
   * Limpia logs antiguos basado en criterios
   * @param {Object} criteria - Criterios de limpieza
   * @returns {Promise<Object>} Resultado de la limpieza
   */
  static async cleanOldLogs(criteria = {}) {
    try {
      const {
        daysToKeep = 90,
        severityToKeep = ['high', 'critical'], // Mantener logs importantes
        batchSize = 1000
      } = criteria;

      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      // Eliminar logs antiguos excepto los de severidad alta/crítica
      const deleteResult = await AdminLog.deleteMany({
        createdAt: { $lt: cutoffDate },
        severity: { $nin: severityToKeep }
      });

      logger.info('Admin logs cleanup completed', {
        deletedCount: deleteResult.deletedCount,
        cutoffDate,
        severityToKeep
      });

      return {
        deletedCount: deleteResult.deletedCount,
        cutoffDate,
        criteriaUsed: criteria
      };
    } catch (error) {
      logger.error('Error cleaning old admin logs:', error);
      throw error;
    }
  }

  /**
   * Busca logs por patrones específicos
   * @param {Object} searchCriteria - Criterios de búsqueda
   * @returns {Promise<Array>} Logs encontrados
   */
  static async searchLogs(searchCriteria) {
    try {
      const {
        textSearch,
        adminIds,
        targetTypes,
        severities,
        dateRange,
        limit = 100
      } = searchCriteria;

      const filters = {};

      if (textSearch) {
        filters.$or = [
          { action: { $regex: textSearch, $options: 'i' } },
          { details: { $regex: textSearch, $options: 'i' } }
        ];
      }

      if (adminIds && adminIds.length > 0) {
        filters.adminId = { $in: adminIds };
      }

      if (targetTypes && targetTypes.length > 0) {
        filters.targetType = { $in: targetTypes };
      }

      if (severities && severities.length > 0) {
        filters.severity = { $in: severities };
      }

      if (dateRange) {
        filters.createdAt = {};
        if (dateRange.from) filters.createdAt.$gte = new Date(dateRange.from);
        if (dateRange.to) filters.createdAt.$lte = new Date(dateRange.to);
      }

      return await AdminLog.find(filters)
        .populate('adminId', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      logger.error('Error searching admin logs:', error);
      throw error;
    }
  }
}

module.exports = AdminLoggerService;