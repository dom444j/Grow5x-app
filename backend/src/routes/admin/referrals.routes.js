const express = require('express');
const router = express.Router();
const referralsController = require('../../controllers/admin/referrals.controller');
const { authenticateAdmin } = require('../../middleware/auth');

/**
 * Rutas para gestión de referidos
 * Todas las rutas requieren autenticación de administrador
 */

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateAdmin);

// Obtener lista de referidos
router.get('/', referralsController.getReferrals);

// Obtener detalles de un referido específico
router.get('/:id', referralsController.getReferralDetails);

// Obtener árbol de referidos
router.get('/tree/view', referralsController.getReferralTree);

// Obtener comisiones de referidos
router.get('/commissions/list', referralsController.getReferralCommissions);

// Procesar comisiones pendientes
router.post('/commissions/process', referralsController.processReferralCommissions);

// Obtener configuración de referidos
router.get('/settings/current', referralsController.getReferralSettings);

// Actualizar configuración de referidos
router.put('/settings/update', referralsController.updateReferralSettings);

// Exportar reporte de referidos
router.get('/reports/export', referralsController.exportReferralReport);

module.exports = router;