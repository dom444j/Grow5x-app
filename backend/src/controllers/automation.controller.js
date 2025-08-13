const AutomationService = require('../services/AutomationService');
const BenefitsProcessor = require('../services/BenefitsProcessor');
const ReportsGenerator = require('../services/ReportsGenerator');
const AutomationLog = require('../models/AutomationLog');
const DailyReport = require('../models/DailyReport');
const logger = require('../utils/logger');

// Instancia global del servicio de automatización
let automationService = null;

/**
 * Inicializar el servicio de automatización
 */
const initializeAutomation = async (req, res) => {
  try {
    if (automationService && automationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'El sistema de automatización ya está inicializado'
      });
    }

    automationService = new AutomationService();
    await automationService.initialize();

    logger.info('Sistema de automatización inicializado por admin:', req.user.id);

    res.json({
      success: true,
      message: 'Sistema de automatización inicializado correctamente',
      data: automationService.getJobsStatus()
    });

  } catch (error) {
    logger.error('Error inicializando automatización:', error);
    res.status(500).json({
      success: false,
      message: 'Error inicializando sistema de automatización',
      error: error.message
    });
  }
};

/**
 * Obtener estado de todos los jobs
 */
const getJobsStatus = async (req, res) => {
  try {
    if (!automationService || !automationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'Sistema de automatización no está inicializado'
      });
    }

    const status = automationService.getJobsStatus();
    
    // Obtener estadísticas recientes de los logs
    const recentLogs = await AutomationLog.getRecentLogs(10);
    const systemOverview = await AutomationLog.getSystemOverview(24);

    res.json({
      success: true,
      data: {
        ...status,
        recent_logs: recentLogs,
        system_overview: systemOverview
      }
    });

  } catch (error) {
    logger.error('Error obteniendo estado de jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado de jobs',
      error: error.message
    });
  }
};

/**
 * Ejecutar job manualmente
 */
const executeJobManually = async (req, res) => {
  try {
    const { jobName } = req.params;

    if (!automationService || !automationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'Sistema de automatización no está inicializado'
      });
    }

    logger.info(`Ejecutando job manual: ${jobName} por admin:`, req.user.id);

    const result = await automationService.executeJobManually(jobName);

    res.json({
      success: true,
      message: `Job ${jobName} ejecutado correctamente`,
      data: result
    });

  } catch (error) {
    logger.error(`Error ejecutando job manual ${req.params.jobName}:`, error);
    res.status(500).json({
      success: false,
      message: `Error ejecutando job ${req.params.jobName}`,
      error: error.message
    });
  }
};

/**
 * Pausar un job
 */
const pauseJob = async (req, res) => {
  try {
    const { jobName } = req.params;

    if (!automationService || !automationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'Sistema de automatización no está inicializado'
      });
    }

    automationService.pauseJob(jobName);
    
    logger.info(`Job pausado: ${jobName} por admin:`, req.user.id);

    res.json({
      success: true,
      message: `Job ${jobName} pausado correctamente`
    });

  } catch (error) {
    logger.error(`Error pausando job ${req.params.jobName}:`, error);
    res.status(500).json({
      success: false,
      message: `Error pausando job ${req.params.jobName}`,
      error: error.message
    });
  }
};

/**
 * Reanudar un job
 */
const resumeJob = async (req, res) => {
  try {
    const { jobName } = req.params;

    if (!automationService || !automationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'Sistema de automatización no está inicializado'
      });
    }

    automationService.resumeJob(jobName);
    
    logger.info(`Job reanudado: ${jobName} por admin:`, req.user.id);

    res.json({
      success: true,
      message: `Job ${jobName} reanudado correctamente`
    });

  } catch (error) {
    logger.error(`Error reanudando job ${req.params.jobName}:`, error);
    res.status(500).json({
      success: false,
      message: `Error reanudando job ${req.params.jobName}`,
      error: error.message
    });
  }
};

/**
 * Procesar beneficios manualmente
 */
const processBenefitsManually = async (req, res) => {
  try {
    const { userIds } = req.body;

    const benefitsProcessor = new BenefitsProcessor();
    let result;

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Procesar usuarios específicos
      result = await benefitsProcessor.processMultipleUsersBenefits(userIds);
      logger.info(`Beneficios procesados manualmente para ${userIds.length} usuarios por admin:`, req.user.id);
    } else {
      // Procesar todos los usuarios elegibles
      result = await benefitsProcessor.processDailyBenefits();
      logger.info('Procesamiento diario manual ejecutado por admin:', req.user.id);
    }

    res.json({
      success: true,
      message: 'Beneficios procesados correctamente',
      data: result
    });

  } catch (error) {
    logger.error('Error procesando beneficios manualmente:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando beneficios',
      error: error.message
    });
  }
};

/**
 * Procesar bonos de líder/padre manualmente
 */
const processLeaderBonuses = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const benefitsProcessor = new BenefitsProcessor();
    const result = await benefitsProcessor.processLeaderBonuses();
    
    logger.info('Bonos de líder/padre procesados manualmente por admin:', req.user.id);
    
    res.json({
      success: true,
      message: `Bonos de líder/padre procesados exitosamente: ${result.processedBonuses} bonos`,
      data: result
    });
  } catch (error) {
    logger.error('Error procesando bonos de líder/padre manualmente:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando bonos de líder/padre',
      error: error.message
    });
  }
};

/**
 * Obtener logs de automatización
 */
