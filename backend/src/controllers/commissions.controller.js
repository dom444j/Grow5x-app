const Commission = require('../models/Commission.model');
const User = require('../models/User');
const Transaction = require('../models/Transaction.model');
const Referral = require('../models/Referral.model');
const UserStatusService = require('../services/UserStatusService');
const logger = require('../utils/logger');
const { validateCommissionPayment } = require('../utils/validation');

/**
 * Controlador de Comisiones
 * Gestiona el procesamiento, pago y consulta de comisiones
 */

/**
 * @route   GET /api/commissions/user/:userId
 * @desc    Obtener comisiones del usuario
 * @access  Private
 */
exports.getUserCommissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, status, type, startDate, endDate } = req.query;

    // Verificar permisos
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estas comisiones'
      });
    }

    // Construir filtros
    const filters = { userId };
    if (status && status !== 'all') filters.status = status;
    if (type && type !== 'all') filters.commissionType = type;
    
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener comisiones
    const commissions = await Commission.find(filters)
      .populate('fromUserId', 'username email')
      .populate('referralId')
      .populate('transactionId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Commission.countDocuments(filters);

    // Calcular estadísticas
    const stats = await Commission.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          },
          totalCount: { $sum: 1 },
          paidCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, 1, 0]
            }
          },
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        commissions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        },
        stats: stats[0] || {
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          totalCount: 0,
          paidCount: 0,
          pendingCount: 0
        }
      }
    });

  } catch (error) {
    logger.error('Error getting user commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @route   POST /api/commissions/:commissionId/pay
 * @desc    Procesar pago de comisión
 * @access  Admin
 */
exports.processCommissionPayment = async (req, res) => {
  try {
    const { commissionId } = req.params;
    const { paymentMethod = 'wallet', notes, transactionHash } = req.body;

    // Validar entrada
    const { error } = validateCommissionPayment(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Datos de pago inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Obtener comisión
    const commission = await Commission.findById(commissionId)
      .populate('userId', 'username email balance')
      .populate('fromUserId', 'username email');

    if (!commission) {
      return res.status(404).json({
        success: false,
        message: 'Comisión no encontrada'
      });
    }

    if (commission.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Esta comisión ya ha sido procesada'
      });
    }

    // Procesar pago según el método
    let transactionResult = null;
    
    if (paymentMethod === 'wallet') {
      // Pago directo al balance del usuario
      const user = await User.findById(commission.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Actualizar balance del usuario
      user.balance = (user.balance || 0) + commission.amount;
      user.totalEarnings = (user.totalEarnings || 0) + commission.amount;
      await user.save();

      // Crear transacción de comisión
      const transaction = new Transaction({
        user: commission.userId,
        type: 'commission',
        subtype: 'referral_commission',
        amount: commission.amount,
        currency: commission.currency,
        status: 'completed',
        payment: {
          method: 'wallet',
          address: null,
          txHash: transactionHash || null
        },
        metadata: {
          commissionId: commission._id,
          commissionType: commission.commissionType,
          fromUserId: commission.fromUserId,
          processedBy: req.user.id,
          notes
        }
      });

      transactionResult = await transaction.save();

      // Actualizar UserStatus
      await UserStatusService.updateFinancialData(commission.userId, {
        commissionReceived: commission.amount,
        transactionId: transactionResult._id
      });
    }

    // Actualizar comisión
    commission.status = 'paid';
    commission.paymentInfo = {
      paidAt: new Date(),
      paidBy: req.user.id,
      paymentMethod,
      transactionHash,
      notes
    };
    
    if (transactionResult) {
      commission.transactionId = transactionResult._id;
    }

    await commission.save();

    // Log administrativo
    logger.info('Commission payment processed', {
      commissionId: commission._id,
      userId: commission.userId,
      amount: commission.amount,
      paymentMethod,
      processedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Comisión pagada exitosamente',
      data: {
        commission,
        transaction: transactionResult
      }
    });

  } catch (error) {
    logger.error('Error processing commission payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @route   POST /api/commissions/calculate
 * @desc    Calcular comisión por transacción - ACTUALIZADO según nueva lógica
 * @access  Private (Internal)
 * NOTA: Esta función está DEPRECADA - usar BenefitsProcessor.processReferralCommissions
 */
exports.calculateCommission = async (req, res) => {
  try {
    const { userId, transactionId, amount, commissionType = 'direct_referral' } = req.body;

    // ADVERTENCIA: Esta función contiene lógica desactualizada
    // Se mantiene solo para compatibilidad temporal
    // Usar BenefitsProcessor.processReferralCommissions para nueva lógica
    
    logger.warn('FUNCIÓN DEPRECADA: calculateCommission - usar BenefitsProcessor en su lugar');

    // Obtener usuario y su referidor
    const user = await User.findById(userId).populate('referredBy');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const calculations = [];

    // CORREGIDO: Comisión directa (10% del cashback total al completar 100%)
    // NOTA: Esta implementación es simplificada - la lógica real está en BenefitsProcessor
    if (user.referredBy && commissionType === 'direct_referral') {
      // Verificar si el usuario completó el cashback (esto debería manejarse en BenefitsProcessor)
      const directCommission = amount * 0.10; // 10% del cashback total
      
      const commission = new Commission({
        userId: user.referredBy._id,
        fromUserId: userId,
        commissionType: 'direct_referral',
        amount: directCommission,
        currency: 'USD',
        status: 'pending',
        transactionId,
        metadata: {
          percentage: 10,
          baseAmount: amount,
          calculatedAt: new Date(),
          note: 'DEPRECADO - usar BenefitsProcessor',
          paymentTrigger: 'cashback_completion_100_percent',
          purchaseId: transactionId,
          ...(global.testRunId ? { runId: global.testRunId } : {})
        }
      });

      await commission.save();
      calculations.push({
        type: 'direct_referral',
        recipient: user.referredBy._id,
        amount: directCommission,
        percentage: 10,
        note: 'Pago al completar 100% del cashback'
      });
    }

    // CORREGIDO: Bono de líder (5% del monto total de licencias - día 17)
    // NOTA: Esta implementación es simplificada - la lógica real está en BenefitsProcessor
    if (user.referredBy && user.referredBy.specialUserType === 'lider') {
      const leaderBonus = amount * 0.05; // 5% del monto total de licencias
      
      const commission = new Commission({
        userId: user.referredBy._id,
        fromUserId: userId,
        commissionType: 'leader_bonus',
        amount: leaderBonus,
        currency: 'USD',
        status: 'pending',
        transactionId,
        metadata: {
          percentage: 5,
          baseAmount: amount,
          calculatedAt: new Date(),
          note: 'DEPRECADO - usar BenefitsProcessor',
          paymentTrigger: 'second_cycle_completion_day_17',
          paymentType: 'unique_per_user'
        }
      });

      await commission.save();
      calculations.push({
        type: 'leader_bonus',
        recipient: user.referredBy._id,
        amount: leaderBonus,
        percentage: 5,
        note: 'Pago único en día 17 (segundo ciclo)'
      });
    }

    // CORREGIDO: Bono de padre (5% del monto total de licencias - día 17)
    // NOTA: Porcentaje corregido de 3% a 5% según documentación oficial
    if (user.referredBy && user.referredBy.referredBy) {
      const parentBonus = amount * 0.05; // CORREGIDO: 5% (antes era 3%)
      
      const commission = new Commission({
        userId: user.referredBy.referredBy,
        fromUserId: userId,
        commissionType: 'parent_bonus',
        amount: parentBonus,
        currency: 'USD',
        status: 'pending',
        transactionId,
        metadata: {
          percentage: 5, // CORREGIDO: 5% (antes era 3%)
          baseAmount: amount,
          calculatedAt: new Date(),
          intermediateUser: user.referredBy._id,
          note: 'DEPRECADO - usar BenefitsProcessor',
          paymentTrigger: 'second_cycle_completion_day_17',
          paymentType: 'unique_per_user'
        }
      });

      await commission.save();
      calculations.push({
        type: 'parent_bonus',
        recipient: user.referredBy.referredBy,
        amount: parentBonus,
        percentage: 5 // CORREGIDO: 5% (antes era 3%)
      });
    }

    res.json({
      success: true,
      message: 'Comisiones calculadas exitosamente',
      data: {
        calculations,
        totalCommissions: calculations.reduce((sum, calc) => sum + calc.amount, 0)
      }
    });

  } catch (error) {
    logger.error('Error calculating commission:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @route   GET /api/commissions/history
 * @desc    Obtener historial completo de comisiones (Admin)
 * @access  Admin
 */
exports.getCommissionHistory = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type, 
      userId, 
      startDate, 
      endDate,
      search 
    } = req.query;

    // Construir filtros
    const filters = {};
    if (status && status !== 'all') filters.status = status;
    if (type && type !== 'all') filters.commissionType = type;
    if (userId) filters.userId = userId;
    
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    // Búsqueda por texto
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filters.$or = [
        { 'paymentInfo.notes': searchRegex },
        { 'paymentInfo.transactionHash': searchRegex }
      ];
    }

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener comisiones
    const commissions = await Commission.find(filters)
      .populate('userId', 'username email')
      .populate('fromUserId', 'username email')
      .populate('paymentInfo.paidBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Commission.countDocuments(filters);

    // Estadísticas globales
    const globalStats = await Commission.aggregate([
      {
        $group: {
          _id: null,
          totalCommissions: { $sum: '$amount' },
          paidCommissions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0]
            }
          },
          pendingCommissions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        commissions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        },
        stats: globalStats[0] || {
          totalCommissions: 0,
          paidCommissions: 0,
          pendingCommissions: 0,
          totalCount: 0
        }
      }
    });

  } catch (error) {
    logger.error('Error getting commission history:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @route   GET /api/commissions/pending
 * @desc    Obtener comisiones pendientes (Admin)
 * @access  Admin
 */
exports.getPendingCommissions = async (req, res) => {
  try {
    const { limit = 50, type, minAmount } = req.query;

    // Construir filtros
    const filters = { status: 'pending' };
    if (type && type !== 'all') filters.commissionType = type;
    if (minAmount) filters.amount = { $gte: parseFloat(minAmount) };

    // Obtener comisiones pendientes
    const pendingCommissions = await Commission.find(filters)
      .populate('userId', 'username email')
      .populate('fromUserId', 'username email')
      .sort({ createdAt: 1 }) // Más antiguas primero
      .limit(parseInt(limit));

    // Estadísticas de pendientes
    const pendingStats = await Commission.aggregate([
      { $match: filters },
      {
        $group: {
          _id: '$commissionType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    const totalPending = await Commission.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        pendingCommissions,
        stats: {
          byType: pendingStats,
          total: totalPending[0] || { totalAmount: 0, totalCount: 0 }
        }
      }
    });

  } catch (error) {
    logger.error('Error getting pending commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @route   POST /api/commissions/batch-pay
 * @desc    Procesar pago en lote de comisiones
 * @access  Admin
 */
exports.batchPayCommissions = async (req, res) => {
  try {
    const { commissionIds, paymentMethod = 'wallet', notes } = req.body;

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs de comisiones requeridos'
      });
    }

    const results = {
      processed: 0,
      failed: 0,
      totalAmount: 0,
      errors: []
    };

    // Procesar cada comisión
    for (const commissionId of commissionIds) {
      try {
        const commission = await Commission.findById(commissionId)
          .populate('userId', 'username email balance');

        if (!commission) {
          results.errors.push(`Comisión ${commissionId} no encontrada`);
          results.failed++;
          continue;
        }

        if (commission.status !== 'pending') {
          results.errors.push(`Comisión ${commissionId} ya procesada`);
          results.failed++;
          continue;
        }

        // Procesar pago
        if (paymentMethod === 'wallet') {
          const user = await User.findById(commission.userId);
          user.balance = (user.balance || 0) + commission.amount;
          user.totalEarnings = (user.totalEarnings || 0) + commission.amount;
          await user.save();

          // Crear transacción
          const transaction = new Transaction({
            user: commission.userId,
            type: 'commission',
            subtype: 'referral_commission',
            amount: commission.amount,
            currency: commission.currency,
            status: 'completed',
            payment: {
              method: 'wallet'
            },
            metadata: {
              commissionId: commission._id,
              batchPayment: true,
              processedBy: req.user.id
            }
          });

          await transaction.save();

          // Actualizar comisión
          commission.status = 'paid';
          commission.paymentInfo = {
            paidAt: new Date(),
            paidBy: req.user.id,
            paymentMethod,
            notes: notes || 'Pago en lote'
          };
          commission.transactionId = transaction._id;
          await commission.save();

          results.processed++;
          results.totalAmount += commission.amount;
        }

      } catch (error) {
        results.errors.push(`Error procesando ${commissionId}: ${error.message}`);
        results.failed++;
      }
    }

    logger.info('Batch commission payment completed', {
      processed: results.processed,
      failed: results.failed,
      totalAmount: results.totalAmount,
      processedBy: req.user.id
    });

    res.json({
      success: true,
      message: `Procesamiento completado: ${results.processed} exitosas, ${results.failed} fallidas`,
      data: results
    });

  } catch (error) {
    logger.error('Error in batch commission payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = exports;