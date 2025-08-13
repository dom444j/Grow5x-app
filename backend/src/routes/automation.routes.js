const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automation.controller');
const reportsController = require('../controllers/reports.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, query, param } = require('express-validator');

// Middleware para todas las rutas de automatización
router.use(requireAuth);
router.use(requireAdmin);

// ===== RUTAS DE AUTOMATIZACIÓN =====

/**
 * @route POST /api/automation/initialize
 * @desc Inicializar sistema de automatización
 * @access Admin
 */
router.post('/initialize', automationController.initializeAutomation);

/**
 * @route GET /api/automation/status
 * @desc Obtener estado de todos los jobs
 * @access Admin
 */
router.get('/status', automationController.getJobsStatus);

/**
 * @route POST /api/automation/jobs/:jobName/execute
 * @desc Ejecutar job manualmente
 * @access Admin
 */
router.post('/jobs/:jobName/execute', [
  param('jobName').notEmpty().withMessage('Nombre del job es requerido')
], validateRequest, automationController.executeJobManually);

/**
 * @route POST /api/automation/jobs/:jobName/pause
 * @desc Pausar un job
 * @access Admin
 */
router.post('/jobs/:jobName/pause', [
  param('jobName').notEmpty().withMessage('Nombre del job es requerido')
], validateRequest, automationController.pauseJob);

/**
 * @route POST /api/automation/jobs/:jobName/resume
 * @desc Reanudar un job
 * @access Admin
 */
router.post('/jobs/:jobName/resume', [
  param('jobName').notEmpty().withMessage('Nombre del job es requerido')
], validateRequest, automationController.resumeJob);

/**
 * @route GET /api/automation/jobs/:jobName/statistics
 * @desc Obtener estadísticas de un job específico
 * @access Admin
 */
router.get('/jobs/:jobName/statistics', [
  param('jobName').notEmpty().withMessage('Nombre del job es requerido'),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Días debe ser un número entre 1 y 365')
], validateRequest, automationController.getJobStatistics);

/**
 * @route POST /api/automation/benefits/process
 * @desc Procesar beneficios manualmente
 * @access Admin
 */
router.post('/benefits/process', [
  body('userIds').optional().isArray().withMessage('userIds debe ser un array'),
  body('userIds.*').optional().isInt().withMessage('Cada ID de usuario debe ser un número')
], validateRequest, automationController.processBenefitsManually);

/**
 * @route POST /api/automation/bonuses/leader/process
 * @desc Procesar bonos de líder/padre manualmente
 * @access Admin
 */
router.post('/bonuses/leader/process', automationController.processLeaderBonuses);

/**
 * @route GET /api/automation/logs
 * @desc Obtener logs de automatización
 * @access Admin
 */
router.get('/logs', [
  query('jobName').optional().isString().withMessage('Nombre del job debe ser texto'),
  query('jobType').optional().isString().withMessage('Tipo de job debe ser texto'),
  query('status').optional().isIn(['running', 'completed', 'failed']).withMessage('Estado inválido'),
  query('startDate').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  query('endDate').optional().isISO8601().withMessage('Fecha de fin inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser entre 1 y 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset debe ser mayor o igual a 0')
], validateRequest, automationController.getAutomationLogs);

/**
 * @route GET /api/automation/metrics
 * @desc Obtener métricas de rendimiento
 * @access Admin
 */
router.get('/metrics', [
  query('days').optional().isInt({ min: 1, max: 90 }).withMessage('Días debe ser un número entre 1 y 90')
], validateRequest, automationController.getPerformanceMetrics);

/**
 * @route POST /api/automation/logs/cleanup
 * @desc Limpiar logs antiguos
 * @access Admin
 */
router.post('/logs/cleanup', [
  body('days').optional().isInt({ min: 1, max: 365 }).withMessage('Días debe ser un número entre 1 y 365')
], validateRequest, automationController.cleanupLogs);

/**
 * @route GET /api/automation/configuration
 * @desc Obtener configuración actual
 * @access Admin
 */
router.get('/configuration', automationController.getConfiguration);

/**
 * @route POST /api/automation/shutdown
 * @desc Detener sistema de automatización
 * @access Admin
 */
router.post('/shutdown', automationController.shutdownAutomation);

// ===== RUTAS DE REPORTES =====

/**
 * @route POST /api/automation/reports/generate
 * @desc Generar reporte diario manualmente
 * @access Admin
 */
router.post('/reports/generate', [
  body('date').optional().isISO8601().withMessage('Fecha inválida')
], validateRequest, reportsController.generateDailyReport);

/**
 * @route GET /api/automation/reports/latest
 * @desc Obtener reporte diario más reciente
 * @access Admin
 */
router.get('/reports/latest', reportsController.getLatestDailyReport);

/**
 * @route GET /api/automation/reports
 * @desc Obtener reportes por rango de fechas
 * @access Admin
 */
router.get('/reports', [
  query('startDate').notEmpty().isISO8601().withMessage('Fecha de inicio es requerida y debe ser válida'),
  query('endDate').notEmpty().isISO8601().withMessage('Fecha de fin es requerida y debe ser válida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser entre 1 y 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset debe ser mayor o igual a 0')
], validateRequest, reportsController.getReportsByDateRange);

/**
 * @route GET /api/automation/reports/alerts/liquidity
 * @desc Obtener alertas de liquidez
 * @access Admin
 */
router.get('/reports/alerts/liquidity', [
  query('days').optional().isInt({ min: 1, max: 90 }).withMessage('Días debe ser un número entre 1 y 90')
], validateRequest, reportsController.getLiquidityAlerts);

/**
 * @route GET /api/automation/reports/metrics/average
 * @desc Obtener métricas promedio
 * @access Admin
 */
router.get('/reports/metrics/average', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Días debe ser un número entre 1 y 365')
], validateRequest, reportsController.getAverageMetrics);

