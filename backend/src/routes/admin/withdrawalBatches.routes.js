const express = require('express');
const router = express.Router();
const withdrawalBatchesController = require('../../controllers/admin/withdrawalBatches.controller');
const { authenticateAdmin } = require('../../middleware/auth');

/**
 * Rutas para gestión de lotes de retiros
 * Todas las rutas requieren autenticación de administrador
 */

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateAdmin);

// Crear nuevo lote de retiros
router.post('/create', withdrawalBatchesController.createWithdrawalBatch);

// Obtener estadísticas de lotes
router.get('/stats', withdrawalBatchesController.getWithdrawalBatchStats);

// Obtener lista de lotes
router.get('/list', withdrawalBatchesController.getWithdrawalBatches);

// Obtener retiros para un lote específico
router.get('/:batchId/withdrawals', withdrawalBatchesController.getWithdrawalsForBatch);

// Exportar retiros pendientes
router.get('/export/pending', withdrawalBatchesController.exportPendingWithdrawals);

// Marcar retiros como exportados
router.post('/mark-exported', withdrawalBatchesController.markWithdrawalsAsExported);

// Marcar retiros como procesados
router.post('/mark-processed', withdrawalBatchesController.markWithdrawalsAsProcessed);

module.exports = router;