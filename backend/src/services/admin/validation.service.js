const mongoose = require('mongoose');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction.model');
const Withdrawal = require('../../models/Withdrawal.model');
const Payment = require('../../models/Payment');
const SystemConfig = require('../../models/SystemConfig.model');
const logger = require('../../utils/logger');

/**
 * Servicio centralizado para validaciones comunes en el módulo admin
 * Proporciona funciones reutilizables para validar datos y estados
 */
class ValidationService {
  /**
   * Valida si un ID de MongoDB es válido
   * @param {string} id - ID a validar
   * @returns {boolean} True si es válido
   */
  static isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * Valida si un email tiene formato válido
   * @param {string} email - Email a validar
   * @returns {boolean} True si es válido
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida múltiples IDs de MongoDB
   * @param {Array} ids - Array de IDs a validar
   * @returns {Object} Resultado de validación
   */
  static validateObjectIds(ids) {
    const validIds = [];
    const invalidIds = [];

    ids.forEach(id => {
      if (this.isValidObjectId(id)) {
        validIds.push(id);
      } else {
        invalidIds.push(id);
      }
    });

    return {
      valid: invalidIds.length === 0,
      validIds,
      invalidIds,
      message: invalidIds.length > 0 ? `IDs inválidos: ${invalidIds.join(', ')}` : 'Todos los IDs son válidos'
    };
  }

  /**
   * Valida si un usuario existe y está activo
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Resultado de validación
   */
  static async validateUserExists(userId) {
    try {
      if (!this.isValidObjectId(userId)) {
        return {
          valid: false,
          user: null,
          message: 'ID de usuario inválido'
        };
      }

      const user = await User.findById(userId).lean();
      
      if (!user) {
        return {
          valid: false,
          user: null,
          message: 'Usuario no encontrado'
        };
      }

      return {
        valid: true,
        user,
        message: 'Usuario válido'
      };
    } catch (error) {
      logger.error('Error validating user existence:', error);
      return {
        valid: false,
        user: null,
        message: 'Error al validar usuario'
      };
    }
  }