/**
 * @route GET /api/automation/reports/trends
 * @desc Obtener tendencias de reportes
 * @access Admin
 */
router.get('/reports/trends', [
  query('days').optional().isInt({ min: 7, max: 365 }).withMessage('Días debe ser un número entre 7 y 365')
], validateRequest, reportsController.getReportTrends);

/**
 * @route GET /api/automation/reports/liquidity/current
 * @desc Obtener estado actual de liquidez
 * @access Admin
 */
router.get('/reports/liquidity/current', reportsController.getCurrentLiquidityStatus);

/**
 * @route GET /api/automation/reports/liquidity/projections
 * @desc Obtener proyecciones de liquidez
 * @access Admin
 */
router.get('/reports/liquidity/projections', [
  query('days').optional().isInt({ min: 1, max: 30 }).withMessage('Días debe ser un número entre 1 y 30')
], validateRequest, reportsController.getLiquidityProjections);

/**
 * @route GET /api/automation/reports/benefits/statistics
 * @desc Obtener estadísticas de beneficios
 * @access Admin
 */
router.get('/reports/benefits/statistics', [
  query('startDate').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  query('endDate').optional().isISO8601().withMessage('Fecha de fin inválida')
], validateRequest, reportsController.getBenefitsStatistics);

/**
 * @route POST /api/automation/reports/detailed
 * @desc Generar reporte detallado
 * @access Admin
 */
router.post('/reports/detailed', [
  body('date').optional().isISO8601().withMessage('Fecha inválida')
], validateRequest, reportsController.generateDetailedReport);

/**
 * @route GET /api/automation/reports/download/:date
 * @desc Descargar archivo de reporte
 * @access Admin
 */
router.get('/reports/download/:date', [
  param('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Formato de fecha debe ser YYYY-MM-DD')
], validateRequest, reportsController.downloadReportFile);

/**
 * @route GET /api/automation/reports/dashboard/summary
 * @desc Obtener resumen del dashboard
 * @access Admin
 */
router.get('/reports/dashboard/summary', reportsController.getDashboardSummary);

/**
 * @route POST /api/automation/reports/cleanup
 * @desc Limpiar archivos de reportes antiguos
 * @access Admin
 */
router.post('/reports/cleanup', [
  body('days').optional().isInt({ min: 1, max: 365 }).withMessage('Días debe ser un número entre 1 y 365')
], validateRequest, reportsController.cleanupReportFiles);

// ===== RUTAS DE MONITOREO EN TIEMPO REAL =====

/**
 * @route GET /api/automation/monitor/health
 * @desc Verificar salud del sistema de automatización
 * @access Admin
 */
router.get('/monitor/health', async (req, res) => {
  try {
    const healthStatus = {
      automation_service: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verificando salud del sistema',
      error: error.message
    });
  }
});

/**
 * @route GET /api/automation/monitor/realtime
 * @desc Obtener datos en tiempo real para el dashboard
 * @access Admin
 */
router.get('/monitor/realtime', async (req, res) => {
  try {
    const jobsStatus = { jobs: {}, isInitialized: false };
    
    res.json({
      success: true,
      data: {
        jobs_status: jobsStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo datos en tiempo real',
      error: error.message
    });
  }
});

module.exports = router;