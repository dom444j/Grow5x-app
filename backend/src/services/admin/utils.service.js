const mongoose = require('mongoose');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction.model');
const Withdrawal = require('../../models/Withdrawal.model');
const Payment = require('../../models/Payment');
const SystemConfig = require('../../models/SystemConfig.model');
const logger = require('../../utils/logger');
const ValidationService = require('./validation.service');

/**
 * Servicio de utilidades comunes para el módulo admin
 * Proporciona funciones auxiliares reutilizables
 */
class AdminUtilsService {
  /**
   * Calcula estadísticas básicas para un conjunto de datos
   * @param {Array} data - Array de datos
   * @param {string} field - Campo numérico a analizar
   * @returns {Object} Estadísticas calculadas
   */
  static calculateBasicStats(data, field) {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0
      };
    }

    const values = data
      .map(item => parseFloat(item[field]) || 0)
      .filter(value => !isNaN(value));

    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0
      };
    }

    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: values.length,
      sum: parseFloat(sum.toFixed(2)),
      average: parseFloat(average.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2))
    };
  }

  /**
   * Agrupa datos por un campo específico
   * @param {Array} data - Array de datos
   * @param {string} groupField - Campo por el cual agrupar
   * @returns {Object} Datos agrupados
   */
  static groupDataBy(data, groupField) {
    if (!Array.isArray(data)) {
      return {};
    }

    return data.reduce((groups, item) => {
      const key = item[groupField] || 'undefined';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }

  /**
   * Formatea respuesta estándar para APIs admin
   * @param {boolean} success - Indica si la operación fue exitosa
   * @param {string} message - Mensaje descriptivo
   * @param {Object} data - Datos de respuesta
   * @param {Object} meta - Metadatos adicionales
   * @returns {Object} Respuesta formateada
   */
  static formatResponse(success, message, data = null, meta = {}) {
    const response = {
      success,
      message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    if (Object.keys(meta).length > 0) {
      response.meta = meta;
    }

    return response;
  }

  /**
   * Formatea respuesta paginada
   * @param {Array} data - Datos de la página actual
   * @param {number} total - Total de registros
   * @param {Object} pagination - Parámetros de paginación
   * @returns {Object} Respuesta paginada formateada
   */
  static formatPaginatedResponse(data, total, pagination) {
    const { page, limit } = pagination;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return this.formatResponse(true, 'Datos obtenidos exitosamente', data, {
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      }
    });
  }

  /**
   * Sanitiza datos de entrada removiendo campos sensibles
   * @param {Object} data - Datos a sanitizar
   * @param {Array} sensitiveFields - Campos sensibles a remover
   * @returns {Object} Datos sanitizados
   */
  static sanitizeData(data, sensitiveFields = ['password', 'token', 'secret', 'key']) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    });

    return sanitized;
  }

  /**
   * Genera filtros de búsqueda para MongoDB
   * @param {Object} searchParams - Parámetros de búsqueda
   * @returns {Object} Filtros de MongoDB
   */
  static buildSearchFilters(searchParams) {
    const filters = {};
    
    Object.keys(searchParams).forEach(key => {
      const value = searchParams[key];
      
      if (value === null || value === undefined || value === '') {
        return;
      }

      switch (key) {
        case 'status':
        case 'type':
        case 'role':
          filters[key] = value;
          break;
        
        case 'email':
        case 'username':
        case 'name':
          filters[key] = { $regex: value, $options: 'i' };
          break;
        
        case 'amountMin':
          filters.amount = { ...filters.amount, $gte: parseFloat(value) };
          break;
        
        case 'amountMax':
          filters.amount = { ...filters.amount, $lte: parseFloat(value) };
          break;
        
        case 'dateFrom':
          const fromDate = new Date(value);
          if (!isNaN(fromDate.getTime())) {
            filters.createdAt = { ...filters.createdAt, $gte: fromDate };
          }
          break;
        
        case 'dateTo':
          const toDate = new Date(value);
          if (!isNaN(toDate.getTime())) {
            filters.createdAt = { ...filters.createdAt, $lte: toDate };
          }
          break;
        
        case 'userId':
          if (ValidationService.isValidObjectId(value)) {
            filters.userId = new mongoose.Types.ObjectId(value);
          }
          break;
        
        default:
          // Para otros campos, usar coincidencia exacta
          filters[key] = value;
      }
    });

    return filters;
  }

  /**
   * Calcula comisiones basadas en configuración del sistema
   * @param {number} amount - Monto base
   * @param {string} type - Tipo de operación
   * @returns {Promise<Object>} Cálculo de comisiones
   */
  static async calculateFees(amount, type) {
    try {
      const config = await SystemConfig.findOne().lean();
      
      if (!config || !config.fees) {
        return {
          originalAmount: amount,
          feeAmount: 0,
          feePercentage: 0,
          finalAmount: amount,
          type
        };
      }

      const fees = config.fees;
      let feePercentage = 0;
      let fixedFee = 0;

      switch (type) {
        case 'withdrawal':
          feePercentage = fees.withdrawalPercentage || 0;
          fixedFee = fees.withdrawalFixed || 0;
          break;
        case 'deposit':
          feePercentage = fees.depositPercentage || 0;
          fixedFee = fees.depositFixed || 0;
          break;
        case 'transfer':
          feePercentage = fees.transferPercentage || 0;
          fixedFee = fees.transferFixed || 0;
          break;
        default:
          break;
      }

      const percentageFee = (amount * feePercentage) / 100;
      const totalFee = percentageFee + fixedFee;
      const finalAmount = amount - totalFee;

      return {
        originalAmount: parseFloat(amount.toFixed(2)),
        feeAmount: parseFloat(totalFee.toFixed(2)),
        feePercentage: parseFloat(feePercentage.toFixed(2)),
        fixedFee: parseFloat(fixedFee.toFixed(2)),
        finalAmount: parseFloat(finalAmount.toFixed(2)),
        type
      };
    } catch (error) {
      logger.error('Error calculating fees:', error);
      return {
        originalAmount: amount,
        feeAmount: 0,
        feePercentage: 0,
        finalAmount: amount,
        type,
        error: 'Error al calcular comisiones'
      };
    }
  }

  /**
   * Genera un token seguro
   * @param {number} length - Longitud del token en bytes (default: 32)
   * @returns {string} Token generado
   */
  static generateSecureToken(length = 32) {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Genera un hash único para transacciones
   * @param {Object} transactionData - Datos de la transacción
   * @returns {string} Hash único
   */
  static generateTransactionHash(transactionData) {
    const crypto = require('crypto');
    const { userId, amount, type, timestamp = Date.now() } = transactionData;
    
    const dataString = `${userId}-${amount}-${type}-${timestamp}`;
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Valida y normaliza direcciones de wallet
   * @param {string} address - Dirección a validar
   * @param {string} network - Red blockchain
   * @returns {Object} Resultado de validación
   */
  static validateWalletAddress(address, network = 'ethereum') {
    if (!address || typeof address !== 'string') {
      return {
        valid: false,
        normalized: null,
        message: 'Dirección inválida'
      };
    }

    const trimmedAddress = address.trim();
    
    // Validación básica para Ethereum
    if (network === 'ethereum') {
      const ethRegex = /^0x[a-fA-F0-9]{40}$/;
      const isValid = ethRegex.test(trimmedAddress);
      
      return {
        valid: isValid,
        normalized: isValid ? trimmedAddress.toLowerCase() : null,
        message: isValid ? 'Dirección válida' : 'Formato de dirección Ethereum inválido'
      };
    }

    // Para otras redes, validación básica
    return {
      valid: trimmedAddress.length > 10,
      normalized: trimmedAddress,
      message: trimmedAddress.length > 10 ? 'Dirección válida' : 'Dirección muy corta'
    };
  }

  /**
   * Convierte datos para exportación
   * @param {Array} data - Datos a exportar
   * @param {string} format - Formato de exportación (csv, json)
   * @returns {string} Datos formateados
   */
  static formatDataForExport(data, format = 'json') {
    if (!Array.isArray(data)) {
      return '';
    }

    switch (format.toLowerCase()) {
      case 'csv':
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(item => 
          Object.values(item).map(value => 
            typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value
          ).join(',')
        );
        
        return [headers, ...rows].join('\n');
      
      case 'json':
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Genera reporte de actividad para un período
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @returns {Promise<Object>} Reporte de actividad
   */
  static async generateActivityReport(startDate, endDate) {
    try {
      const dateFilter = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

      // Obtener estadísticas paralelas
      const [users, transactions, withdrawals, payments] = await Promise.all([
        User.countDocuments({ ...dateFilter }),
        Transaction.find(dateFilter).lean(),
        Withdrawal.find(dateFilter).lean(),
        Payment.find(dateFilter).lean()
      ]);

      // Calcular estadísticas
      const transactionStats = this.calculateBasicStats(transactions, 'amount');
      const withdrawalStats = this.calculateBasicStats(withdrawals, 'amount');
      const paymentStats = this.calculateBasicStats(payments, 'amount');

      return {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        },
        users: {
          newUsers: users
        },
        transactions: {
          count: transactions.length,
          ...transactionStats,
          byStatus: this.groupDataBy(transactions, 'status')
        },
        withdrawals: {
          count: withdrawals.length,
          ...withdrawalStats,
          byStatus: this.groupDataBy(withdrawals, 'status')
        },
        payments: {
          count: payments.length,
          ...paymentStats,
          byStatus: this.groupDataBy(payments, 'status')
        }
      };
    } catch (error) {
      logger.error('Error generating activity report:', error);
      throw new Error('Error al generar reporte de actividad');
    }
  }
}

module.exports = AdminUtilsService;