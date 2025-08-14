const express = require('express');
const router = express.Router();
const emailsController = require('../../controllers/admin/emails.controller');
const { authenticateToken, requireAdmin } = require('../../middleware/auth.middleware');

/**
 * Rutas para gestión de correos electrónicos
 * Todas las rutas requieren autenticación de administrador
 */

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);
router.use(requireAdmin);

// Reenviar email de verificación
router.post('/verification/:userId/resend', emailsController.resendVerificationEmail);

// Forzar verificación de email
router.post('/verification/:userId/force', emailsController.forceEmailVerification);

// Obtener errores de email
router.get('/errors', emailsController.getEmailErrors);

// Obtener estadísticas de emails
router.get('/stats', emailsController.getEmailStats);

// Reenviar email fallido
router.post('/failed/:logId/resend', emailsController.resendFailedEmail);

// Obtener plantillas de email disponibles
router.get('/templates', emailsController.getEmailTemplates);

// Enviar email personalizado
router.post('/send-custom', emailsController.sendCustomEmail);

module.exports = router;