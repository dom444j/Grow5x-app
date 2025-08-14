const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const transactionsController = require('../../controllers/admin/transactions.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// Middleware de autenticación y autorización para todas las rutas
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Validaciones
const validateTransactionId = [
  param('id').isMongoId().withMessage('ID de transacción inválido')
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número entero positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  query('sortBy').optional().isIn(['createdAt', 'amount', 'status', 'type']).withMessage('Campo de ordenamiento inválido'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Orden debe ser asc o desc')
];

const validateStatusUpdate = [
  param('id').isMongoId().withMessage('ID de transacción inválido'),
  body('status').isIn(['pending', 'completed', 'failed', 'cancelled']).withMessage('Estado inválido'),
  body('reason').optional().isString().withMessage('La razón debe ser una cadena de texto'),
  body('notes').optional().isString().withMessage('Las notas deben ser una cadena de texto')
];

const validateManualTransaction = [
  body('userId').isMongoId().withMessage('ID de usuario inválido'),
  body('type').isIn(['adjustment', 'bonus', 'penalty', 'refund', 'manual_deposit', 'manual_withdrawal']).withMessage('Tipo de transacción inválido'),
  body('amount').isNumeric().withMessage('El monto debe ser numérico'),
  body('description').optional().isString().withMessage('La descripción debe ser una cadena de texto'),
  body('reason').isString().notEmpty().withMessage('La razón es requerida')
];

// Rutas

/**
 * @route GET /api/admin/transactions
 * @desc Obtener todas las transacciones con paginación y filtros
 * @access Admin
 */
router.get('/', validatePagination, transactionsController.getAllTransactions);

/**
 * @route GET /api/admin/transactions/:id
 * @desc Obtener detalles de una transacción específica
 * @access Admin
 */
router.get('/:id', validateTransactionId, transactionsController.getTransactionDetails);

/**
 * @route PUT /api/admin/transactions/:id/status
 * @desc Actualizar estado de transacción
 * @access Admin
 */
router.put('/:id/status', validateStatusUpdate, transactionsController.updateTransactionStatus);

/**
 * @route POST /api/admin/transactions/manual
 * @desc Crear transacción manual
 * @access Admin
 */
router.post('/manual', validateManualTransaction, transactionsController.createManualTransaction);

module.exports = router;