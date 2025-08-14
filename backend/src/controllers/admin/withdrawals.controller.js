const mongoose = require('mongoose');
const WithdrawalRequest = require('../../models/WithdrawalRequest');
const User = require('../../models/User');
const Wallet = require('../../models/Wallet.model');
const Transaction = require('../../models/Transaction.model');
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

// Obtener todos los retiros
const getAllWithdrawals = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      userId = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minAmount = '',
      maxAmount = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const filters = {};
    if (status) filters.status = status;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filters.user = new mongoose.Types.ObjectId(userId);
    }

    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);
    }

    if (minAmount || maxAmount) {
      filters.amount = {};
      if (minAmount) filters.amount.$gte = parseFloat(minAmount);
      if (maxAmount) filters.amount.$lte = parseFloat(maxAmount);
    }

    // Configurar ordenamiento
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const withdrawals = await WithdrawalRequest.find(filters)
      .populate('user', 'fullName email phone')
      .populate('wallet', 'address network')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await WithdrawalRequest.countDocuments(filters);

    // Estadísticas adicionales
    const stats = await WithdrawalRequest.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          totalPending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          },
          totalApproved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0]
            }
          },
          totalCompleted: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          },
          totalRejected: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    await logAdminAction(
      req.user.id,
      'view_all_withdrawals',
      'withdrawal_list',
      null,
      `Viewed withdrawals - Page ${page}`,
      { page, limit, total, filters },
      'low'
    );

    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum
        },
        stats: stats[0] || {
          totalAmount: 0,
          avgAmount: 0,
          totalPending: 0,
          totalApproved: 0,
          totalCompleted: 0,
          totalRejected: 0
        }
      }
    });

  } catch (error) {
    logger.error('Error getting all withdrawals:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener detalles de un retiro específico
const getWithdrawalDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de retiro inválido'
      });
    }

    const withdrawal = await WithdrawalRequest.findById(id)
      .populate('user', 'fullName email phone balances')
      .populate('wallet', 'address network type')
      .lean();

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Retiro no encontrado'
      });
    }

    // Obtener historial de retiros del usuario
    const userWithdrawals = await WithdrawalRequest.find({
      user: withdrawal.user._id,
      _id: { $ne: id }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Obtener transacciones relacionadas
    const relatedTransactions = await Transaction.find({
      user: withdrawal.user._id,
      type: { $in: ['withdrawal', 'withdrawal_fee'] },
      'metadata.withdrawalId': id
    }).lean();

    await logAdminAction(
      req.user.id,
      'view_withdrawal_details',
      'withdrawal',
      id,
      `Viewed withdrawal details for user ${withdrawal.user.email}`,
      {
        withdrawalId: id,
        userId: withdrawal.user._id,
        userEmail: withdrawal.user.email,
        amount: withdrawal.amount,
        status: withdrawal.status
      },
      'low'
    );

    res.json({
      success: true,
      data: {
        withdrawal,
        userWithdrawals,
        relatedTransactions
      }
    });

  } catch (error) {
    logger.error('Error getting withdrawal details:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Aprobar retiro
const approveWithdrawal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { notes, txHash } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de retiro inválido'
      });
    }

    const withdrawal = await WithdrawalRequest.findById(id).populate('user wallet');
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Retiro no encontrado'
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `No se puede aprobar un retiro con estado: ${withdrawal.status}`
      });
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Actualizar retiro
        withdrawal.status = 'approved';
        withdrawal.approvedAt = new Date();
        withdrawal.approvedBy = req.user.id;
        withdrawal.notes = notes || withdrawal.notes;
        withdrawal.txHash = txHash || withdrawal.txHash;
        withdrawal.updatedAt = new Date();

        // Actualizar metadata
        withdrawal.metadata = withdrawal.metadata || {};
        withdrawal.metadata.approval = {
          adminId: req.user.id,
          approvedAt: new Date(),
          notes,
          txHash
        };

        await withdrawal.save({ session });

        // Crear transacción de retiro si no existe
        const existingTransaction = await Transaction.findOne({
          user: withdrawal.user._id,
          type: 'withdrawal',
          'metadata.withdrawalId': id
        });

        if (!existingTransaction) {
          const withdrawalTransaction = new Transaction({
            user: withdrawal.user._id,
            type: 'withdrawal',
            amount: withdrawal.amount,
            description: `Retiro aprobado - ${withdrawal.wallet.address}`,
            status: 'completed',
            completedAt: new Date(),
            metadata: {
              withdrawalId: id,
              walletAddress: withdrawal.wallet.address,
              network: withdrawal.wallet.network,
              txHash,
              approvedBy: req.user.id
            }
          });

          await withdrawalTransaction.save({ session });
        }
      });

      await logAdminAction(
        req.user.id,
        'approve_withdrawal',
        'withdrawal',
        id,
        `Approved withdrawal for user ${withdrawal.user.email}. Amount: ${withdrawal.amount}. Wallet: ${withdrawal.wallet.address}`,
        {
          withdrawalId: id,
          userId: withdrawal.user._id,
          userEmail: withdrawal.user.email,
          amount: withdrawal.amount,
          walletAddress: withdrawal.wallet.address,
          network: withdrawal.wallet.network,
          txHash,
          notes
        },
        'high'
      );

      res.json({
        success: true,
        message: 'Retiro aprobado exitosamente',
        data: {
          withdrawalId: id,
          status: 'approved',
          approvedAt: withdrawal.approvedAt,
          amount: withdrawal.amount,
          txHash
        }
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    logger.error('Error approving withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Rechazar retiro
const rejectWithdrawal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { reason, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de retiro inválido'
      });
    }

    const withdrawal = await WithdrawalRequest.findById(id).populate('user');
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Retiro no encontrado'
      });
    }

    if (!['pending', 'approved'].includes(withdrawal.status)) {
      return res.status(400).json({
        success: false,
        message: `No se puede rechazar un retiro con estado: ${withdrawal.status}`
      });
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Actualizar retiro
        withdrawal.status = 'rejected';
        withdrawal.rejectedAt = new Date();
        withdrawal.rejectedBy = req.user.id;
        withdrawal.rejectionReason = reason;
        withdrawal.notes = notes || withdrawal.notes;
        withdrawal.updatedAt = new Date();

        // Actualizar metadata
        withdrawal.metadata = withdrawal.metadata || {};
        withdrawal.metadata.rejection = {
          adminId: req.user.id,
          rejectedAt: new Date(),
          reason,
          notes
        };

        await withdrawal.save({ session });

        // Devolver fondos al usuario
        const user = withdrawal.user;
        user.balances.available += withdrawal.amount;
        await user.save({ session });

        // Crear transacción de reembolso
        const refundTransaction = new Transaction({
          user: user._id,
          type: 'refund',
          amount: withdrawal.amount,
          description: `Reembolso por retiro rechazado - ${reason}`,
          status: 'completed',
          completedAt: new Date(),
          metadata: {
            withdrawalId: id,
            rejectionReason: reason,
            refundedBy: req.user.id
          }
        });

        await refundTransaction.save({ session });
      });

      await logAdminAction(
        req.user.id,
        'reject_withdrawal',
        'withdrawal',
        id,
        `Rejected withdrawal for user ${withdrawal.user.email}. Amount: ${withdrawal.amount}. Reason: ${reason}`,
        {
          withdrawalId: id,
          userId: withdrawal.user._id,
          userEmail: withdrawal.user.email,
          amount: withdrawal.amount,
          reason,
          notes
        },
        'high'
      );

      res.json({
        success: true,
        message: 'Retiro rechazado exitosamente',
        data: {
          withdrawalId: id,
          status: 'rejected',
          rejectedAt: withdrawal.rejectedAt,
          amount: withdrawal.amount,
          reason
        }
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    logger.error('Error rejecting withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Marcar retiro como completado
const completeWithdrawal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { txHash, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de retiro inválido'
      });
    }

    const withdrawal = await WithdrawalRequest.findById(id).populate('user wallet');
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Retiro no encontrado'
      });
    }

    if (withdrawal.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `No se puede completar un retiro con estado: ${withdrawal.status}`
      });
    }

    if (!txHash) {
      return res.status(400).json({
        success: false,
        message: 'Hash de transacción es requerido'
      });
    }

    // Actualizar retiro
    withdrawal.status = 'completed';
    withdrawal.completedAt = new Date();
    withdrawal.completedBy = req.user.id;
    withdrawal.txHash = txHash;
    withdrawal.notes = notes || withdrawal.notes;
    withdrawal.updatedAt = new Date();

    // Actualizar metadata
    withdrawal.metadata = withdrawal.metadata || {};
    withdrawal.metadata.completion = {
      adminId: req.user.id,
      completedAt: new Date(),
      txHash,
      notes
    };

    await withdrawal.save();

    // Actualizar transacción relacionada
    await Transaction.updateOne(
      {
        user: withdrawal.user._id,
        type: 'withdrawal',
        'metadata.withdrawalId': id
      },
      {
        $set: {
          'metadata.txHash': txHash,
          'metadata.completedBy': req.user.id,
          updatedAt: new Date()
        }
      }
    );

    await logAdminAction(
      req.user.id,
      'complete_withdrawal',
      'withdrawal',
      id,
      `Completed withdrawal for user ${withdrawal.user.email}. Amount: ${withdrawal.amount}. TxHash: ${txHash}`,
      {
        withdrawalId: id,
        userId: withdrawal.user._id,
        userEmail: withdrawal.user.email,
        amount: withdrawal.amount,
        walletAddress: withdrawal.wallet.address,
        network: withdrawal.wallet.network,
        txHash,
        notes
      },
      'high'
    );

    res.json({
      success: true,
      message: 'Retiro completado exitosamente',
      data: {
        withdrawalId: id,
        status: 'completed',
        completedAt: withdrawal.completedAt,
        amount: withdrawal.amount,
        txHash
      }
    });

  } catch (error) {
    logger.error('Error completing withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllWithdrawals,
  getWithdrawalDetails,
  approveWithdrawal,
  rejectWithdrawal,
  completeWithdrawal
};