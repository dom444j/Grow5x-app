/**
 * Rutas Optimizadas para Beneficios y Comisiones
 * Utiliza el controlador optimizado para manejar operaciones eficientes
 */

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const optimizedBenefitsController = require('../controllers/optimizedBenefits.controller');
const { requireAuth: protect, requireAdmin: authorize } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting para operaciones sensibles
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.TEST_E2E === 'true' ? 10000 : 100, // máximo requests por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting en modo TEST_E2E
    return process.env.TEST_E2E === 'true';
  }
});

const userRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: process.env.TEST_E2E === 'true' ? 10000 : 30, // máximo requests por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes, intenta de nuevo en 5 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting en modo TEST_E2E
    return process.env.TEST_E2E === 'true';
  }
});

// Validaciones comunes
const validateUserId = [
  param('userId')
    .isMongoId()
    .withMessage('ID de usuario inválido')
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser un número entero entre 1 y 100')
];

const validateRecalculation = [
  body('fromDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha debe estar en formato ISO 8601'),
  body('recalculateCommissions')
    .optional()
    .isBoolean()
    .withMessage('recalculateCommissions debe ser un booleano')
];

// ============================================================================
// RUTAS PARA USUARIOS (Protegidas)
// ============================================================================

/**
 * @route   GET /api/benefits/status/:userId
 * @desc    Obtener estado de beneficios de un usuario
 * @access  Private (Usuario propietario o Admin)
 */
router.get(
  '/status/:userId',
  userRateLimit,
  protect,
  validateUserId,
  optimizedBenefitsController.getUserBenefitStatus
);

/**
 * @route   POST /api/benefits/process-daily/:userId
 * @desc    Procesar beneficio diario para un usuario específico
 * @access  Private (Usuario propietario o Admin)
 */
router.post(
  '/process-daily/:userId',
  userRateLimit,
  protect,
  validateUserId,
  optimizedBenefitsController.processDailyBenefit
);

// ============================================================================
// RUTAS PARA ADMINISTRADORES
// ============================================================================

/**
 * @route   POST /api/benefits/process-all-daily
 * @desc    Procesar beneficios diarios para todos los usuarios elegibles
 * @access  Admin
 */
router.post(
  '/process-all-daily',
  adminRateLimit,
  protect,
  authorize,
  optimizedBenefitsController.processAllDailyBenefits
);

/**
 * @route   GET /api/benefits/system-stats
 * @desc    Obtener estadísticas del sistema de beneficios
 * @access  Admin
 */
router.get(
  '/system-stats',
  adminRateLimit,
  protect,
  authorize,
  optimizedBenefitsController.getSystemStats
);

/**
 * @route   POST /api/benefits/recalculate/:userId
 * @desc    Recalcular beneficios para un usuario (herramienta de administración)
 * @access  Admin
 */
router.post(
  '/recalculate/:userId',
  adminRateLimit,
  protect,
  authorize,
  validateUserId,
  validateRecalculation,
  optimizedBenefitsController.recalculateUserBenefits
);

/**
 * @route   GET /api/benefits/eligible-users
 * @desc    Obtener usuarios elegibles para beneficios diarios
 * @access  Admin
 */
router.get(
  '/eligible-users',
  adminRateLimit,
  protect,
  authorize,
  validatePagination,
  optimizedBenefitsController.getEligibleUsers
);

// ============================================================================
// RUTAS DE MONITOREO Y SALUD DEL SISTEMA
// ============================================================================

/**
 * @route   GET /api/benefits/health
 * @desc    Verificar salud del sistema de beneficios
 * @access  Admin
 */
router.get('/health', adminRateLimit, protect, authorize, async (req, res) => {
  try {
    const UserStatus = require('../models/UserStatus');
    const Transaction = require('../models/Transaction.model');
    const Commission = require('../models/Commission.model');
    
    // Verificaciones básicas de salud
    const healthChecks = {
      database: {
        userStatusCount: await UserStatus.countDocuments({}),
        activeSubscriptions: await UserStatus.countDocuments({
          'subscription.packageStatus': 'active'
        }),
        transactionsToday: await Transaction.countDocuments({
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }),
        pendingCommissions: await Commission.countDocuments({
          status: 'pending'
        })
      },
      
      systemStatus: {
        timestamp: new Date(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      },
      
      benefitSystem: {
        usersEligibleToday: await UserStatus.countDocuments({
          'subscription.packageStatus': 'active',
          'subscription.benefitCycle.nextBenefitDate': { $lte: new Date() },
          'subscription.benefitCycle.isPaused': false
        }),
        usersWithIssues: await UserStatus.countDocuments({
          'adminFlags.needsAttention': true
        }),
        cacheHitRate: await UserStatus.countDocuments({
          'cachedCalculations.cacheValid': true
        }) / Math.max(1, await UserStatus.countDocuments({})) * 100
      }
    };
    
    // Determinar estado general
    const isHealthy = 
      healthChecks.database.userStatusCount > 0 &&
      healthChecks.benefitSystem.cacheHitRate > 50 &&
      healthChecks.benefitSystem.usersWithIssues < healthChecks.database.activeSubscriptions * 0.1;
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      message: isHealthy ? 'Sistema saludable' : 'Sistema requiere atención',
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        checks: healthChecks,
        recommendations: isHealthy ? [] : [
          healthChecks.benefitSystem.cacheHitRate < 50 ? 'Optimizar cache de cálculos' : null,
          healthChecks.benefitSystem.usersWithIssues > 0 ? 'Revisar usuarios con problemas' : null,
          healthChecks.database.pendingCommissions > 100 ? 'Procesar comisiones pendientes' : null
        ].filter(Boolean)
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verificando salud del sistema',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ============================================================================

// Middleware para manejar errores de validación
router.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'JSON inválido en el cuerpo de la solicitud'
    });
  }
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: Object.values(error.errors).map(err => err.message)
    });
  }
  
  next(error);
});

// Middleware para rutas no encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada en el sistema de beneficios optimizado`
  });
});

module.exports = router;