const express = require('express');
const router = express.Router();
const systemSettingsController = require('../controllers/systemSettings.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Rutas verdaderamente públicas (sin autenticación)
router.get('/public', systemSettingsController.getPublicSettings);
router.get('/app-config', systemSettingsController.getAppConfig);

// Todas las demás rutas requieren autenticación
router.use(requireAuth);

// Rutas de administrador
router.use(requireAdmin);

// CRUD de configuraciones del sistema
router.get('/', systemSettingsController.getAllSettings);
router.get('/:key', systemSettingsController.getSettingByKey);
router.post('/', systemSettingsController.createSetting);
router.put('/:key', systemSettingsController.updateSetting);
router.delete('/:key', systemSettingsController.deleteSetting);

// Configuraciones por categoría
router.get('/category/:category', systemSettingsController.getSettingsByCategory);
router.put('/category/:category', systemSettingsController.updateCategorySettings);

// Configuraciones específicas del sistema
router.get('/email/config', systemSettingsController.getEmailConfig);
router.put('/email/config', systemSettingsController.updateEmailConfig);
router.get('/payment/config', systemSettingsController.getPaymentConfig);
router.put('/payment/config', systemSettingsController.updatePaymentConfig);
router.get('/security/config', systemSettingsController.getSecurityConfig);
router.put('/security/config', systemSettingsController.updateSecurityConfig);

// Configuraciones de la aplicación
router.get('/app/maintenance', systemSettingsController.getMaintenanceMode);
router.put('/app/maintenance', systemSettingsController.setMaintenanceMode);
router.get('/app/features', systemSettingsController.getFeatureFlags);
router.put('/app/features', systemSettingsController.updateFeatureFlags);

// Backup y restauración de configuraciones
router.post('/backup', systemSettingsController.backupSettings);
router.post('/restore', systemSettingsController.restoreSettings);
router.post('/reset', systemSettingsController.resetToDefaults);

module.exports = router;