/**
 * Middleware de Validación para Beneficios y Comisiones Optimizadas
 * Valida datos específicos del sistema de beneficios basado en información real
 * (7 paquetes, 12.5% diario, 5% comisiones especiales, etc.)
 */

const { body, param, query, validationResult } = require('express-validator');
const UserStatus = require('../models/UserStatus');
const Package = require('../models/Package');
const User = require('../models/User.model');
const logger = require('../utils/logger');
const { COMMISSION_CONFIG } = require('../config/referral.config');

/**
 * Validaciones para ID de usuario
 */
const validateUserId = [
  param('userId')
    .isMongoId()
    .withMessage('ID de usuario debe ser un ObjectId válido')
    .custom(async (userId) => {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      return true;
    })
];

/**
 * Validaciones para parámetros de paginación
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Página debe ser un número entero entre 1 y 1000'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser un número entero entre 1 y 100')
];

/**
 * Validaciones para filtros de fecha
 */
const validateDateFilters = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio debe estar en formato ISO 8601')
    .custom((startDate) => {
      const date = new Date(startDate);
      const now = new Date();
      const maxPastDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 año atrás
      
      if (date > now) {
        throw new Error('Fecha de inicio no puede ser futura');
      }
      if (date < maxPastDate) {
        throw new Error('Fecha de inicio no puede ser mayor a 1 año atrás');
      }
      return true;
    }),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin debe estar en formato ISO 8601')
    .custom((endDate, { req }) => {
      const endDateObj = new Date(endDate);
      const now = new Date();
      
      if (endDateObj > now) {
        throw new Error('Fecha de fin no puede ser futura');
      }
      
      if (req.query.startDate) {
        const startDateObj = new Date(req.query.startDate);
        if (endDateObj <= startDateObj) {
          throw new Error('Fecha de fin debe ser posterior a fecha de inicio');
        }
        
        const diffDays = (endDateObj - startDateObj) / (1000 * 60 * 60 * 24);
        if (diffDays > 90) {
          throw new Error('El rango de fechas no puede ser mayor a 90 días');
        }
      }
      
      return true;
    })
];

/**
 * Validaciones para procesamiento de beneficios
 */
const validateBenefitProcessing = [
  body('forceProcess')
    .optional()
    .isBoolean()
    .withMessage('forceProcess debe ser un booleano'),
  body('skipValidations')
    .optional()
    .isBoolean()
    .withMessage('skipValidations debe ser un booleano')
    .custom((skipValidations, { req }) => {
      if (skipValidations && req.user.role !== 'admin') {
        throw new Error('Solo administradores pueden omitir validaciones');
      }
      return true;
    }),
  body('customAmount')
    .optional()
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Monto personalizado debe estar entre 0.01 y 10000')
    .custom((customAmount, { req }) => {
      if (customAmount && req.user.role !== 'admin') {
        throw new Error('Solo administradores pueden especificar montos personalizados');
      }
      return true;
    })
];

/**
 * Validaciones para recálculo de beneficios
 */
const validateRecalculation = [
  body('fromDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha debe estar en formato ISO 8601')
    .custom((fromDate) => {
      const date = new Date(fromDate);
      const now = new Date();
      const maxPastDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // 6 meses atrás
      
      if (date > now) {
        throw new Error('Fecha no puede ser futura');
      }
      if (date < maxPastDate) {
        throw new Error('No se puede recalcular más de 6 meses atrás');
      }
      return true;
    }),
  body('recalculateCommissions')
    .optional()
    .isBoolean()
    .withMessage('recalculateCommissions debe ser un booleano'),
  body('recalculateBenefits')
    .optional()
    .isBoolean()
    .withMessage('recalculateBenefits debe ser un booleano'),
  body('reason')
    .isLength({ min: 10, max: 500 })
    .withMessage('Razón del recálculo debe tener entre 10 y 500 caracteres')
    .trim()
    .escape()
];

/**
 * Validaciones para filtros de comisiones
 */
const validateCommissionFilters = [
  query('commissionType')
    .optional()
    .isIn(['direct_referral', 'leader_bonus', 'parent_bonus']) // ⚠️ 'assignment_bonus' ELIMINADO - NO EXISTE
    .withMessage('Tipo de comisión inválido'),
  query('status')
    .optional()
    .isIn(['pending', 'paid', 'cancelled'])
    .withMessage('Estado de comisión inválido'),
  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monto mínimo debe ser un número positivo'),
  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monto máximo debe ser un número positivo')
    .custom((maxAmount, { req }) => {
      if (req.query.minAmount && parseFloat(maxAmount) <= parseFloat(req.query.minAmount)) {
        throw new Error('Monto máximo debe ser mayor al monto mínimo');
      }
      return true;
    })
];

