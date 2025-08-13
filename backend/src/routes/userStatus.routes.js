const express = require('express');
const { body, param, query } = require('express-validator');
const UserStatusController = require('../controllers/userStatus.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

console.log('🔄 UserStatus routes file loaded successfully');

/**
 * Rutas para el Sistema de Estados Unificado
 * 
 * Todas las rutas requieren autenticación.
 * Las rutas administrativas requieren rol de admin.
 */

// === RUTAS DE USUARIO ===

/**
 * @route   GET /api/user-status/me
 * @desc    Obtener estado del usuario actual
 * @access  Private
 */
router.get('/me', requireAuth, UserStatusController.getMyStatus);

/**
 * @route   GET /api/user-status/:userId
 * @desc    Obtener estado de un usuario específico
 * @access  Private (Admin o el mismo usuario)
 */
router.get('/:userId', 
  requireAuth,
  param('userId').isMongoId().withMessage('ID de usuario inválido'),
  UserStatusController.getUserStatus
);

/**
 * @route   POST /api/user-status/activate-package
 * @desc    Activar paquete de suscripción
 * @access  Private
 */
router.post('/activate-package',
  requireAuth,
  [
    body('packageType')
      .isIn(['starter', 'basic', 'standard', 'premium', 'gold', 'platinum', 'diamond'])
      .withMessage('Tipo de paquete inválido'),
    body('amount')
      .isNumeric()
      .isFloat({ min: 0.01 })
      .withMessage('Monto debe ser un número positivo'),
    body('userId')
      .optional()
      .isMongoId()
      .withMessage('ID de usuario inválido')
  ],
  UserStatusController.activatePackage
);

/**
 * @route   POST /api/user-status/activate-pioneer
 * @desc    Activar usuario Pioneer
 * @access  Private
 */
router.post('/activate-pioneer',
  requireAuth,
  [
    body('level')
      .isIn(['basic', 'premium', 'elite'])
      .withMessage('Nivel Pioneer inválido'),
    body('duration')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Duración debe ser entre 1 y 365 días'),
    body('userId')
      .optional()
      .isMongoId()
      .withMessage('ID de usuario inválido')
  ],
  UserStatusController.activatePioneer
);

/**
 * @route   POST /api/user-status/withdrawal-request
 * @desc    Procesar solicitud de retiro
 * @access  Private
 */
router.post('/withdrawal-request',
  requireAuth,
  [
    body('amount')
      .isNumeric()
      .isFloat({ min: 0.01 })
      .withMessage('Monto debe ser un número positivo')
  ],
  UserStatusController.processWithdrawalRequest
);

// === RUTAS ADMINISTRATIVAS ===

/**
 * @route   POST /api/user-status/process-benefits
 * @desc    Procesar beneficios diarios para un usuario
 * @access  Admin
 */
router.post('/process-benefits',
  requireAuth,
  adminAuth,
  [
    body('userId')
      .isMongoId()
      .withMessage('ID de usuario inválido')
  ],
  UserStatusController.processBenefits
);

/**
 * @route   POST /api/user-status/complete-pioneer-waiting
 * @desc    Completar período de espera Pioneer
 * @access  Admin
 */
router.post('/complete-pioneer-waiting',
  requireAuth,
  adminAuth,
  [
    body('userId')
      .isMongoId()
      .withMessage('ID de usuario inválido')
  ],
  UserStatusController.completePioneerWaiting
);

/**
 * @route   POST /api/user-status/flag-attention
 * @desc    Marcar usuario para atención administrativa
 * @access  Admin
 */
router.post('/flag-attention',
  requireAuth,
  adminAuth,
  [
    body('userId')
      .isMongoId()
      .withMessage('ID de usuario inválido'),
    body('reason')
      .isIn([
        'high_withdrawal_volume',
        'pioneer_waiting_period',
        'benefit_cycle_issue',
        'suspicious_activity',
        'commission_calculation_error',
        'inactive_user',
        'manual_review_required'
      ])
      .withMessage('Razón de atención inválida'),
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Prioridad inválida')
  ],
  UserStatusController.flagForAttention
);

/**
 * @route   POST /api/user-status/add-admin-note
 * @desc    Agregar nota administrativa
 * @access  Admin
 */
router.post('/add-admin-note',
  requireAuth,
  adminAuth,
  [
    body('userId')
      .isMongoId()
      .withMessage('ID de usuario inválido'),
    body('note')
      .isLength({ min: 1, max: 1000 })
      .withMessage('La nota debe tener entre 1 y 1000 caracteres'),
    body('category')
      .optional()
      .isIn(['general', 'financial', 'technical', 'support'])
      .withMessage('Categoría inválida')
  ],
  UserStatusController.addAdminNote
);

// === RUTAS DE CONSULTA ADMINISTRATIVA ===

/**
 * @route   GET /api/user-status/admin/attention-needed
 * @desc    Obtener usuarios que necesitan atención
 * @access  Admin
 */
router.get('/admin/attention-needed',
  requireAuth,
  adminAuth,
  [
    query('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Prioridad inválida')
  ],
  UserStatusController.getUsersNeedingAttention
);

/**
 * @route   GET /api/user-status/admin/pioneer-waiting
 * @desc    Obtener usuarios en período de espera Pioneer
 * @access  Admin
 */
router.get('/admin/pioneer-waiting',
  requireAuth,
  adminAuth,
  UserStatusController.getUsersInPioneerWaiting
);

/**
 * @route   GET /api/user-status/admin/benefit-processing
 * @desc    Obtener usuarios para procesamiento de beneficios
 * @access  Admin
 */
router.get('/admin/benefit-processing',
  requireAuth,
  adminAuth,
  UserStatusController.getUsersForBenefitProcessing
);

/**
 * @route   GET /api/user-status/admin/dashboard-metrics
 * @desc    Obtener métricas del dashboard administrativo
 * @access  Admin
 */
router.get('/admin/dashboard-metrics',
  requireAuth,
  adminAuth,
  UserStatusController.getDashboardMetrics
);

/**
 * @route   POST /api/user-status/admin/process-all-benefits
 * @desc    Procesar beneficios masivos para todos los usuarios elegibles
 * @access  Admin
 */
router.post('/admin/process-all-benefits',
  requireAuth,
  adminAuth,
  UserStatusController.processAllBenefits
);

module.exports = router;