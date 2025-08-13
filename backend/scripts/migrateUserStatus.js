const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/User');
const UserStatus = require('../src/models/UserStatus');
const Transaction = require('../src/models/Transaction.model');

/**
 * Script de Migración - Sistema de Estados Unificado
 * 
 * Este script migra los datos existentes de usuarios al nuevo
 * modelo UserStatus sin perder información.
 * 
 * Ejecutar con: node scripts/migrateUserStatus.js
 */

class UserStatusMigration {
  
  static async connectDatabase() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Conectado a MongoDB');
    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error);
      process.exit(1);
    }
  }

  static async migrateAllUsers() {
    try {
      console.log('🚀 Iniciando migración de estados de usuario...');
      
      // Obtener todos los usuarios
      const users = await User.find({}).lean();
      console.log(`📊 Encontrados ${users.length} usuarios para migrar`);
      
      let migratedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      for (const user of users) {
        try {
          // Verificar si ya existe UserStatus para este usuario
          const existingStatus = await UserStatus.findOne({ user: user._id });
          
          if (existingStatus) {
            console.log(`⏭️  Usuario ${user.email} ya tiene estado - omitiendo`);
            skippedCount++;
            continue;
          }
          
          // Obtener métricas de transacciones
          const transactionMetrics = await this.getTransactionMetrics(user._id);
          
          // Crear nuevo UserStatus basado en datos existentes
          const userStatusData = await this.createUserStatusData(user, transactionMetrics);
          
          const userStatus = new UserStatus(userStatusData);
          await userStatus.save();
          
          console.log(`✅ Migrado: ${user.email}`);
          migratedCount++;
          
        } catch (error) {
          console.error(`❌ Error migrando usuario ${user.email}:`, error.message);
          errorCount++;
        }
      }
      
      console.log('\n📈 Resumen de migración:');
      console.log(`✅ Migrados exitosamente: ${migratedCount}`);
      console.log(`⏭️  Omitidos (ya existían): ${skippedCount}`);
      console.log(`❌ Errores: ${errorCount}`);
      console.log(`📊 Total procesados: ${users.length}`);
      
    } catch (error) {
      console.error('❌ Error en migración:', error);
      throw error;
    }
  }

  static async getTransactionMetrics(userId) {
    try {
      const metrics = await Transaction.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalDeposits: {
              $sum: {
                $cond: [
                  { $eq: ['$type', 'deposit'] },
                  1,
                  0
                ]
              }
            },
            totalWithdrawals: {
              $sum: {
                $cond: [
                  { $eq: ['$type', 'withdrawal'] },
                  1,
                  0
                ]
              }
            },
            totalDepositAmount: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'deposit'] }, { $eq: ['$status', 'completed'] }] },
                  '$amount',
                  0
                ]
              }
            },
            totalWithdrawnAmount: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'withdrawal'] }, { $eq: ['$status', 'completed'] }] },
                  '$amount',
                  0
                ]
              }
            },
            totalEarnings: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'earnings'] }, { $eq: ['$status', 'completed'] }] },
                  '$amount',
                  0
                ]
              }
            },
            lastTransaction: { $max: '$createdAt' },
            lastDeposit: {
              $max: {
                $cond: [
                  { $eq: ['$type', 'deposit'] },
                  '$createdAt',
                  null
                ]
              }
            },
            lastWithdrawal: {
              $max: {
                $cond: [
                  { $eq: ['$type', 'withdrawal'] },
                  '$createdAt',
                  null
                ]
              }
            },
            pendingWithdrawals: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'withdrawal'] }, { $eq: ['$status', 'pending'] }] },
                  1,
                  0
                ]
              }
            },
            pendingWithdrawalAmount: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'withdrawal'] }, { $eq: ['$status', 'pending'] }] },
                  '$amount',
                  0
                ]
              }
            }
          }
        }
      ]);
      
      return metrics[0] || {
        totalTransactions: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalDepositAmount: 0,
        totalWithdrawnAmount: 0,
        totalEarnings: 0,
        lastTransaction: null,
        lastDeposit: null,
        lastWithdrawal: null,
        pendingWithdrawals: 0,
        pendingWithdrawalAmount: 0
      };
    } catch (error) {
      console.error(`Error obteniendo métricas de transacciones para usuario ${userId}:`, error);
      return {
        totalTransactions: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalDepositAmount: 0,
        totalWithdrawnAmount: 0,
        totalEarnings: 0,
        lastTransaction: null,
        lastDeposit: null,
        lastWithdrawal: null,
        pendingWithdrawals: 0,
        pendingWithdrawalAmount: 0
      };
    }
  }

  static async createUserStatusData(user, transactionMetrics) {
    const now = new Date();
    
    // Determinar estado de suscripción basado en datos existentes
    const subscriptionStatus = this.determineSubscriptionStatus(user, transactionMetrics);
    
    // Configurar estado Pioneer
    const pioneerStatus = this.configurePioneerStatus(user);
    
    // Configurar métricas de actividad
    const activityMetrics = this.configureActivityMetrics(user, transactionMetrics);
    
    // Configurar información de referidos
    const referralInfo = this.configureReferralInfo(user);
    
    // Configurar información financiera
    const financialInfo = this.configureFinancialInfo(user, transactionMetrics);
    
    // Determinar si necesita atención administrativa
    const adminFlags = this.determineAdminFlags(user, transactionMetrics);
    
    // Configurar métricas calculadas
    const calculatedMetrics = this.configureCalculatedMetrics(user, transactionMetrics);
    
    return {
      user: user._id,
      subscription: subscriptionStatus,
      pioneer: pioneerStatus,
      activity: activityMetrics,
      referrals: referralInfo,
      financial: financialInfo,
      adminFlags: adminFlags,
      calculated: calculatedMetrics
    };
  }

  static determineSubscriptionStatus(user, transactionMetrics) {
    // Por defecto, no hay suscripción activa
    // En una implementación real, esto se basaría en datos de paquetes comprados
    return {
      currentPackage: '',
      packageStatus: 'none',
      activatedAt: null,
      expiresAt: null,
      lastBenefitDate: null,
      benefitCycle: {
        currentDay: 0,
        cycleStartDate: null,
        nextBenefitDate: null,
        isPaused: false,
        totalCyclesCompleted: 0
      },
      benefits: {
        dailyRate: 0.125,
        totalEarned: transactionMetrics.totalEarnings || 0,
        pendingBenefits: 0,
        lastCalculatedAt: null
      }
    };
  }

  static configurePioneerStatus(user) {
    const isPioneer = user.isPioneer || false;
    const pioneerDetails = user.pioneerDetails || {};
    
    return {
      isActive: isPioneer,
      level: pioneerDetails.level || '',
      waitingPeriod: {
        isInWaitingPeriod: false,
        startedAt: null,
        endsAt: null
      },
      activatedAt: pioneerDetails.activatedAt || null,
      expiresAt: pioneerDetails.expiresAt || null,
      benefits: {
        discountPercentage: this.getPioneerDiscountByLevel(pioneerDetails.level),
        prioritySupport: isPioneer,
        fastWithdrawals: isPioneer
      }
    };
  }

  static configureActivityMetrics(user, transactionMetrics) {
    const now = new Date();
    const lastLogin = user.lastLogin || user.createdAt;
    const daysSinceLastLogin = lastLogin ? Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24)) : 0;
    
    return {
      lastLogin: lastLogin,
      lastTransaction: transactionMetrics.lastTransaction,
      lastWithdrawal: transactionMetrics.lastWithdrawal,
      lastDeposit: transactionMetrics.lastDeposit,
      totalTransactions: transactionMetrics.totalTransactions || 0,
      totalWithdrawals: transactionMetrics.totalWithdrawals || 0,
      totalDeposits: transactionMetrics.totalDeposits || 0,
      isActive: user.status === 'active',
      inactivityDays: daysSinceLastLogin
    };
  }

  static configureReferralInfo(user) {
    const referrals = user.referrals || [];
    
    return {
      referredBy: {
        user: user.referredBy || null,
        isLeaderCode: false, // Se determinará posteriormente
        commissionPaid: 0
      },
      directReferrals: {
        count: referrals.length,
        activeCount: referrals.filter(r => r.status === 'active').length,
        pioneerCount: referrals.filter(r => r.status === 'pioneer').length,
        totalCommissionsEarned: referrals.reduce((sum, r) => sum + (r.commission || 0), 0)
      },
      pendingCommissions: {
        directReferral: 0,
        leaderBonus: 0
      }
    };
  }

  static configureFinancialInfo(user, transactionMetrics) {
    return {
      currentBalance: user.balance || 0,
      withdrawals: {
        pendingAmount: transactionMetrics.pendingWithdrawalAmount || 0,
        pendingCount: transactionMetrics.pendingWithdrawals || 0,
        lastWithdrawalRequest: transactionMetrics.lastWithdrawal,
        totalWithdrawn: transactionMetrics.totalWithdrawnAmount || 0
      },
      limits: {
        dailyWithdrawalLimit: 1000, // Límite por defecto
        monthlyWithdrawalLimit: 10000,
        usedDailyLimit: 0,
        usedMonthlyLimit: 0,
        lastLimitReset: new Date()
      }
    };
  }

  static determineAdminFlags(user, transactionMetrics) {
    let needsAttention = false;
    let attentionReason = '';
    let priority = 'normal';
    
    // Verificar si hay retiros pendientes altos
    if (transactionMetrics.pendingWithdrawalAmount > 5000) {
      needsAttention = true;
      attentionReason = 'high_withdrawal_volume';
      priority = 'high';
    }
    
    // Verificar inactividad
    const daysSinceLastLogin = user.lastLogin ? 
      Math.floor((new Date() - user.lastLogin) / (1000 * 60 * 60 * 24)) : 999;
    
    if (daysSinceLastLogin > 30) {
      needsAttention = true;
      attentionReason = 'inactive_user';
      priority = 'low';
    }
    
    return {
      needsAttention,
      attentionReason,
      priority,
      adminNotes: [],
      isBlocked: user.status === 'suspended' || user.status === 'deleted',
      blockReason: user.status !== 'active' ? `Estado: ${user.status}` : null,
      blockedAt: user.status !== 'active' ? user.updatedAt : null,
      blockedBy: null
    };
  }

  static configureCalculatedMetrics(user, transactionMetrics) {
    const totalInvested = transactionMetrics.totalDepositAmount || 0;
    const totalReturned = transactionMetrics.totalEarnings || 0;
    const currentROI = totalInvested > 0 ? ((totalReturned / totalInvested) - 1) * 100 : 0;
    
    return {
      totalInvested,
      totalReturned,
      currentROI,
      projectedEarnings: 0, // Se calculará posteriormente
      daysToComplete: 0,
      lastCalculatedAt: new Date()
    };
  }

  static getPioneerDiscountByLevel(level) {
    const discounts = {
      basic: 10,
      premium: 20,
      elite: 30
    };
    return discounts[level] || 0;
  }

  static async validateMigration() {
    try {
      console.log('\n🔍 Validando migración...');
      
      const totalUsers = await User.countDocuments({});
      const totalUserStatus = await UserStatus.countDocuments({});
      
      console.log(`👥 Total usuarios: ${totalUsers}`);
      console.log(`📊 Total estados de usuario: ${totalUserStatus}`);
      
      if (totalUsers === totalUserStatus) {
        console.log('✅ Migración validada correctamente');
      } else {
        console.log('⚠️  Discrepancia detectada en la migración');
      }
      
      // Verificar algunos registros
      const sampleUserStatus = await UserStatus.findOne().populate('user', 'email');
      if (sampleUserStatus) {
        console.log(`📋 Ejemplo de estado migrado para: ${sampleUserStatus.user.email}`);
        console.log(`   - Balance: ${sampleUserStatus.financial.currentBalance}`);
        console.log(`   - Pioneer: ${sampleUserStatus.pioneer.isActive}`);
        console.log(`   - Necesita atención: ${sampleUserStatus.adminFlags.needsAttention}`);
      }
      
    } catch (error) {
      console.error('❌ Error en validación:', error);
    }
  }

  static async run() {
    try {
      await this.connectDatabase();
      await this.migrateAllUsers();
      await this.validateMigration();
      
      console.log('\n🎉 Migración completada exitosamente');
      console.log('\n📝 Próximos pasos:');
      console.log('   1. Verificar que el servidor backend funcione correctamente');
      console.log('   2. Probar las nuevas rutas de user-status');
      console.log('   3. Implementar el dashboard administrativo');
      
    } catch (error) {
      console.error('❌ Error en migración:', error);
    } finally {
      await mongoose.disconnect();
      console.log('\n👋 Desconectado de MongoDB');
      process.exit(0);
    }
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  UserStatusMigration.run();
}

module.exports = UserStatusMigration;