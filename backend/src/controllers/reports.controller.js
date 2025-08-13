const ReportsGenerator = require('../services/ReportsGenerator');
const DailyReport = require('../models/DailyReport');
const BenefitsProcessor = require('../services/BenefitsProcessor');
// const { Op } = require('sequelize'); // Removed - using MongoDB/Mongoose
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * Generar reporte diario manualmente
 */
const generateDailyReport = async (req, res) => {
  try {
    const { date } = req.body;
    const reportDate = date ? new Date(date) : new Date();

    const reportsGenerator = new ReportsGenerator();
    const report = await reportsGenerator.generateDailyReport(reportDate);

    logger.info(`Reporte diario generado manualmente para ${reportDate.toISOString().split('T')[0]} por admin:`, req.user.id);

    res.json({
      success: true,
      message: 'Reporte diario generado correctamente',
      data: report
    });

  } catch (error) {
    logger.error('Error generando reporte diario:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando reporte diario',
      error: error.message
    });
  }
};

/**
 * Obtener reporte diario más reciente
 */
const getLatestDailyReport = async (req, res) => {
  try {
    const report = await DailyReport.getLatestReport();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró ningún reporte diario'
      });
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    logger.error('Error obteniendo último reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo último reporte',
      error: error.message
    });
  }
};

/**
 * Obtener reportes por rango de fechas
 */
const getReportsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, limit = 30, offset = 0 } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren las fechas de inicio y fin'
      });
    }

    const reports = await DailyReport.getReportsByDateRange(
      new Date(startDate),
      new Date(endDate),
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      data: {
        reports: reports.rows,
        total: reports.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('Error obteniendo reportes por rango de fechas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo reportes',
      error: error.message
    });
  }
};

/**
 * Obtener alertas de liquidez
 */
const getLiquidityAlerts = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const alerts = await DailyReport.getLiquidityAlerts(parseInt(days));

    res.json({
      success: true,
      data: {
        alerts,
        period_days: parseInt(days)
      }
    });

  } catch (error) {
    logger.error('Error obteniendo alertas de liquidez:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo alertas de liquidez',
      error: error.message
    });
  }
};

/**
 * Obtener métricas promedio
 */
const getAverageMetrics = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const metrics = await DailyReport.getAverageMetrics(parseInt(days));

    res.json({
      success: true,
      data: {
        metrics,
        period_days: parseInt(days)
      }
    });

  } catch (error) {
    logger.error('Error obteniendo métricas promedio:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo métricas promedio',
      error: error.message
    });
  }
};

/**
 * Obtener tendencias de reportes
 */
const getReportTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const trends = await DailyReport.getTrends(parseInt(days));

    res.json({
      success: true,
      data: {
        trends,
        period_days: parseInt(days)
      }
    });

  } catch (error) {
    logger.error('Error obteniendo tendencias:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo tendencias',
      error: error.message
    });
  }
};

/**
 * Obtener estado actual de liquidez
 */
const getCurrentLiquidityStatus = async (req, res) => {
  try {
    const reportsGenerator = new ReportsGenerator();
    const liquidityStatus = await reportsGenerator.checkLiquidityStatus();

    res.json({
      success: true,
      data: liquidityStatus
    });

  } catch (error) {
    logger.error('Error obteniendo estado de liquidez:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado de liquidez',
      error: error.message
    });
  }
};

/**
 * Obtener estadísticas de beneficios
 */
const getBenefitsStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const benefitsProcessor = new BenefitsProcessor();
    const stats = await benefitsProcessor.getBenefitsStats(startDate, endDate);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas de beneficios:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas de beneficios',
      error: error.message
    });
  }
};

/**
 * Generar reporte detallado
 */
const generateDetailedReport = async (req, res) => {
  try {
    const { date } = req.body;
    const reportDate = date ? new Date(date) : new Date();

    const reportsGenerator = new ReportsGenerator();
    const detailedReport = await reportsGenerator.generateDetailedReport(reportDate);

    logger.info(`Reporte detallado generado para ${reportDate.toISOString().split('T')[0]} por admin:`, req.user.id);

    res.json({
      success: true,
      message: 'Reporte detallado generado correctamente',
      data: detailedReport
    });

  } catch (error) {
    logger.error('Error generando reporte detallado:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando reporte detallado',
      error: error.message
    });
  }
};

/**
 * Descargar archivo de reporte
 */
