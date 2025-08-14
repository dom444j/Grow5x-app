const express = require('express');
const router = express.Router();

// Importar rutas modulares
const usersRoutes = require('./users.routes');
const paymentsRoutes = require('./payments.routes');
const transactionsRoutes = require('./transactions.routes');
const withdrawalsRoutes = require('./withdrawals.routes');
const systemRoutes = require('./system.routes');
const securityRoutes = require('./security.routes');
const statisticsRoutes = require('./statistics.routes');
const referralsRoutes = require('./referrals.routes');
const financeRoutes = require('./finance.routes');
const withdrawalBatchesRoutes = require('./withdrawalBatches.routes');
const emailsRoutes = require('./emails.routes');
const specialCodesRoutes = require('../specialCodes.routes');

// Importar el controlador de dashboard existente
const dashboardController = require('../../controllers/admin/dashboard.controller');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// Middleware de autenticación y autorización para el dashboard
router.use('/dashboard', authenticateToken, requireRole(['admin']));

// Ruta del dashboard (mantener la existente)
router.get('/dashboard/stats', dashboardController.getDashboardStats);

// Montar rutas modulares
router.use('/users', usersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/withdrawals', withdrawalsRoutes);
router.use('/system', systemRoutes);
router.use('/security', securityRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/referrals', referralsRoutes);
router.use('/finance', financeRoutes);
router.use('/withdrawal-batches', withdrawalBatchesRoutes);
router.use('/emails', emailsRoutes);
router.use('/special-codes', specialCodesRoutes);

// Ruta de información del módulo admin
router.get('/info', authenticateToken, requireRole(['admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Admin API modular activa',
    modules: {
      dashboard: '/api/admin/dashboard',
      users: '/api/admin/users',
      payments: '/api/admin/payments',
      transactions: '/api/admin/transactions',
      withdrawals: '/api/admin/withdrawals',
      specialCodes: '/api/admin/special-codes',
      system: '/api/admin/system',
      security: '/api/admin/security'
    },
    version: '2.0.0',
    refactoredAt: new Date().toISOString()
  });
});

module.exports = router;