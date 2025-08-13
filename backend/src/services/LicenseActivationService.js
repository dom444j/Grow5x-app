const User = require('../models/User');
const UserStatus = require('../models/UserStatus');
const UserBenefit = require('../models/UserBenefit.model');
const Notification = require('../models/Notification.model');
const Transaction = require('../models/Transaction.model');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

class LicenseActivationService {
  constructor() {
    this.PERSONAL_BENEFIT_DELAY = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
  }

  // Mapeo de los 7 paquetes oficiales con sus características
  static PACKAGE_CONFIG = {
    starter: {
      price: 50,
      dailyReturn: 0.125, // 12.5%
      totalCycles: 5,
      cycleDays: 45, // Días máximos por ciclo
      pauseDays: 1,
      totalDays: 180, // Duración total 6 meses
      name: 'Starter'
    },
    basic: {
      price: 100,
      dailyReturn: 0.125,
      totalCycles: 5,
      cycleDays: 45, // Días máximos por ciclo
      pauseDays: 1,
      totalDays: 180, // Duración total 6 meses
      name: 'Basic'
    },
    standard: {
      price: 250,
      dailyReturn: 0.125,
      totalCycles: 5,
      cycleDays: 45, // Días máximos por ciclo
      pauseDays: 1,
      totalDays: 180, // Duración total 6 meses
      name: 'Standard'
    },
    premium: {
      price: 500,
      dailyReturn: 0.125,
      totalCycles: 5,
      cycleDays: 45, // Días máximos por ciclo
      pauseDays: 1,
      totalDays: 180, // Duración total 6 meses
      name: 'Premium'
    },
    gold: {
      price: 1000,
      dailyReturn: 0.125,
      totalCycles: 5,
      cycleDays: 45, // Días máximos por ciclo
      pauseDays: 1,
      totalDays: 180, // Duración total 6 meses
      name: 'Gold'
    },
    platinum: {
      price: 2500,
      dailyReturn: 0.125,
      totalCycles: 5,
      cycleDays: 45, // Días máximos por ciclo
      pauseDays: 1,
      totalDays: 180, // Duración total 6 meses
      name: 'Platinum'
    },
    diamond: {
      price: 5000,
      dailyReturn: 0.125,
      totalCycles: 5,
      cycleDays: 45, // Días máximos por ciclo
      pauseDays: 1,
      totalDays: 180, // Duración total 6 meses
      name: 'Diamond'
    }
  };