/**
 * Validaciones para filtros de paquetes
 */
const validatePackageFilters = [
  query('packageCategory')
    .optional()
    .isIn(['starter', 'basic', 'standard', 'premium', 'professional', 'enterprise', 'vip'])
    .withMessage('Categoría de paquete inválida'),
  query('packageStatus')
    .optional()
    .isIn(['active', 'paused', 'expired', 'cancelled'])
    .withMessage('Estado de paquete inválido')
];

/**
 * Middleware para validar que el usuario puede procesar beneficios
 */
const validateUserCanProcessBenefits = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para procesar beneficios de este usuario'
      });
    }
    
    // Obtener estado del usuario
    const userStatus = await UserStatus.findOne({ user: userId });
    
    if (!userStatus) {
      return res.status(404).json({
        success: false,
        message: 'Estado de usuario no encontrado'
      });
    }
    
    // Verificar que el usuario tiene un paquete activo
    if (userStatus.subscription.packageStatus !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'El usuario no tiene un paquete activo',
        data: {
          currentStatus: userStatus.subscription.packageStatus,
          currentPackage: userStatus.subscription.currentPackage
        }
      });
    }
    
    // Verificar que el ciclo de beneficios no está pausado
    if (userStatus.subscription.benefitCycle.isPaused) {
      return res.status(400).json({
        success: false,
        message: 'El ciclo de beneficios está pausado para este usuario'
      });
    }
    
    // Verificar que no hay flags administrativos que impidan el procesamiento
    if (userStatus.adminFlags.needsAttention && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Este usuario requiere atención administrativa'
      });
    }
    
    // Agregar información del usuario al request
    req.userStatus = userStatus;
    next();
    
  } catch (error) {
    logger.error('Error validando usuario para procesamiento de beneficios:', error);
    res.status(500).json({
      success: false,
      message: 'Error validando permisos de usuario'
    });
  }
};

/**
 * Middleware para validar límites de procesamiento
 */
const validateProcessingLimits = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Verificar límite de procesamiento diario por usuario
    const Transaction = require('../models/Transaction.model');
    const todayProcessingCount = await Transaction.countDocuments({
      user: userId,
      type: 'earnings',
      subtype: 'auto_earnings',
      createdAt: { $gte: todayStart },
      'metadata.manuallyProcessed': true
    });
    
    const maxDailyProcessing = req.user.role === 'admin' ? 10 : 3;
    
    if (todayProcessingCount >= maxDailyProcessing) {
      return res.status(429).json({
        success: false,
        message: `Límite de procesamiento diario alcanzado (${maxDailyProcessing} por día)`,
        data: {
          processedToday: todayProcessingCount,
          maxAllowed: maxDailyProcessing,
          resetTime: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
        }
      });
    }
    
    next();
    
  } catch (error) {
    logger.error('Error validando límites de procesamiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error validando límites de procesamiento'
    });
  }
};

/**
 * Middleware para validar configuración de paquete
 */
const validatePackageConfiguration = async (req, res, next) => {
  try {
    const userStatus = req.userStatus;
    
    if (!userStatus.subscription.currentPackage) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no tiene un paquete asignado'
      });
    }
    
    // Obtener configuración del paquete
    const packageConfig = await Package.findOne({
      category: userStatus.subscription.currentPackage,
      status: 'active'
    });
    
    if (!packageConfig) {
      return res.status(400).json({
        success: false,
        message: 'Configuración de paquete no encontrada o inactiva',
        data: {
          packageCategory: userStatus.subscription.currentPackage
        }
      });
    }
    
    // Validar configuración de beneficios
    if (!packageConfig.benefitConfig || !packageConfig.benefitConfig.dailyRate) {
      return res.status(400).json({
        success: false,
        message: 'Configuración de beneficios incompleta en el paquete'
      });
    }
    
    // Validar que la tasa diaria esté dentro de los límites esperados (12.5% = 0.125)
    const expectedDailyRate = 0.125;
    if (Math.abs(packageConfig.benefitConfig.dailyRate - expectedDailyRate) > 0.001) {
      logger.warn(`Tasa diaria inesperada en paquete ${packageConfig.category}: ${packageConfig.benefitConfig.dailyRate}`);
    }
    
    // Agregar configuración del paquete al request
    req.packageConfig = packageConfig;
    next();
    
  } catch (error) {
    logger.error('Error validando configuración de paquete:', error);
    res.status(500).json({
      success: false,
      message: 'Error validando configuración de paquete'
    });
  }
};

