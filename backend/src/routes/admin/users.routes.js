const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const usersController = require('../../controllers/admin/users.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// Middleware de autenticación y autorización para todas las rutas
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Validaciones
const validateUserId = [
  param('id').isMongoId().withMessage('ID de usuario inválido')
];

const validateUserUpdate = [
  param('id').isMongoId().withMessage('ID de usuario inválido'),
  body('status').optional().isIn(['active', 'inactive', 'suspended', 'blocked']).withMessage('Estado inválido'),
  body('role').optional().isIn(['user', 'admin', 'moderator']).withMessage('Rol inválido'),
  body('reason').optional().isString().withMessage('La razón debe ser una cadena de texto')
];

const validateBalanceAdjustment = [
  param('id').isMongoId().withMessage('ID de usuario inválido'),
  body('amount').isNumeric().withMessage('El monto debe ser numérico'),
  body('type').isIn(['add', 'subtract']).withMessage('Tipo debe ser add o subtract'),
  body('reason').isString().notEmpty().withMessage('La razón es requerida')
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número entero positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  query('sortBy').optional().isIn(['createdAt', 'fullName', 'email', 'balances.available', 'lastLogin']).withMessage('Campo de ordenamiento inválido'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Orden debe ser asc o desc')
];

// Rutas

/**
 * @route GET /api/admin/users
 * @desc Obtener todos los usuarios con paginación y filtros
 * @access Admin
 */
router.get('/', validatePagination, usersController.getAllUsers);

/**
 * @route GET /api/admin/users/:id
 * @desc Obtener detalles de un usuario específico
 * @access Admin
 */
router.get('/:id', validateUserId, usersController.getUserDetails);

/**
 * @route PUT /api/admin/users/:id/status
 * @desc Actualizar estado de usuario
 * @access Admin
 */
router.put('/:id/status', validateUserUpdate, usersController.updateUserStatus);

/**
 * @route PUT /api/admin/users/:id/balance
 * @desc Ajustar balance de usuario
 * @access Admin
 */
router.put('/:id/balance', validateBalanceAdjustment, usersController.adjustUserBalance);

module.exports = router;