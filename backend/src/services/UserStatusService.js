const UserStatus = require('../models/UserStatus');
const User = require('../models/User');
const Transaction = require('../models/Transaction.model');
const mongoose = require('mongoose');

/**
 * UserStatusService - Servicio para gestión del Sistema de Estados Unificado
 * 
 * Este servicio centraliza toda la lógica de negocio relacionada con
 * el estado de los usuarios, beneficios, ciclos y gestión administrativa.
 */
class UserStatusService {

  /**
   * Crear o obtener el estado de un usuario
   * @param {String} userId - ID del usuario
   * @returns {Object} UserStatus document
   */
  static async getOrCreateUserStatus(userId) {
    try {
      let userStatus = await UserStatus.findOne({ user: userId }).populate('user');
      
      if (!userStatus) {
        // Crear nuevo estado basado en datos del usuario existente
        const user = await User.findById(userId);
        if (!user) {
          throw new Error('Usuario no encontrado');
        }
        
        userStatus = new UserStatus({
          user: userId,
          financial: {
            currentBalance: user.balance || 0
          },
          pioneer: {
            isActive: user.isPioneer || false,
            level: user.pioneerDetails?.level || '',
            activatedAt: user.pioneerDetails?.activatedAt,
            expiresAt: user.pioneerDetails?.expiresAt
          },
          activity: {
            lastLogin: user.lastLogin,
            totalTransactions: 0,
            isActive: user.status === 'active'
          },
          referrals: {
            referredBy: {
              user: user.referredBy
            },
            directReferrals: {
              count: user.referrals?.length || 0
            }
          }
        });
        
        await userStatus.save();
      }
      
      return userStatus;
    } catch (error) {
      throw new Error(`Error al obtener/crear estado de usuario: ${error.message}`);
    }
  }

