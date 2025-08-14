const Payment = require('../../models/Payment');
const Transaction = require('../../models/Transaction.model');
const User = require('../../models/User');
const Commission = require('../../models/Commission.model');
const AdminLoggerService = require('../../services/admin/adminLogger.service');
const AdminValidationService = require('../../services/admin/validation.service');
const AdminUtilsService = require('../../services/admin/utils.service');

/**
 * Controlador para gestión de finanzas
 * Maneja todas las operaciones financieras del sistema
 */

// Obtener resumen financiero general
const getFinancialOverview = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const dateFilter = AdminUtilsService.buildDateFilter(period);

    const [revenue, expenses, balances, transactions] = await Promise.all([
      // Ingresos
      Payment.aggregate([
        {
          $match: {
            status: 'completed',
            type: { $in: ['deposit', 'purchase'] },
            createdAt: dateFilter
          }
        },
        {
          $group: {
            _id: '$currency',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Gastos
      Payment.aggregate([
        {
          $match: {
            status: 'completed',
            type: { $in: ['withdrawal', 'refund'] },
            createdAt: dateFilter
          }
        },
        {
          $group: {
            _id: '$currency',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Balances totales por moneda
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUSD: { $sum: '$balance.USD' },
            totalEUR: { $sum: '$balance.EUR' },
            totalBTC: { $sum: '$balance.BTC' },
            totalETH: { $sum: '$balance.ETH' },
            userCount: { $sum: 1 }
          }
        }
      ]),
      // Transacciones recientes
      Transaction.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            volume: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const overview = {
      period,
      revenue: {
        total: revenue.reduce((sum, r) => sum + r.total, 0),
        byCurrency: revenue,
        transactionCount: revenue.reduce((sum, r) => sum + r.count, 0)
      },
      expenses: {
        total: expenses.reduce((sum, e) => sum + e.total, 0),
        byCurrency: expenses,
        transactionCount: expenses.reduce((sum, e) => sum + e.count, 0)
      },
      balances: balances[0] || {
        totalUSD: 0,
        totalEUR: 0,
        totalBTC: 0,
        totalETH: 0,
        userCount: 0
      },
      transactions: {
        byType: transactions,
        totalVolume: transactions.reduce((sum, t) => sum + t.volume, 0),
        totalCount: transactions.reduce((sum, t) => sum + t.count, 0)
      }
    };

    overview.netRevenue = overview.revenue.total - overview.expenses.total;
    overview.profitMargin = overview.revenue.total > 0 
      ? ((overview.netRevenue / overview.revenue.total) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: overview
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

// Obtener flujo de caja
const getCashFlow = async (req, res) => {
  try {
    const { period = '30d', currency = 'USD' } = req.query;
    const dateFilter = AdminUtilsService.buildDateFilter(period);

    const cashFlow = await Payment.aggregate([
      {
        $match: {
          currency,
          status: 'completed',
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            type: '$type'
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          inflow: {
            $sum: {
              $cond: [
                { $in: ['$_id.type', ['deposit', 'purchase']] },
                '$amount',
                0
              ]
            }
          },
          outflow: {
            $sum: {
              $cond: [
                { $in: ['$_id.type', ['withdrawal', 'refund']] },
                '$amount',
                0
              ]
            }
          },
          transactions: { $sum: '$count' }
        }
      },
      {
        $addFields: {
          netFlow: { $subtract: ['$inflow', '$outflow'] }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Calcular balance acumulado
    let runningBalance = 0;
    const enrichedCashFlow = cashFlow.map(day => {
      runningBalance += day.netFlow;
      return {
        ...day,
        date: day._id,
        runningBalance
      };
    });

    res.json({
      success: true,
      data: {
        period,
        currency,
        cashFlow: enrichedCashFlow,
        summary: {
          totalInflow: cashFlow.reduce((sum, d) => sum + d.inflow, 0),
          totalOutflow: cashFlow.reduce((sum, d) => sum + d.outflow, 0),
          netFlow: cashFlow.reduce((sum, d) => sum + d.netFlow, 0),
          finalBalance: runningBalance
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo flujo de caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener análisis de rentabilidad
const getProfitabilityAnalysis = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const dateFilter = AdminUtilsService.buildDateFilter(period);

    const [userMetrics, transactionMetrics, commissionMetrics] = await Promise.all([
      // Métricas por usuario
      User.aggregate([
        {
          $lookup: {
            from: 'payments',
            localField: '_id',
            foreignField: 'user',
            as: 'payments'
          }
        },
        {
          $addFields: {
            totalDeposits: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$payments',
                      cond: {
                        $and: [
                          { $eq: ['$$this.type', 'deposit'] },
                          { $eq: ['$$this.status', 'completed'] },
                          { $gte: ['$$this.createdAt', dateFilter.$gte || new Date(0)] }
                        ]
                      }
                    }
                  },
                  as: 'payment',
                  in: '$$payment.amount'
                }
              }
            },
            totalWithdrawals: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$payments',
                      cond: {
                        $and: [
                          { $eq: ['$$this.type', 'withdrawal'] },
                          { $eq: ['$$this.status', 'completed'] },
                          { $gte: ['$$this.createdAt', dateFilter.$gte || new Date(0)] }
                        ]
                      }
                    }
                  },
                  as: 'payment',
                  in: '$$payment.amount'
                }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDepositsPerUser: { $avg: '$totalDeposits' },
            avgWithdrawalsPerUser: { $avg: '$totalWithdrawals' },
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: {
                $cond: [{ $gt: ['$totalDeposits', 0] }, 1, 0]
              }
            }
          }
        }
      ]),
      // Métricas de transacciones
      Transaction.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),
      // Métricas de comisiones
      Commission.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const analysis = {
      period,
      userMetrics: userMetrics[0] || {
        avgDepositsPerUser: 0,
        avgWithdrawalsPerUser: 0,
        totalUsers: 0,
        activeUsers: 0
      },
      transactionMetrics,
      commissionMetrics,
      kpis: {
        userActivationRate: userMetrics[0] ? 
          ((userMetrics[0].activeUsers / userMetrics[0].totalUsers) * 100).toFixed(2) : 0,
        avgRevenuePerUser: userMetrics[0] ? 
          (userMetrics[0].avgDepositsPerUser - userMetrics[0].avgWithdrawalsPerUser).toFixed(2) : 0,
        totalCommissions: commissionMetrics.reduce((sum, c) => sum + c.totalAmount, 0),
        commissionConversionRate: commissionMetrics.find(c => c._id === 'paid') ? 
          ((commissionMetrics.find(c => c._id === 'paid').count / 
            commissionMetrics.reduce((sum, c) => sum + c.count, 0)) * 100).toFixed(2) : 0
      }
    };

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Error obteniendo análisis de rentabilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener balance de usuarios
const getUserBalances = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      currency,
      minBalance,
      maxBalance,
      sortBy = 'balance.USD',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (currency && minBalance !== undefined) {
      query[`balance.${currency}`] = { $gte: parseFloat(minBalance) };
    }
    
    if (currency && maxBalance !== undefined) {
      query[`balance.${currency}`] = { 
        ...query[`balance.${currency}`],
        $lte: parseFloat(maxBalance) 
      };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      select: 'username email firstName lastName balance createdAt status'
    };

    const result = await User.paginate(query, options);

    // Calcular estadísticas de balance
    const balanceStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUSD: { $sum: '$balance.USD' },
          totalEUR: { $sum: '$balance.EUR' },
          totalBTC: { $sum: '$balance.BTC' },
          totalETH: { $sum: '$balance.ETH' },
          avgUSD: { $avg: '$balance.USD' },
          avgEUR: { $avg: '$balance.EUR' },
          avgBTC: { $avg: '$balance.BTC' },
          avgETH: { $avg: '$balance.ETH' },
          usersWithBalance: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $add: [
                        '$balance.USD',
                        '$balance.EUR',
                        '$balance.BTC',
                        '$balance.ETH'
                      ]
                    },
                    0
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: result.docs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        itemsPerPage: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      },
      statistics: balanceStats[0] || {
        totalUSD: 0,
        totalEUR: 0,
        totalBTC: 0,
        totalETH: 0,
        avgUSD: 0,
        avgEUR: 0,
        avgBTC: 0,
        avgETH: 0,
        usersWithBalance: 0
      }
    });

  } catch (error) {
    console.error('Error obteniendo balances de usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Ajustar balance de usuario
const adjustUserBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currency, amount, reason, type } = req.body;

    // Validaciones
    if (!AdminValidationService.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    if (!['USD', 'EUR', 'BTC', 'ETH'].includes(currency)) {
      return res.status(400).json({
        success: false,
        message: 'Moneda no soportada'
      });
    }

    if (!AdminValidationService.isValidAmount(Math.abs(amount))) {
      return res.status(400).json({
        success: false,
        message: 'Cantidad inválida'
      });
    }

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de ajuste inválido'
      });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Razón del ajuste requerida (mínimo 5 caracteres)'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const adjustmentAmount = type === 'credit' ? Math.abs(amount) : -Math.abs(amount);
    const previousBalance = user.balance[currency] || 0;
    const newBalance = previousBalance + adjustmentAmount;

    // Verificar que el balance no sea negativo
    if (newBalance < 0) {
      return res.status(400).json({
        success: false,
        message: 'El ajuste resultaría en un balance negativo'
      });
    }

    // Actualizar balance
    user.balance[currency] = newBalance;
    await user.save();

    // Crear registro de transacción
    const transaction = new Transaction({
      user: userId,
      type: 'admin_adjustment',
      amount: adjustmentAmount,
      currency,
      status: 'completed',
      description: `Ajuste administrativo: ${reason}`,
      metadata: {
        adminId: req.admin.id,
        previousBalance,
        newBalance,
        adjustmentType: type
      }
    });
    await transaction.save();

    // Log de la acción
    await AdminLoggerService.logAdminAction(
      req.admin.id,
      'BALANCE_ADJUSTMENT',
      {
        userId,
        currency,
        amount: adjustmentAmount,
        type,
        reason,
        previousBalance,
        newBalance
      }
    );

    res.json({
      success: true,
      message: 'Balance ajustado exitosamente',
      data: {
        userId,
        currency,
        previousBalance,
        adjustment: adjustmentAmount,
        newBalance,
        transactionId: transaction._id
      }
    });

  } catch (error) {
    console.error('Error ajustando balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Generar reporte financiero
const generateFinancialReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      currency = 'USD',
      includeUserBreakdown = false,
      format = 'json'
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Fechas de inicio y fin requeridas'
      });
    }

    const dateFilter = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };

    const [payments, transactions, commissions, userStats] = await Promise.all([
      // Pagos
      Payment.aggregate([
        {
          $match: {
            currency,
            status: 'completed',
            createdAt: dateFilter
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' }
          }
        }
      ]),
      // Transacciones
      Transaction.aggregate([
        {
          $match: {
            currency,
            createdAt: dateFilter
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),
      // Comisiones
      Commission.aggregate([
        {
          $match: {
            createdAt: dateFilter
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),
      // Estadísticas de usuarios (si se solicita)
      includeUserBreakdown === 'true' ? User.aggregate([
        {
          $lookup: {
            from: 'payments',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$user', '$$userId'] },
                  currency,
                  status: 'completed',
                  createdAt: dateFilter
                }
              }
            ],
            as: 'payments'
          }
        },
        {
          $addFields: {
            totalRevenue: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$payments',
                      cond: { $in: ['$$this.type', ['deposit', 'purchase']] }
                    }
                  },
                  as: 'payment',
                  in: '$$payment.amount'
                }
              }
            },
            totalExpenses: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$payments',
                      cond: { $in: ['$$this.type', ['withdrawal', 'refund']] }
                    }
                  },
                  as: 'payment',
                  in: '$$payment.amount'
                }
              }
            }
          }
        },
        {
          $match: {
            $or: [
              { totalRevenue: { $gt: 0 } },
              { totalExpenses: { $gt: 0 } }
            ]
          }
        },
        {
          $project: {
            username: 1,
            email: 1,
            totalRevenue: 1,
            totalExpenses: 1,
            netContribution: { $subtract: ['$totalRevenue', '$totalExpenses'] }
          }
        },
        { $sort: { netContribution: -1 } },
        { $limit: 100 }
      ]) : []
    ]);

    const report = {
      period: {
        startDate,
        endDate,
        currency
      },
      summary: {
        totalRevenue: payments
          .filter(p => ['deposit', 'purchase'].includes(p._id))
          .reduce((sum, p) => sum + p.totalAmount, 0),
        totalExpenses: payments
          .filter(p => ['withdrawal', 'refund'].includes(p._id))
          .reduce((sum, p) => sum + p.totalAmount, 0),
        totalCommissions: commissions.reduce((sum, c) => sum + c.totalAmount, 0),
        transactionVolume: transactions.reduce((sum, t) => sum + t.totalAmount, 0)
      },
      breakdown: {
        payments,
        transactions,
        commissions
      },
      userBreakdown: includeUserBreakdown === 'true' ? userStats : null,
      generatedAt: new Date(),
      generatedBy: req.admin.id
    };

    report.summary.netProfit = report.summary.totalRevenue - report.summary.totalExpenses - report.summary.totalCommissions;

    // Log de la acción
    await AdminLoggerService.logAdminAction(
      req.admin.id,
      'FINANCIAL_REPORT_GENERATED',
      {
        period: report.period,
        includeUserBreakdown,
        format
      }
    );

    if (format === 'csv') {
      const csv = AdminUtilsService.convertToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=financial-report-${Date.now()}.csv`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: report
      });
    }

  } catch (error) {
    console.error('Error generando reporte financiero:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getFinancialOverview,
  getCashFlow,
  getProfitabilityAnalysis,
  getUserBalances,
  adjustUserBalance,
  generateFinancialReport
};