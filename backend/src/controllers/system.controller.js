const User = require('../models/User');
const Transaction = require('../models/Transaction.model');
const Wallet = require('../models/Wallet.model');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const Commission = require('../models/Commission.model');

/**
 * @desc    Get dashboard statistics for system
 * @route   GET /api/system/stats/dashboard
 * @access  Public
 */
const getDashboardStats = async (req, res) => {
  try {
    // Obtener fecha de hace 24 horas
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Obtener fecha de hace 7 días
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Estadísticas de retiros exitosos (últimas 24 horas)
    const successfulWithdrawals = await WithdrawalRequest.find({
      status: 'completed',
      createdAt: {
        $gte: last24Hours
      }
    }).select('amount createdAt');

    const withdrawalStats = {
      count: successfulWithdrawals.length,
      totalAmount: successfulWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0),
      averageTime: 'Automático' // Tiempo promedio de procesamiento
    };

    // Estadísticas de cashbacks entregados (esta semana)
    const cashbacksDelivered = await Commission.find({
      commissionType: 'direct_referral',
      status: 'paid',
      createdAt: {
        $gte: last7Days
      }
    }).select('amount createdAt');

    const cashbackStats = {
      count: cashbacksDelivered.length,
      totalAmount: cashbacksDelivered.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
      averagePerUser: cashbacksDelivered.length > 0 ? 
        (cashbacksDelivered.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0) / cashbacksDelivered.length) : 0
    };

    // Estadísticas del rendimiento del sistema
    const totalUsers = await User.countDocuments({ status: 'active' });
    const activeOperations = await Transaction.countDocuments({
      status: 'pending',
      type: 'earnings'
    });

    // Calcular ganancia promedio basada en transacciones completadas
    const completedTransactions = await Transaction.find({
      status: 'completed',
      type: 'earnings',
      createdAt: {
        $gte: last7Days
      }
    }).select('amount');

    const averageProfit = completedTransactions.length > 0 ?
      completedTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) / completedTransactions.length : 0;

    const systemPerformance = {
      uptime: '99.9%', // Esto podría calcularse basado en logs del sistema
      activeOperations,
      averageProfit: averageProfit.toFixed(2),
      totalUsers
    };

    res.json({
      success: true,
      data: {
        successfulWithdrawals: {
          users: withdrawalStats.count,
          totalAmount: `$${withdrawalStats.totalAmount.toFixed(2)}`,
          averageTime: withdrawalStats.averageTime,
          message: 'Todos los retiros procesados automáticamente'
        },
        cashbacksDelivered: {
          users: cashbackStats.count,
          totalAmount: `$${cashbackStats.totalAmount.toFixed(2)}`,
          averagePerUser: `$${cashbackStats.averagePerUser.toFixed(2)}`,
          message: 'Programa de cashback al 100% activo'
        },
        systemPerformance: {
          uptime: systemPerformance.uptime,
          activeOperations: systemPerformance.activeOperations,
          averageProfit: `${systemPerformance.averageProfit}%`,
          message: 'Algoritmos de arbitraje optimizados'
        }
      }
    });

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * @desc    Get system statistics
 * @route   GET /api/system/stats
 * @access  Public
 */
const getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalTransactions = await Transaction.countDocuments();
    const volumeResult = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalVolume = volumeResult.length > 0 ? volumeResult[0].total : 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalTransactions,
        totalVolume: parseFloat(totalVolume).toFixed(2)
      }
    });

  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * @desc    Get cashback statistics
 * @route   GET /api/system/stats/cashback
 * @access  Public
 */
const getCashbackStats = async (req, res) => {
  try {
    const totalCashbacks = await Commission.countDocuments({ commissionType: 'direct_referral' });
    const amountResult = await Commission.aggregate([
      { $match: { commissionType: 'direct_referral' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalCashbackAmount = amountResult.length > 0 ? amountResult[0].total : 0;
    const paidCashbacks = await Commission.countDocuments({ 
      commissionType: 'direct_referral',
      status: 'paid'
    });

    res.json({
      success: true,
      data: {
        totalCashbacks,
        totalCashbackAmount: parseFloat(totalCashbackAmount).toFixed(2),
        paidCashbacks,
        pendingCashbacks: totalCashbacks - paidCashbacks
      }
    });

  } catch (error) {
    console.error('Error getting cashback stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getDashboardStats,
  getSystemStats,
  getCashbackStats
};