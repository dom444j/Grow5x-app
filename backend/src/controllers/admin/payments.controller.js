const mongoose = require('mongoose');
const Payment = require('../../models/Payment');
const PaymentDLQ = require('../../models/PaymentDLQ.model');
const Purchase = require('../../models/Purchase.model');
const Transaction = require('../../models/Transaction.model');
const Wallet = require('../../models/Wallet.model');
const User = require('../../models/User');
const AdminLog = require('../../models/AdminLog.model');
const logger = require('../../utils/logger');
const { validationResult } = require('express-validator');

// Función helper para registrar acciones de admin
const logAdminAction = async (adminId, action, targetType, targetId, details, metadata, severity = 'medium') => {
  try {
    await AdminLog.create({
      adminId,
      action,
      targetType,
      targetId,
      details,
      metadata,
      severity
    });
  } catch (error) {
    logger.error('Error logging admin action:', error);
  }
};

// Obtener pagos pendientes y beneficios
const getPendingPaymentsAndBenefits = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      userId = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const filters = {};
    if (status) filters.status = status;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filters.userId = new mongoose.Types.ObjectId(userId);
    }

    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);
    }

    // Configurar ordenamiento
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Obtener pagos pendientes
    const pendingPayments = await Payment.find({
      ...filters,
      status: { $in: ['pending', 'processing'] }
    })
      .populate('userId', 'fullName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Obtener transacciones relacionadas con beneficios
    const benefitTransactions = await Transaction.find({
      ...filters,
      type: { $in: ['earnings', 'commission', 'pioneer_payment'] },
      status: 'pending'
    })
      .populate('user', 'fullName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalPayments = await Payment.countDocuments({
      ...filters,
      status: { $in: ['pending', 'processing'] }
    });

    const totalBenefits = await Transaction.countDocuments({
      ...filters,
      type: { $in: ['earnings', 'commission', 'pioneer_payment'] },
      status: 'pending'
    });

    await logAdminAction(
      req.user.id,
      'view_pending_payments_benefits',
      'payment_list',
      null,
      `Viewed pending payments and benefits - Page ${page}`,
      { page, limit, totalPayments, totalBenefits },
      'low'
    );

    res.json({
      success: true,
      data: {
        pendingPayments,
        benefitTransactions,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(Math.max(totalPayments, totalBenefits) / limitNum),
          totalPayments,
          totalBenefits
        }
      }
    });

  } catch (error) {
    logger.error('Error getting pending payments and benefits:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Forzar activación de beneficios
const forceBenefitActivation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { transactionId, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de transacción inválido'
      });
    }

    const transaction = await Transaction.findById(transactionId).populate('user');
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    if (transaction.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'La transacción ya está completada'
      });
    }

    // Actualizar transacción
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    transaction.notes = `Activación forzada por admin. Razón: ${reason || 'No especificada'}`;
    transaction.metadata = transaction.metadata || {};
    transaction.metadata.forcedActivation = {
      adminId: req.user.id,
      reason,
      activatedAt: new Date()
    };

    await transaction.save();

    // Actualizar balance del usuario si es necesario
    if (transaction.type === 'earnings' || transaction.type === 'commission') {
      const user = transaction.user;
      user.balances.available += transaction.amount;
      await user.save();
    }

    await logAdminAction(
      req.user.id,
      'force_benefit_activation',
      'transaction',
      transactionId,
      `Forced activation of benefit transaction for user ${transaction.user.email}. Amount: ${transaction.amount}. Reason: ${reason}`,
      {
        transactionId,
        userId: transaction.user._id,
        userEmail: transaction.user.email,
        amount: transaction.amount,
        transactionType: transaction.type,
        reason
      },
      'high'
    );

    res.json({
      success: true,
      message: 'Beneficio activado exitosamente',
      data: {
        transactionId,
        userId: transaction.user._id,
        amount: transaction.amount,
        activatedAt: transaction.completedAt
      }
    });

  } catch (error) {
    logger.error('Error forcing benefit activation:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Unificar duplicados por txHash
const unifyDuplicatesByTxHash = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { txHash, canonicalId, reason } = req.body;

    if (!txHash) {
      return res.status(400).json({
        success: false,
        message: 'txHash es requerido'
      });
    }

    // Buscar todas las compras con el mismo txHash
    const purchases = await Purchase.find({ txHash }).sort({ createdAt: 1 });

    if (purchases.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'No se encontraron duplicados para este txHash'
      });
    }

    // Determinar la compra canónica
    let canonicalPurchase;
    if (canonicalId && mongoose.Types.ObjectId.isValid(canonicalId)) {
      canonicalPurchase = purchases.find(p => p._id.toString() === canonicalId);
    }
    
    if (!canonicalPurchase) {
      // Si no se especifica o no se encuentra, usar la primera (más antigua)
      canonicalPurchase = purchases[0];
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Marcar duplicados como cancelados
        const duplicateIds = purchases
          .filter(p => p._id.toString() !== canonicalPurchase._id.toString())
          .map(p => p._id);

        if (duplicateIds.length > 0) {
          await Purchase.updateMany(
            { _id: { $in: duplicateIds } },
            {
              $set: {
                status: 'cancelled_duplicate',
                cancelledAt: new Date(),
                canonicalId: canonicalPurchase._id,
                updatedAt: new Date()
              }
            },
            { session }
          );
        }

        // Actualizar la compra canónica
        await Purchase.findByIdAndUpdate(
          canonicalPurchase._id,
          {
            $set: {
              status: 'paid',
              updatedAt: new Date()
            }
          },
          { session }
        );

        // Buscar y actualizar pagos relacionados
        const payments = await Payment.find({ txHash });
        if (payments.length > 1) {
          const canonicalPayment = payments[0];
          const duplicatePaymentIds = payments
            .filter(p => p._id.toString() !== canonicalPayment._id.toString())
            .map(p => p._id);

          if (duplicatePaymentIds.length > 0) {
            await Payment.updateMany(
              { _id: { $in: duplicatePaymentIds } },
              {
                $set: {
                  isDuplicate: true,
                  status: 'cancelled_duplicate',
                  canonicalId: canonicalPayment._id,
                  updatedAt: new Date()
                }
              },
              { session }
            );
          }

          // Actualizar el pago canónico
          await Payment.findByIdAndUpdate(
            canonicalPayment._id,
            {
              $set: {
                verified: true,
                purchaseId: canonicalPurchase._id,
                updatedAt: new Date()
              }
            },
            { session }
          );
        }
      });

      await logAdminAction(
        req.user.id,
        'unify_duplicates_by_txhash',
        'purchase',
        canonicalPurchase._id,
        `Unified ${purchases.length} duplicate purchases for txHash: ${txHash}. Canonical ID: ${canonicalPurchase._id}. Reason: ${reason || 'No reason provided'}`,
        {
          txHash,
          canonicalId: canonicalPurchase._id,
          totalDuplicates: purchases.length - 1,
          duplicateIds: purchases.filter(p => p._id.toString() !== canonicalPurchase._id.toString()).map(p => p._id),
          reason
        },
        'high'
      );

      res.json({
        success: true,
        message: 'Duplicados unificados exitosamente',
        data: {
          txHash,
          canonicalId: canonicalPurchase._id,
          totalProcessed: purchases.length,
          duplicatesMarked: purchases.length - 1
        }
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    logger.error('Error unifying duplicates by txHash:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getPendingPaymentsAndBenefits,
  forceBenefitActivation,
  unifyDuplicatesByTxHash
};