  /**
   * Activar licencia inmediatamente después de confirmación de pago
   * @param {string} userId - ID del usuario
   * @param {Object} transactionData - Datos de la transacción
   * @param {string} packageType - Tipo de paquete/licencia
   */
  async activateLicenseAfterPayment(userId, transactionData, packageType = 'standard') {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        logger.info(`Iniciando activación de licencia para usuario ${userId}`);

        // 1. Actualizar estado del usuario
        const user = await User.findById(userId).session(session);
        if (!user) {
          throw new Error('Usuario no encontrado');
        }

        // Activar licencia según el tipo de paquete
        const licenseData = this.getLicenseDataByPackage(packageType, transactionData);
        
        // Actualizar campos de licencia en el usuario
        user.status = 'active';
        user.isPioneer = licenseData.isPioneer;
        
        // CRÍTICO: Agregar package_status para sincronizar con UserStatus
        user.package_status = 'active';
        user.current_package = packageType;
        
        if (licenseData.isPioneer) {
          user.pioneerDetails = {
            level: licenseData.level,
            activatedAt: new Date(),
            expiresAt: licenseData.expiresAt,
            paymentId: transactionData._id
          };
        }

        // Actualizar beneficios personales
        user.benefits.personalBenefits.totalLicensesPurchased += 1;
        user.benefits.personalBenefits.lastPurchaseDate = new Date();
        
        await user.save({ session });

        // 2. Actualizar UserStatus
        let userStatus = await UserStatus.findOne({ user: userId }).session(session);
        if (!userStatus) {
          userStatus = new UserStatus({ user: userId });
        }

        // CRÍTICO: Configurar suscripción para que BenefitsProcessor pueda encontrar usuarios activos
        const now = new Date();
        userStatus.subscription.currentPackage = packageType;
        userStatus.subscription.packageStatus = 'active';
        userStatus.subscription.activatedAt = now;
        userStatus.subscription.expiresAt = licenseData.expiresAt;
        
        // Inicializar ciclo de beneficios
        userStatus.subscription.benefitCycle.currentDay = 1;
        userStatus.subscription.benefitCycle.cycleStartDate = now;
        // Para permitir procesamiento inmediato en tests, usar fecha actual
        userStatus.subscription.benefitCycle.nextBenefitDate = now;
        userStatus.subscription.benefitCycle.isPaused = false;
        
        // Actualizar métricas financieras
        userStatus.calculated.totalInvested += transactionData.amount;

        // Activar estado pioneer si aplica
        if (licenseData.isPioneer) {
          userStatus.pioneer.isActive = true;
          userStatus.pioneer.level = licenseData.level;
          userStatus.pioneer.activatedAt = new Date();
          userStatus.pioneer.expiresAt = licenseData.expiresAt;
          userStatus.pioneer.benefits = licenseData.benefits;
        }

        await userStatus.save({ session });

        // 3. Crear notificación de activación inmediata
        await this.createLicenseActivationNotification(userId, licenseData, session);

        // 4. Activar inmediatamente el sistema de beneficios diarios
        await this.activateDailyBenefitsSystem(userId, transactionData, licenseData, session);

        logger.info(`Licencia activada exitosamente para usuario ${userId}`);
        
        return {
          success: true,
          licenseActivated: true,
          dailyBenefitsActivated: true,
          licenseData
        };
      });

    } catch (error) {
      logger.error('Error activando licencia:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Obtener datos de licencia según el tipo de paquete
   * Paquetes disponibles: starter, basic, standard, premium, gold, platinum, diamond
   * Configuración según flujo real de correccionflujo.md
   */
  getLicenseDataByPackage(packageType, transactionData) {
    const baseData = {
      isPioneer: false, // Pioneer status disabled - mantener código sin activar
      activatedAt: new Date(),
      paymentAmount: transactionData.amount,
      currency: transactionData.currency,
      // Todos los paquetes tienen 180 días de duración (5 ciclos de 45 días máximo)
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 180 días
    };

    // Configuración real de los 7 paquetes según seed-packages.js
    switch (packageType.toLowerCase()) {
      case 'starter':
        return {
          ...baseData,
          level: 'starter',
          packagePrice: 50,
          benefits: {
            dailyReturn: 12.5, // 12.5% diario sobre monto invertido
            withdrawalTime: '24 horas',
            priority: 'Baja',
            totalCycles: 5,
            cycleDays: 8,
            commissionRate: 10,
            maxEarnings: 75,
            totalPotential: 500 // 500% (100% cashback + 400% beneficios)
          }
        };
      
      case 'basic':
        return {
          ...baseData,
          level: 'basic',
          packagePrice: 100,
          benefits: {
            dailyReturn: 12.5, // 12.5% diario sobre monto invertido
            withdrawalTime: '12 horas',
            priority: 'Media',
            totalCycles: 5,
            cycleDays: 8,
            commissionRate: 15,
            maxEarnings: 175,
            totalPotential: 500 // 500% (100% cashback + 400% beneficios)
          }
        };
      
      case 'standard':
        return {
          ...baseData,
          level: 'standard',
          packagePrice: 250,
          benefits: {
            dailyReturn: 12.5, // 12.5% diario sobre monto invertido
            withdrawalTime: '6 horas',
            priority: 'Alta',
            totalCycles: 5,
            cycleDays: 8,
            commissionRate: 20,
            maxEarnings: 400,
            totalPotential: 500 // 500% (100% cashback + 400% beneficios)
          }
        };
      
      case 'premium':
        return {
          ...baseData,
          level: 'premium',
          packagePrice: 500,
          benefits: {
            dailyReturn: 12.5, // 12.5% diario sobre monto invertido
            withdrawalTime: '3 horas',
            priority: 'Premium',
            totalCycles: 5,
            cycleDays: 8,
            commissionRate: 25,
            maxEarnings: 1000,
            totalPotential: 500 // 500% (100% cashback + 400% beneficios)
          }
        };
      
      case 'gold':
        return {
          ...baseData,
          level: 'gold',
          packagePrice: 1000,
          benefits: {
            dailyReturn: 12.5, // 12.5% diario sobre monto invertido
            withdrawalTime: '1 hora',
            priority: 'Gold',
            totalCycles: 5,
            cycleDays: 8,
            commissionRate: 30,
            maxEarnings: 2500,
            totalPotential: 500 // 500% (100% cashback + 400% beneficios)
          }
        };
      
      case 'platinum':
        return {
          ...baseData,
          level: 'platinum',
          packagePrice: 2500,
          benefits: {
            dailyReturn: 12.5, // 12.5% diario sobre monto invertido
            withdrawalTime: '30 minutos',
            priority: 'Platinum',
            totalCycles: 5,
            cycleDays: 8,
            commissionRate: 35,
            maxEarnings: 6000,
            totalPotential: 500 // 500% (100% cashback + 400% beneficios)
          }
        };
      
      case 'diamond':
        return {
          ...baseData,
          level: 'diamond',
          packagePrice: 5000,
          benefits: {
            dailyReturn: 12.5, // 12.5% diario sobre monto invertido
            withdrawalTime: '15 minutos',
            priority: 'Diamond',
            totalCycles: 5,
            cycleDays: 8,
            commissionRate: 40,
            maxEarnings: 15000,
            totalPotential: 500 // 500% (100% cashback + 400% beneficios)
          }
        };
      
      default:
        // Default a starter si no se reconoce el tipo
        return {
          ...baseData,
          level: 'starter',
          packagePrice: 50,
          benefits: {
            dailyReturn: 12.5,
            withdrawalTime: '24 horas',
            priority: 'Baja',
            totalCycles: 5,
            cycleDays: 8,
            commissionRate: 10,
            maxEarnings: 75,
            totalPotential: 500
          }
        };
    }
  }

  /**
   * Crear notificación de activación de licencia
   */
  async createLicenseActivationNotification(userId, licenseData, session) {
    const notification = new Notification({
      recipient: userId,
      type: 'success',
      title: '🎉 ¡Licencia Activada!',
      message: `Tu licencia ${licenseData.level} ha sido activada exitosamente. El sistema de beneficios diarios (12.5% diario) está ahora activo por 180 días.`,
      priority: 'high',
      status: 'pending',
      metadata: {
        source: 'license_activation',
        category: 'license',
        relatedId: userId,
        relatedModel: 'User',
        data: {
          licenseLevel: licenseData.level,
          activatedAt: licenseData.activatedAt,
          expiresAt: licenseData.expiresAt,
          benefits: licenseData.benefits,
          dailyReturn: licenseData.benefits.dailyReturn,
          totalCycles: licenseData.benefits.totalCycles,
          cycleDays: licenseData.benefits.cycleDays
        }
      }
    });

    await notification.save({ session });
    logger.info(`Notificación de activación creada para usuario ${userId}`);
  }

  /**
   * Activar inmediatamente el sistema de beneficios diarios
   * Según el flujo real: 12.5% diario por 180 días (5 ciclos de 45 días máximo)
   */
  async activateDailyBenefitsSystem(userId, transactionData, licenseData, session) {
    // Actualizar el UserStatus para activar el sistema de beneficios diarios
    let userStatus = await UserStatus.findOne({ user: userId }).session(session);
    if (!userStatus) {
      userStatus = new UserStatus({ user: userId });
    }

    // Configurar el sistema de beneficios diarios
    userStatus.dailyBenefits = {
      isActive: true,
      packageType: licenseData.level,
      investmentAmount: transactionData.amount,
      dailyReturnRate: licenseData.benefits.dailyReturn, // 12.5%
      startDate: new Date(),
      endDate: licenseData.expiresAt,
      totalCycles: licenseData.benefits.totalCycles, // 5 ciclos
      cycleDays: licenseData.benefits.cycleDays, // 8 días por ciclo
      currentCycle: 1,
      currentDay: 1,
      totalDaysActive: 0,
      totalBenefitsEarned: 0,
      lastProcessedDate: null,
      withdrawalTime: licenseData.benefits.withdrawalTime,
      priority: licenseData.benefits.priority
    };

    await userStatus.save({ session });

    // Crear notificación del sistema activado
    const systemNotification = new Notification({
      recipient: userId,
      type: 'success',
      title: '💰 Sistema de Beneficios Diarios Activado',
      message: `Tu sistema de beneficios diarios está activo. Recibirás ${licenseData.benefits.dailyReturn}% diario (${(transactionData.amount * licenseData.benefits.dailyReturn / 100).toFixed(2)} ${transactionData.currency}) por 180 días.`,
      priority: 'high',
      status: 'pending',
      metadata: {
        source: 'license_activation',
        category: 'benefits',
        relatedId: transactionData._id || transactionData.id,
        relatedModel: 'Transaction',
        data: {
          packageType: licenseData.level,
          investmentAmount: transactionData.amount,
          dailyAmount: transactionData.amount * licenseData.benefits.dailyReturn / 100,
          totalCycles: licenseData.benefits.totalCycles,
          cycleDays: licenseData.benefits.cycleDays,
          totalPotential: licenseData.benefits.totalPotential
        }
      }
    });

    await systemNotification.save({ session });
    
    logger.info(`Sistema de beneficios diarios activado para usuario ${userId} - Paquete: ${licenseData.level} - Monto: ${transactionData.amount}`);
  }

  /**
   * Procesar beneficios personales programados (llamado por cron job)
   */
  async processScheduledPersonalBenefits() {
    const startTime = Date.now();
    logger.info('Iniciando procesamiento de beneficios personales programados...');

    try {
      const now = new Date();
      
      // Buscar beneficios programados que deben activarse
      const scheduledBenefits = await UserBenefit.find({
        'schedule.isScheduled': true,
        'schedule.scheduledFor': { $lte: now },
        status: 'pending',
        type: 'personal_license_benefit'
      }).populate('user', 'fullName email');

      logger.info(`Encontrados ${scheduledBenefits.length} beneficios personales para procesar`);

      let processed = 0;
      let errors = 0;

      for (const benefit of scheduledBenefits) {
        try {
          await this.activatePersonalBenefit(benefit);
          processed++;
        } catch (error) {
          logger.error(`Error procesando beneficio ${benefit._id}:`, error);
          errors++;
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`Procesamiento completado - Procesados: ${processed}, Errores: ${errors}, Duración: ${duration}ms`);

      return {
        success: true,
        processed,
        errors,
        duration,
        total: scheduledBenefits.length
      };

    } catch (error) {
      logger.error('Error en procesamiento de beneficios personales:', error);
      throw error;
    }
  }

  /**
   * Activar un beneficio personal específico
   */
  async activatePersonalBenefit(benefit) {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Actualizar estado del beneficio
        benefit.status = 'approved';
        benefit.processing.requestedAt = new Date();
        benefit.processing.approvedAt = new Date();
        benefit.processing.approvedBy = 'system';
        benefit.processing.notes = 'Beneficio personal activado automáticamente después de 24 horas';
        
        await benefit.save({ session });

        // Actualizar balance del usuario
        const user = await User.findById(benefit.user._id || benefit.user).session(session);
        if (user) {
          user.balances.available += benefit.amount;
          user.totalEarnings += benefit.amount;
          await user.save({ session });
        }

        // Crear notificación de activación
        const notification = new Notification({
          userId: benefit.user._id || benefit.user,
          type: 'benefit_activated',
          title: '💰 ¡Beneficio Personal Activado!',
          message: `Tu beneficio personal de ${benefit.amount} ${benefit.currency} ha sido activado y agregado a tu balance.`,
          priority: 'high',
          status: 'pending',
          metadata: {
            benefitId: benefit._id,
            amount: benefit.amount,
            currency: benefit.currency,
            activatedAt: new Date()
          }
        });

        await notification.save({ session });

        logger.info(`Beneficio personal activado: ${benefit._id} - Usuario: ${benefit.user._id || benefit.user} - Monto: ${benefit.amount}`);
      });

    } catch (error) {
      logger.error(`Error activando beneficio personal ${benefit._id}:`, error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Obtener estadísticas de activaciones de licencias
   */
  async getLicenseActivationStats(days = 30) {
    try {
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
      
      const stats = await User.aggregate([
        {
          $match: {
            'pioneerDetails.activatedAt': { $gte: startDate },
            isPioneer: true
          }
        },
        {
          $group: {
            _id: {
              level: '$pioneerDetails.level',
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$pioneerDetails.activatedAt'
                }
              }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$benefits.personalBenefits.totalPersonalCommissions' }
          }
        },
        {
          $sort: { '_id.date': -1, '_id.level': 1 }
        }
      ]);

      return {
        success: true,
        period: `${days} días`,
        stats
      };

    } catch (error) {
      logger.error('Error obteniendo estadísticas de activación:', error);
      throw error;
    }
  }
}

module.exports = new LicenseActivationService();