/**
 * Middleware para validar timing de beneficios
 */
const validateBenefitTiming = async (req, res, next) => {
  try {
    const userStatus = req.userStatus;
    const now = new Date();
    
    // Verificar si es elegible para beneficio
    const nextBenefitDate = userStatus.subscription.benefitCycle.nextBenefitDate;
    
    if (!nextBenefitDate) {
      return res.status(400).json({
        success: false,
        message: 'Fecha de próximo beneficio no configurada'
      });
    }
    
    // Permitir procesamiento si es admin o si ya es tiempo
    const isEligible = req.user.role === 'admin' || nextBenefitDate <= now;
    const forceProcess = req.body.forceProcess === true && req.user.role === 'admin';
    
    if (!isEligible && !forceProcess) {
      const hoursRemaining = Math.ceil((nextBenefitDate - now) / (1000 * 60 * 60));
      
      return res.status(400).json({
        success: false,
        message: 'Aún no es tiempo para el próximo beneficio',
        data: {
          nextBenefitDate,
          hoursRemaining,
          canForceProcess: req.user.role === 'admin'
        }
      });
    }
    
    // Verificar límites de ciclo
    const currentDay = userStatus.subscription.benefitCycle.currentDay;
    const maxDays = 40; // 5 ciclos × 8 días
    
    if (currentDay > maxDays && !forceProcess) {
      return res.status(400).json({
        success: false,
        message: 'Usuario ha completado todos los ciclos de beneficios',
        data: {
          currentDay,
          maxDays,
          completedCycles: Math.floor(currentDay / 8)
        }
      });
    }
    
    next();
    
  } catch (error) {
    logger.error('Error validando timing de beneficios:', error);
    res.status(500).json({
      success: false,
      message: 'Error validando timing de beneficios'
    });
  }
};

/**
 * Middleware para manejar errores de validación
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: formattedErrors
    });
  }
  
  next();
};

/**
 * Middleware para validar permisos de administrador
 */
const validateAdminPermissions = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Se requieren permisos de administrador para esta operación'
    });
  }
  next();
};

/**
 * Middleware para validar operaciones de recálculo
 */
const validateRecalculationPermissions = async (req, res, next) => {
  try {
    // Solo administradores pueden hacer recálculos
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden realizar recálculos'
      });
    }
    
    // Verificar que no hay otro recálculo en progreso
    const UserStatus = require('../models/UserStatus');
    const activeRecalculations = await UserStatus.countDocuments({
      'adminFlags.isRecalculating': true
    });
    
    if (activeRecalculations > 5) {
      return res.status(429).json({
        success: false,
        message: 'Demasiados recálculos en progreso. Intenta más tarde.',
        data: {
          activeRecalculations
        }
      });
    }
    
    next();
    
  } catch (error) {
    logger.error('Error validando permisos de recálculo:', error);
    res.status(500).json({
      success: false,
      message: 'Error validando permisos de recálculo'
    });
  }
};

module.exports = {
  // Validaciones básicas
  validateUserId,
  validatePagination,
  validateDateFilters,
  
  // Validaciones específicas de beneficios
  validateBenefitProcessing,
  validateRecalculation,
  
  // Validaciones de filtros
  validateCommissionFilters,
  validatePackageFilters,
  
  // Middlewares de validación de negocio
  validateUserCanProcessBenefits,
  validateProcessingLimits,
  validatePackageConfiguration,
  validateBenefitTiming,
  
  // Middlewares de permisos
  validateAdminPermissions,
  validateRecalculationPermissions,
  
  // Middleware de manejo de errores
  handleValidationErrors,
  
  // Combinaciones comunes
  validateBasicBenefitProcessing: [
    validateUserId,
    handleValidationErrors,
    validateUserCanProcessBenefits,
    validateProcessingLimits,
    validatePackageConfiguration,
    validateBenefitTiming
  ],
  
  validateAdminBenefitOperation: [
    validateUserId,
    validateBenefitProcessing,
    handleValidationErrors,
    validateAdminPermissions,
    validateUserCanProcessBenefits,
    validatePackageConfiguration
  ],
  
  validateRecalculationOperation: [
    validateUserId,
    validateRecalculation,
    handleValidationErrors,
    validateRecalculationPermissions,
    validateUserCanProcessBenefits
  ]
};