  /**
   * Valida transiciones de estado para usuarios
   * @param {string} currentStatus - Estado actual
   * @param {string} newStatus - Nuevo estado
   * @returns {Object} Resultado de validación
   */
  static validateUserStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'active': ['inactive', 'suspended', 'blocked'],
      'inactive': ['active', 'suspended', 'blocked'],
      'suspended': ['active', 'inactive', 'blocked'],
      'blocked': ['active', 'inactive', 'suspended']
    };

    const isValid = validTransitions[currentStatus]?.includes(newStatus) || false;
    
    return {
      valid: isValid,
      message: isValid 
        ? `Transición válida: ${currentStatus} -> ${newStatus}`
        : `Transición inválida: ${currentStatus} -> ${newStatus}`
    };
  }

  /**
   * Valida transiciones de estado para transacciones
   * @param {string} currentStatus - Estado actual
   * @param {string} newStatus - Nuevo estado
   * @returns {Object} Resultado de validación
   */
  static validateTransactionStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'pending': ['completed', 'failed', 'cancelled'],
      'processing': ['completed', 'failed', 'cancelled'],
      'failed': ['pending', 'completed'],
      'cancelled': ['pending'],
      'completed': [] // Las transacciones completadas no pueden cambiar
    };

    const isValid = validTransitions[currentStatus]?.includes(newStatus) || false;
    
    return {
      valid: isValid,
      message: isValid 
        ? `Transición válida: ${currentStatus} -> ${newStatus}`
        : `Transición inválida: ${currentStatus} -> ${newStatus}`
    };
  }

  /**
   * Valida transiciones de estado para retiros
   * @param {string} currentStatus - Estado actual
   * @param {string} newStatus - Nuevo estado
   * @returns {Object} Resultado de validación
   */
  static validateWithdrawalStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'pending': ['approved', 'rejected'],
      'approved': ['completed', 'rejected'],
      'rejected': ['pending'], // Solo si hay una razón válida
      'completed': [] // Los retiros completados no pueden cambiar
    };

    const isValid = validTransitions[currentStatus]?.includes(newStatus) || false;
    
    return {
      valid: isValid,
      message: isValid 
        ? `Transición válida: ${currentStatus} -> ${newStatus}`
        : `Transición inválida: ${currentStatus} -> ${newStatus}`
    };
  }

  /**
   * Valida montos y límites del sistema
   * @param {number} amount - Monto a validar
   * @param {string} type - Tipo de operación (withdrawal, deposit, etc.)
   * @returns {Promise<Object>} Resultado de validación
   */
  static async validateAmountLimits(amount, type) {
    try {
      const config = await SystemConfig.findOne().lean();
      
      if (!config || !config.limits) {
        return {
          valid: true,
          message: 'No hay límites configurados'
        };
      }

      const limits = config.limits;
      let minLimit, maxLimit;

      switch (type) {
        case 'withdrawal':
          minLimit = limits.minWithdrawal || 0;
          maxLimit = limits.maxWithdrawal || Infinity;
          break;
        case 'deposit':
          minLimit = limits.minDeposit || 0;
          maxLimit = limits.maxDeposit || Infinity;
          break;
        default:
          return {
            valid: true,
            message: 'Tipo de operación no requiere validación de límites'
          };
      }

      if (amount < minLimit) {
        return {
          valid: false,
          message: `El monto ${amount} es menor al mínimo permitido: ${minLimit}`
        };
      }

      if (amount > maxLimit) {
        return {
          valid: false,
          message: `El monto ${amount} excede el máximo permitido: ${maxLimit}`
        };
      }

      return {
        valid: true,
        message: 'Monto dentro de los límites permitidos'
      };
    } catch (error) {
      logger.error('Error validating amount limits:', error);
      return {
        valid: false,
        message: 'Error al validar límites de monto'
      };
    }
  }

  /**
   * Valida balance suficiente para una operación
   * @param {string} userId - ID del usuario
   * @param {number} amount - Monto requerido
   * @returns {Promise<Object>} Resultado de validación
   */
  static async validateSufficientBalance(userId, amount) {
    try {
      const user = await User.findById(userId).lean();
      
      if (!user) {
        return {
          valid: false,
          message: 'Usuario no encontrado'
        };
      }

      const availableBalance = user.balances?.available || 0;
      
      if (availableBalance < amount) {
        return {
          valid: false,
          currentBalance: availableBalance,
          requiredAmount: amount,
          deficit: amount - availableBalance,
          message: `Balance insuficiente. Disponible: ${availableBalance}, Requerido: ${amount}`
        };
      }

      return {
        valid: true,
        currentBalance: availableBalance,
        requiredAmount: amount,
        remaining: availableBalance - amount,
        message: 'Balance suficiente'
      };
    } catch (error) {
      logger.error('Error validating sufficient balance:', error);
      return {
        valid: false,
        message: 'Error al validar balance'
      };
    }
  }

  /**
   * Valida parámetros de paginación
   * @param {Object} params - Parámetros de paginación
   * @returns {Object} Parámetros validados y normalizados
   */
  static validatePaginationParams(params) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const validatedSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';

    return {
      page: validatedPage,
      limit: validatedLimit,
      skip: (validatedPage - 1) * validatedLimit,
      sortBy,
      sortOrder: validatedSortOrder,
      sortOptions: { [sortBy]: validatedSortOrder === 'desc' ? -1 : 1 }
    };
  }

  /**
   * Valida filtros de fecha
   * @param {Object} dateFilters - Filtros de fecha
   * @returns {Object} Filtros validados
   */
  static validateDateFilters(dateFilters) {
    const { dateFrom, dateTo } = dateFilters;
    const filters = {};

    if (dateFrom || dateTo) {
      filters.createdAt = {};
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          filters.createdAt.$gte = fromDate;
        }
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          filters.createdAt.$lte = toDate;
        }
      }
    }

    return filters;
  }

  /**
   * Valida permisos de administrador para una acción específica
   * @param {Object} admin - Objeto del administrador
   * @param {string} action - Acción a realizar
   * @param {string} targetType - Tipo de objetivo
   * @returns {Object} Resultado de validación
   */
  static validateAdminPermissions(admin, action, targetType) {
    // Validaciones básicas
    if (!admin) {
      return {
        valid: false,
        message: 'Administrador no encontrado'
      };
    }

    if (admin.role !== 'admin') {
      return {
        valid: false,
        message: 'Permisos insuficientes'
      };
    }

    if (admin.status !== 'active') {
      return {
        valid: false,
        message: 'Cuenta de administrador inactiva'
      };
    }

    // Validaciones específicas por acción (se puede expandir)
    const restrictedActions = {
      'delete_user': ['user'],
      'force_withdrawal': ['withdrawal'],
      'system_config': ['system']
    };

    if (restrictedActions[action] && !restrictedActions[action].includes(targetType)) {
      return {
        valid: false,
        message: `Acción ${action} no permitida para tipo ${targetType}`
      };
    }

    return {
      valid: true,
      message: 'Permisos válidos'
    };
  }
}

module.exports = ValidationService;