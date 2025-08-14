const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const withdrawalsController = require('../../controllers/admin/withdrawals.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// Middleware de autenticación y autorización para todas las rutas
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Validaciones
const validateWithdrawalId = [
  param('id').isMongoId().withMessage('ID de retiro inválido')
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número entero positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  query('sortBy').optional().isIn(['createdAt', 'amount', 'status']).withMessage('Campo de ordenamiento inválido'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Orden debe ser asc o desc'),
  query('minAmount').optional().isNumeric().withMessage('Monto mínimo debe ser numérico'),
  query('maxAmount').optional().isNumeric().withMessage('Monto máximo debe ser numérico')
];

const validateApproval = [
  param('id').isMongoId().withMessage('ID de retiro inválido'),
  body('notes').optional().isString().withMessage('Las notas deben ser una cadena de texto'),
  body('txHash').optional().isString().withMessage('El hash de transacción debe ser una cadena de texto')
];

const validateRejection = [
  param('id').isMongoId().withMessage('ID de retiro inválido'),
  body('reason').isString().notEmpty().withMessage('La razón es requerida'),
  body('notes').optional().isString().withMessage('Las notas deben ser una cadena de texto')
];

const validateCompletion = [
  param('id').isMongoId().withMessage('ID de retiro inválido'),
  body('txHash').isString().notEmpty().withMessage('El hash de transacción es requerido'),
  body('notes').optional().isString().withMessage('Las notas deben ser una cadena de texto')
];

// Rutas

/**
 * @route GET /api/admin/withdrawals
 * @desc Obtener todos los retiros con paginación y filtros
 * @access Admin
 */
router.get('/', validatePagination, withdrawalsController.getAllWithdrawals);

/**
 * @route GET /api/admin/withdrawals/:id
 * @desc Obtener detalles de un retiro específico
 * @access Admin
 */
router.get('/:id', validateWithdrawalId, withdrawalsController.getWithdrawalDetails);

/**
 * @route PUT /api/admin/withdrawals/:id/approve
 * @desc Aprobar retiro
 * @access Admin
 */
router.put('/:id/approve', validateApproval, withdrawalsController.approveWithdrawal);

/**
 * @route PUT /api/admin/withdrawals/:id/reject
 * @desc Rechazar retiro
 * @access Admin
 */
router.put('/:id/reject', validateRejection, withdrawalsController.rejectWithdrawal);

/**
 * @route PUT /api/admin/withdrawals/:id/complete
 * @desc Marcar retiro como completado
 * @access Admin
 */
router.put('/:id/complete', validateCompletion, withdrawalsController.completeWithdrawal);

module.exports = router;