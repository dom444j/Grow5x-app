const express = require('express');
const router = express.Router();
const statisticsController = require('../../controllers/admin/statistics.controller');
const { authenticateAdmin } = require('../../middleware/auth');

/**
 * Rutas para estadísticas y métricas del sistema
 * Todas las rutas requieren autenticación de administrador
 */

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateAdmin);

// Estadísticas generales del sistema
router.get('/system', statisticsController.getSystemStats);

// Estadísticas de usuarios
router.get('/users', statisticsController.getUserStats);

// Estadísticas de transacciones
router.get('/transactions', statisticsController.getTransactionStats);

// Estadísticas de conversión
router.get('/conversion-rates', statisticsController.getConversionRateStats);

// Métricas de rendimiento del sistema
router.get('/performance', statisticsController.getSystemPerformanceStats);

// Estadísticas de referidos
router.get('/referrals', statisticsController.getReferralStats);

// Estadísticas de comisiones
router.get('/commissions', statisticsController.getCommissionStats);

// Resumen financiero
router.get('/financial-summary', statisticsController.getFinancialSummary);

module.exports = router;