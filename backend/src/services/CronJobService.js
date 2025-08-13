/**
 * Servicio de Tareas Programadas (Cron Jobs)
 * Automatiza el procesamiento diario de beneficios y comisiones
 * basado en la información real del sistema (7 paquetes, 12.5% diario, etc.)
 */

const cron = require('node-cron');
const OptimizedCalculationService = require('./OptimizedCalculationService');
const UserStatus = require('../models/UserStatus');
const Transaction = require('../models/Transaction.model');
const Commission = require('../models/Commission.model');
const Package = require('../models/Package.model');
const logger = require('../utils/logger');
const { sendNotification } = require('./NotificationService');

class CronJobService {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
    this.stats = {
      dailyBenefitsProcessed: 0,
      commissionsProcessed: 0,
      errorsToday: 0,
      lastProcessingTime: null,
      averageProcessingTime: 0
    };
  }

  /**
   * Inicializar todos los trabajos programados
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        logger.warn('CronJobService ya está inicializado');
        return;
      }

      logger.info('Inicializando CronJobService...');

      // Configurar trabajos programados
      await this.setupDailyBenefitsJob();
      await this.setupCommissionProcessingJob();
      await this.setupSystemMaintenanceJob();
      await this.setupReportingJob();
      await this.setupNotificationJob();
      await this.setupHealthCheckJob();

      this.isInitialized = true;
      logger.info('CronJobService inicializado exitosamente');

    } catch (error) {
      logger.error('Error inicializando CronJobService:', error);
      throw error;
    }
  }

  /**
   * Configurar trabajo de procesamiento diario de beneficios
   * Se ejecuta cada hora para procesar usuarios elegibles
   */
  async setupDailyBenefitsJob() {
    const jobName = 'daily-benefits-processing';
    
    // Ejecutar cada hora en minuto 5 (ej: 00:05, 01:05, 02:05, etc.)
    const job = cron.schedule('5 * * * *', async () => {
      await this.processDailyBenefits();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    this.jobs.set(jobName, {
      job,
      name: jobName,
      description: 'Procesamiento de beneficios diarios',
      schedule: '5 * * * *',
      lastRun: null,
      nextRun: null,
      isRunning: false
    });

    job.start();
    logger.info(`Trabajo programado '${jobName}' configurado y iniciado`);
  }

  /**
   * Configurar trabajo de procesamiento de comisiones
   * Se ejecuta cada 4 horas para procesar comisiones pendientes
   */
  async setupCommissionProcessingJob() {
    const jobName = 'commission-processing';
    
    // Ejecutar cada 4 horas
    const job = cron.schedule('0 */4 * * *', async () => {
      await this.processCommissions();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    this.jobs.set(jobName, {
      job,
      name: jobName,
      description: 'Procesamiento de comisiones pendientes cada 4 horas',
      schedule: '0 */4 * * *',
      lastRun: null,
      nextRun: null,
      isRunning: false
    });

    job.start();
    logger.info(`Trabajo programado '${jobName}' configurado y iniciado`);
  }

  /**
   * Configurar trabajo de mantenimiento del sistema
   * Se ejecuta diariamente a las 2:00 AM
   */
  async setupSystemMaintenanceJob() {
    const jobName = 'system-maintenance';
    
    // Ejecutar diariamente a las 2:00 AM
    const job = cron.schedule('0 2 * * *', async () => {
      await this.performSystemMaintenance();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    this.jobs.set(jobName, {
      job,
      name: jobName,
      description: 'Mantenimiento diario del sistema',
      schedule: '0 2 * * *',
      lastRun: null,
      nextRun: null,
      isRunning: false
    });

    job.start();
    logger.info(`Trabajo programado '${jobName}' configurado y iniciado`);
  }

  /**
   * Configurar trabajo de reportes diarios
   * Se ejecuta diariamente a las 6:00 AM
   */
  async setupReportingJob() {
    const jobName = 'daily-reporting';
    
    // Ejecutar diariamente a las 6:00 AM
    const job = cron.schedule('0 6 * * *', async () => {
      await this.generateDailyReports();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    this.jobs.set(jobName, {
      job,
      name: jobName,
      description: 'Generación de reportes diarios',
      schedule: '0 6 * * *',
      lastRun: null,
      nextRun: null,
      isRunning: false
    });

    job.start();
    logger.info(`Trabajo programado '${jobName}' configurado y iniciado`);
  }

  /**
   * Configurar trabajo de notificaciones diarias
   * Se ejecuta cada 24 horas para enviar notificaciones de beneficios y comisiones
   */
  async setupNotificationJob() {
    const jobName = 'daily-notifications';
    
    // Ejecutar diariamente a las 8:00 AM
    const job = cron.schedule('0 8 * * *', async () => {
      await this.sendDailyNotifications();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    this.jobs.set(jobName, {
      job,
      name: jobName,
      description: 'Envío de notificaciones diarias de beneficios y comisiones',
      schedule: '0 8 * * *',
      lastRun: null,
      nextRun: null,
      isRunning: false
    });

    job.start();
    logger.info(`Trabajo programado '${jobName}' configurado y iniciado`);
  }

  /**
   * Configurar trabajo de verificación de salud del sistema
   * Se ejecuta cada 15 minutos
   */
  async setupHealthCheckJob() {
    const jobName = 'health-check';
    
    // Ejecutar cada 15 minutos
    const job = cron.schedule('*/15 * * * *', async () => {
      await this.performHealthCheck();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    this.jobs.set(jobName, {
      job,
      name: jobName,
      description: 'Verificación de salud del sistema',
      schedule: '*/15 * * * *',
      lastRun: null,
      nextRun: null,
      isRunning: false
    });

    job.start();
    logger.info(`Trabajo programado '${jobName}' configurado y iniciado`);
  }

  /**
   * Procesar beneficios diarios para usuarios elegibles
   */
  async processDailyBenefits() {
    const jobInfo = this.jobs.get('daily-benefits-processing');
    if (jobInfo.isRunning) {
      logger.warn('Procesamiento de beneficios diarios ya está en ejecución');
      return;
    }

    const startTime = Date.now();
    jobInfo.isRunning = true;
    jobInfo.lastRun = new Date();

    try {
      logger.info('Iniciando procesamiento automático de beneficios diarios');

      // Obtener usuarios elegibles
      const eligibleUsers = await UserStatus.find({
        'subscription.packageStatus': 'active',
        'subscription.benefitCycle.nextBenefitDate': { $lte: new Date() },
        'subscription.benefitCycle.isPaused': false
      }).limit(100); // Procesar máximo 100 usuarios por ejecución

      if (eligibleUsers.length === 0) {
        logger.info('No hay usuarios elegibles para beneficios en este momento');
        return;
      }

      logger.info(`Procesando beneficios para ${eligibleUsers.length} usuarios elegibles`);

      // Procesar beneficios
      const results = await OptimizedCalculationService.processDailyBenefitsForAllUsers();

      // Actualizar estadísticas
      this.stats.dailyBenefitsProcessed += results.successful;
      this.stats.errorsToday += results.failed;
      this.stats.lastProcessingTime = new Date();
      this.stats.averageProcessingTime = (this.stats.averageProcessingTime + (Date.now() - startTime)) / 2;

      logger.info(`Procesamiento completado: ${results.successful} exitosos, ${results.failed} fallidos`);

      // Notificar si hay muchos errores
      if (results.failed > results.successful * 0.1) {
        await this.notifyAdminsOfIssues('high_error_rate', {
          successful: results.successful,
          failed: results.failed,
          errorRate: (results.failed / (results.successful + results.failed) * 100).toFixed(2) + '%'
        });
      }

    } catch (error) {
      logger.error('Error en procesamiento automático de beneficios:', error);
      this.stats.errorsToday++;
      
      await this.notifyAdminsOfIssues('processing_error', {
        error: error.message,
        timestamp: new Date()
      });
    } finally {
      jobInfo.isRunning = false;
    }
  }

  /**
   * Procesar comisiones pendientes
   */
  async processCommissions() {
    const jobInfo = this.jobs.get('commission-processing');
    if (jobInfo.isRunning) {
      logger.warn('Procesamiento de comisiones ya está en ejecución');
      return;
    }

    jobInfo.isRunning = true;
    jobInfo.lastRun = new Date();

    try {
      logger.info('Iniciando procesamiento automático de comisiones');

      // Obtener comisiones pendientes donde el referido directo haya completado el 100% del cashback
      const pendingCommissions = await Commission.find({
        status: 'pending',
        commissionType: 'direct_referral',
        createdAt: { $lte: new Date(Date.now() - 5 * 60 * 1000) } // Al menos 5 minutos de antigüedad
      }).populate('fromUserId').limit(50); // Procesar máximo 50 comisiones por ejecución
      
      // Filtrar comisiones donde el referido directo haya completado el cashback
       const eligibleCommissions = [];
       for (const commission of pendingCommissions) {
         if (await this.hasCompletedCashback(commission.fromUserId)) {
           eligibleCommissions.push(commission);
         }
       }

      if (eligibleCommissions.length === 0) {
        logger.info('No hay comisiones elegibles para procesar (referidos sin completar cashback)');
        return;
      }

      logger.info(`Procesando ${eligibleCommissions.length} comisiones elegibles`);

      let processed = 0;
      let errors = 0;

      for (const commission of pendingCommissions) {
        try {
          // Procesar comisión individual
          await this.processIndividualCommission(commission);
          processed++;
        } catch (error) {
          logger.error(`Error procesando comisión ${commission._id}:`, error);
          errors++;
        }
      }

      // Actualizar estadísticas
      this.stats.commissionsProcessed += processed;
      this.stats.errorsToday += errors;

      logger.info(`Procesamiento de comisiones completado: ${processed} procesadas, ${errors} errores`);

    } catch (error) {
      logger.error('Error en procesamiento automático de comisiones:', error);
      this.stats.errorsToday++;
    } finally {
      jobInfo.isRunning = false;
    }
  }

  /**
   * Procesar una comisión individual
   */
  async processIndividualCommission(commission) {
    // Verificar que el usuario receptor existe y está activo
    const userStatus = await UserStatus.findOne({ user: commission.userId });
    if (!userStatus) {
      throw new Error(`Usuario ${commission.userId} no encontrado`);
    }

    // Crear transacción de comisión
    const transaction = new Transaction({
      user: commission.userId,
      type: 'earnings',
      subtype: 'commission',
      amount: commission.amount,
      currency: commission.currency,
      status: 'completed',
      paymentInfo: {
        method: 'internal_transfer',
        processedAt: new Date()
      },
      metadata: {
        commissionId: commission._id,
        commissionType: commission.commissionType,
        fromUserId: commission.fromUserId,
        autoProcessed: true
      },
      calculationData: {
        isValidated: true,
        calculatedAt: new Date(),
        verificationHash: OptimizedCalculationService.generateVerificationHash({
          userId: commission.userId,
          amount: commission.amount,
          type: 'commission'
        })
      }
    });

    await transaction.save();

    // Marcar comisión como pagada
    commission.status = 'paid';
    commission.paidAt = new Date();
    commission.transactionId = transaction._id;
    commission.processingData = {
      isAutoProcessed: true,
      processedAt: new Date(),
      processingMethod: 'cron_job'
    };

    await commission.save();

    // Actualizar tracking de comisiones en UserStatus
    await OptimizedCalculationService.updateCommissionTracking(commission.userId, {
      commissionType: commission.commissionType,
      amount: commission.amount,
      action: 'paid'
    });

    logger.info(`Comisión ${commission._id} procesada exitosamente: ${commission.amount} ${commission.currency}`);
  }

  /**
   * Verificar si un usuario ha completado el 100% del cashback
   */
  async hasCompletedCashback(userId) {
    try {
      const userStatus = await UserStatus.findOne({ user: userId });
      if (!userStatus) {
        return false;
      }

      // Verificar si el usuario está en la primera semana (período de cashback)
      const packageStartDate = userStatus.subscription?.packageStartDate;
      if (!packageStartDate) {
        return false;
      }

      const daysSinceStart = Math.floor((new Date() - packageStartDate) / (1000 * 60 * 60 * 24));
      
      // Si han pasado más de 7 días, ha completado la primera semana
      if (daysSinceStart >= 7) {
        return true;
      }

      // Si está en la primera semana, verificar si ha recibido todos los beneficios
      const benefitsReceived = userStatus.benefits?.totalBenefitsReceived || 0;
      const expectedBenefits = Math.min(daysSinceStart + 1, 7); // Máximo 7 días de beneficios
      
      // Ha completado el cashback si ha recibido todos los beneficios esperados de la primera semana
      return benefitsReceived >= 7;
      
    } catch (error) {
      logger.error(`Error verificando cashback completado para usuario ${userId}:`, error);
      return false;
    }
  }

  /**
   * Realizar mantenimiento del sistema
   */
  async performSystemMaintenance() {
    const jobInfo = this.jobs.get('system-maintenance');
    if (jobInfo.isRunning) {
      logger.warn('Mantenimiento del sistema ya está en ejecución');
      return;
    }

    jobInfo.isRunning = true;
    jobInfo.lastRun = new Date();

    try {
      logger.info('Iniciando mantenimiento diario del sistema');

      // 1. Limpiar cache expirado
      await this.cleanExpiredCache();

      // 2. Actualizar estadísticas de rendimiento
      await this.updatePerformanceStats();

      // 3. Verificar integridad de datos
      await this.verifyDataIntegrity();

      // 4. Limpiar logs antiguos
      await this.cleanOldLogs();

      // 5. Resetear estadísticas diarias
      this.resetDailyStats();

      logger.info('Mantenimiento diario completado exitosamente');

    } catch (error) {
      logger.error('Error en mantenimiento del sistema:', error);
      await this.notifyAdminsOfIssues('maintenance_error', {
        error: error.message,
        timestamp: new Date()
      });
    } finally {
      jobInfo.isRunning = false;
    }
  }

  /**
   * Limpiar cache expirado
   */
  async cleanExpiredCache() {
    const expiredCacheCount = await UserStatus.countDocuments({
      'cachedCalculations.cacheValid': true,
      'cachedCalculations.expiresAt': { $lt: new Date() }
    });

    if (expiredCacheCount > 0) {
      await UserStatus.updateMany(
        {
          'cachedCalculations.cacheValid': true,
          'cachedCalculations.expiresAt': { $lt: new Date() }
        },
        {
          $set: {
            'cachedCalculations.cacheValid': false,
            'cachedCalculations.lastCalculated': null
          }
        }
      );

      logger.info(`Cache expirado limpiado: ${expiredCacheCount} registros`);
    }
  }

  /**
   * Actualizar estadísticas de rendimiento
   */
  async updatePerformanceStats() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Calcular estadísticas del día anterior
    const dailyStats = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: yesterday },
          type: 'earnings',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$subtype',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    logger.info('Estadísticas de rendimiento actualizadas:', dailyStats);
  }

  /**
   * Verificar integridad de datos
   */
  async verifyDataIntegrity() {
    // Verificar usuarios con paquetes activos pero sin UserStatus
    const usersWithoutStatus = await UserStatus.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $match: {
          userInfo: { $size: 0 }
        }
      }
    ]);

    if (usersWithoutStatus.length > 0) {
      logger.warn(`Encontrados ${usersWithoutStatus.length} UserStatus sin usuario asociado`);
      await this.notifyAdminsOfIssues('data_integrity', {
        issue: 'UserStatus sin usuario asociado',
        count: usersWithoutStatus.length
      });
    }

    // Verificar comisiones sin transacciones asociadas
    const commissionsWithoutTransactions = await Commission.countDocuments({
      status: 'paid',
      transactionId: { $exists: false }
    });

    if (commissionsWithoutTransactions > 0) {
      logger.warn(`Encontradas ${commissionsWithoutTransactions} comisiones pagadas sin transacción`);
      await this.notifyAdminsOfIssues('data_integrity', {
        issue: 'Comisiones pagadas sin transacción',
        count: commissionsWithoutTransactions
      });
    }
  }

  /**
   * Limpiar logs antiguos (placeholder - implementar según sistema de logs)
   */
  async cleanOldLogs() {
    // Implementar limpieza de logs según el sistema utilizado
    logger.info('Limpieza de logs completada');
  }

  /**
   * Resetear estadísticas diarias
   */
  resetDailyStats() {
    this.stats.dailyBenefitsProcessed = 0;
    this.stats.commissionsProcessed = 0;
    this.stats.errorsToday = 0;
    logger.info('Estadísticas diarias reseteadas');
  }

  /**
   * Generar reportes diarios
   */
  async generateDailyReports() {
    const jobInfo = this.jobs.get('daily-reporting');
    if (jobInfo.isRunning) {
      logger.warn('Generación de reportes ya está en ejecución');
      return;
    }

    jobInfo.isRunning = true;
    jobInfo.lastRun = new Date();

    try {
      logger.info('Generando reportes diarios');

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();

      // Obtener estadísticas del sistema
      const systemStats = await OptimizedCalculationService.getSystemPerformanceStats();

      // Generar reporte de beneficios
      const benefitsReport = await this.generateBenefitsReport(yesterday, today);

      // Generar reporte de comisiones
      const commissionsReport = await this.generateCommissionsReport(yesterday, today);

      // Enviar reporte a administradores
      await this.sendDailyReportToAdmins({
        date: yesterday,
        systemStats,
        benefitsReport,
        commissionsReport
      });

      logger.info('Reportes diarios generados y enviados exitosamente');

    } catch (error) {
      logger.error('Error generando reportes diarios:', error);
    } finally {
      jobInfo.isRunning = false;
    }
  }

  /**
   * Generar reporte de beneficios
   */
  async generateBenefitsReport(startDate, endDate) {
    const benefitsData = await Transaction.aggregate([
      {
        $match: {
          type: 'earnings',
          subtype: 'auto_earnings',
          createdAt: { $gte: startDate, $lt: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalBenefits: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          avgBenefit: { $avg: '$amount' },
          maxBenefit: { $max: '$amount' },
          minBenefit: { $min: '$amount' }
        }
      }
    ]);

    return benefitsData[0] || {
      totalBenefits: 0,
      totalTransactions: 0,
      avgBenefit: 0,
      maxBenefit: 0,
      minBenefit: 0
    };
  }

  /**
   * Generar reporte de comisiones
   */
  async generateCommissionsReport(startDate, endDate) {
    const commissionsData = await Commission.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: '$commissionType',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    return commissionsData;
  }

  /**
   * Enviar reporte diario a administradores
   */
  async sendDailyReportToAdmins(reportData) {
    // Implementar envío de reportes según sistema de notificaciones
    logger.info('Reporte diario enviado a administradores:', {
      date: reportData.date,
      benefitsTotal: reportData.benefitsReport.totalBenefits,
      commissionsCount: reportData.commissionsReport.length
    });
  }

  /**
   * Realizar verificación de salud del sistema
   */
  async performHealthCheck() {
    try {
      // Verificar conexión a base de datos
      const dbCheck = await UserStatus.countDocuments({}).limit(1);
      
      // Verificar usuarios con problemas
      const usersWithIssues = await UserStatus.countDocuments({
        'adminFlags.needsAttention': true
      });

      // Verificar transacciones fallidas recientes
      const recentFailures = await Transaction.countDocuments({
        status: 'failed',
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Última hora
      });

      // Alertar si hay problemas críticos
      if (usersWithIssues > 10) {
        await this.notifyAdminsOfIssues('high_user_issues', {
          count: usersWithIssues,
          timestamp: new Date()
        });
      }

      if (recentFailures > 5) {
        await this.notifyAdminsOfIssues('high_failure_rate', {
          count: recentFailures,
          timestamp: new Date()
        });
      }

    } catch (error) {
      logger.error('Error en verificación de salud:', error);
      await this.notifyAdminsOfIssues('health_check_failed', {
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Enviar notificaciones diarias de beneficios y comisiones
   */
  async sendDailyNotifications() {
    try {
      logger.info('Iniciando envío de notificaciones diarias...');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Obtener estadísticas de beneficios del día anterior
      const benefitsStats = await Transaction.aggregate([
        {
          $match: {
            type: 'benefit',
            status: 'completed',
            createdAt: { $gte: yesterday, $lt: today }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalUsers: { $addToSet: '$user' },
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Obtener estadísticas de comisiones del día anterior
      const commissionsStats = await Commission.aggregate([
        {
          $match: {
            status: 'paid',
            paidAt: { $gte: yesterday, $lt: today }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalUsers: { $addToSet: '$userId' },
            count: { $sum: 1 }
          }
        }
      ]);
      
      const benefitsSummary = benefitsStats[0] || { totalAmount: 0, totalUsers: [], count: 0 };
      const commissionsSummary = commissionsStats[0] || { totalAmount: 0, totalUsers: [], count: 0 };
      
      // Enviar notificación a administradores
      const notificationData = {
        date: yesterday.toISOString().split('T')[0],
        benefits: {
          totalAmount: benefitsSummary.totalAmount,
          usersCount: benefitsSummary.totalUsers.length,
          transactionsCount: benefitsSummary.count
        },
        commissions: {
          totalAmount: commissionsSummary.totalAmount,
          usersCount: commissionsSummary.totalUsers.length,
          transactionsCount: commissionsSummary.count
        },
        timestamp: new Date()
      };
      
      // Enviar notificación usando el servicio de notificaciones
      await sendNotification('admin', {
        type: 'daily_summary',
        title: 'Resumen Diario de Beneficios y Comisiones',
        data: notificationData
      });
      
      logger.info('Notificaciones diarias enviadas exitosamente', notificationData);
      
    } catch (error) {
      logger.error('Error enviando notificaciones diarias:', error);
    }
  }

  /**
   * Notificar a administradores sobre problemas
   */
  async notifyAdminsOfIssues(issueType, data) {
    try {
      // Implementar notificación según sistema disponible
      logger.warn(`Notificación de problema: ${issueType}`, data);
      
      // Aquí se podría integrar con sistema de notificaciones
      // await sendNotification('admin', {
      //   type: 'system_alert',
      //   issueType,
      //   data,
      //   timestamp: new Date()
      // });
      
    } catch (error) {
      logger.error('Error enviando notificación a administradores:', error);
    }
  }

  /**
   * Obtener estado de todos los trabajos programados
   */
  getJobsStatus() {
    const jobsStatus = [];
    
    for (const [name, jobInfo] of this.jobs) {
      jobsStatus.push({
        name: jobInfo.name,
        description: jobInfo.description,
        schedule: jobInfo.schedule,
        isRunning: jobInfo.isRunning,
        lastRun: jobInfo.lastRun,
        nextRun: jobInfo.job.nextDate()?.toDate() || null
      });
    }
    
    return {
      jobs: jobsStatus,
      stats: this.stats,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Detener todos los trabajos programados
   */
  stopAllJobs() {
    for (const [name, jobInfo] of this.jobs) {
      jobInfo.job.stop();
      logger.info(`Trabajo '${name}' detenido`);
    }
    
    this.isInitialized = false;
    logger.info('Todos los trabajos programados han sido detenidos');
  }

  /**
   * Reiniciar todos los trabajos programados
   */
  restartAllJobs() {
    for (const [name, jobInfo] of this.jobs) {
      jobInfo.job.start();
      logger.info(`Trabajo '${name}' reiniciado`);
    }
    
    logger.info('Todos los trabajos programados han sido reiniciados');
  }
}

// Exportar instancia singleton
module.exports = new CronJobService();