const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Middleware para validar errores
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

// ===== RUTAS DE CONFIGURACIONES GENERALES =====

// Obtener configuraciones generales del usuario
router.get('/general', 
  requireAuth, 
  settingsController.getGeneralSettings
);

// Actualizar configuraciones generales
router.put('/general',
  requireAuth,
  [
    body('language').optional().isIn(['es', 'en', 'pt']).withMessage('Idioma no válido'),
    body('theme').optional().isIn(['light', 'dark', 'system']).withMessage('Tema no válido'),
    body('timezone').optional().isString().withMessage('Zona horaria debe ser una cadena'),
    body('currency').optional().isIn(['USD', 'EUR', 'MXN', 'BRL']).withMessage('Moneda no válida')
  ],
  handleValidationErrors,
  settingsController.updateGeneralSettings
);

// ===== RUTAS DE CONFIGURACIONES DE NOTIFICACIONES =====

// Obtener configuraciones de notificaciones
router.get('/notifications', 
  requireAuth, 
  settingsController.getNotificationSettings
);

// Actualizar configuraciones de notificaciones
router.put('/notifications',
  requireAuth,
  [
    body('emailNotifications').optional().isBoolean().withMessage('emailNotifications debe ser booleano'),
    body('pushNotifications').optional().isBoolean().withMessage('pushNotifications debe ser booleano'),
    body('smsNotifications').optional().isBoolean().withMessage('smsNotifications debe ser booleano'),
    body('marketingEmails').optional().isBoolean().withMessage('marketingEmails debe ser booleano'),
    body('securityAlerts').optional().isBoolean().withMessage('securityAlerts debe ser booleano'),
    body('transactionAlerts').optional().isBoolean().withMessage('transactionAlerts debe ser booleano'),
    body('referralNotifications').optional().isBoolean().withMessage('referralNotifications debe ser booleano'),
    body('systemUpdates').optional().isBoolean().withMessage('systemUpdates debe ser booleano')
  ],
  handleValidationErrors,
  settingsController.updateNotificationSettings
);

// ===== RUTAS DE CONFIGURACIONES DE PRIVACIDAD =====

// Obtener configuraciones de privacidad
router.get('/privacy', 
  requireAuth, 
  settingsController.getPrivacySettings
);

// Actualizar configuraciones de privacidad
router.put('/privacy',
  requireAuth,
  [
    body('profileVisibility').optional().isIn(['public', 'private', 'friends']).withMessage('Visibilidad de perfil no válida'),
    body('showEmail').optional().isBoolean().withMessage('showEmail debe ser booleano'),
    body('showPhone').optional().isBoolean().withMessage('showPhone debe ser booleano'),
    body('showLastActivity').optional().isBoolean().withMessage('showLastActivity debe ser booleano'),
    body('allowDataCollection').optional().isBoolean().withMessage('allowDataCollection debe ser booleano'),
    body('allowAnalytics').optional().isBoolean().withMessage('allowAnalytics debe ser booleano'),
    body('twoFactorAuth').optional().isBoolean().withMessage('twoFactorAuth debe ser booleano')
  ],
  handleValidationErrors,
  settingsController.updatePrivacySettings
);

// ===== RUTAS DE CONFIGURACIONES DE SEGURIDAD =====

// Obtener configuraciones de seguridad
router.get('/security', 
  requireAuth, 
  settingsController.getSecuritySettings
);

// Actualizar configuraciones de seguridad
router.put('/security',
  requireAuth,
  [
    body('sessionTimeout').optional().isInt({ min: 0, max: 480 }).withMessage('Tiempo de sesión debe estar entre 0 y 480 minutos'),
    body('loginNotifications').optional().isBoolean().withMessage('loginNotifications debe ser booleano'),
    body('deviceTracking').optional().isBoolean().withMessage('deviceTracking debe ser booleano'),
    body('autoLogout').optional().isBoolean().withMessage('autoLogout debe ser booleano')
  ],
  handleValidationErrors,
  settingsController.updateSecuritySettings
);

// ===== RUTAS DE CONFIGURACIONES ESPECÍFICAS =====

// Actualizar tema
router.put('/theme',
  requireAuth,
  [
    body('theme').isIn(['light', 'dark', 'system']).withMessage('Tema no válido')
  ],
  handleValidationErrors,
  settingsController.updateTheme
);

