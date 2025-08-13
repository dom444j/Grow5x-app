const Transaction = require('../models/Transaction.model');
const UserStatus = require('../models/UserStatus');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Obtener rendimiento histórico del usuario
 * @route GET /api/user/portfolio/performance
 * @access Private
 */
exports.getPortfolioPerformance = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '3m' } = req.query;
    
    // Calcular fecha de inicio según el período
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '1w':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3m':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6m':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date('2023-01-01');
        break;
      default:
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }
    
    // Obtener usuario y estado
    const user = await User.findById(userId);
    const userStatus = await UserStatus.findOne({ user: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Obtener transacciones de earnings (beneficios diarios)
    const earningsTransactions = await Transaction.find({
      user: userId,
      type: 'earnings',
      status: 'completed',
      completedAt: { $gte: startDate }
    }).sort({ completedAt: 1 });
    
    // Obtener inversión inicial (primera transacción de depósito completada)
    const initialInvestment = await Transaction.findOne({
      user: userId,
      type: 'deposit',
      status: 'completed'
    }).sort({ completedAt: 1 });
    
    const initialAmount = initialInvestment ? initialInvestment.amount : 1000; // Default si no hay inversión
    
    // Construir datos históricos
    const performanceData = [];
    let cumulativeEarnings = 0;
    
    // Si no hay transacciones, crear datos de ejemplo basados en el período
    if (earningsTransactions.length === 0) {
      const daysInPeriod = Math.ceil((now - startDate) / (24 * 60 * 60 * 1000));
      const dailyRate = 0.125; // 12.5% diario
      
      for (let i = 0; i <= Math.min(daysInPeriod, 45); i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dailyEarning = initialAmount * dailyRate;
        cumulativeEarnings += dailyEarning;
        
        performanceData.push({
          date: date.toISOString().split('T')[0],
          value: initialAmount + cumulativeEarnings,
          dailyEarning: dailyEarning,
          cumulativeEarnings: cumulativeEarnings,
          roi: ((cumulativeEarnings / initialAmount) * 100).toFixed(2)
        });
      }
    } else {
      // Usar datos reales de transacciones
      let runningTotal = initialAmount;
      
      // Agregar punto inicial
      performanceData.push({
        date: startDate.toISOString().split('T')[0],
        value: initialAmount,
        dailyEarning: 0,
        cumulativeEarnings: 0,
        roi: '0.00'
      });
      
      earningsTransactions.forEach(transaction => {
        cumulativeEarnings += transaction.amount;
        runningTotal = initialAmount + cumulativeEarnings;
        
        performanceData.push({
          date: transaction.completedAt.toISOString().split('T')[0],
          value: runningTotal,
          dailyEarning: transaction.amount,
          cumulativeEarnings: cumulativeEarnings,
          roi: ((cumulativeEarnings / initialAmount) * 100).toFixed(2)
        });
      });
    }
    
    // Calcular estadísticas
    const currentValue = performanceData.length > 0 ? performanceData[performanceData.length - 1].value : initialAmount;
    const totalGrowth = ((currentValue - initialAmount) / initialAmount * 100).toFixed(2);
    const totalEarnings = currentValue - initialAmount;
    
    // Calcular promedio diario
    const daysActive = Math.max(1, Math.ceil((now - startDate) / (24 * 60 * 60 * 1000)));
    const avgDailyEarning = totalEarnings / daysActive;
    
    res.json({
      success: true,
      data: {
        performanceData,
        summary: {
          initialInvestment: initialAmount,
          currentValue: currentValue,
          totalEarnings: totalEarnings,
          totalGrowth: `${totalGrowth}%`,
          avgDailyEarning: avgDailyEarning,
          daysActive: daysActive,
          period: period
        },
        userInfo: {
          hasActivePackage: userStatus?.subscription?.packageStatus === 'active',
          currentPackage: userStatus?.subscription?.currentPackage || 'none',
          benefitCycle: userStatus?.subscription?.benefitCycle || null
        }
      }
    });
    
  } catch (error) {
    logger.error('Error getting portfolio performance:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener distribución del portafolio
 * @route GET /api/user/portfolio/distribution
 * @access Private
 */
exports.getPortfolioDistribution = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const userStatus = await UserStatus.findOne({ user: userId });
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Calcular distribución basada en el estado del usuario
    const distribution = {
      activeInvestment: 0,
      availableBalance: user.balance || 0,
      totalEarnings: user.totalEarnings || 0,
      pendingWithdrawals: 0
    };
    
    if (userStatus?.subscription?.currentPackage && userStatus.subscription.packageStatus === 'active') {
      // Obtener precio del paquete desde las transacciones
      const packageTransaction = await Transaction.findOne({
        user: userId,
        type: 'deposit',
        status: 'completed'
      }).sort({ completedAt: -1 });
      
      distribution.activeInvestment = packageTransaction ? packageTransaction.amount : 0;
    }
    
    // Obtener retiros pendientes
    const pendingWithdrawals = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'withdrawal',
          status: 'pending'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    distribution.pendingWithdrawals = pendingWithdrawals.length > 0 ? pendingWithdrawals[0].total : 0;
    
    const total = distribution.activeInvestment + distribution.availableBalance + distribution.totalEarnings;
    
    res.json({
      success: true,
      data: {
        distribution,
        percentages: {
          activeInvestment: total > 0 ? ((distribution.activeInvestment / total) * 100).toFixed(1) : '0.0',
          availableBalance: total > 0 ? ((distribution.availableBalance / total) * 100).toFixed(1) : '0.0',
          totalEarnings: total > 0 ? ((distribution.totalEarnings / total) * 100).toFixed(1) : '0.0'
        },
        total
      }
    });
    
  } catch (error) {
    logger.error('Error getting portfolio distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener estadísticas de rendimiento
 * @route GET /api/user/portfolio/stats
 * @access Private
 */
exports.getPortfolioStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Obtener estadísticas de transacciones
    const stats = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          lastTransaction: { $max: '$completedAt' }
        }
      }
    ]);
    
    // Formatear estadísticas
    const formattedStats = {
      deposits: { count: 0, total: 0, avg: 0, last: null },
      earnings: { count: 0, total: 0, avg: 0, last: null },
      withdrawals: { count: 0, total: 0, avg: 0, last: null },
      commissions: { count: 0, total: 0, avg: 0, last: null }
    };
    
    stats.forEach(stat => {
      if (formattedStats[stat._id]) {
        formattedStats[stat._id] = {
          count: stat.count,
          total: stat.totalAmount,
          avg: stat.avgAmount,
          last: stat.lastTransaction
        };
      }
    });
    
    res.json({
      success: true,
      data: formattedStats
    });
    
  } catch (error) {
    logger.error('Error getting portfolio stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};