const getAutomationLogs = async (req, res) => {
  try {
    const { 
      jobName, 
      jobType, 
      status, 
      startDate, 
      endDate, 
      limit = 50, 
      offset = 0 
    } = req.query;

    const whereClause = {};
    
    if (jobName) whereClause.job_name = jobName;
    if (jobType) whereClause.job_type = jobType;
    if (status) whereClause.status = status;
    
    if (startDate && endDate) {
      whereClause.start_time = {
        [require('sequelize').Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.start_time = {
        [require('sequelize').Op.gte]: new Date(startDate)
      };
    }

    const logs = await AutomationLog.findAndCountAll({
      where: whereClause,
      order: [['start_time', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        logs: logs.rows,
        total: logs.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('Error obteniendo logs de automatización:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo logs',
      error: error.message
    });
  }
};

/**
 * Obtener estadísticas de un job específico
 */
const getJobStatistics = async (req, res) => {
  try {
    const { jobName } = req.params;
    const { days = 30 } = req.query;

    const statistics = await AutomationLog.getJobStatistics(jobName, parseInt(days));
    const recentLogs = await AutomationLog.getLogsByJob(jobName, 10);

    res.json({
      success: true,
      data: {
        statistics,
        recent_logs: recentLogs
      }
    });

  } catch (error) {
    logger.error(`Error obteniendo estadísticas del job ${req.params.jobName}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas del job',
      error: error.message
    });
  }
};

/**
 * Obtener métricas de rendimiento
 */
const getPerformanceMetrics = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const metrics = await AutomationLog.getPerformanceMetrics(parseInt(days));
    const systemOverview = await AutomationLog.getSystemOverview(24);
    const failedJobs = await AutomationLog.getFailedJobs(24);

    res.json({
      success: true,
      data: {
        performance_metrics: metrics,
        system_overview: systemOverview,
        failed_jobs: failedJobs,
        period_days: parseInt(days)
      }
    });

  } catch (error) {
    logger.error('Error obteniendo métricas de rendimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo métricas de rendimiento',
      error: error.message
    });
  }
};

/**
 * Limpiar logs antiguos
 */
const cleanupLogs = async (req, res) => {
  try {
    const { days = 30 } = req.body;

    const deletedCount = await AutomationLog.cleanupOldLogs(parseInt(days));
    
    logger.info(`Logs antiguos limpiados: ${deletedCount} registros eliminados por admin:`, req.user.id);

    res.json({
      success: true,
      message: `Se eliminaron ${deletedCount} logs antiguos`,
      data: {
        deleted_count: deletedCount,
        days_threshold: parseInt(days)
      }
    });

  } catch (error) {
    logger.error('Error limpiando logs antiguos:', error);
    res.status(500).json({
      success: false,
      message: 'Error limpiando logs antiguos',
      error: error.message
    });
  }
};

/**
 * Detener sistema de automatización
 */
const shutdownAutomation = async (req, res) => {
  try {
    if (!automationService || !automationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'Sistema de automatización no está inicializado'
      });
    }

    await automationService.shutdown();
    automationService = null;
    
    logger.info('Sistema de automatización detenido por admin:', req.user.id);

    res.json({
      success: true,
      message: 'Sistema de automatización detenido correctamente'
    });

  } catch (error) {
    logger.error('Error deteniendo automatización:', error);
    res.status(500).json({
      success: false,
      message: 'Error deteniendo sistema de automatización',
      error: error.message
    });
  }
};

/**
 * Obtener configuración actual
 */
const getConfiguration = async (req, res) => {
  try {
    const config = {
      automation_enabled: automationService && automationService.isInitialized,
      jobs: {
        dailyBenefits: {
          schedule: '0 1 0 * * *',
          description: 'Procesamiento diario de beneficios a las 00:01 UTC'
        },
        pioneerActivation: {
          schedule: '0 0 */6 * * *',
          description: 'Activación de usuarios Pioneer cada 6 horas'
        },
        reportsGeneration: {
          schedule: '0 30 0 * * *',
          description: 'Generación de reportes diarios a las 00:30 UTC'
        },
        cleanup: {
          schedule: '0 0 2 * * *',
          description: 'Limpieza de datos a las 02:00 UTC'
        },
        notifications: {
          schedule: '0 */15 * * * *',
          description: 'Procesamiento de notificaciones cada 15 minutos'
        },
        liquidityMonitor: {
          schedule: '0 */5 * * * *',
          description: 'Monitoreo de liquidez cada 5 minutos'
        }
      },
      thresholds: {
        liquidity: {
          critical: 0.05,
          warning: 0.15,
          healthy: 0.30
        },
        batch_size: 100,
        max_retries: 3
      }
    };

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error('Error obteniendo configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo configuración',
      error: error.message
    });
  }
};

/**
 * Función para obtener la instancia del servicio de automatización
 */
const getAutomationService = () => {
  return automationService;
};

/**
 * Función para establecer la instancia del servicio de automatización
 */
const setAutomationService = (service) => {
  automationService = service;
};

module.exports = {
  initializeAutomation,
  getJobsStatus,
  executeJobManually,
  pauseJob,
  resumeJob,
  processBenefitsManually,
  processLeaderBonuses,
  getAutomationLogs,
  getJobStatistics,
  getPerformanceMetrics,
  cleanupLogs,
  shutdownAutomation,
  getConfiguration,
  getAutomationService,
  setAutomationService
};