const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const paymentsController = require('../../controllers/admin/payments.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// Middleware de autenticación y autorización para todas las rutas
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Validaciones
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número entero positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  query('sortBy').optional().isIn(['createdAt', 'amount', 'status']).withMessage('Campo de ordenamiento inválido'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Orden debe ser asc o desc')
];

const validateBenefitActivation = [
  body('transactionId').isMongoId().withMessage('ID de transacción inválido'),
  body('reason').optional().isString().withMessage('La razón debe ser una cadena de texto')
];

const validateUnifyDuplicates = [
  body('txHash').isString().notEmpty().withMessage('txHash es requerido'),
  body('canonicalId').optional().isMongoId().withMessage('ID canónico inválido'),
  body('reason').optional().isString().withMessage('La razón debe ser una cadena de texto')
];

// Rutas

/**
 * @route GET /api/admin/payments/pending
 * @desc Obtener pagos pendientes y beneficios
 * @access Admin
 */
router.get('/pending', validatePagination, paymentsController.getPendingPaymentsAndBenefits);

/**
 * @route POST /api/admin/payments/force-benefit-activation
 * @desc Forzar activación de beneficios
 * @access Admin
 */
router.post('/force-benefit-activation', validateBenefitActivation, paymentsController.forceBenefitActivation);

/**
 * @route POST /api/admin/payments/unify-duplicates
 * @desc Unificar duplicados por txHash
 * @access Admin
 */
router.post('/unify-duplicates', validateUnifyDuplicates, paymentsController.unifyDuplicatesByTxHash);

module.exports = router;