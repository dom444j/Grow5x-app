/**
 * Servicio Optimizado de Cálculos
 * Maneja cálculos de beneficios y comisiones de manera eficiente
 * utilizando los campos optimizados de la base de datos
 */

const mongoose = require('mongoose');
const UserStatus = require('../models/UserStatus');
const Transaction = require('../models/Transaction.model');
const Commission = require('../models/Commission.model');
const Package = require('../models/Package.model');
const Purchase = require('../models/Purchase.model');
const User = require('../models/User');
const { REFERRAL_CONFIG } = require('../../config/referral.config');
const logger = require('../utils/logger');
const crypto = require('crypto');

class OptimizedCalculationService {
  
  /**
   * Calcular beneficios diarios para un usuario
   * @param {String} userId - ID del usuario
   * @param {Object} options - Opciones adicionales (forceProcess, TEST_E2E, etc.)
   * @returns {Object} Resultado del cálculo
   */
  static async calculateDailyBenefits(userId, options = {}) {
    try {
      const userStatus = await UserStatus.findOne({ user: userId })
        .populate('user', 'email username');
      
      if (!userStatus || userStatus.subscription.packageStatus !== 'active') {
        return {
          success: false,
          message: 'Usuario no tiene paquete activo',
          data: null
        };
      }
      
      // Verificar si debe recibir beneficios hoy (salvo en modo TEST_E2E con forceProcess)
      const now = new Date();
      const nextBenefitDate = userStatus.subscription.benefitCycle.nextBenefitDate;
      const isTestMode = options.TEST_E2E === true;
      const forceProcess = options.forceProcess === true;
      
      // En modo test con forceProcess, saltar validación de fecha
      const shouldSkipDateValidation = isTestMode && forceProcess;
      
      if (!shouldSkipDateValidation && (!nextBenefitDate || nextBenefitDate > now)) {
        return {
          success: false,
          message: 'No corresponde beneficio hoy',
          data: { nextBenefitDate }
        };
      }
      
      // Obtener configuración del paquete
      const packageConfig = await Package.findOne({ 
        category: userStatus.subscription.currentPackage 
      });
      
      if (!packageConfig) {
        throw new Error('Configuración de paquete no encontrada');
      }
      
      // Fix: Calcular beneficio diario con fallback para evitar rate undefined
      const rate = 
        options?.rate ?? 
        packageConfig?.benefitConfig?.dailyRate ?? 
        packageConfig?.dailyRate ?? 
        0.125; // fallback 12.5%
      
      if (rate == null) {
        throw new Error("benefit_rate_missing");
      }
      
      const packagePrice = packageConfig.price;
      const dailyAmount = packagePrice * rate;
      
      // Verificar límites de ciclo
      const currentDay = userStatus.subscription.benefitCycle.currentDay;
      const maxDays = packageConfig.benefitConfig?.daysPerCycle || 8;
      const maxCycles = packageConfig.benefitConfig?.cyclesTotal || 5;
      const currentCycle = Math.floor((currentDay - 1) / (maxDays + 1)) + 1;
      
      if (currentCycle > maxCycles) {
        return {
          success: false,
          message: 'Usuario ha completado todos los ciclos',
          data: { currentCycle, maxCycles }
        };
      }
      
      // Obtener purchaseId si está disponible en options
      let purchaseId = options.metadata?.purchaseId;
      
      // Si no hay purchaseId en metadata, buscar la compra más reciente del usuario
      if (!purchaseId) {
        const activePurchase = await Purchase.findOne({
          userId: userId
        }).sort({ createdAt: -1 });
        
        if (activePurchase) {
          purchaseId = activePurchase._id;
          logger.info(`PurchaseId encontrado automáticamente para transacción: ${purchaseId}`);
        } else {
          logger.warn(`No se encontró ninguna compra para el usuario ${userId}`);
        }
      }
      
      // Crear transacción de beneficio usando la función centralizada
      const transactionMetadata = {
        packageType: userStatus.subscription.currentPackage,
        cycleNumber: currentCycle,
        dayInCycle: ((currentDay - 1) % (maxDays + 1)) + 1,
        benefitRate: rate,
        baseAmount: packagePrice
      };
      
      // Incluir purchaseId en metadata si está disponible
      if (purchaseId) {
        transactionMetadata.purchaseId = purchaseId;
      }
      
      const transaction = await this.createBenefitTransaction(
        userId,
        dailyAmount,
        transactionMetadata,
        {
          isAutomated: true,
          calculatedAt: now,
          calculationMethod: 'daily_benefit_12_5_percent',
          verificationHash: this.generateVerificationHash(userId, dailyAmount, currentDay),
          sourcePackage: packageConfig._id,
          sourceCycle: currentCycle,
          sourceDay: currentDay,
          isValidated: true,
          validatedAt: now
        }
      );
      
      // Actualizar UserStatus
      await this.updateUserStatusAfterBenefit(userStatus, dailyAmount, currentDay, maxDays);
      
      // Verificar si completó el primer ciclo para comisiones
      if (currentDay === maxDays && currentCycle === 1) {
        
        // Procesar comisiones del primer ciclo (ahora por compra)
        await this.processFirstCycleCommissions(userId, packagePrice, purchaseId);
        
        // Fix: Marcar firstCycleCompleted por compra cuando se completa el día 8
        if (purchaseId) {
          // Contar beneficios completados para esta compra
          const ticks = await Transaction.countDocuments({
            user: userId,
            type: 'earnings',
            subtype: 'auto_earnings',
            status: 'completed',
            "metadata.purchaseId": purchaseId
          });
          
          if (ticks >= 8) {
            await Purchase.updateOne(
              { _id: purchaseId },
              { $set: { firstCycleCompleted: true } }
            );
            logger.info(`Primer ciclo marcado como completado para compra ${purchaseId}`);
          }
        } else {
          logger.warn(`No se pudo encontrar purchaseId para marcar firstCycleCompleted - userId: ${userId}`);
        }
      }
      
      // Verificar si completó el segundo ciclo para bonos especiales
      if (currentDay === maxDays && currentCycle === 2) {
        await this.processSpecialBonuses(userId, packagePrice);
      }
      
      return {
        success: true,
        message: 'Beneficio diario calculado exitosamente',
        data: {
          amount: dailyAmount,
          currentDay,
          currentCycle,
          transactionId: transaction._id,
          nextBenefitDate: userStatus.subscription.benefitCycle.nextBenefitDate
        }
      };
      
    } catch (error) {
      logger.error('Error calculando beneficios diarios:', error);
      throw error;
    }
  }
  
