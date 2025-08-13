const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting para operaciones de billeteras
const walletLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes, intente más tarde'
  },
  trustProxy: false
});

// Validaciones
const createWalletValidation = [
  body('address')
    .notEmpty()
    .withMessage('La dirección es requerida')
    .isLength({ min: 26, max: 42 })
    .withMessage('Formato de dirección inválido'),
  body('network')
    .optional()
    .isIn(['BEP20'])
    .withMessage('Red no soportada'),
  body('currency')
    .optional()
    .isIn(['USDT', 'BTC', 'ETH', 'BNB'])
    .withMessage('Moneda no soportada'),
  body('label')
    .optional()
    .isLength({ max: 100 })
    .withMessage('La etiqueta no puede exceder 100 caracteres'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),

];

const updateWalletValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID de billetera inválido'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'maintenance'])
    .withMessage('Estado inválido'),
  body('label')
    .optional()
    .isLength({ max: 100 })
    .withMessage('La etiqueta no puede exceder 100 caracteres'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),

  body('monitoringEnabled')
    .optional()
    .isBoolean()
    .withMessage('El monitoreo debe ser verdadero o falso')
];

const walletIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID de billetera inválido')
];

const addNoteValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID de billetera inválido'),
  body('content')
    .notEmpty()
    .withMessage('El contenido de la nota es requerido')
    .isLength({ min: 1, max: 1000 })
    .withMessage('La nota debe tener entre 1 y 1000 caracteres')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100'),
  query('network')
    .optional()
    .isIn(['BEP20'])
    .withMessage('Red no soportada'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'maintenance'])
    .withMessage('Estado inválido')
];

/**
 * @route   GET /api/wallets
 * @desc    Obtener todas las billeteras (Admin)
 * @access  Private (Admin)
 */
router.get('/',
  authenticateToken,
  requireAdmin,
  walletLimiter,
  queryValidation,
  validateRequest,
  walletController.getAllWallets
);

/**
 * @route   POST /api/wallets
 * @desc    Crear nueva billetera (Admin)
 * @access  Private (Admin)
 */
router.post('/',
  authenticateToken,
  requireAdmin,
  walletLimiter,
  createWalletValidation,
  validateRequest,
  walletController.createWallet
);

/**
 * @route   GET /api/wallets/available
 * @desc    Obtener billetera disponible para pagos
 * @access  Private
 */
router.get('/available',
  authenticateToken,
  walletLimiter,
  query('network')
    .optional()
    .isIn(['BEP20'])
    .withMessage('Red no soportada'),
  validateRequest,
  walletController.getAvailableWallet
);

/**
 * @route   GET /api/wallets/stats
 * @desc    Obtener estadísticas de billeteras (Admin)
 * @access  Private (Admin)
 */
router.get('/stats',
  authenticateToken,
  requireAdmin,
  walletLimiter,
  walletController.getWalletStats
);

/**
 * @route   GET /api/wallets/:id
 * @desc    Obtener billetera por ID (Admin)
 * @access  Private (Admin)
 */
router.get('/:id',
  authenticateToken,
  requireAdmin,
  walletLimiter,
  walletIdValidation,
  validateRequest,
  walletController.getWalletById
);

/**
 * @route   PUT /api/wallets/:id
 * @desc    Actualizar billetera (Admin)
 * @access  Private (Admin)
 */
router.put('/:id',
  authenticateToken,
  requireAdmin,
  walletLimiter,
  updateWalletValidation,
  validateRequest,
  walletController.updateWallet
);

/**
 * @route   DELETE /api/wallets/:id
 * @desc    Eliminar billetera (Admin)
 * @access  Private (Admin)
 */
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  walletLimiter,
  walletIdValidation,
  validateRequest,
  walletController.deleteWallet
);

/**
 * @route   POST /api/wallets/:id/update-balance
 * @desc    Actualizar balance de billetera (Admin)
 * @access  Private (Admin)
 */
router.post('/:id/update-balance',
  authenticateToken,
  requireAdmin,
  walletLimiter,
  walletIdValidation,
  validateRequest,
  walletController.updateWalletBalance
);

/**
 * @route   POST /api/wallets/:id/release
 * @desc    Liberar billetera (Admin)
 * @access  Private (Admin)
 */
router.post('/:id/release',
  authenticateToken,
  requireAdmin,
  walletLimiter,
  walletIdValidation,
  validateRequest,
  walletController.releaseWallet
);

/**
 * @route   POST /api/wallets/:id/notes
 * @desc    Añadir nota a billetera (Admin)
 * @access  Private (Admin)
 */
router.post('/:id/notes',
  authenticateToken,
  requireAdmin,
  walletLimiter,
  addNoteValidation,
  validateRequest,
  walletController.addWalletNote
);

// Error handling middleware específico para rutas de billeteras
router.use((error, req, res, next) => {
  console.error('Error en rutas de billeteras:', error);
  
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
      message: 'Esta dirección de billetera ya está registrada'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

module.exports = router;