  /**
   * Activar paquete de suscripción
   * @param {String} userId - ID del usuario
   * @param {String} packageType - Tipo de paquete
   * @param {Number} amount - Monto invertido
   * @returns {Object} UserStatus actualizado
   */
  static async activatePackage(userId, packageType, amount) {
    try {
      const userStatus = await this.getOrCreateUserStatus(userId);
      const now = new Date();
      
      // Configurar suscripción
      userStatus.subscription.currentPackage = packageType;
      userStatus.subscription.packageStatus = 'active';
      userStatus.subscription.activatedAt = now;
      userStatus.subscription.expiresAt = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000); // 45 días
      
      // Inicializar ciclo de beneficios
      userStatus.subscription.benefitCycle.currentDay = 1;
      userStatus.subscription.benefitCycle.cycleStartDate = now;
      userStatus.subscription.benefitCycle.nextBenefitDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      userStatus.subscription.benefitCycle.isPaused = false;
      
      // Actualizar métricas financieras
      userStatus.calculated.totalInvested += amount;
      
      // Configurar límites de retiro según el paquete
      const withdrawalLimits = this.getWithdrawalLimitsByPackage(packageType);
      userStatus.financial.limits.dailyWithdrawalLimit = withdrawalLimits.daily;
      userStatus.financial.limits.monthlyWithdrawalLimit = withdrawalLimits.monthly;
      
      await userStatus.save();
      
      return userStatus;
    } catch (error) {
      throw new Error(`Error al activar paquete: ${error.message}`);
    }
  }

  /**
   * Procesar beneficios diarios
   * @param {String} userId - ID del usuario
   * @returns {Object} Resultado del procesamiento
   */
  static async processDailyBenefits(userId) {
    try {
      const userStatus = await this.getOrCreateUserStatus(userId);
      
      // Verificar si debe recibir beneficios
      if (!userStatus.shouldReceiveBenefitsToday) {
        return {
          processed: false,
          reason: 'No corresponde beneficio hoy',
          currentDay: userStatus.subscription.benefitCycle.currentDay,
          isPaused: userStatus.subscription.benefitCycle.isPaused
        };
      }
      
      // Verificar que no esté en día de pausa
      if (userStatus.subscription.benefitCycle.currentDay === 9) {
        return {
          processed: false,
          reason: 'Día de pausa (día 9)',
          currentDay: 9,
          isPaused: true
        };
      }
      
      // Calcular beneficio diario (12.5% del monto invertido)
      const dailyBenefit = userStatus.calculated.totalInvested * userStatus.subscription.benefits.dailyRate;
      
      // Actualizar beneficios
      userStatus.subscription.benefits.totalEarned += dailyBenefit;
      userStatus.subscription.benefits.lastCalculatedAt = new Date();
      userStatus.subscription.lastBenefitDate = new Date();
      
      // Actualizar balance financiero
      userStatus.financial.currentBalance += dailyBenefit;
      
      // Avanzar ciclo de beneficios
      userStatus.updateBenefitCycle();
      
      // Actualizar métricas calculadas
      userStatus.calculated.totalReturned += dailyBenefit;
      
      await userStatus.save();
      
      // Crear transacción de beneficio
      await this.createBenefitTransaction(userId, dailyBenefit, userStatus.subscription.benefitCycle.currentDay - 1);
      
      return {
        processed: true,
        amount: dailyBenefit,
        currentDay: userStatus.subscription.benefitCycle.currentDay,
        totalEarned: userStatus.subscription.benefits.totalEarned,
        newBalance: userStatus.financial.currentBalance
      };
    } catch (error) {
      throw new Error(`Error al procesar beneficios diarios: ${error.message}`);
    }
  }

  /**
   * Activar usuario Pioneer
   * @param {String} userId - ID del usuario
   * @param {String} level - Nivel Pioneer (basic, premium, elite)
   * @param {Number} duration - Duración en días
   * @returns {Object} UserStatus actualizado
   */
  static async activatePioneer(userId, level, duration = 30) {
    try {
      const userStatus = await this.getOrCreateUserStatus(userId);
      const now = new Date();
      
      // Iniciar período de espera de 48 horas
      await userStatus.startPioneerWaitingPeriod();
      
      // Configurar detalles Pioneer
      userStatus.pioneer.level = level;
      userStatus.pioneer.activatedAt = now;
      userStatus.pioneer.expiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
      
      // Configurar beneficios según nivel
      const pioneerBenefits = this.getPioneerBenefitsByLevel(level);
      userStatus.pioneer.benefits = pioneerBenefits;
      
      await userStatus.save();
      
      return userStatus;
    } catch (error) {
      throw new Error(`Error al activar Pioneer: ${error.message}`);
    }
  }

  /**
   * Completar período de espera Pioneer
   * @param {String} userId - ID del usuario
   * @returns {Object} UserStatus actualizado
   */
  static async completePioneerWaitingPeriod(userId) {
    try {
      const userStatus = await this.getOrCreateUserStatus(userId);
      
      if (!userStatus.pioneer.waitingPeriod.isInWaitingPeriod) {
        throw new Error('Usuario no está en período de espera Pioneer');
      }
      
      // Verificar que hayan pasado 48 horas
      const now = new Date();
      if (userStatus.pioneer.waitingPeriod.endsAt > now) {
        throw new Error('Período de espera aún no ha terminado');
      }
      
      // Activar Pioneer
      userStatus.pioneer.isActive = true;
      userStatus.pioneer.waitingPeriod.isInWaitingPeriod = false;
      
      // Remover flag de atención administrativa
      if (userStatus.adminFlags.attentionReason === 'pioneer_waiting_period') {
        userStatus.adminFlags.needsAttention = false;
        userStatus.adminFlags.attentionReason = '';
        userStatus.adminFlags.priority = 'normal';
      }
      
      await userStatus.save();
      
      return userStatus;
    } catch (error) {
      throw new Error(`Error al completar período Pioneer: ${error.message}`);
    }
  }

  /**
   * Procesar solicitud de retiro
   * @param {String} userId - ID del usuario
   * @param {Number} amount - Monto a retirar
   * @returns {Object} Resultado del procesamiento
   */
  static async processWithdrawalRequest(userId, amount) {
    try {
      const userStatus = await this.getOrCreateUserStatus(userId);
      
      // Verificar balance suficiente
      if (userStatus.financial.currentBalance < amount) {
        throw new Error('Balance insuficiente');
      }
      
      // Verificar límites diarios
      const today = new Date();
      const lastReset = userStatus.financial.limits.lastLimitReset;
      
      // Resetear límites si es un nuevo día
      if (!lastReset || lastReset.toDateString() !== today.toDateString()) {
        userStatus.financial.limits.usedDailyLimit = 0;
        userStatus.financial.limits.lastLimitReset = today;
      }
      
      // Verificar límite diario
      if (userStatus.financial.limits.usedDailyLimit + amount > userStatus.financial.limits.dailyWithdrawalLimit) {
        throw new Error('Límite diario de retiro excedido');
      }
      
      // Actualizar métricas de retiro
      userStatus.financial.withdrawals.pendingAmount += amount;
      userStatus.financial.withdrawals.pendingCount += 1;
      userStatus.financial.withdrawals.lastWithdrawalRequest = new Date();
      userStatus.financial.limits.usedDailyLimit += amount;
      
      // Determinar prioridad según paquete y estado Pioneer
      const priority = this.getWithdrawalPriority(userStatus);
      
      // Si es alto volumen, marcar para atención
      if (amount > 5000) {
        await userStatus.flagForAttention('high_withdrawal_volume', 'high');
      }
      
      await userStatus.save();
      
      return {
        success: true,
        priority,
        estimatedProcessingTime: this.getEstimatedProcessingTime(userStatus),
        pendingAmount: userStatus.financial.withdrawals.pendingAmount
      };
    } catch (error) {
      throw new Error(`Error al procesar solicitud de retiro: ${error.message}`);
    }
  }

  /**
   * Obtener usuarios que necesitan atención administrativa
   * @param {String} priority - Filtrar por prioridad (opcional)
   * @returns {Array} Lista de usuarios que necesitan atención
   */
  static async getUsersNeedingAttention(priority = null) {
    try {
      const query = { 'adminFlags.needsAttention': true };
      
      if (priority) {
        query['adminFlags.priority'] = priority;
      }
      
      const users = await UserStatus.find(query)
        .populate('user', 'email fullName')
        .sort({ 'adminFlags.priority': -1, updatedAt: -1 })
        .limit(100);
      
      return users;
    } catch (error) {
      throw new Error(`Error al obtener usuarios que necesitan atención: ${error.message}`);
    }
  }

  /**
   * Obtener usuarios en período de espera Pioneer - DESHABILITADO
   * @returns {Array} Lista vacía (funcionalidad deshabilitada)
   */
  static async getUsersInPioneerWaiting() {
    // Pioneer status deshabilitado - retornar lista vacía
    return [];
    
    /* CÓDIGO ORIGINAL DESHABILITADO
    try {
      const users = await UserStatus.find({
        'pioneer.waitingPeriod.isInWaitingPeriod': true,
        'pioneer.waitingPeriod.endsAt': { $gte: new Date() }
      })
      .populate('user', 'email fullName')
      .sort({ 'pioneer.waitingPeriod.endsAt': 1 });
      
      return users;
    } catch (error) {
      throw new Error(`Error al obtener usuarios en espera Pioneer: ${error.message}`);
    }
    */
  }

  /**
   * Obtener usuarios que deben recibir beneficios hoy
   * @returns {Array} Lista de usuarios para procesar beneficios
   */
  static async getUsersForBenefitProcessing() {
    try {
      const today = new Date();
      
      const users = await UserStatus.find({
        'subscription.packageStatus': 'active',
        'subscription.benefitCycle.nextBenefitDate': { $lte: today },
        'subscription.benefitCycle.isPaused': false,
        'subscription.benefitCycle.currentDay': { $gte: 1, $lte: 8 }
      })
      .populate('user', 'email fullName')
      .sort({ 'subscription.benefitCycle.nextBenefitDate': 1 });
      
      return users;
    } catch (error) {
      throw new Error(`Error al obtener usuarios para beneficios: ${error.message}`);
    }
  }

  /**
   * Obtener métricas del dashboard administrativo
   * @returns {Object} Métricas consolidadas
   */
  static async getAdminDashboardMetrics() {
    try {
      const [totalUsers, activePackages, pioneerUsers, pendingWithdrawals, usersNeedingAttention] = await Promise.all([
        UserStatus.countDocuments({}),
        UserStatus.countDocuments({ 'subscription.packageStatus': 'active' }),
        UserStatus.countDocuments({ 'pioneer.isActive': true }),
        UserStatus.aggregate([
          { $match: { 'financial.withdrawals.pendingCount': { $gt: 0 } } },
          { $group: { 
            _id: null, 
            totalAmount: { $sum: '$financial.withdrawals.pendingAmount' },
            totalCount: { $sum: '$financial.withdrawals.pendingCount' }
          }}
        ]),
        UserStatus.countDocuments({ 'adminFlags.needsAttention': true })
      ]);
      
      return {
        totalUsers,
        activePackages,
        pioneerUsers,
        pendingWithdrawals: pendingWithdrawals[0] || { totalAmount: 0, totalCount: 0 },
        usersNeedingAttention,
        lastUpdated: new Date()
      };
    } catch (error) {
      throw new Error(`Error al obtener métricas del dashboard: ${error.message}`);
    }
  }

  // === MÉTODOS AUXILIARES ===

  /**
   * Obtener límites de retiro por paquete
   */
  static getWithdrawalLimitsByPackage(packageType) {
    const limits = {
      starter: { daily: 500, monthly: 5000 },
      basic: { daily: 1000, monthly: 10000 },
      standard: { daily: 2000, monthly: 20000 },
      premium: { daily: 5000, monthly: 50000 },
      gold: { daily: 10000, monthly: 100000 },
      platinum: { daily: 20000, monthly: 200000 },
      diamond: { daily: 50000, monthly: 500000 }
    };
    
    return limits[packageType] || limits.basic;
  }

  /**
   * Obtener beneficios Pioneer por nivel - DESHABILITADO
   */
  static getPioneerBenefitsByLevel(level) {
    // Pioneer status deshabilitado - retornar beneficios básicos sin descuentos
    return {
      discountPercentage: 0,
      prioritySupport: false,
      fastWithdrawals: false
    };
    
    /* CÓDIGO ORIGINAL DESHABILITADO
    const benefits = {
      basic: {
        discountPercentage: 10,
        prioritySupport: true,
        fastWithdrawals: true
      },
      premium: {
        discountPercentage: 20,
        prioritySupport: true,
        fastWithdrawals: true
      },
      elite: {
        discountPercentage: 30,
        prioritySupport: true,
        fastWithdrawals: true
      }
    };
    
    return benefits[level] || benefits.basic;
    */
  }

  /**
   * Obtener prioridad de retiro - DESHABILITADO Pioneer
   */
  static getWithdrawalPriority(userStatus) {
    // Pioneer status deshabilitado - usar prioridad estándar
    /* VERIFICACIÓN PIONEER DESHABILITADA
    if (userStatus.pioneer.isActive && userStatus.pioneer.benefits.fastWithdrawals) {
      return 'ultra_high'; // 5-10 minutos
    }
    */
    
    const packagePriorities = {
      diamond: 'very_high',    // 15 minutos
      platinum: 'high',        // 30 minutos
      gold: 'medium_high',     // 1 hora
      premium: 'medium',       // 3 horas
      standard: 'low_medium',  // 6 horas
      basic: 'low',           // 12 horas
      starter: 'very_low'     // 24 horas
    };
    
    return packagePriorities[userStatus.subscription.currentPackage] || 'low';
  }

  /**
   * Obtener tiempo estimado de procesamiento
   */
  static getEstimatedProcessingTime(userStatus) {
    const priority = this.getWithdrawalPriority(userStatus);
    
    const times = {
      ultra_high: '5-10 minutos',
      very_high: '15 minutos',
      high: '30 minutos',
      medium_high: '1 hora',
      medium: '3 horas',
      low_medium: '6 horas',
      low: '12 horas',
      very_low: '24 horas'
    };
    
    return times[priority] || '12 horas';
  }

  /**
   * Crear transacción de beneficio
   */
  static async createBenefitTransaction(userId, amount, day) {
    try {
      const transaction = new Transaction({
        user: userId,
        type: 'earnings',
        subtype: 'auto_earnings',
        amount,
        currency: 'USDT',
        status: 'completed',
        description: `Beneficio diario día ${day} - 12.5%`,
        completedAt: new Date(),
        metadata: {
          benefitDay: day,
          rate: 0.125
        }
      });
      
      await transaction.save();
      return transaction;
    } catch (error) {
      throw new Error(`Error al crear transacción de beneficio: ${error.message}`);
    }
  }
}

module.exports = UserStatusService;