  /**
   * Procesar comisiones del primer ciclo (10% del cashback total)
   * Fix: Ahora procesa por compra en lugar de por usuario
   * @param {String} userId - ID del usuario que completó el ciclo
   * @param {Number} packagePrice - Precio del paquete
   * @param {String} purchaseId - ID de la compra específica (opcional)
   */
  static async processFirstCycleCommissions(userId, packagePrice, purchaseId = null) {
    try {
      const user = await User.findById(userId).populate('referredBy');
      
      if (!user || !user.referredBy) {
        logger.info(`Usuario ${userId} no tiene referidor para comisión`);
        return;
      }
      
      const sponsorId = user.referredBy._id;
      
      // Verificar que el referidor tenga licencia activa
      const referrerStatus = await UserStatus.findOne({ user: sponsorId });
      
      if (!referrerStatus || referrerStatus.subscription.packageStatus !== 'active') {
        logger.info(`Referidor ${sponsorId} no tiene licencia activa`);
        return;
      }
      
      // Obtener todas las compras activas del usuario
      // En TEST_E2E permitir 'pending' además de 'completed'
      const allowPending = !!process.env.TEST_E2E;
      const userPurchases = await Purchase.find({ 
        userId: userId, 
        status: allowPending ? { $in: ['pending', 'completed', 'active'] } : 'active' 
      }).lean();
      
      if (!userPurchases || userPurchases.length === 0) {
        logger.info(`Usuario ${userId} no tiene compras activas`);
        return;
      }
      
      const processedCommissions = [];
      
      // Procesar cada compra por separado
      for (const purchase of userPurchases) {
        const currentPurchaseId = purchase._id.toString();
        
        // Si se especifica purchaseId, solo procesar esa compra
        if (purchaseId && currentPurchaseId !== purchaseId) {
          continue;
        }
        
        // Verificar si esta compra completó su primer ciclo (>= 8 beneficios)
        const benefitCount = await Transaction.countDocuments({
          user: userId,
          type: 'earnings',
          subtype: 'auto_earnings',
          status: 'completed',
          "metadata.purchaseId": currentPurchaseId
        });
        
        if (benefitCount < 8) {
          logger.info(`Compra ${currentPurchaseId} no ha completado primer ciclo (${benefitCount}/8)`);
          continue;
        }
        
        // Verificar si ya existe comisión para esta compra (clave idempotente)
        const existingCommission = await Commission.findOne({
          commissionType: 'direct_referral',
          userId: sponsorId,
          fromUserId: userId,
          purchaseId: currentPurchaseId
        });
        
        if (existingCommission) {
          logger.info(`Comisión directa ya existe para compra ${currentPurchaseId}`);
          continue;
        }
        
        // Calcular base del primer ciclo para esta compra específica
        const baseAmountResult = await Transaction.aggregate([
          {
            $match: {
              user: new mongoose.Types.ObjectId(userId),
              type: 'earnings',
              subtype: 'auto_earnings',
              status: 'completed',
              "metadata.purchaseId": currentPurchaseId
            }
          },
          { $sort: { createdAt: 1 } },
          { $limit: 8 }, // primer ciclo
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        
        const baseAmount = baseAmountResult.length > 0 ? baseAmountResult[0].total : 0;
        
        if (baseAmount <= 0) {
          logger.info(`Base amount inválido para compra ${currentPurchaseId}: ${baseAmount}`);
          continue;
        }
        
        // Calcular comisión (10% del cashback total del primer ciclo)
        const commissionRate = REFERRAL_CONFIG.COMMISSION_CONFIG.direct_referral.rate; // 10%
        const commissionAmount = Number((baseAmount * commissionRate).toFixed(2));
        
        // Crear comisión con clave idempotente por compra
        const commission = new Commission({
          userId: sponsorId,
          fromUserId: userId,
          commissionType: 'direct_referral',
          purchaseId: currentPurchaseId, // NUEVO: incluir purchaseId a nivel raíz
          amount: commissionAmount,
          currency: 'USDT',
          status: 'pending',
          metadata: {
            weekNumber: 1,
            percentage: commissionRate * 100,
            baseAmount: baseAmount, // usar baseAmount real, no cashbackTotal
            packageType: user.currentPackage || 'unknown',
            cycleCompleted: true,
            paymentTrigger: 'first_cycle_completion',
            firstCycleCompleted: true,
            purchaseId: currentPurchaseId, // Agregar purchaseId también en metadata
            ...(global.testRunId ? { runId: global.testRunId } : {}) // Incluir runId si está disponible
          },
          processingData: {
            isAutoProcessed: true,
            processedAt: new Date(),
            processingRule: 'first_cycle_10_percent_per_purchase',
            eligibilityCheck: {
              userHasLicense: true,
              cycleCompleted: true,
              minimumMet: commissionAmount >= 0.01,
              maximumRespected: commissionAmount <= 10000
            },
            calculation: {
              baseAmount: baseAmount,
              appliedRate: commissionRate,
              grossAmount: commissionAmount,
              deductions: 0,
              netAmount: commissionAmount
            }
          }
        });
        
        await commission.save();
        
        // Actualizar tracking de comisiones del referidor
        await this.updateCommissionTracking(sponsorId, commissionAmount, 'directReferral');
        
        logger.info(`Comisión de primer ciclo creada: ${commissionAmount} USDT para ${sponsorId} por compra ${currentPurchaseId} (base: ${baseAmount})`);
        
        processedCommissions.push({
          created: true,
          purchaseId: currentPurchaseId,
          amount: commissionAmount,
          baseAmount: baseAmount,
          commissionId: commission._id
        });
      }
      
      return {
        success: true,
        processedCount: processedCommissions.length,
        commissions: processedCommissions
      };
      
    } catch (error) {
      logger.error('Error procesando comisiones de primer ciclo:', error);
      throw error;
    }
  }
  
  /**
   * Procesar bonos especiales (5% para líderes y padres)
   * @param {String} userId - ID del usuario que completó el segundo ciclo
   * @param {Number} packagePrice - Precio del paquete
   */
  static async processSpecialBonuses(userId, packagePrice) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.referredBy) {
        return;
      }
      
      // Buscar usuarios especiales en la línea de referidos
      const specialUsers = await this.findSpecialUsersInLine(user.referredBy);
      
      for (const specialUser of specialUsers) {
        // Verificar que el usuario especial tenga licencia activa
        const specialUserStatus = await UserStatus.findOne({ user: specialUser._id });
        
        if (!specialUserStatus || specialUserStatus.subscription.packageStatus !== 'active') {
          continue;
        }
        
        // Calcular bono especial (5% del monto de la licencia)
        const bonusRate = 0.05; // 5%
        const bonusAmount = packagePrice * bonusRate;
        
        // Determinar tipo de bono
        const bonusType = specialUser.userLevel === 'FATHER' ? 'parent_bonus' : 'leader_bonus';
        
        // Crear comisión de bono especial
        const bonus = new Commission({
          userId: specialUser._id,
          fromUserId: userId,
          commissionType: bonusType,
          amount: bonusAmount,
          currency: 'USDT',
          status: 'pending',
          metadata: {
            weekNumber: 2,
            percentage: bonusRate * 100,
            baseAmount: packagePrice,
            packageType: user.currentPackage || 'unknown',
            cycleCompleted: true,
            paymentTrigger: 'second_cycle_completion'
          },
          processingData: {
            isAutoProcessed: true,
            processedAt: new Date(),
            processingRule: 'special_bonus_5_percent',
            eligibilityCheck: {
              userHasLicense: true,
              cycleCompleted: true,
              minimumMet: bonusAmount >= 0.01,
              maximumRespected: bonusAmount <= 10000
            },
            calculation: {
              baseAmount: packagePrice,
              appliedRate: bonusRate,
              grossAmount: bonusAmount,
              deductions: 0,
              netAmount: bonusAmount
            }
          }
        });
        
        await bonus.save();
        
        // Actualizar tracking
        const trackingType = bonusType === 'parent_bonus' ? 'parentBonus' : 'leaderBonus';
        await this.updateCommissionTracking(specialUser._id, bonusAmount, trackingType);
        
        logger.info(`Bono especial ${bonusType} creado: ${bonusAmount} USDT para ${specialUser._id}`);
      }
      
    } catch (error) {
      logger.error('Error procesando bonos especiales:', error);
      throw error;
    }
  }
  
  /**
   * Actualizar UserStatus después de un beneficio
   * @param {Object} userStatus - UserStatus del usuario
   * @param {Number} dailyAmount - Monto del beneficio diario
   * @param {Number} currentDay - Día actual del ciclo
   * @param {Number} maxDays - Días máximos por ciclo
   */
  static async updateUserStatusAfterBenefit(userStatus, dailyAmount, currentDay, maxDays) {
    // Actualizar beneficios
    userStatus.subscription.benefits.totalEarned += dailyAmount;
    userStatus.subscription.lastBenefitDate = new Date();
    
    // Actualizar ciclo
    const dayInCycle = ((currentDay - 1) % (maxDays + 1)) + 1;
    
    if (dayInCycle === maxDays) {
      // Completó el ciclo, iniciar día de pausa
      userStatus.subscription.benefitCycle.currentDay = currentDay + 1;
      userStatus.subscription.benefitCycle.isPaused = true;
      userStatus.subscription.benefitCycle.nextBenefitDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (dayInCycle === maxDays + 1) {
      // Día de pausa completado, iniciar nuevo ciclo
      userStatus.subscription.benefitCycle.currentDay = currentDay + 1;
      userStatus.subscription.benefitCycle.isPaused = false;
      userStatus.subscription.benefitCycle.cycleStartDate = new Date();
      userStatus.subscription.benefitCycle.nextBenefitDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      userStatus.subscription.benefitCycle.totalCyclesCompleted += 1;
    } else {
      // Día normal del ciclo
      userStatus.subscription.benefitCycle.currentDay = currentDay + 1;
      userStatus.subscription.benefitCycle.nextBenefitDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    
    // Actualizar métricas financieras
    if (!userStatus.financial) userStatus.financial = {};
    if (!userStatus.financial.performance) userStatus.financial.performance = {};
    
    userStatus.financial.performance.dailyAverage = dailyAmount;
    userStatus.financial.performance.monthlyProjection = dailyAmount * 30;
    
    // Invalidar cache
    if (userStatus.cachedCalculations) {
      userStatus.cachedCalculations.cacheValid = false;
    }
    
    await userStatus.save();
  }
  
  /**
   * Actualizar tracking de comisiones
   * @param {String} userId - ID del usuario
   * @param {Number} amount - Monto de la comisión
   * @param {String} type - Tipo de comisión
   */
  static async updateCommissionTracking(userId, amount, type) {
    const userStatus = await UserStatus.findOne({ user: userId });
    
    if (!userStatus) return;
    
    if (!userStatus.commissionTracking) {
      userStatus.commissionTracking = {
        totalEarned: 0,
        pendingCommissions: 0,
        paidCommissions: 0,
        byType: {
          directReferral: 0,
          leaderBonus: 0,
          parentBonus: 0
        }
      };
    }
    
    userStatus.commissionTracking.pendingCommissions += amount;
    userStatus.commissionTracking.byType[type] += amount;
    
    // Actualizar cache
    if (userStatus.cachedCalculations) {
      userStatus.cachedCalculations.pendingCommissions += amount;
      userStatus.cachedCalculations.cacheValid = false;
    }
    
    await userStatus.save();
  }
  
  /**
   * Encontrar usuarios especiales en la línea de referidos
   * @param {String} startUserId - ID del usuario inicial
   * @returns {Array} Lista de usuarios especiales
   */
  static async findSpecialUsersInLine(startUserId) {
    const specialUsers = [];
    let currentUserId = startUserId;
    
    // Buscar hasta 10 niveles hacia arriba
    for (let level = 0; level < 10 && currentUserId; level++) {
      const user = await User.findById(currentUserId);
      
      if (!user) break;
      
      // Verificar si es usuario especial
      if (user.userLevel === 'FATHER' || user.userLevel === 'LEADER') {
        specialUsers.push(user);
      }
      
      currentUserId = user.referredBy;
    }
    
    return specialUsers;
  }
  
  /**
   * Generar hash de verificación para transacciones
   * @param {String} userId - ID del usuario
   * @param {Number} amount - Monto
   * @param {Number} day - Día del ciclo
   * @returns {String} Hash de verificación
   */
  static generateVerificationHash(userId, amount, day) {
    const data = `${userId}-${amount}-${day}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Procesar beneficios diarios para todos los usuarios elegibles
   * Procesamiento por lotes de purchaseId con idempotencia y reintentos
   * @returns {Object} Resultado del procesamiento masivo
   */
  static async processDailyBenefitsForAllUsers() {
    try {
      logger.info('🔄 Iniciando procesamiento masivo de beneficios diarios...');
      
      let eligiblePurchases = [];
      
      try {
        // Buscar compras elegibles (no usuarios) para procesamiento por purchaseId
        logger.info('🔍 Buscando compras en la base de datos...');
        const allPurchases = await Purchase.find({
          status: { $in: ['pending', 'completed'] },
          userId: { $ne: null, $exists: true } // Asegurar que userId existe y no es null
        }).populate({
          path: 'userId',
          select: 'email username'
        });
        
        logger.info(`📊 Compras encontradas: ${allPurchases.length}`);
        
        // Filtrar compras donde el populate fue exitoso y el usuario existe
        logger.info('🔍 Filtrando compras con usuarios válidos...');
        eligiblePurchases = allPurchases.filter((purchase, index) => {
          try {
            logger.info(`Compra ${index}: ${purchase._id}, userId: ${purchase.userId ? 'exists' : 'null'}`);
            
            // Validación segura paso a paso
            if (!purchase.userId) {
              logger.warn(`Compra ${purchase._id}: userId es null/undefined`);
              return false;
            }
            
            if (typeof purchase.userId === 'string') {
              logger.warn(`Compra ${purchase._id}: userId es string (${purchase.userId}) - no es ObjectId populado`);
              return false;
            }
            
            if (!purchase.userId._id) {
              logger.warn(`Compra ${purchase._id}: userId._id es null/undefined`);
              return false;
            }
            
            logger.info(`Compra ${purchase._id}: Usuario válido ${purchase.userId._id}`);
            return true;
            
          } catch (filterError) {
            logger.error(`Error filtrando compra ${purchase._id}:`, filterError);
            return false;
          }
        });
        
        logger.info(`📊 Compras elegibles: ${eligiblePurchases.length}`);
      } catch (queryError) {
        logger.error('❌ Error en consulta de compras:', queryError);
        throw queryError;
      }
      
      const results = {
        processedCount: 0,
        skipped: 0,
        errors: 0,
        details: {
          successful: [],
          skippedReasons: [],
          errorDetails: []
        }
      };
      
      // Procesar en lotes de 50 compras
      const batchSize = 50;
      for (let i = 0; i < eligiblePurchases.length; i += batchSize) {
        const batch = eligiblePurchases.slice(i, i + batchSize);
        
        for (const purchase of batch) {
          try {
            logger.info(`🔍 Procesando compra: ${purchase._id}, userId: ${purchase.userId}`);
            
            // Guardia robusta antes de procesar cada purchase
            if (!purchase?.userId || !purchase.userId?._id) {
              logger.warn(`⚠️ Purchase ${purchase._id}: userId inválido o sin _id`);
              results.skipped++;
              results.details.skippedReasons.push({
                purchaseId: purchase._id,
                reason: 'Usuario no encontrado o sin _id válido'
              });
              continue;
            }
            
            // Validar que el usuario existe
            if (!purchase.userId || !purchase.userId._id) {
              logger.warn(`⚠️ Usuario inválido para compra ${purchase._id}: userId=${purchase.userId}`);
              results.skipped++;
              results.details.skippedReasons.push({
                purchaseId: purchase._id,
                reason: 'Usuario no encontrado o inválido'
              });
              continue;
            }
            
            logger.info(`✅ Usuario válido: ${purchase.userId.email} (${purchase.userId._id})`);
            
            // Configurar opciones con validación adicional para TEST_E2E
            const opts = {
              forceProcess: !!process.env.TEST_E2E,
              TEST_E2E: !!process.env.TEST_E2E,
              metadata: { purchaseId: purchase._id }
            };
            
            // Procesar beneficio con metadata de purchaseId para idempotencia
            const result = await this.calculateDailyBenefits(purchase.userId._id, opts);
            
            if (result.success) {
              results.processedCount++;
              results.details.successful.push({
                purchaseId: purchase._id,
                userId: purchase.userId._id,
                email: purchase.userId.email,
                amount: result.data.amount
              });
              logger.info(`✅ Beneficio procesado para compra ${purchase._id} - ${purchase.userId.email}: ${result.data.amount} USDT`);
            } else {
              results.skipped++;
              results.details.skippedReasons.push({
                purchaseId: purchase._id,
                userId: purchase.userId._id,
                email: purchase.userId.email,
                reason: result.message
              });
              logger.warn(`⚠️ Beneficio omitido para compra ${purchase._id} - ${purchase.userId.email}: ${result.message}`);
            }
            
          } catch (error) {
            results.errors++;
            results.details.errorDetails.push({
              purchaseId: purchase._id,
              userId: purchase.userId?._id || 'unknown',
              email: purchase.userId?.email || 'unknown',
              error: error.message
            });
            logger.error(`❌ Error procesando beneficio para compra ${purchase._id}:`, error);
          }
        }
        
        // Pausa entre lotes para evitar sobrecarga
        if (i + batchSize < eligiblePurchases.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      logger.info(`🎉 Procesamiento masivo completado: ${results.processedCount} procesados, ${results.skipped} omitidos, ${results.errors} errores`);
      
      return results;
      
    } catch (error) {
      logger.error('Error en procesamiento masivo de beneficios:', error);
      throw error;
    }
  }
  
  /**
   * Procesar pool bonuses del día 17 (ciclo 2)
   * @param {Object} options - Opciones del pool bonus
   * @returns {Object} Resultado del procesamiento
   */
  static async processPoolBonuses(options = {}) {
    try {
      const { purchaseId, cycleNumber, adminId, userId, baseAmount } = options;
      
      if (!purchaseId || !adminId || !userId || !baseAmount) {
        throw new Error('Parámetros requeridos faltantes para processPoolBonuses');
      }
      
      // Verificar si ya existe pool bonus para esta compra y ciclo (idempotencia)
       const existingPoolBonus = await Commission.findOne({
         commissionType: 'pool_bonus',
         purchaseId: purchaseId,
         'metadata.cycleNumber': cycleNumber
       });
      
      if (existingPoolBonus) {
        return {
          success: true,
          message: 'Pool bonus ya existe (idempotente)',
          data: { poolBonus: existingPoolBonus, isNew: false }
        };
      }
      
      // Calcular pool bonus (5% del baseAmount)
      const poolRate = 0.05; // 5%
      const poolAmount = baseAmount * poolRate;
      
      // Crear pool bonus
       const poolBonus = new Commission({
          userId: adminId, // El admin recibe el pool bonus
          fromUserId: userId,
          commissionType: 'pool_bonus',
          purchaseId: purchaseId, // Campo a nivel raíz para índice único
          amount: poolAmount,
          currency: 'USDT',
          status: 'pending',
          metadata: {
             purchaseId: purchaseId, // También en metadata para compatibilidad
             cycleNumber: cycleNumber,
             dayInCycle: 17, // Día 17 específicamente
             percentage: poolRate * 100,
             baseAmount: baseAmount,
             paymentTrigger: 'day_17_cycle_2',
             calculatedAt: new Date()
           },
        processingData: {
          isAutoProcessed: true,
          processedAt: new Date(),
          processingRule: 'pool_bonus_5_percent_day_17',
          eligibilityCheck: {
            cycleNumber: cycleNumber,
            dayInCycle: 17,
            minimumMet: poolAmount >= 0.01,
            maximumRespected: poolAmount <= 10000
          },
          calculation: {
            baseAmount: baseAmount,
            appliedRate: poolRate,
            grossAmount: poolAmount,
            deductions: 0,
            netAmount: poolAmount
          }
        }
      });
      
      await poolBonus.save();
      
      logger.info(`Pool bonus día 17 creado: ${poolAmount} USDT para admin ${adminId} por compra ${purchaseId}`);
      
      return {
        success: true,
        message: 'Pool bonus del día 17 procesado exitosamente',
        data: { poolBonus: poolBonus, isNew: true }
      };
      
    } catch (error) {
      logger.error('Error procesando pool bonuses:', error);
      throw error;
    }
  }
  
  /**
   * Crear transacción de beneficio con metadatos personalizados
   * @param {string} userId - ID del usuario
   * @param {number} amount - Monto del beneficio
   * @param {Object} metadata - Metadatos de la transacción
   * @param {Object} calculationData - Datos de cálculo
   * @returns {Object} Transacción creada
   */
  static async createBenefitTransaction(userId, amount, metadata = {}, calculationData = {}) {
    try {
      const transaction = new Transaction({
        user: userId,
        type: 'earnings',
        subtype: 'auto_earnings',
        amount,
        currency: 'USDT',
        status: 'completed',
        metadata,
        calculationData,
        completedAt: new Date()
      });
      
      await transaction.save();
      return transaction;
    } catch (error) {
      logger.error('Error al crear transacción de beneficio:', error);
      throw new Error(`Error al crear transacción de beneficio: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de rendimiento del sistema
   * @returns {Object} Estadísticas del sistema
   */
  static async getSystemPerformanceStats() {
    try {
      const stats = {
        users: {
          total: await UserStatus.countDocuments({}),
          active: await UserStatus.countDocuments({ 'subscription.packageStatus': 'active' }),
          inFirstCycle: await UserStatus.countDocuments({ 
            'subscription.packageStatus': 'active',
            'subscription.benefitCycle.currentDay': { $gte: 1, $lte: 8 }
          }),
          inPause: await UserStatus.countDocuments({ 
            'subscription.packageStatus': 'active',
            'subscription.benefitCycle.isPaused': true
          })
        },
        
        transactions: {
          todayBenefits: await Transaction.countDocuments({
            type: 'earnings',
            subtype: 'auto_earnings',
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          }),
          totalBenefits: await Transaction.countDocuments({
            type: 'earnings',
            subtype: 'auto_earnings'
          })
        },
        
        commissions: {
          pending: await Commission.countDocuments({ status: 'pending' }),
          paid: await Commission.countDocuments({ status: 'paid' }),
          totalAmount: await Commission.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ])
        }
      };
      
      return stats;
      
    } catch (error) {
      logger.error('Error obteniendo estadísticas de rendimiento:', error);
      throw error;
    }
  }
}

module.exports = OptimizedCalculationService;