const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { body } = require('express-validator');

// Todas las rutas requieren autenticación
router.use(requireAuth);

// Rutas para usuarios
router.get('/user/:userId', notificationsController.getUserNotifications);
router.patch('/:id/read', notificationsController.markAsRead);
router.patch('/user/:userId/read-all', notificationsController.markAllAsRead);
router.delete('/:id', notificationsController.deleteNotification);

// Rutas de administrador
router.use(requireAdmin);

// CRUD de notificaciones (Admin)
router.get('/', notificationsController.getAllNotifications);
router.post('/', [
  body('title').notEmpty().withMessage('Título es requerido'),
  body('message').notEmpty().withMessage('Mensaje es requerido'),
  body('type').optional().isIn(['info', 'success', 'warning', 'error', 'system']).withMessage('Tipo inválido'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Prioridad inválida'),
  body('userId').optional().isMongoId().withMessage('ID de usuario inválido'),
  body('actionUrl').optional().isURL().withMessage('URL de acción inválida')
], notificationsController.createNotification);

// Notificaciones masivas
router.post('/bulk', [
  body('title').notEmpty().withMessage('Título es requerido'),
  body('message').notEmpty().withMessage('Mensaje es requerido'),
  body('type').optional().isIn(['info', 'success', 'warning', 'error', 'system']).withMessage('Tipo inválido'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Prioridad inválida'),
  body('userIds').optional().isArray().withMessage('IDs de usuarios debe ser un array')
], notificationsController.createBulkNotification);

// Estadísticas y mantenimiento
router.get('/stats/overview', notificationsController.getNotificationStats);
router.delete('/cleanup/expired', notificationsController.cleanupExpiredNotifications);

module.exports = router;