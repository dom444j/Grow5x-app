const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(requireAuth);

// Rutas de reportes generales (usuarios pueden ver sus propios reportes)
router.get('/user/:userId', reportsController.getUserReports);
router.get('/user/:userId/summary', reportsController.getUserSummary);

// Rutas de administrador
router.use(requireAdmin);

// Reportes generales del sistema
router.get('/dashboard', reportsController.getDashboardReports);
router.get('/daily', reportsController.getDailyReports);
router.get('/weekly', reportsController.getWeeklyReports);
router.get('/monthly', reportsController.getMonthlyReports);
router.get('/yearly', reportsController.getYearlyReports);

// Reportes específicos
router.get('/users', reportsController.getUsersReport);
router.get('/sales', reportsController.getSalesReport);
router.get('/products', reportsController.getProductsReport);
router.get('/transactions', reportsController.getTransactionsReport);
router.get('/referrals', reportsController.getReferralsReport);

// Reportes personalizados
router.post('/custom', reportsController.generateCustomReport);
router.get('/export/:type', reportsController.exportReport);

// Estadísticas en tiempo real
router.get('/realtime/stats', reportsController.getRealtimeStats);
router.get('/realtime/activity', reportsController.getRealtimeActivity);

module.exports = router;