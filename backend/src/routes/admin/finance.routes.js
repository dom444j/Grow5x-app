const express = require('express');
const router = express.Router();
const financeController = require('../../controllers/admin/finance.controller');
const { authenticateAdmin } = require('../../middleware/auth');

/**
 * Rutas para gestión de finanzas
 * Todas las rutas requieren autenticación de administrador
 */

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateAdmin);

// Resumen financiero general
router.get('/overview', financeController.getFinancialOverview);

// Flujo de caja
router.get('/cash-flow', financeController.getCashFlow);

// Análisis de rentabilidad
router.get('/profitability', financeController.getProfitabilityAnalysis);

// Balance de usuarios
router.get('/user-balances', financeController.getUserBalances);

// Ajustar balance de usuario
router.post('/user-balances/:userId/adjust', financeController.adjustUserBalance);

// Generar reporte financiero
router.get('/reports/generate', financeController.generateFinancialReport);

module.exports = router;