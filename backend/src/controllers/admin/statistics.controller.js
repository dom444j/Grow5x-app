const mongoose = require('mongoose');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction.model');
const Payment = require('../../models/Payment');
const Purchase = require('../../models/Purchase.model');
const Commission = require('../../models/Commission.model');
const AdminLoggerService = require('../../services/admin/adminLogger.service');
const AdminUtilsService = require('../../services/admin/utils.service');

/**
 * Controlador para estadísticas y métricas del sistema
 * Maneja todas las consultas de estadísticas, métricas y reportes
 */

// Obtener estadísticas generales del sistema
const getSystemStats = async (req, res) => {
  try {
    const stats = await AdminUtilsService.calculateSystemStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas del sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de usuarios
const getUserStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const dateFilter = AdminUtilsService.buildDateFilter(period);
    
    const stats = await User.aggregate([
      {
        $facet: {
          totalUsers: [{ $count: 'count' }],
          activeUsers: [{ $match: { status: 'active' } }, { $count: 'count' }],
          newUsers: [{ $match: { createdAt: dateFilter } }, { $count: 'count' }],
          verifiedUsers: [{ $match: { 'verification.email.verified': true } }, { $count: 'count' }],
          usersByStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          usersByCountry: [
            { $group: { _id: '$country', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          registrationTrend: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
              }
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt'
                  }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id': 1 } }
          ]
        }
      }
    ]);

    const result = {
      totalUsers: stats[0].totalUsers[0]?.count || 0,
      activeUsers: stats[0].activeUsers[0]?.count || 0,
      newUsers: stats[0].newUsers[0]?.count || 0,
      verifiedUsers: stats[0].verifiedUsers[0]?.count || 0,
      usersByStatus: stats[0].usersByStatus,
      usersByCountry: stats[0].usersByCountry,
      registrationTrend: stats[0].registrationTrend
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de transacciones
const getTransactionStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const dateFilter = AdminUtilsService.buildDateFilter(period);

    const stats = await Transaction.aggregate([
      {
        $facet: {
          totalTransactions: [{ $count: 'count' }],
          recentTransactions: [{ $match: { createdAt: dateFilter } }, { $count: 'count' }],
          transactionsByType: [
            { $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
          ],
          transactionsByStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
          ],
          dailyVolume: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
              }
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt'
                  }
                },
                count: { $sum: 1 },
                volume: { $sum: '$amount' }
              }
            },
            { $sort: { '_id': 1 } }
          ],
          totalVolume: [
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]
        }
      }
    ]);

    const result = {
      totalTransactions: stats[0].totalTransactions[0]?.count || 0,
      recentTransactions: stats[0].recentTransactions[0]?.count || 0,
      totalVolume: stats[0].totalVolume[0]?.total || 0,
      transactionsByType: stats[0].transactionsByType,
      transactionsByStatus: stats[0].transactionsByStatus,
      dailyVolume: stats[0].dailyVolume
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de transacciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de conversión
const getConversionRateStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const dateFilter = AdminUtilsService.buildDateFilter(period);

    // Usuarios registrados en el período
    const registeredUsers = await User.countDocuments({
      createdAt: dateFilter
    });

    // Usuarios que hicieron al menos una compra
    const purchasingUsers = await Purchase.distinct('user', {
      createdAt: dateFilter,
      status: { $ne: 'cancelled' }
    });

    // Usuarios verificados
    const verifiedUsers = await User.countDocuments({
      createdAt: dateFilter,
      'verification.email.verified': true
    });

    // Usuarios activos (con al menos una transacción)
    const activeUsers = await Transaction.distinct('user', {
      createdAt: dateFilter
    });

    const conversionRates = {
      registrationToVerification: registeredUsers > 0 ? (verifiedUsers / registeredUsers * 100).toFixed(2) : 0,
      registrationToPurchase: registeredUsers > 0 ? (purchasingUsers.length / registeredUsers * 100).toFixed(2) : 0,
      registrationToActive: registeredUsers > 0 ? (activeUsers.length / registeredUsers * 100).toFixed(2) : 0,
      verificationToPurchase: verifiedUsers > 0 ? (purchasingUsers.length / verifiedUsers * 100).toFixed(2) : 0
    };

    res.json({
      success: true,
      data: {
        period,
        metrics: {
          registeredUsers,
          verifiedUsers,
          purchasingUsers: purchasingUsers.length,
          activeUsers: activeUsers.length
        },
        conversionRates
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de conversión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener métricas de rendimiento del sistema
const getSystemPerformanceStats = async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Estadísticas de base de datos
    const dbStats = await mongoose.connection.db.stats();
    
    // Conteos rápidos para rendimiento
    const [userCount, transactionCount, paymentCount] = await Promise.all([
      User.estimatedDocumentCount(),
      Transaction.estimatedDocumentCount(),
      Payment.estimatedDocumentCount()
    ]);

    const performanceMetrics = {
      server: {
        uptime: Math.floor(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        },
        nodeVersion: process.version
      },
      database: {
        collections: dbStats.collections,
        dataSize: Math.round(dbStats.dataSize / 1024 / 1024),
        indexSize: Math.round(dbStats.indexSize / 1024 / 1024),
        documents: {
          users: userCount,
          transactions: transactionCount,
          payments: paymentCount
        }
      },
      timestamp: new Date()
    };

    res.json({
      success: true,
      data: performanceMetrics
    });

  } catch (error) {
    console.error('Error obteniendo métricas de rendimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de referidos
const getReferralStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const dateFilter = AdminUtilsService.buildDateFilter(period);

    const stats = await User.aggregate([
      {
        $facet: {
          totalReferrals: [
            { $match: { referredBy: { $exists: true, $ne: null } } },
            { $count: 'count' }
          ],
          recentReferrals: [
            {
              $match: {
                referredBy: { $exists: true, $ne: null },
                createdAt: dateFilter
              }
            },
            { $count: 'count' }
          ],
          topReferrers: [
            { $match: { referredBy: { $exists: true, $ne: null } } },
            { $group: { _id: '$referredBy', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'referrer'
              }
            },
            {
              $project: {
                count: 1,
                referrer: { $arrayElemAt: ['$referrer', 0] }
              }
            }
          ],
          referralTrend: [
            {
              $match: {
                referredBy: { $exists: true, $ne: null },
                createdAt: {
                  $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
              }
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt'
                  }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id': 1 } }
          ]
        }
      }
    ]);

    const result = {
      totalReferrals: stats[0].totalReferrals[0]?.count || 0,
      recentReferrals: stats[0].recentReferrals[0]?.count || 0,
      topReferrers: stats[0].topReferrers,
      referralTrend: stats[0].referralTrend
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de referidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de comisiones
const getCommissionStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const dateFilter = AdminUtilsService.buildDateFilter(period);

    const stats = await Commission.aggregate([
      {
        $facet: {
          totalCommissions: [{ $count: 'count' }],
          recentCommissions: [{ $match: { createdAt: dateFilter } }, { $count: 'count' }],
          commissionsByType: [
            { $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
          ],
          commissionsByStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
          ],
          totalPaid: [
            { $match: { status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          totalPending: [
            { $match: { status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]
        }
      }
    ]);

    const result = {
      totalCommissions: stats[0].totalCommissions[0]?.count || 0,
      recentCommissions: stats[0].recentCommissions[0]?.count || 0,
      totalPaid: stats[0].totalPaid[0]?.total || 0,
      totalPending: stats[0].totalPending[0]?.total || 0,
      commissionsByType: stats[0].commissionsByType,
      commissionsByStatus: stats[0].commissionsByStatus
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de comisiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener resumen financiero
const getFinancialSummary = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const dateFilter = AdminUtilsService.buildDateFilter(period);

    const [payments, withdrawals, commissions] = await Promise.all([
      Payment.aggregate([
        { $match: { createdAt: dateFilter, status: 'completed' } },
        { $group: { _id: '$currency', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { createdAt: dateFilter, type: 'withdrawal', status: 'completed' } },
        { $group: { _id: '$currency', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Commission.aggregate([
        { $match: { createdAt: dateFilter, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    const summary = {
      period,
      revenue: {
        payments: payments.reduce((sum, p) => sum + p.total, 0),
        paymentCount: payments.reduce((sum, p) => sum + p.count, 0)
      },
      expenses: {
        withdrawals: withdrawals.reduce((sum, w) => sum + w.total, 0),
        withdrawalCount: withdrawals.reduce((sum, w) => sum + w.count, 0),
        commissions: commissions[0]?.total || 0,
        commissionCount: commissions[0]?.count || 0
      },
      breakdown: {
        paymentsByCurrency: payments,
        withdrawalsByCurrency: withdrawals
      }
    };

    summary.netRevenue = summary.revenue.payments - summary.expenses.withdrawals - summary.expenses.commissions;

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error obteniendo resumen financiero:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getSystemStats,
  getUserStats,
  getTransactionStats,
  getConversionRateStats,
  getSystemPerformanceStats,
  getReferralStats,
  getCommissionStats,
  getFinancialSummary
};