const downloadReportFile = async (req, res) => {
  try {
    const { date } = req.params;
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }

    const reportsDir = path.join(process.cwd(), 'reports');
    const fileName = `daily-report-${date}.json`;
    const filePath = path.join(reportsDir, fileName);

    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Archivo de reporte no encontrado'
      });
    }

    const fileContent = await fs.readFile(filePath, 'utf8');
    const reportData = JSON.parse(fileContent);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    logger.info(`Archivo de reporte descargado: ${fileName} por admin:`, req.user.id);
    
    res.json(reportData);

  } catch (error) {
    logger.error('Error descargando archivo de reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error descargando archivo de reporte',
      error: error.message
    });
  }
};

/**
 * Obtener resumen del dashboard
 */
const getDashboardSummary = async (req, res) => {
  try {
    // Obtener último reporte
    const latestReport = await DailyReport.getLatestReport();
    
    // Obtener alertas de liquidez recientes
    const liquidityAlerts = await DailyReport.getLiquidityAlerts(7);
    
    // Obtener métricas promedio de los últimos 7 días
    const weeklyMetrics = await DailyReport.getAverageMetrics(7);
    
    // Obtener tendencias de los últimos 30 días
    const monthlyTrends = await DailyReport.getTrends(30);
    
    // Obtener estado actual de liquidez
    const reportsGenerator = new ReportsGenerator();
    const currentLiquidity = await reportsGenerator.checkLiquidityStatus();
    
    // Obtener estadísticas de beneficios del día actual
    const benefitsProcessor = new BenefitsProcessor();
    const todayStats = await benefitsProcessor.getBenefitsStats(
      new Date().toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    );

    res.json({
      success: true,
      data: {
        latest_report: latestReport,
        liquidity_alerts: liquidityAlerts,
        weekly_metrics: weeklyMetrics,
        monthly_trends: monthlyTrends,
        current_liquidity: currentLiquidity,
        today_benefits: todayStats,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error obteniendo resumen del dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo resumen del dashboard',
      error: error.message
    });
  }
};

/**
 * Limpiar archivos de reportes antiguos
 */
const cleanupReportFiles = async (req, res) => {
  try {
    const { days = 30 } = req.body;

    const reportsGenerator = new ReportsGenerator();
    const deletedFiles = await reportsGenerator.cleanupTempFiles(parseInt(days));

    logger.info(`Archivos de reportes limpiados: ${deletedFiles.length} archivos eliminados por admin:`, req.user.id);

    res.json({
      success: true,
      message: `Se eliminaron ${deletedFiles.length} archivos de reportes antiguos`,
      data: {
        deleted_files: deletedFiles,
        days_threshold: parseInt(days)
      }
    });

  } catch (error) {
    logger.error('Error limpiando archivos de reportes:', error);
    res.status(500).json({
      success: false,
      message: 'Error limpiando archivos de reportes',
      error: error.message
    });
  }
};

/**
 * Obtener proyecciones de liquidez
 */
const getLiquidityProjections = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    // Obtener tendencias históricas
    const trends = await DailyReport.getTrends(30);
    
    // Obtener estado actual
    const reportsGenerator = new ReportsGenerator();
    const currentStatus = await reportsGenerator.checkLiquidityStatus();
    
    // Calcular proyecciones simples basadas en tendencias
    const projections = [];
    const currentDate = new Date();
    
    for (let i = 1; i <= parseInt(days); i++) {
      const projectionDate = new Date(currentDate);
      projectionDate.setDate(currentDate.getDate() + i);
      
      // Proyección simple basada en tendencias promedio
      const avgDailyChange = trends.length > 0 ? 
        trends.reduce((sum, trend) => sum + (trend.daily_change || 0), 0) / trends.length : 0;
      
      const projectedBalance = currentStatus.available_balance + (avgDailyChange * i);
      
      projections.push({
        date: projectionDate.toISOString().split('T')[0],
        projected_balance: Math.max(0, projectedBalance),
        confidence_level: Math.max(0.3, 1 - (i * 0.1)) // Confianza decrece con el tiempo
      });
    }

    res.json({
      success: true,
      data: {
        current_status: currentStatus,
        projections,
        projection_days: parseInt(days),
        based_on_trends: trends.length
      }
    });

  } catch (error) {
    logger.error('Error obteniendo proyecciones de liquidez:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo proyecciones de liquidez',
      error: error.message
    });
  }
};

module.exports = {
  generateDailyReport,
  getLatestDailyReport,
  getReportsByDateRange,
  getLiquidityAlerts,
  getAverageMetrics,
  getReportTrends,
  getCurrentLiquidityStatus,
  getBenefitsStatistics,
  generateDetailedReport,
  downloadReportFile,
  getDashboardSummary,
  cleanupReportFiles,
  getLiquidityProjections
};