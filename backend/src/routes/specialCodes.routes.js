const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const specialCodesController = require('../controllers/specialCodes.controller');

const { requireAuth, requireAdmin } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting para operaciones de códigos especiales
const specialCodesRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
  },
  trustProxy: true
});

// Rate limiting más estricto para creación y modificación
const modificationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // máximo 10 modificaciones por ventana
  message: {
    success: false,
    message: 'Demasiadas modificaciones, intenta de nuevo más tarde'
  },
  trustProxy: false
});

// Validaciones
const createSpecialCodeValidation = [
  body('type')
    .isIn(['leader', 'parent'])
    .withMessage('El tipo debe ser "leader" o "parent"'),
  body('userId')
    .isMongoId()
    .withMessage('ID de usuario inválido'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
];

const updateSpecialCodeValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID de código especial inválido'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('El campo activo debe ser booleano'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
];

const transferSpecialCodeValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID de código especial inválido'),
  body('newUserId')
    .isMongoId()
    .withMessage('ID de nuevo usuario inválido'),
  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('La razón no puede exceder 200 caracteres')
];

const processCommissionPaymentsValidation = [
  body('commissionIds')
    .isArray({ min: 1 })
    .withMessage('Se requiere al menos un ID de comisión'),
  body('commissionIds.*')
    .isMongoId()
    .withMessage('ID de comisión inválido')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100')
];

// Aplicar middleware de autenticación y autorización a todas las rutas
router.use(requireAuth);
router.use(requireAdmin);
router.use(specialCodesRateLimit);

/**
 * @route GET /api/admin/special-codes
 * @desc Obtener todos los códigos especiales
 * @access Admin
 */
router.get('/', 
  [
    query('active')
      .optional()
      .isBoolean()
      .withMessage('El filtro activo debe ser booleano'),
    query('type')
      .optional()
      .isIn(['leader', 'parent'])
      .withMessage('El tipo debe ser "leader" o "parent"')
  ],
  specialCodesController.getAllSpecialCodes
);

/**
 * @route GET /api/admin/special-codes/statistics
 * @desc Obtener estadísticas de códigos especiales
 * @access Admin
 */
router.get('/statistics',
  queryRateLimit,
  specialCodesController.getSpecialCodesStatistics
);

/**
 * @route GET /api/admin/special-codes/configuration
 * @desc Obtener configuración del sistema de códigos especiales
 * @access Admin
 */
router.get('/configuration',
  queryRateLimit,
  specialCodesController.getConfiguration
);

/**
 * @route GET /api/admin/special-codes/second-week-commission-stats
 * @desc Obtener estadísticas de comisiones de segunda semana
 * @access Admin
 */
router.get('/second-week-commission-stats',
  specialCodesController.getSecondWeekCommissionStats
);

/**
 * @route GET /api/admin/special-codes/:id
 * @desc Obtener código especial por ID
 * @access Admin
 */
router.get('/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('ID de código especial inválido')
  ],
  specialCodesController.getSpecialCodeById
);

/**
 * @route GET /api/admin/special-codes/:id/commissions
 * @desc Obtener historial de comisiones de un código especial
 * @access Admin
 */
router.get('/:id/commissions',
  [
    param('id')
      .isMongoId()
      .withMessage('ID de código especial inválido'),
    ...paginationValidation,
    query('status')
      .optional()
      .isIn(['pending', 'paid', 'cancelled'])
      .withMessage('El estado debe ser "pending", "paid" o "cancelled"')
  ],
  specialCodesController.getCommissionHistory
);

/**
 * @route POST /api/admin/special-codes
 * @desc Crear nuevo código especial
 * @access Admin
 */
router.post('/',
  modificationRateLimit,
  createSpecialCodeValidation,
  specialCodesController.createSpecialCode
);

/**
 * @route PUT /api/admin/special-codes/:id
 * @desc Actualizar código especial
 * @access Admin
 */
router.put('/:id',
  modificationRateLimit,
  updateSpecialCodeValidation,
  specialCodesController.updateSpecialCode
);

/**
 * @route DELETE /api/admin/special-codes/:id
 * @desc Eliminar (desactivar) código especial
 * @access Admin
 */
router.delete('/:id',
  modificationRateLimit,
  [
    param('id')
      .isMongoId()
      .withMessage('ID de código especial inválido')
  ],
  specialCodesController.deleteSpecialCode
);

/**
 * @route POST /api/admin/special-codes/:id/transfer
 * @desc Transferir código especial a otro usuario
 * @access Admin
 */
router.post('/:id/transfer',
  modificationRateLimit,
  transferSpecialCodeValidation,
  specialCodesController.transferSpecialCode
);

/**
 * @route POST /api/admin/special-codes/process-payments
 * @desc Procesar pagos de comisiones pendientes
 * @access Admin
 */
router.post('/process-payments',
  modificationRateLimit,
  processCommissionPaymentsValidation,
  specialCodesController.processCommissionPayments
);

/**
 * @route POST /api/admin/special-codes/apply-manual-benefits
 * @desc Aplicar beneficios manualmente para códigos PADRE y LIDER
 * @access Admin
 */
router.post('/apply-manual-benefits',
  modificationRateLimit,
  [
    body('codeId')
      .isMongoId()
      .withMessage('ID de código especial inválido'),
    body('userId')
      .isMongoId()
      .withMessage('ID de usuario inválido'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('El monto debe ser un número mayor a 0.01'),
    body('reason')
      .isLength({ min: 5, max: 500 })
      .withMessage('La razón debe tener entre 5 y 500 caracteres'),
    body('benefitType')
      .isIn(['leader_bonus', 'parent_bonus'])
      .withMessage('El tipo de beneficio debe ser "leader_bonus" o "parent_bonus"')
  ],
  specialCodesController.applyManualBenefits
);

// Middleware de manejo de errores específico para códigos especiales
router.use((error, req, res, next) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: Object.values(error.errors).map(err => err.message)
    });
  }
  
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Ya existe un código especial con estos datos'
    });
  }
  
  next(error);
});

module.exports = router;