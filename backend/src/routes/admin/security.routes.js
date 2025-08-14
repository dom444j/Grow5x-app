const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const securityController = require('../../controllers/admin/security.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// Middleware de autenticación y autorización para todas las rutas
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Validaciones
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número entero positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  query('sortBy').optional().isIn(['createdAt', 'severity', 'action', 'eventType']).withMessage('Campo de ordenamiento inválido'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Orden debe ser asc o desc')
];

const validateBlockUser = [
  body('userId').isMongoId().withMessage('ID de usuario inválido'),
  body('reason').isString().notEmpty().withMessage('La razón es requerida'),
  body('duration').optional().isInt({ min: 1 }).withMessage('La duración debe ser un número entero positivo (en horas)')
];

const validateUnblockUser = [
  body('userId').isMongoId().withMessage('ID de usuario inválido'),
  body('reason').isString().notEmpty().withMessage('La razón es requerida')
];

const validateCleanLogs = [
  body('daysToKeep').optional().isInt({ min: 1, max: 365 }).withMessage('Los días a mantener deben estar entre 1 y 365'),
  body('logType').optional().isIn(['all', 'admin', 'login', 'security']).withMessage('Tipo de log inválido')
];

// Rutas

/**
 * @route GET /api/admin/security/logs
 * @desc Obtener logs de administrador
 * @access Admin
 */
router.get('/logs', validatePagination, securityController.getAdminLogs);

/**
 * @route GET /api/admin/security/events
 * @desc Obtener eventos de seguridad
 * @access Admin
 */
router.get('/events', validatePagination, securityController.getSecurityEvents);

/**
 * @route GET /api/admin/security/login-attempts
 * @desc Obtener intentos de login
 * @access Admin
 */
router.get('/login-attempts', validatePagination, securityController.getLoginAttempts);

/**
 * @route POST /api/admin/security/block-user
 * @desc Bloquear usuario por seguridad
 * @access Admin
 */
router.post('/block-user', validateBlockUser, securityController.blockUserForSecurity);

/**
 * @route POST /api/admin/security/unblock-user
 * @desc Desbloquear usuario
 * @access Admin
 */
router.post('/unblock-user', validateUnblockUser, securityController.unblockUser);

/**
 * @route POST /api/admin/security/clean-logs
 * @desc Limpiar logs antiguos
 * @access Admin
 */
router.post('/clean-logs', validateCleanLogs, securityController.cleanOldLogs);

module.exports = router;