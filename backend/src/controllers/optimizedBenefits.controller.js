/**
 * Controlador Optimizado de Beneficios y Comisiones
 * Utiliza el OptimizedCalculationService para manejar cálculos eficientes
 * basados en la información real del sistema (7 paquetes, 12.5% diario, etc.)
 */

const OptimizedCalculationService = require('../services/OptimizedCalculationService');
const UserStatus = require('../models/UserStatus');
const Transaction = require('../models/Transaction.model');
const Commission = require('../models/Commission.model');
const Package = require('../models/Package.model');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * @desc    Procesar beneficio diario para un usuario específico
 * @route   POST /api/benefits/process-daily/:userId
 * @access  Admin
 */
exports.processDailyBenefit = async (req, res) => {
  try {
    // Validar errores de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }
    
    const { userId } = req.params;
    
    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para procesar este beneficio'
      });
    }
    
    // Procesar beneficio diario con opciones del request
    const options = {
      forceProcess: req.body.forceProcess,
      TEST_E2E: req.body.TEST_E2E,
      day: req.body.day,
      cycleDay: req.body.cycleDay,
      metadata: req.body.metadata
    };
    
    const result = await OptimizedCalculationService.calculateDailyBenefits(userId, options);
    
    if (result.success) {
      logger.info(`Beneficio diario procesado para usuario ${userId}: ${result.data.amount} USDT`);
      
      res.status(200).json({
        success: true,
        message: 'Beneficio diario procesado exitosamente',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: result.data
      });
    }
    
  } catch (error) {
    logger.error('Error procesando beneficio diario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Procesar beneficios diarios para todos los usuarios elegibles
 * @route   POST /api/benefits/process-all-daily
 * @access  Admin
 */
exports.processAllDailyBenefits = async (req, res) => {
  try {
    // Solo administradores pueden ejecutar procesamiento masivo
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden ejecutar procesamiento masivo'
      });
    }
    
    logger.info(`Procesamiento masivo iniciado por admin: ${req.user.email}`);
    
    // Procesar beneficios para todos los usuarios elegibles
    const results = await OptimizedCalculationService.processDailyBenefitsForAllUsers();
    
    const totalProcessed = results.processedCount + results.skipped + results.errors;
    
    res.status(200).json({
      success: true,
      message: 'Procesamiento masivo completado',
      data: {
        summary: {
          processedCount: results.processedCount,
          skipped: results.skipped,
          errors: results.errors,
          total: totalProcessed,
          successRate: totalProcessed > 0 ? (results.processedCount / totalProcessed * 100).toFixed(2) + '%' : '0%'
        },
        details: {
          successful: results.details.successful.slice(0, 10), // Limitar resultados mostrados
          skippedReasons: results.details.skippedReasons.slice(0, 5),
          errorDetails: results.details.errorDetails.slice(0, 5)
        }
      }
    });
    
  } catch (error) {
    logger.error('Error en procesamiento masivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error en procesamiento masivo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener estado de beneficios de un usuario
 * @route   GET /api/benefits/status/:userId
 * @access  Private
 */
exports.getUserBenefitStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este estado'
      });
    }
    
    // Obtener UserStatus con información completa
    const userStatus = await UserStatus.findOne({ user: userId })
      .populate('user', 'email username fullName');
    
    if (!userStatus) {
      return res.status(404).json({
        success: false,
        message: 'Estado de usuario no encontrado'
      });
    }
    
    // Obtener configuración del paquete actual
    let packageConfig = null;
    if (userStatus.subscription.currentPackage) {
      packageConfig = await Package.findOne({ 
        category: userStatus.subscription.currentPackage 
      });
    }
    
    // Calcular métricas en tiempo real
    const now = new Date();
    const currentDay = userStatus.subscription.benefitCycle.currentDay;
    const maxDays = packageConfig?.benefitConfig?.daysPerCycle || 8;
    const maxCycles = packageConfig?.benefitConfig?.cyclesTotal || 5;
    const currentCycle = Math.floor((currentDay - 1) / (maxDays + 1)) + 1;
    const dayInCycle = ((currentDay - 1) % (maxDays + 1)) + 1;
    
    // Calcular progreso
    const cycleProgress = currentCycle > 0 ? (dayInCycle / maxDays * 100) : 0;
    const totalProgress = currentCycle > 0 ? ((currentCycle - 1) / maxCycles * 100) + (cycleProgress / maxCycles) : 0;
    
    // Calcular próximo beneficio
    const nextBenefitDate = userStatus.subscription.benefitCycle.nextBenefitDate;
    const timeToNextBenefit = nextBenefitDate ? Math.max(0, nextBenefitDate.getTime() - now.getTime()) : null;
    
    // Obtener transacciones recientes de beneficios
    const recentBenefits = await Transaction.find({
      user: userId,
      type: 'earnings',
      subtype: 'auto_earnings'
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('amount createdAt metadata');
    
    // Obtener comisiones pendientes
    const pendingCommissions = await Commission.find({
      userId: userId,
      status: 'pending'
    })
    .populate('fromUserId', 'email username')
    .sort({ createdAt: -1 })
    .limit(5);
    
    const benefitStatus = {
      user: {
        id: userStatus.user._id,
        email: userStatus.user.email,
        username: userStatus.user.username,
        fullName: userStatus.user.fullName
      },
      
      subscription: {
        currentPackage: userStatus.subscription.currentPackage,
        packageStatus: userStatus.subscription.packageStatus,
        activatedAt: userStatus.subscription.activatedAt,
        expiresAt: userStatus.subscription.expiresAt
      },
      
      currentCycle: {
        cycleNumber: currentCycle,
        dayInCycle: dayInCycle,
        maxDaysPerCycle: maxDays,
        maxCycles: maxCycles,
        isPaused: userStatus.subscription.benefitCycle.isPaused,
        cycleProgress: Math.round(cycleProgress * 100) / 100,
        totalProgress: Math.round(totalProgress * 100) / 100
      },
      
      nextBenefit: {
        date: nextBenefitDate,
        timeRemaining: timeToNextBenefit,
        hoursRemaining: timeToNextBenefit ? Math.ceil(timeToNextBenefit / (1000 * 60 * 60)) : null,
        canReceiveToday: timeToNextBenefit !== null && timeToNextBenefit <= 0
      },
      
      packageConfig: packageConfig ? {
        name: packageConfig.name,
        price: packageConfig.price,
        dailyRate: packageConfig.benefitConfig?.dailyRate || 0.125,
        dailyAmount: packageConfig.price * (packageConfig.benefitConfig?.dailyRate || 0.125),
        totalPotential: packageConfig.benefitConfig?.totalPotential || 5.0
      } : null,
      
      earnings: {
        totalEarned: userStatus.subscription.benefits?.totalEarned || 0,
        pendingBenefits: userStatus.subscription.benefits?.pendingBenefits || 0,
        dailyAverage: userStatus.financial?.performance?.dailyAverage || 0,
        monthlyProjection: userStatus.financial?.performance?.monthlyProjection || 0
      },
      
      commissions: {
        totalEarned: userStatus.commissionTracking?.totalEarned || 0,
        pendingCommissions: userStatus.commissionTracking?.pendingCommissions || 0,
        paidCommissions: userStatus.commissionTracking?.paidCommissions || 0,
        byType: userStatus.commissionTracking?.byType || {
          directReferral: 0,
          leaderBonus: 0,
          parentBonus: 0
        }
      },
      
      recentActivity: {
        recentBenefits: recentBenefits.map(benefit => ({
          amount: benefit.amount,
          date: benefit.createdAt,
          cycle: benefit.metadata?.cycleNumber,
          day: benefit.metadata?.dayInCycle
        })),
        pendingCommissions: pendingCommissions.map(commission => ({
          amount: commission.amount,
          type: commission.commissionType,
          fromUser: commission.fromUserId?.email || 'Unknown',
          date: commission.createdAt
        }))
      }
    };
    
    res.status(200).json({
      success: true,
      message: 'Estado de beneficios obtenido exitosamente',
      data: benefitStatus
    });
    
  } catch (error) {
    logger.error('Error obteniendo estado de beneficios:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado de beneficios',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener estadísticas del sistema de beneficios
 * @route   GET /api/benefits/system-stats
 * @access  Admin
 */
exports.getSystemStats = async (req, res) => {
  try {
    // Solo administradores pueden ver estadísticas del sistema
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden ver estadísticas del sistema'
      });
    }
    
    // Obtener estadísticas de rendimiento
    const stats = await OptimizedCalculationService.getSystemPerformanceStats();
    
    // Agregar estadísticas adicionales
    const additionalStats = {
      packages: {
        total: await Package.countDocuments({ status: 'active' }),
        byCategory: await Package.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$category', count: { $sum: 1 }, totalPrice: { $sum: '$price' } } },
          { $sort: { totalPrice: 1 } }
        ])
      },
      
      dailyMetrics: {
        benefitsProcessed: await Transaction.countDocuments({
          type: 'earnings',
          subtype: 'auto_earnings',
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }),
        commissionsGenerated: await Commission.countDocuments({
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }),
        totalAmountProcessed: await Transaction.aggregate([
          {
            $match: {
              type: 'earnings',
              subtype: 'auto_earnings',
              createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      },
      
      systemHealth: {
        usersNeedingAttention: await UserStatus.countDocuments({
          'adminFlags.needsAttention': true
        }),
        failedTransactions: await Transaction.countDocuments({
          status: 'failed',
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        cacheValidityRate: await UserStatus.countDocuments({
          'cachedCalculations.cacheValid': true
        }) / await UserStatus.countDocuments({}) * 100
      }
    };
    
    const combinedStats = {
      ...stats,
      ...additionalStats,
      generatedAt: new Date(),
      systemVersion: '2.0.0-optimized'
    };
    
    res.status(200).json({
      success: true,
      message: 'Estadísticas del sistema obtenidas exitosamente',
      data: combinedStats
    });
    
  } catch (error) {
    logger.error('Error obteniendo estadísticas del sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas del sistema',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Recalcular beneficios para un usuario (herramienta de administración)
 * @route   POST /api/benefits/recalculate/:userId
 * @access  Admin
 */
exports.recalculateUserBenefits = async (req, res) => {
  try {
    // Solo administradores pueden recalcular
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden recalcular beneficios'
      });
    }
    
    const { userId } = req.params;
    const { fromDate, recalculateCommissions = false } = req.body;
    
    logger.info(`Recálculo iniciado por admin ${req.user.email} para usuario ${userId}`);
    
    // Obtener UserStatus
    const userStatus = await UserStatus.findOne({ user: userId });
    
    if (!userStatus) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Invalidar cache
    if (userStatus.cachedCalculations) {
      userStatus.cachedCalculations.cacheValid = false;
      userStatus.cachedCalculations.lastCalculated = null;
      await userStatus.save();
    }
    
    // Marcar transacciones para recálculo si se especifica fecha
    if (fromDate) {
      await Transaction.updateMany(
        {
          user: userId,
          type: 'earnings',
          subtype: 'auto_earnings',
          createdAt: { $gte: new Date(fromDate) }
        },
        {
          $set: {
            'calculationData.isValidated': false,
            'calculationData.calculatedAt': new Date()
          }
        }
      );
    }
    
    // Recalcular comisiones si se solicita
    if (recalculateCommissions) {
      await Commission.updateMany(
        {
          userId: userId,
          status: 'pending'
        },
        {
          $set: {
            'processingData.isAutoProcessed': false,
            'processingData.processedAt': new Date()
          }
        }
      );
    }
    
    res.status(200).json({
      success: true,
      message: 'Recálculo iniciado exitosamente',
      data: {
        userId,
        fromDate,
        recalculateCommissions,
        processedBy: req.user.email,
        processedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Error en recálculo de beneficios:', error);
    res.status(500).json({
      success: false,
      message: 'Error en recálculo de beneficios',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener usuarios elegibles para beneficios diarios
 * @route   GET /api/benefits/eligible-users
 * @access  Admin
 */
exports.getEligibleUsers = async (req, res) => {
  try {
    // Solo administradores
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden ver usuarios elegibles'
      });
    }
    
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Buscar usuarios elegibles para beneficios
    const eligibleUsers = await UserStatus.find({
      'subscription.packageStatus': 'active',
      'subscription.benefitCycle.nextBenefitDate': { $lte: new Date() },
      'subscription.benefitCycle.isPaused': false
    })
    .populate('user', 'email username fullName')
    .sort({ 'subscription.benefitCycle.nextBenefitDate': 1 })
    .skip(skip)
    .limit(parseInt(limit));
    
    const total = await UserStatus.countDocuments({
      'subscription.packageStatus': 'active',
      'subscription.benefitCycle.nextBenefitDate': { $lte: new Date() },
      'subscription.benefitCycle.isPaused': false
    });
    
    const formattedUsers = eligibleUsers.map(userStatus => {
      const currentDay = userStatus.subscription.benefitCycle.currentDay;
      const maxDays = 8; // Días por ciclo
      const currentCycle = Math.floor((currentDay - 1) / (maxDays + 1)) + 1;
      const dayInCycle = ((currentDay - 1) % (maxDays + 1)) + 1;
      
      return {
        userId: userStatus.user._id,
        email: userStatus.user.email,
        username: userStatus.user.username,
        fullName: userStatus.user.fullName,
        currentPackage: userStatus.subscription.currentPackage,
        currentCycle,
        dayInCycle,
        nextBenefitDate: userStatus.subscription.benefitCycle.nextBenefitDate,
        hoursOverdue: Math.floor((new Date() - userStatus.subscription.benefitCycle.nextBenefitDate) / (1000 * 60 * 60))
      };
    });
    
    res.status(200).json({
      success: true,
      message: 'Usuarios elegibles obtenidos exitosamente',
      data: {
        users: formattedUsers,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: formattedUsers.length,
          totalUsers: total
        }
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo usuarios elegibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo usuarios elegibles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Las funciones ya están exportadas individualmente con exports.functionName