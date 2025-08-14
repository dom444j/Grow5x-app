const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const systemController = require('../../controllers/admin/system.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// Middleware de autenticación y autorización para todas las rutas
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Validaciones
const validateMaintenanceToggle = [
  body('enabled').optional().isBoolean().withMessage('Enabled debe ser un booleano'),
  body('message').optional().isString().withMessage('El mensaje debe ser una cadena de texto'),
  body('allowedRoles').optional().isArray().withMessage('Los roles permitidos deben ser un array')
];

const validateLimitsUpdate = [
  body('minWithdrawal').optional().isNumeric().withMessage('Retiro mínimo debe ser numérico'),
  body('maxWithdrawal').optional().isNumeric().withMessage('Retiro máximo debe ser numérico'),
  body('minDeposit').optional().isNumeric().withMessage('Depósito mínimo debe ser numérico'),
  body('maxDeposit').optional().isNumeric().withMessage('Depósito máximo debe ser numérico'),
  body('dailyWithdrawalLimit').optional().isNumeric().withMessage('Límite diario de retiro debe ser numérico'),
  body('monthlyWithdrawalLimit').optional().isNumeric().withMessage('Límite mensual de retiro debe ser numérico')
];

const validateFeesUpdate = [
  body('withdrawalFeePercentage').optional().isNumeric().withMessage('Porcentaje de tarifa de retiro debe ser numérico'),
  body('minimumWithdrawalFee').optional().isNumeric().withMessage('Tarifa mínima de retiro debe ser numérica'),
  body('tradingFeePercentage').optional().isNumeric().withMessage('Porcentaje de tarifa de trading debe ser numérico')
];

const validateFeatureToggle = [
  body('feature').isIn(['registration', 'withdrawals', 'deposits', 'referrals', 'trading']).withMessage('Característica inválida'),
  body('enabled').optional().isBoolean().withMessage('Enabled debe ser un booleano')
];

// Rutas

/**
 * @route GET /api/admin/system/config
 * @desc Obtener configuración del sistema
 * @access Admin
 */
router.get('/config', systemController.getSystemConfig);

/**
 * @route PUT /api/admin/system/config
 * @desc Actualizar configuración del sistema
 * @access Admin
 */
router.put('/config', systemController.updateSystemConfig);

/**
 * @route PUT /api/admin/system/maintenance
 * @desc Activar/Desactivar modo mantenimiento
 * @access Admin
 */
router.put('/maintenance', validateMaintenanceToggle, systemController.toggleMaintenance);

/**
 * @route PUT /api/admin/system/limits
 * @desc Actualizar límites del sistema
 * @access Admin
 */
router.put('/limits', validateLimitsUpdate, systemController.updateSystemLimits);

/**
 * @route PUT /api/admin/system/fees
 * @desc Actualizar tarifas del sistema
 * @access Admin
 */
router.put('/fees', validateFeesUpdate, systemController.updateSystemFees);

/**
 * @route PUT /api/admin/system/features
 * @desc Activar/Desactivar características del sistema
 * @access Admin
 */
router.put('/features', validateFeatureToggle, systemController.toggleSystemFeature);

module.exports = router;