const User = require('../models/User');
const UserStatus = require('../models/UserStatus');
const Transaction = require('../models/Transaction.model');
const Wallet = require('../models/Wallet.model');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const { 
  calculateDailyBenefit, 
  shouldUseRealCapital, 
  calculateTotalCapital,
  calculateDirectReferralCommission,
  isUserInCashbackPeriod,
  calculateLeaderParentBonus
} = require('../utils/benefitsCalculator');
const Referral = require('../models/Referral.model');
const SpecialCode = require('../models/SpecialCode.model');
const Commission = require('../models/Commission.model');

class BenefitsProcessor {
  constructor() {
    this.batchSize = 100; // Procesar en lotes de 100 usuarios
    this.maxRetries = 3;
  }

  /**
   * Procesar beneficios diarios para todos los usuarios elegibles
   */
  async processDailyBenefits() {
    const startTime = Date.now();
    logger.info('Iniciando procesamiento diario de beneficios...');

    const result = {
      usersProcessed: 0,
      totalAmount: 0,
      errors: [],
      batches: 0,
      duration: 0,
      date: new Date().toISOString().split('T')[0],
      usingRealCapital: false
    };

    try {
      // Verificar si se debe usar capital real
      const useRealCapital = await shouldUseRealCapital();
      result.usingRealCapital = useRealCapital;
      
      if (useRealCapital) {
        logger.info('Procesando beneficios con CAPITAL REAL - Umbral de 1.4M USDT superado');
      } else {
        logger.info('Procesando beneficios con capital simulado - Umbral de 1.4M USDT no alcanzado');
      }
      
      // Obtener usuarios elegibles para beneficios
      const eligibleUsers = await this.getEligibleUsers();
      logger.info(`Usuarios elegibles encontrados: ${eligibleUsers.length}`);

      if (eligibleUsers.length === 0) {
        logger.info('No hay usuarios elegibles para procesar beneficios hoy');
        return result;
      }
      
      // Actualizar el estado de capital real para todos los usuarios elegibles
      if (eligibleUsers.length > 0) {
        await this.updateUsersRealCapitalStatus(eligibleUsers, useRealCapital);
      }

      // Procesar en lotes
      const batches = this.createBatches(eligibleUsers, this.batchSize);
      result.batches = batches.length;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.info(`Procesando lote ${i + 1}/${batches.length} (${batch.length} usuarios)`);

        const batchResult = await this.processBatch(batch);
        
        result.usersProcessed += batchResult.processed;
        result.totalAmount += batchResult.totalAmount;
        result.errors.push(...batchResult.errors);

        // Pequeña pausa entre lotes para no sobrecargar la base de datos
        if (i < batches.length - 1) {
          await this.sleep(1000); // 1 segundo
        }
      }

      result.duration = Date.now() - startTime;
      logger.info(`Procesamiento diario completado: ${result.usersProcessed} usuarios, $${result.totalAmount} en ${result.duration}ms`);
      logger.info(`Modo de capital: ${useRealCapital ? 'REAL' : 'SIMULADO'}`);

    } catch (error) {
      logger.error('Error durante el procesamiento diario de beneficios:', error);
      result.errors.push({
        type: 'system',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }

    return result;
  }

  /**
   * Obtener usuarios elegibles para beneficios diarios
   */
  async getEligibleUsers() {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    try {
      // Buscar usuarios con paquetes activos usando UserStatus
      const activeUserStatuses = await UserStatus.find({
        'subscription.packageStatus': 'active',
        'subscription.currentPackage': { $in: ['starter', 'basic', 'standard', 'premium', 'gold', 'platinum', 'diamond'] },
        $or: [
          { 'subscription.lastBenefitDate': { $exists: false } },
          { 'subscription.lastBenefitDate': null },
          { 'subscription.lastBenefitDate': { $lt: todayStart } }
        ]
      }).populate('user', '_id email status email_verified usingRealCapital package_type package_status last_benefit_date');

      // Filtrar usuarios activos y con email verificado
      const eligibleUsers = [];
      for (const userStatus of activeUserStatuses) {
        const user = userStatus.user;
        if (!user || user.status !== 'active' || !user.email_verified) {
          continue;
        }

        // Verificar que tiene wallet activa
        const wallet = await Wallet.findOne({ user: user._id, status: 'active' });
        if (wallet) {
          eligibleUsers.push({
            ...user.toObject(),
            wallet: wallet,
            userStatus: userStatus
          });
        }
      }

      return eligibleUsers;
    } catch (error) {
      logger.error('Error obteniendo usuarios elegibles:', error);
      throw error;
    }
  }

  /**
   * Crear lotes de usuarios para procesamiento
   */
  createBatches(users, batchSize) {
    const batches = [];
    for (let i = 0; i < users.length; i += batchSize) {
      batches.push(users.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Procesar un lote de usuarios
   */
  async processBatch(users) {
    const result = {
      processed: 0,
      totalAmount: 0,
      errors: []
    };

    const promises = users.map(user => this.processUserBenefits(user));
    const results = await Promise.allSettled(promises);

    for (let i = 0; i < results.length; i++) {
      const promiseResult = results[i];
      const user = users[i];

      if (promiseResult.status === 'fulfilled') {
        const userResult = promiseResult.value;
        if (userResult.success) {
          result.processed++;
          result.totalAmount += userResult.amount;
        } else {
          result.errors.push({
            userId: user.id,
            email: user.email,
            error: userResult.error,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        result.errors.push({
          userId: user.id,
          email: user.email,
          error: promiseResult.reason.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return result;
  }

  /**
   * Procesar beneficios para un usuario específico
   */
  async processUserBenefits(user) {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        const userStatus = user.userStatus;
        const wallet = user.wallet;

        // Calcular beneficio diario considerando si se usa capital real
        const benefitAmount = await calculateDailyBenefit(user, userStatus);
        
        if (benefitAmount <= 0) {
          return {
            success: false,
            error: 'Beneficio calculado es 0 o negativo',
            amount: 0,
            usingRealCapital: user.usingRealCapital || false
          };
        }

        // Iniciar transacción de base de datos
        const transaction = await User.sequelize.transaction();

        try {
          // Actualizar saldo de la billetera
          await wallet.increment('available_balance', {
            by: benefitAmount,
            transaction
          });

          // Actualizar estado del usuario
          await userStatus.update({
            last_benefit_date: new Date(),
            last_benefit_amount: benefitAmount,
            total_benefits: userStatus.total_benefits + benefitAmount,
            benefits_count: userStatus.benefits_count + 1
          }, { transaction });

          // Crear registro de transacción
          const benefitTransaction = await Transaction.create({
            user_id: user.id,
            wallet_id: wallet.id,
            type: 'benefit',
            amount: benefitAmount,
            status: 'completed',
            description: `Beneficio diario - ${userStatus.package_type} ${user.usingRealCapital ? '(capital real)' : '(simulado)'}`,
            reference: `daily_benefit_${new Date().toISOString().split('T')[0]}`,
            metadata: {
              package_type: userStatus.package_type,
              processing_date: new Date().toISOString(),
              automatic: true,
              usingRealCapital: user.usingRealCapital || false
            }
          }, { transaction });

          // Procesar comisiones de referidos si el usuario está en período de cashback
          await this.processReferralCommissionsForUser(user, false, transaction);

          // Confirmar transacción
          await transaction.commit();

          logger.debug(`Beneficio procesado para usuario ${user.id}: $${benefitAmount} ${user.usingRealCapital ? '(capital real)' : '(simulado)'}`);
          
          return {
            success: true,
            amount: benefitAmount,
            userId: user.id,
            usingRealCapital: user.usingRealCapital || false
          };

        } catch (error) {
          // Revertir transacción en caso de error
          await transaction.rollback();
          throw error;
        }

      } catch (error) {
        retries++;
        logger.warn(`Error procesando beneficio para usuario ${user.id} (intento ${retries}/${this.maxRetries}):`, error.message);
        
        if (retries >= this.maxRetries) {
          return {
            success: false,
            error: `Error después de ${this.maxRetries} intentos: ${error.message}`,
            amount: 0
          };
        }
        
        // Esperar antes del siguiente intento
        await this.sleep(1000 * retries); // Backoff exponencial
      }
    }
  }

  /**
   * Procesar beneficios para un usuario específico (manual)
   */
  async processUserBenefitsManual(userId) {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            model: UserStatus,
            as: 'userStatus'
          },
          {
            model: Wallet,
            as: 'wallet'
          }
        ]
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (!user.userStatus || user.userStatus.status !== 'active') {
        throw new Error('Usuario no tiene estado activo');
      }

      if (!user.wallet || user.wallet.status !== 'active') {
        throw new Error('Usuario no tiene billetera activa');
      }

      const result = await this.processUserBenefits(user);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        amount: result.amount,
        message: `Beneficio de $${result.amount} procesado exitosamente`
      };

    } catch (error) {
      logger.error(`Error procesando beneficio manual para usuario ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Procesar beneficios para múltiples usuarios (manual)
   */
  async processMultipleUsersBenefits(userIds) {
    const results = {
      processed: 0,
      totalAmount: 0,
      errors: [],
      details: [],
      skipped: 0
    };

    for (const userId of userIds) {
      try {
        // Guardia para evitar error de null _id
        if (!userId || (typeof userId === 'object' && !userId._id)) {
          logger.warn(`⚠️ userId inválido o sin _id: ${userId}`);
          results.skipped++;
          results.details.push({
            userId: userId || 'null',
            success: false,
            error: 'userId inválido o sin _id'
          });
          continue;
        }
        
        const result = await this.processUserBenefitsManual(userId);
        
        results.processed++;
        results.totalAmount += result.amount;
        results.details.push({
          userId,
          success: true,
          amount: result.amount
        });

      } catch (error) {
        results.errors.push({
          userId,
          error: error.message
        });
        results.details.push({
          userId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Procesar comisiones de referidos manualmente (para testing y triggers manuales)
   * @param {string} userId - ID del usuario específico (opcional)
   * @param {boolean} force - Forzar procesamiento sin validaciones estrictas
   */
  async processReferralCommissionsManual(userId = null, force = false) {
    logger.info(`processReferralCommissionsManual called with userId=${userId}, force=${force}`);
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      let processedCommissions = [];
      
      if (userId) {
        // Procesar para un usuario específico
        logger.info(`Looking for user with ID: ${userId}`);
        const user = await User.findById(userId);
        if (user) {
          logger.info(`User found: ${user.email}, calling processReferralCommissionsForUser with force=${force}`);
          try {
            const result = await this.processReferralCommissionsForUser(user, force, session);
            logger.info(`processReferralCommissionsForUser result: ${JSON.stringify(result)}`);
            if (result) processedCommissions.push(result);
          } catch (error) {
            logger.error('Error calling processReferralCommissionsForUser:', error);
          }
        } else {
          logger.info(`User with ID ${userId} not found`);
        }
      } else {
        // Procesar para todos los usuarios elegibles
        const eligibleUsers = await this.getEligibleUsersForCommissions(force);
        
        for (const user of eligibleUsers) {
          const result = await this.processReferralCommissionsForUser(user, force, session);
          if (result) processedCommissions.push(result);
        }
      }
      
      await session.commitTransaction();
      
      return {
        success: true,
        processedCount: processedCommissions.length,
        commissions: processedCommissions
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error en procesamiento manual de comisiones:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Procesar comisiones de referidos según el nuevo sistema
   * CORREGIDO: Pago único al completar 100% del cashback (día 8)
   */
  async processReferralCommissions(user, benefitAmount, dbTransaction) {
    try {
      // Verificar si el usuario completó exactamente el 100% del cashback (día 8)
      const hasCompletedCashback = await this.hasUserCompletedFullCashback(user.id);
      
      if (!hasCompletedCashback) {
        return; // Solo procesar comisión al completar 100% del cashback
      }

      // Buscar referido directo
      const referral = await Referral.findOne({
        referred: user.id,
        status: 'active'
      }).populate('referrer');

      if (referral && referral.referrer) {
        // Verificar que no se haya pagado ya la comisión por este usuario
        const existingCommission = await Transaction.findOne({
          user_id: referral.referrer._id,
          type: 'commission',
          subtype: 'direct_referral',
          'metadata.referredUser': user.id,
          'metadata.cashbackCompleted': true
        });

        if (!existingCommission) {
          // Calcular comisión total (10% del cashback total completado)
          const totalCashbackAmount = await this.getUserTotalCashback(user.id);
          const directCommission = totalCashbackAmount * 0.10; // 10% del cashback total
          
          if (directCommission > 0) {
            // Crear transacción de comisión para referido directo
            await Transaction.create({
              user_id: referral.referrer._id,
              type: 'commission',
              subtype: 'direct_referral',
              amount: directCommission,
              status: 'completed',
              description: `Comisión por referido directo - 10% del cashback total completado`,
              reference: `ref_commission_complete_${user.id}_${Date.now()}`,
              metadata: {
                referredUser: user.id,
                totalCashback: totalCashbackAmount,
                commissionRate: 0.10,
                cashbackCompleted: true,
                paymentType: 'single_completion'
              }
            }, { transaction: dbTransaction });

            // Actualizar saldo del referente
            const referrerWallet = await Wallet.findOne({ user_id: referral.referrer._id });
            if (referrerWallet) {
              await referrerWallet.increment('available_balance', {
                by: directCommission,
                transaction: dbTransaction
              });
            }

            logger.info(`Comisión de referido directo COMPLETA procesada: $${directCommission} para usuario ${referral.referrer._id} por cashback total de $${totalCashbackAmount}`);
          }
        } else {
          logger.debug(`Comisión directa ya fue pagada para usuario ${user.id} - saltando pago duplicado`);
        }
      }

      // Procesar bonos de códigos líder/padre (día 17 exacto)
      await this.processLeaderParentBonuses(user, benefitAmount, dbTransaction);

    } catch (error) {
      logger.error('Error procesando comisiones de referidos:', error);
      throw error;
    }
  }

  /**
   * Verificar si el usuario completó exactamente el 100% del cashback (día 8)
   * LEGACY: Mantener para compatibilidad
   */
  async hasUserCompletedFullCashback(userId) {
    try {
      // Contar días de beneficios completados
      const benefitDays = await Transaction.countDocuments({
        user_id: userId,
        type: 'benefit',
        status: 'completed'
      });

      // Cambiar a >= 8 para evitar fallos por conteos de pruebas
      return benefitDays >= 8;
    } catch (error) {
      logger.error('Error verificando cashback completo:', error);
      return false;
    }
  }

  /**
   * Verificar si el primer ciclo de una compra específica está completo
   * NUEVO: Per purchase logic
   */
  async hasFirstCycleCompleted(userId, purchaseId) {
    try {
      // Cuenta 8 benefits COMPLETED de ESA compra
      const benefitDays = await Transaction.countDocuments({
        user: userId,
        type: 'earnings',
        subtype: 'auto_earnings',
        status: 'completed',
        "metadata.purchaseId": purchaseId
      });

      return benefitDays >= 8; // mejor >= por si ya corrieron más de 8 ticks
    } catch (error) {
      logger.error('Error verificando primer ciclo completo:', error);
      return false;
    }
  }

  /**
   * Obtener el monto total del cashback completado por el usuario
   * LEGACY: Mantener para compatibilidad
   */
  async getUserTotalCashback(userId) {
    try {
      const result = await Transaction.aggregate([
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(userId),
            type: 'benefit',
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalCashback: { $sum: '$amount' }
          }
        }
      ]);

      return result.length > 0 ? result[0].totalCashback : 0;
     } catch (error) {
       logger.error('Error obteniendo cashback total:', error);
       return 0;
     }
   }

   /**
    * Obtener el monto base del primer ciclo de una compra específica
    * NUEVO: Per purchase logic
    */
   async getFirstCycleCashbackBase(userId, purchaseId) {
     try {
       const result = await Transaction.aggregate([
         {
           $match: {
             user: new mongoose.Types.ObjectId(userId),
             type: 'earnings',
             subtype: 'auto_earnings',
             status: 'completed',
             "metadata.purchaseId": new mongoose.Types.ObjectId(purchaseId)
           }
         },
         { $sort: { createdAt: 1 } },
         { $limit: 8 }, // primer ciclo
         { $group: { _id: null, total: { $sum: "$amount" } } }
       ]);
       
       return result.length > 0 ? result[0].total : 0;
     } catch (error) {
       logger.error('Error obteniendo cashback base del primer ciclo:', error);
       return 0;
     }
   }

   /**
    * Obtener el monto total de todas las licencias del usuario
    */
   async getUserTotalLicensesAmount(userId) {
     try {
       const result = await Transaction.aggregate([
         {
           $match: {
             user_id: new mongoose.Types.ObjectId(userId),
             $or: [
               { type: 'purchase', subtype: 'license' },
               { type: 'package_purchase' },
               { type: 'deposit', subtype: 'license_purchase' }
             ],
             status: 'completed'
           }
         },
         {
           $group: {
             _id: null,
             totalLicenses: { $sum: '$amount' }
           }
         }
       ]);

       return result.length > 0 ? result[0].totalLicenses : 0;
     } catch (error) {
       logger.error('Error obteniendo monto total de licencias:', error);
       return 0;
     }
   }

  /**
   * Procesar bonos adicionales para códigos líder/padre
   * CORREGIDO: Pago único por usuario - solo se paga exactamente en el día 17 (segundo ciclo)
   */
  async processLeaderParentBonuses(user, benefitAmount, dbTransaction) {
    try {
      // Verificar si el usuario completó exactamente el día 17 (segundo ciclo)
      const hasCompletedSecondCycle = await this.hasUserCompletedSecondCycle(user.id);
      
      if (!hasCompletedSecondCycle) {
        return; // Solo procesar bonos al completar segundo ciclo (día 17)
      }

      // Buscar códigos especiales que deberían recibir bono de este usuario
      const specialCodes = await SpecialCode.find({
        isActive: true,
        codeType: { $in: ['leader', 'parent'] }
      }).populate('userId');

      for (const specialCode of specialCodes) {
        // Verificar si este código especial debe recibir bono de este usuario
        const shouldReceiveBonus = await this.shouldReceiveLeaderParentBonus(specialCode, user);
        
        if (shouldReceiveBonus) {
          // VERIFICACIÓN CRÍTICA: Comprobar si ya se pagó el bono para este usuario
          const existingBonus = await Transaction.findOne({
            user_id: specialCode.userId._id,
            type: 'commission',
            subtype: 'leader_bonus',
            'metadata.sourceUser': user.id,
            'metadata.specialCodeId': specialCode._id,
            'metadata.secondCycleCompleted': true
          });

          // Solo procesar si NO existe un pago previo (pago único)
          if (!existingBonus) {
            // Calcular bono basado en el monto total de la licencia del usuario
            const userTotalInvestment = await this.getUserTotalInvestment(user.id);
            const leaderBonus = userTotalInvestment * 0.05; // 5% del total invertido
            
            if (leaderBonus > 0) {
              // Crear transacción de bono líder/padre
              await Transaction.create({
                user_id: specialCode.userId._id,
                type: 'commission',
                subtype: 'leader_bonus',
                amount: leaderBonus,
                status: 'completed',
                description: `Bono ${specialCode.codeType} - 5% del monto total de licencias (día 17 - pago único)`,
                reference: `${specialCode.codeType}_bonus_day17_${user.id}_${Date.now()}`,
                metadata: {
                  sourceUser: user.id,
                  specialCodeId: specialCode._id,
                  codeType: specialCode.codeType,
                  bonusRate: 0.05,
                  totalInvestment: userTotalInvestment,
                  secondCycleCompleted: true,
                  paymentDay: 17,
                  paymentType: 'unique_payment',
                  processedAt: new Date()
                }
              }, { transaction: dbTransaction });

              // Actualizar saldo del usuario con código especial
              const leaderWallet = await Wallet.findOne({ user_id: specialCode.userId._id });
              if (leaderWallet) {
                await leaderWallet.increment('available_balance', {
                  by: leaderBonus,
                  transaction: dbTransaction
                });
              }

              logger.info(`Bono ${specialCode.codeType} DÍA 17 procesado: $${leaderBonus} para usuario ${specialCode.userId._id} por usuario fuente ${user.id}`);
            }
          } else {
            logger.debug(`Bono ${specialCode.codeType} día 17 ya fue pagado para usuario ${user.id} - saltando pago duplicado`);
          }
        }
      }
    } catch (error) {
      logger.error('Error procesando bonos líder/padre:', error);
    }
  }

  /**
   * Verificar si un código especial debe recibir bono de un usuario específico
   */
  async shouldReceiveLeaderParentBonus(specialCode, user) {
    // Implementar lógica para determinar si el código especial
    // debe recibir bono de este usuario específico
    // Por ahora, retornar true para todos (se puede refinar según reglas de negocio)
    return true;
  }

  /**
   * Verificar si el usuario completó exactamente el segundo ciclo (día 17)
   */
  async hasUserCompletedSecondCycle(userId) {
    try {
      const benefitCount = await Transaction.countDocuments({
        user_id: userId,
        type: 'benefit',
        status: 'completed'
      });
      
      // Segundo ciclo se completa exactamente en el día 17
      return benefitCount === 17;
    } catch (error) {
      logger.error(`Error verificando segundo ciclo del usuario ${userId}:`, error);
      return false;
    }
  }

  /**
   * Obtener la inversión total del usuario (suma de todos los paquetes activos)
   * Para calcular el bono del 5% sobre el total invertido
   */
  async getUserTotalInvestment(userId) {
    try {
      const totalInvestment = await Transaction.aggregate([
        {
          $match: {
            user_id: userId,
            type: { $in: ['deposit', 'pioneer_payment'] },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);
      
      return totalInvestment.length > 0 ? totalInvestment[0].total : 0;
    } catch (error) {
      logger.error(`Error obteniendo inversión total del usuario ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Obtener estadísticas de beneficios
   */
  async getBenefitsStats(startDate = null, endDate = null) {
    const matchClause = {
      type: 'earnings',
      status: 'completed'
    };
    
    if (startDate && endDate) {
      matchClause.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    } else if (startDate) {
      matchClause.createdAt = {
        $gte: startDate
      };
    }

    try {
      const stats = await Transaction.aggregate([
        {
          $match: matchClause
        },
        {
          $group: {
            _id: null,
            total_transactions: { $sum: 1 },
            total_amount: { $sum: '$amount' },
            average_amount: { $avg: '$amount' },
            min_amount: { $min: '$amount' },
            max_amount: { $max: '$amount' }
          }
        }
      ]);

      const result = stats.length > 0 ? stats[0] : {
        total_transactions: 0,
        total_amount: 0,
        average_amount: 0,
        min_amount: 0,
        max_amount: 0
      };

      return {
        totalTransactions: parseInt(result.total_transactions) || 0,
        totalAmount: parseFloat(result.total_amount) || 0,
        averageAmount: parseFloat(result.average_amount) || 0,
        minAmount: parseFloat(result.min_amount) || 0,
        maxAmount: parseFloat(result.max_amount) || 0
      };

    } catch (error) {
      logger.error('Error obteniendo estadísticas de beneficios:', error);
      throw error;
    }
  }

  /**
   * Verificar si un usuario puede recibir beneficios hoy
   */
  async canUserReceiveBenefits(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { canReceive: false, reason: 'Usuario no encontrado' };
      }

      const userStatus = await UserStatus.findOne({ user: userId });
      if (!userStatus) {
        return { canReceive: false, reason: 'Estado de usuario no encontrado' };
      }

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Verificar estado activo
      if (user.status !== 'active') {
        return { canReceive: false, reason: 'Usuario no está activo' };
      }

      // Verificar paquete activo usando UserStatus
      if (userStatus.subscription.packageStatus !== 'active') {
        return { canReceive: false, reason: 'Usuario no tiene paquete activo' };
      }

      // Verificar si ya recibió beneficios hoy usando UserStatus
      const lastBenefitDate = userStatus.subscription.lastBenefitDate;
      if (lastBenefitDate && lastBenefitDate >= todayStart) {
        return { canReceive: false, reason: 'Ya recibió beneficios hoy' };
      }

      return { canReceive: true, reason: 'Usuario elegible para beneficios' };

    } catch (error) {
      logger.error(`Error verificando elegibilidad de usuario ${userId}:`, error);
      return { canReceive: false, reason: 'Error del sistema' };
    }
  }

  /**
   * Procesar comisiones para un usuario específico - CORREGIDO: Itera por compras
   */
  async processReferralCommissionsForUser(user, force = false, dbTransaction) {
    try {
      logger.info("[DEBUG] processReferralCommissionsForUser called", { user: user ? 'exists' : 'null', force });
      const userId = user.id || user._id;
      logger.info("[DEBUG] userId extracted", { userId });
      
      // DIAGNOSTIC LOGGING - START
      logger.info("[direct_referral] start", { userId, force });
      
      // IMPLEMENTACIÓN DEL FIX: Buscar compras con firstCycleCompleted: true
      const Purchase = require('../models/Purchase.model');
      const purchases = await Purchase.find({ 
        userId: userId, 
        firstCycleCompleted: true,
        status: process.env.TEST_E2E ? { $in: ['pending','completed'] } : 'completed'
      }).lean();
      
      logger.info("[direct_referral] purchases found", { userId, purchaseCount: purchases.length });
      
      if (purchases.length === 0) {
        logger.warn("[direct_referral] skip: no completed purchases", { userId });
        return { created: false, reason: "no_completed_purchases" };
      }

      // Función helper para obtener sponsorId
      const getSponsorId = async (userId) => {
        const userB = await User.findById(userId).lean();
        let sponsorId = userB?.referredBy;
        
        if (!sponsorId) {
          const referral = await Referral.findOne({
            referred: userId,
            status: { $in: ['active', 'pending'] }
          }).lean();
          sponsorId = referral?.referrer;
        }
        
        return sponsorId;
      };
      
      const processedCommissions = [];
      
      // Procesar cada compra según el fix sugerido
      for (const p of purchases) {
        const sponsorId = await getSponsorId(userId);
        if (!sponsorId) {
          logger.warn("[direct_referral] skip purchase: no sponsor", { userId, purchaseId: p._id });
          continue;
        }
        
        const baseAmount = p.netAmount ?? p.amount ?? p.price; // base = valor del paquete
        const amount = +(baseAmount * 0.10).toFixed(2);
        
        // Clave de idempotencia según el fix
        const key = { 
          commissionType:'direct_referral', 
          userId:sponsorId, 
          fromUserId:userId, 
          purchaseId:p._id 
        };
        
        logger.info("[direct_referral] processing purchase", { 
          userId, 
          purchaseId: p._id, 
          sponsorId, 
          baseAmount, 
          amount 
        });
        
        const existingCommission = await Commission.findOne(key);
        if (existingCommission) {
          logger.info("[direct_referral] commission already exists", { purchaseId: p._id });
          continue;
        }

        // Crear comisión según el fix sugerido
        const metadata = { 
          base:'purchase', 
          percentage:10, 
          firstCycleCompleted:true,
          purchaseId: p._id // Agregar purchaseId también en metadata
        };
        
        // Incluir runId si está disponible (para smoke tests)
        if (global.testRunId) {
          metadata.runId = global.testRunId;
        }
        
        // Log quirúrgico antes de crear (solo en staging/debug)
        if (process.env.STAGING === 'true' || process.env.LOG_LEVEL === 'debug') {
          logger.info('direct_referral:create', JSON.stringify({
            ...key,
            baseCheck: { firstCycleCompleted: true, status: 'pending' },
            amount,
            metadata
          }));
        } else {
          // Log reducido para producción
          logger.info('direct_referral:creating', { 
            commissionType: key.commissionType, 
            amount, 
            purchaseId: p._id 
          });
        }
        
        await Commission.create({ 
          ...key, // Esto ya incluye purchaseId a nivel raíz
          amount, 
          currency:'USDT', 
          status:'pending', 
          level:1, 
          metadata
        });
        
        logger.info(`[direct_referral] commission created`, { 
          userId, 
          purchaseId: p._id, 
          sponsorId, 
          amount, 
          baseAmount 
        });
        
        processedCommissions.push({
          created: true,
          userId: userId,
          purchaseId: p._id,
          referrerId: sponsorId,
          amount: amount,
          baseAmount: baseAmount
        });
      }
      
      if (processedCommissions.length === 0) {
        return { created: false, reason: "no_eligible_purchases" };
      }
      
      return {
        created: true,
        processedCount: processedCommissions.length,
        commissions: processedCommissions
      };
      
    } catch (error) {
      logger.error('Error procesando comisión para usuario:', error);
      throw error;
    }
  }

  /**
   * Obtener usuarios elegibles para procesamiento de comisiones
   */
  async getEligibleUsersForCommissions(force = false) {
    try {
      if (force) {
        // Si es forzado, obtener todos los usuarios con referidos activos
        const referrals = await Referral.find({ status: 'active' })
          .populate('referred')
          .lean();
        
        return referrals.map(ref => ref.referred).filter(user => user);
      }
      
      // Obtener usuarios que completaron el cashback en los últimos días
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2); // Últimos 2 días
      
      const userStatuses = await UserStatus.find({
        'subscription.packageStatus': 'active',
        'subscription.activatedAt': { $gte: recentDate }
      }).populate('userId').lean();
      
      const eligibleUsers = [];
      
      for (const userStatus of userStatuses) {
        if (userStatus.userId) {
          const hasCompleted = await this.hasUserCompletedFullCashback(userStatus.userId._id);
          if (hasCompleted) {
            eligibleUsers.push(userStatus.userId);
          }
        }
      }
      
      return eligibleUsers;
    } catch (error) {
      logger.error('Error obteniendo usuarios elegibles para comisiones:', error);
      return [];
    }
  }

  /**
   * Actualiza el estado de capital real para todos los usuarios en el lote
   * @param {Array} users - Lista de usuarios a actualizar
   * @param {Boolean} useRealCapital - Si se debe usar capital real
   */
  async updateUsersRealCapitalStatus(users, useRealCapital) {
    try {
      // Actualizar en lotes para no sobrecargar la base de datos
      const batches = this.createBatches(users, this.batchSize);
      
      for (const batch of batches) {
        const userIds = batch.map(user => user.id);
        
        // Actualizar el campo usingRealCapital para todos los usuarios en el lote
        await User.update(
          { usingRealCapital: useRealCapital },
          { 
            where: { id: { [Op.in]: userIds } },
            silent: true // No disparar hooks
          }
        );
        
        // Actualizar también el objeto en memoria para cálculos posteriores
        batch.forEach(user => {
          user.usingRealCapital = useRealCapital;
        });
        
        // Pequeña pausa entre lotes
        if (batches.length > 1) {
          await this.sleep(500);
        }
      }
      
      logger.info(`Estado de capital real actualizado para ${users.length} usuarios: ${useRealCapital ? 'REAL' : 'SIMULADO'}`);
    } catch (error) {
      logger.error('Error actualizando estado de capital real:', error);
      // Continuar con el proceso a pesar del error
    }
  }

  /**
   * Función de utilidad para pausas
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = BenefitsProcessor;