// Actualizar idioma
router.put('/language',
  requireAuth,
  [
    body('language').isIn(['es', 'en', 'pt']).withMessage('Idioma no válido')
  ],
  handleValidationErrors,
  settingsController.updateLanguage
);

// ===== RUTAS DE GESTIÓN DE CONFIGURACIONES =====

// Obtener todas las configuraciones del usuario
router.get('/all', 
  requireAuth, 
  settingsController.getAllSettings
);

// Resetear configuraciones
router.post('/reset',
  requireAuth,
  [
    body('category').optional().isIn(['general', 'notifications', 'privacy', 'security', 'all']).withMessage('Categoría no válida')
  ],
  handleValidationErrors,
  settingsController.resetSettings
);

// Exportar configuraciones
router.get('/export', 
  requireAuth, 
  settingsController.exportSettings
);

// Importar configuraciones
router.post('/import',
  requireAuth,
  settingsController.importSettings
);

// ===== RUTAS DE AUTENTICACIÓN DE DOS FACTORES =====

// Habilitar 2FA
router.post('/2fa/enable',
  requireAuth,
  settingsController.enable2FA
);

// Deshabilitar 2FA
router.post('/2fa/disable',
  requireAuth,
  [
    body('code').isLength({ min: 6, max: 6 }).withMessage('Código debe tener 6 dígitos')
  ],
  handleValidationErrors,
  settingsController.disable2FA
);

// Verificar 2FA
router.post('/2fa/verify',
  requireAuth,
  [
    body('code').isLength({ min: 6, max: 6 }).withMessage('Código debe tener 6 dígitos')
  ],
  handleValidationErrors,
  settingsController.verify2FA
);

// ===== RUTAS DE GESTIÓN DE DISPOSITIVOS =====

// Obtener dispositivos del usuario
router.get('/devices', 
  requireAuth, 
  settingsController.getDevices
);

// Revocar dispositivo
router.delete('/devices/:deviceId',
  requireAuth,
  settingsController.revokeDevice
);

// ===== RUTAS DE GESTIÓN DE SESIONES =====

// Obtener sesiones activas
router.get('/sessions', 
  requireAuth, 
  settingsController.getSessions
);

// Revocar sesión específica
router.delete('/sessions/:sessionId',
  requireAuth,
  settingsController.revokeSession
);

// Revocar todas las sesiones
router.delete('/sessions/all',
  requireAuth,
  settingsController.revokeAllSessions
);

// ===== RUTAS DE GESTIÓN DE CLAVES API =====

// Obtener claves API del usuario
router.get('/api-keys', 
  requireAuth, 
  settingsController.getApiKeys
);

// Crear nueva clave API
router.post('/api-keys',
  requireAuth,
  [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Nombre de clave API requerido'),
    body('permissions').optional().isArray().withMessage('Permisos deben ser un array')
  ],
  handleValidationErrors,
  settingsController.createApiKey
);

// Revocar clave API
router.delete('/api-keys/:keyId',
  requireAuth,
  settingsController.revokeApiKey
);

// ===== RUTAS DE ADMINISTRACIÓN =====

// Obtener configuraciones de todos los usuarios (Admin)
router.get('/admin/all',
  requireAuth,
  requireAdmin,
  settingsController.getAllUserSettings
);

// Obtener configuraciones de un usuario específico (Admin)
router.get('/admin/user/:userId',
  requireAuth,
  requireAdmin,
  settingsController.getUserSettings
);

// Actualizar configuraciones de un usuario (Admin)
router.put('/admin/user/:userId',
  requireAuth,
  requireAdmin,
  settingsController.updateUserSettings
);

// Estadísticas de configuraciones (Admin)
router.get('/admin/stats',
  requireAuth,
  requireAdmin,
  settingsController.getSettingsStats
);

// Resetear configuraciones de un usuario (Admin)
router.post('/admin/user/:userId/reset',
  requireAuth,
  requireAdmin,
  [
    body('category').optional().isIn(['general', 'notifications', 'privacy', 'security', 'all']).withMessage('Categoría no válida')
  ],
  handleValidationErrors,
  settingsController.resetUserSettings
);

module.exports = router;