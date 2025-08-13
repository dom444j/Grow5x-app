const cron = require('node-cron');
const logger = require('../utils/logger');
const BenefitsProcessor = require('./BenefitsProcessor');
const ReportsGenerator = require('./ReportsGenerator');
const NotificationService = require('./NotificationService');
const AutomationLog = require('../models/AutomationLog');
const { processLeaderBonuses } = require('../controllers/specialCodes.controller');

class AutomationService {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
    this.benefitsProcessor = new BenefitsProcessor();
    this.reportsGenerator = new ReportsGenerator();
    this.notificationService = new NotificationService();
  }

  /**
   * Inicializar todos los cron jobs
   */
  async initialize() {
    try {
      logger.info('Inicializando sistema de automatización...');

      // Job diario de procesamiento de beneficios - 00:01 UTC
      this.scheduleJob('dailyBenefits', '0 1 0 * * *', async () => {
        await this.executeDailyBenefitsProcessing();
      });

      // Job de procesamiento de beneficios personales programados - cada hora
      this.scheduleJob('personalBenefits', '0 0 * * * *', async () => {
        await this.executePersonalBenefitsProcessing();
      });

      // Job de generación de reportes - 00:30 UTC
      this.scheduleJob('reportsGeneration', '0 30 0 * * *', async () => {
        await this.executeReportsGeneration();
      });

      // Job de limpieza - 02:00 UTC
      this.scheduleJob('cleanup', '0 0 2 * * *', async () => {
        await this.executeCleanup();
      });

      // Job de notificaciones - cada 15 minutos
      this.scheduleJob('notifications', '0 */15 * * * *', async () => {
        await this.executeNotifications();
      });

      // Job de monitoreo de liquidez - cada 5 minutos
      this.scheduleJob('liquidityMonitor', '0 */5 * * * *', async () => {
        await this.executeLiquidityMonitoring();
      });

      this.isInitialized = true;
      logger.info('Sistema de automatización inicializado correctamente');

      // Enviar notificación de inicio
      await this.notificationService.sendAdminNotification({
        type: 'system',
        priority: 'normal',
        title: 'Sistema de Automatización Iniciado',
        message: 'Todos los jobs automáticos han sido configurados y están ejecutándose.',
        data: {
          jobsCount: this.jobs.size,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error inicializando sistema de automatización:', error);
      throw error;
    }
  }

  /**
   * Programar un job con manejo de errores
   */
  scheduleJob(name, schedule, task) {
    const job = cron.schedule(schedule, async () => {
      const logEntry = await this.startJobLog(name);
      
      try {
        logger.info(`Iniciando job: ${name}`);
        const startTime = Date.now();
        
        await task();
        
        const duration = Date.now() - startTime;
        await this.completeJobLog(logEntry.id, 'completed', duration);
        
        logger.info(`Job completado: ${name} (${duration}ms)`);
        
      } catch (error) {
        logger.error(`Error en job ${name}:`, error);
        await this.completeJobLog(logEntry.id, 'failed', null, error.message);
        
        // Enviar notificación de error crítico
        await this.notificationService.sendAdminNotification({
          type: 'system',
          priority: 'critical',
          title: `Error en Job: ${name}`,
          message: `El job automático ${name} ha fallado: ${error.message}`,
          data: {
            jobName: name,
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
    }, {
      scheduled: false
    });

    this.jobs.set(name, {
      job,
      schedule,
      isRunning: false,
      lastRun: null,
      nextRun: null
    });

    job.start();
    logger.info(`Job programado: ${name} con horario ${schedule}`);
  }

  /**
   * Ejecutar procesamiento diario de beneficios
   */
  async executeDailyBenefitsProcessing() {
    logger.info('Iniciando procesamiento diario de beneficios...');
    
    const result = await this.benefitsProcessor.processDailyBenefits();
    
    // NUEVO: Procesar bonos de líder/padre automáticamente
    try {
      logger.info('Procesando bonos de líder/padre automáticamente...');
      await this.processLeaderBonuses();
      logger.info('Procesamiento de bonos de líder/padre completado');
    } catch (bonusError) {
      logger.error('Error procesando bonos de líder/padre:', bonusError);
      // No fallar todo el proceso si los bonos fallan
    }
    
    // Generar reporte del procesamiento
    await this.reportsGenerator.generateDailyBenefitsReport(result);
    
    // Enviar notificación a administradores
    await this.notificationService.sendAdminNotification({
      type: 'benefits',
      priority: 'normal',
      title: 'Beneficios Diarios Procesados',
      message: `Se han procesado beneficios para ${result.usersProcessed} usuarios. Total: $${result.totalAmount}`,
      data: result
    });
    
    logger.info(`Procesamiento diario completado: ${result.usersProcessed} usuarios, $${result.totalAmount}`);
    return result;
  }

  /**
   * Procesar bonos de líder/padre (5% adicional en segunda semana)
   */
  async processLeaderBonuses() {
    try {
      const SpecialCode = require('../models/SpecialCode.model');
      const User = require('../models/User.model');
      const Transaction = require('../models/Transaction.model');
      
      // Obtener todos los códigos especiales de tipo 'leader' o 'parent'
      const leaderCodes = await SpecialCode.find({
        type: { $in: ['leader', 'parent'] },
        status: 'active',
        assignedTo: { $exists: true }
      }).populate('assignedTo');

      let processedBonuses = 0;

      for (const code of leaderCodes) {
        // Buscar usuarios que usen este código y estén en su segunda semana
        const usersWithCode = await User.find({
          'referralInfo.specialCode': code.code
        }).populate('userStatus');

        for (const user of usersWithCode) {
          if (user.userStatus && 
              user.userStatus.benefitCycle.weeksCompleted >= 1 && 
              user.userStatus.benefitCycle.currentDay === 1) {
            
            // Verificar si ya se procesó el bono para esta semana
            const existingBonus = await Transaction.findOne({
              user: code.assignedTo._id,
              type: 'bonus',
              subtype: 'leader_bonus',
              'metadata.sourceUserId': user._id,
              'metadata.weekNumber': user.userStatus.benefitCycle.weeksCompleted + 1
            });

            if (!existingBonus) {
              // Calcular el 5% del monto de la licencia del usuario
              const userInvestment = user.userStatus.totalInvested || 0;
              if (userInvestment > 0) {
                const leaderBonusAmount = userInvestment * 0.05;
                
                // Crear transacción de bono de líder
                const leaderBonusTransaction = new Transaction({
                  user: code.assignedTo._id,
                  type: 'bonus',
                  subtype: 'leader_bonus',
                  amount: leaderBonusAmount,
                  currency: 'USDT',
                  status: 'completed',
                  description: `Bono de ${code.type} 5% - Usuario: ${user.username}`,
                  externalReference: `LEADER_BONUS_${code._id}_${user._id}_${Date.now()}`,
                  metadata: {
                    specialCodeId: code._id,
                    codeType: code.type,
                    sourceUserId: user._id,
                    sourceUserInvestment: userInvestment,
                    bonusRate: 0.05,
                    weekNumber: user.userStatus.benefitCycle.weeksCompleted + 1,
                    processedAutomatically: true
                  }
                });

                await leaderBonusTransaction.save();

                // Actualizar el código especial con el bono
                code.bonuses.push({
                  amount: leaderBonusAmount,
                  transactionId: leaderBonusTransaction._id,
                  processedAt: new Date(),
                  description: `Bono automático de ${code.type} - Semana 2 - Usuario: ${user.username}`,
                  metadata: {
                    sourceUserId: user._id,
                    weekNumber: user.userStatus.benefitCycle.weeksCompleted + 1
                  }
                });
                await code.save();

                // Actualizar el capital del líder/padre
                await User.findByIdAndUpdate(code.assignedTo._id, {
                  $inc: { 'capital.available': leaderBonusAmount }
                });

                processedBonuses++;

                logger.info(`Bono de ${code.type} procesado automáticamente`, {
                  leaderId: code.assignedTo._id,
                  sourceUserId: user._id,
                  bonusAmount: leaderBonusAmount,
                  codeType: code.type
                });
              }
            }
          }
        }
      }

      logger.info(`Procesamiento automático de bonos completado: ${processedBonuses} bonos procesados`);
      return { processedBonuses };

    } catch (error) {
      logger.error('Error procesando bonos de líder/padre:', error);
      throw error;
    }
  }

  /**
   * Ejecutar activación de usuarios Pioneer
   * Nota: Funcionalidad eliminada
   */
  async executePioneerActivation() {
    logger.info('La funcionalidad de activación de usuarios Pioneer ha sido eliminada');
    return { activatedCount: 0, message: 'Funcionalidad eliminada' };
  }

  /**
   * Ejecutar generación de reportes
   */
  async executeReportsGeneration() {
    logger.info('Iniciando generación de reportes diarios...');
    
    const report = await this.reportsGenerator.generateDailyReport();
    
    // Enviar reporte por email a administradores
    await this.notificationService.sendDailyReportEmail(report);
    
    logger.info('Generación de reportes completada');
    return report;
  }

  /**
   * Ejecutar limpieza de datos
   */
  async executeCleanup() {
    logger.info('Iniciando limpieza de datos...');
    
    const result = {
      logsDeleted: 0,
      notificationsDeleted: 0,
      tempFilesDeleted: 0
    };

    try {
      // Limpiar logs antiguos (más de 30 días)
      const logsDeleted = await AutomationLog.destroy({
        where: {
          created_at: {
            [require('sequelize').Op.lt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      });
      result.logsDeleted = logsDeleted;

      // Limpiar notificaciones antiguas
      result.notificationsDeleted = await this.notificationService.cleanupOldNotifications();

      // Limpiar archivos temporales
      result.tempFilesDeleted = await this.reportsGenerator.cleanupTempFiles();

      logger.info(`Limpieza completada: ${JSON.stringify(result)}`);
      
    } catch (error) {
      logger.error('Error durante la limpieza:', error);
      throw error;
    }

    return result;
  }

  /**
   * Ejecutar procesamiento de notificaciones
   */
  async executeNotifications() {
    const result = await this.notificationService.processNotificationQueue();
    
    if (result.processed > 0) {
      logger.info(`Notificaciones procesadas: ${result.processed}`);
    }
    
    return result;
  }

  /**
   * Ejecutar monitoreo de liquidez
   */
  async executeLiquidityMonitoring() {
    const liquidityStatus = await this.reportsGenerator.checkLiquidityStatus();
    
    // Enviar alertas si la liquidez está baja
    if (liquidityStatus.status === 'critical' || liquidityStatus.status === 'warning') {
      await this.notificationService.sendAdminNotification({
        type: 'liquidity',
        priority: liquidityStatus.status === 'critical' ? 'critical' : 'high',
        title: `Alerta de Liquidez: ${liquidityStatus.status.toUpperCase()}`,
        message: `El nivel de liquidez está en estado ${liquidityStatus.status}. Saldo disponible: $${liquidityStatus.availableBalance}`,
        data: liquidityStatus
      });
    }
    
    return liquidityStatus;
  }

  /**
   * Ejecutar job manualmente
   */
  async executeJobManually(jobName) {
    if (!this.jobs.has(jobName)) {
      throw new Error(`Job no encontrado: ${jobName}`);
    }

    const logEntry = await this.startJobLog(jobName, 'manual');
    
    try {
      logger.info(`Ejecutando job manualmente: ${jobName}`);
      const startTime = Date.now();
      
      let result;
      switch (jobName) {
        case 'dailyBenefits':
          result = await this.executeDailyBenefitsProcessing();
          break;
        case 'pioneerActivation':
          logger.info('La funcionalidad de activación de usuarios Pioneer ha sido eliminada');
          result = { activatedCount: 0, message: 'Funcionalidad eliminada' };
          break;
        case 'reportsGeneration':
          result = await this.executeReportsGeneration();
          break;
        case 'cleanup':
          result = await this.executeCleanup();
          break;
        case 'notifications':
          result = await this.executeNotifications();
          break;
        case 'liquidityMonitor':
          result = await this.executeLiquidityMonitoring();
          break;
        case 'personalBenefits':
          result = await this.executePersonalBenefitsProcessing();
          break;
        default:
          throw new Error(`Job no implementado: ${jobName}`);
      }
      
      const duration = Date.now() - startTime;
      await this.completeJobLog(logEntry.id, 'completed', duration, null, result);
      
      logger.info(`Job manual completado: ${jobName} (${duration}ms)`);
      return result;
      
    } catch (error) {
      logger.error(`Error en job manual ${jobName}:`, error);
      await this.completeJobLog(logEntry.id, 'failed', null, error.message);
      throw error;
    }
  }

  /**
   * Pausar un job
   */
  pauseJob(jobName) {
    if (!this.jobs.has(jobName)) {
      throw new Error(`Job no encontrado: ${jobName}`);
    }

    const jobInfo = this.jobs.get(jobName);
    jobInfo.job.stop();
    jobInfo.isRunning = false;
    
    logger.info(`Job pausado: ${jobName}`);
  }

  /**
   * Reanudar un job
   */
  resumeJob(jobName) {
    if (!this.jobs.has(jobName)) {
      throw new Error(`Job no encontrado: ${jobName}`);
    }

    const jobInfo = this.jobs.get(jobName);
    jobInfo.job.start();
    jobInfo.isRunning = true;
    
    logger.info(`Job reanudado: ${jobName}`);
  }

  /**
   * Obtener estado de todos los jobs
   */
  getJobsStatus() {
    const status = {};
    
    for (const [name, info] of this.jobs) {
      status[name] = {
        isRunning: info.isRunning,
        schedule: info.schedule,
        lastRun: info.lastRun,
        nextRun: info.nextRun
      };
    }
    
    return {
      isInitialized: this.isInitialized,
      jobs: status,
      totalJobs: this.jobs.size
    };
  }

  /**
   * Crear entrada de log para job
   */
  async startJobLog(jobName, triggerType = 'automatic') {
    return await AutomationLog.create({
      job_name: jobName,
      job_type: this.getJobType(jobName),
      status: 'running',
      start_time: new Date(),
      trigger_type: triggerType
    });
  }

  /**
   * Completar entrada de log para job
   */
  async completeJobLog(logId, status, duration = null, errorMessage = null, metadata = null) {
    const updateData = {
      status,
      end_time: new Date()
    };

    if (duration !== null) {
      updateData.duration_ms = duration;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (metadata) {
      updateData.metadata = metadata;
    }

    await AutomationLog.update(updateData, {
      where: { id: logId }
    });
  }

  /**
   * Obtener tipo de job
   */
  getJobType(jobName) {
    const typeMap = {
      dailyBenefits: 'benefits',
      personalBenefits: 'benefits',
      pioneerActivation: 'removed_feature',
      reportsGeneration: 'reports',
      cleanup: 'cleanup',
      notifications: 'notifications',
      liquidityMonitor: 'monitoring'
    };
    
    return typeMap[jobName] || 'other';
  }

  /**
   * Ejecutar procesamiento de beneficios personales programados
   */
  async executePersonalBenefitsProcessing() {
    const LicenseActivationService = require('./LicenseActivationService');
    
    try {
      logger.info('Iniciando procesamiento de beneficios personales programados...');
      
      const result = await LicenseActivationService.processScheduledPersonalBenefits();
      
      logger.info('Procesamiento de beneficios personales completado:', {
        processed: result.processed,
        errors: result.errors,
        duration: result.duration
      });
      
      // Enviar notificación si hay errores
      if (result.errors > 0) {
        await this.notificationService.sendAdminNotification({
          type: 'system',
          priority: 'high',
          title: 'Errores en Procesamiento de Beneficios Personales',
          message: `Se procesaron ${result.processed} beneficios con ${result.errors} errores.`,
          data: result
        });
      }
      
      return result;
      
    } catch (error) {
      logger.error('Error en procesamiento de beneficios personales:', error);
      
      await this.notificationService.sendAdminNotification({
        type: 'system',
        priority: 'critical',
        title: 'Error Crítico en Beneficios Personales',
        message: `Error procesando beneficios personales: ${error.message}`,
        data: { error: error.message, stack: error.stack }
      });
      
      throw error;
    }
  }

  /**
   * Detener todos los jobs
   */
  async shutdown() {
    logger.info('Deteniendo sistema de automatización...');
    
    for (const [name, info] of this.jobs) {
      info.job.stop();
      logger.info(`Job detenido: ${name}`);
    }
    
    this.jobs.clear();
    this.isInitialized = false;
    
    logger.info('Sistema de automatización detenido');
  }
}

module.exports = AutomationService;