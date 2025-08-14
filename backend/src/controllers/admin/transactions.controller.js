const mongoose = require('mongoose');
const Transaction = require('../../models/Transaction.model');
const User = require('../../models/User');
const Wallet = require('../../models/Wallet.model');
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

// Obtener todas las transacciones
const getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      type = '',
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
    if (type) filters.type = type;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filters.user = new mongoose.Types.ObjectId(userId);
    }

    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);
    }

    // Configurar ordenamiento
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const transactions = await Transaction.find(filters)
      .populate('user', 'fullName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Transaction.countDocuments(filters);

    // Estadísticas adicionales
    const stats = await Transaction.aggregate([
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
          totalCompleted: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          },
          totalFailed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'failed'] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    await logAdminAction(
      req.user.id,
      'view_all_transactions',
      'transaction_list',
      null,
      `Viewed transactions - Page ${page}`,
      { page, limit, total, filters },
      'low'
    );

    res.json({
      success: true,
      data: {
        transactions,
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
          totalCompleted: 0,
          totalFailed: 0
        }
      }
    });

  } catch (error) {
    logger.error('Error getting all transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener detalles de una transacción específica
const getTransactionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de transacción inválido'
      });
    }

    const transaction = await Transaction.findById(id)
      .populate('user', 'fullName email phone')
      .lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    // Obtener transacciones relacionadas del mismo usuario
    const relatedTransactions = await Transaction.find({
      user: transaction.user._id,
      _id: { $ne: id }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    await logAdminAction(
      req.user.id,
      'view_transaction_details',
      'transaction',
      id,
      `Viewed transaction details for user ${transaction.user.email}`,
      {
        transactionId: id,
        userId: transaction.user._id,
        userEmail: transaction.user.email,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status
      },
      'low'
    );

    res.json({
      success: true,
      data: {
        transaction,
        relatedTransactions
      }
    });

  } catch (error) {
    logger.error('Error getting transaction details:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Actualizar estado de transacción
const updateTransactionStatus = async (req, res) => {
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
    const { status, reason, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de transacción inválido'
      });
    }

    const transaction = await Transaction.findById(id).populate('user');
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    const oldStatus = transaction.status;
    const oldAmount = transaction.amount;
    const user = transaction.user;

    // Validar transición de estado
    const validTransitions = {
      'pending': ['completed', 'failed', 'cancelled'],
      'processing': ['completed', 'failed', 'cancelled'],
      'failed': ['pending', 'completed'],
      'cancelled': ['pending']
    };

    if (!validTransitions[oldStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Transición de estado inválida: ${oldStatus} -> ${status}`
      });
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Actualizar transacción
        transaction.status = status;
        transaction.notes = notes || transaction.notes;
        transaction.updatedAt = new Date();
        
        if (status === 'completed') {
          transaction.completedAt = new Date();
        } else if (status === 'failed' || status === 'cancelled') {
          transaction.failedAt = new Date();
          transaction.failureReason = reason;
        }

        // Actualizar metadata
        transaction.metadata = transaction.metadata || {};
        transaction.metadata.adminUpdate = {
          adminId: req.user.id,
          oldStatus,
          newStatus: status,
          reason,
          updatedAt: new Date()
        };

        await transaction.save({ session });

        // Actualizar balance del usuario si es necesario
        if (oldStatus !== 'completed' && status === 'completed') {
          // Completar transacción - agregar al balance
          if (['earnings', 'commission', 'pioneer_payment', 'deposit'].includes(transaction.type)) {
            user.balances.available += oldAmount;
            await user.save({ session });
          }
        } else if (oldStatus === 'completed' && status !== 'completed') {
          // Revertir transacción completada - quitar del balance
          if (['earnings', 'commission', 'pioneer_payment', 'deposit'].includes(transaction.type)) {
            if (user.balances.available >= oldAmount) {
              user.balances.available -= oldAmount;
              await user.save({ session });
            } else {
              throw new Error('Balance insuficiente para revertir la transacción');
            }
          }
        }
      });

      await logAdminAction(
        req.user.id,
        'update_transaction_status',
        'transaction',
        id,
        `Updated transaction status from ${oldStatus} to ${status} for user ${user.email}. Amount: ${oldAmount}. Reason: ${reason || 'No reason provided'}`,
        {
          transactionId: id,
          userId: user._id,
          userEmail: user.email,
          oldStatus,
          newStatus: status,
          amount: oldAmount,
          reason,
          notes
        },
        'high'
      );

      res.json({
        success: true,
        message: 'Estado de transacción actualizado exitosamente',
        data: {
          transactionId: id,
          oldStatus,
          newStatus: status,
          amount: oldAmount,
          updatedAt: new Date()
        }
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    logger.error('Error updating transaction status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Crear transacción manual
const createManualTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { userId, type, amount, description, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Validar tipos de transacción permitidos para creación manual
    const allowedTypes = ['adjustment', 'bonus', 'penalty', 'refund', 'manual_deposit', 'manual_withdrawal'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de transacción no permitido para creación manual'
      });
    }

    const session = await mongoose.startSession();
    
    try {
      let transaction;
      
      await session.withTransaction(async () => {
        // Crear transacción
        transaction = new Transaction({
          user: userId,
          type,
          amount: Math.abs(amount),
          description: description || `Transacción manual: ${type}`,
          status: 'completed',
          completedAt: new Date(),
          metadata: {
            manualCreation: {
              adminId: req.user.id,
              reason,
              createdAt: new Date()
            }
          }
        });

        await transaction.save({ session });

        // Actualizar balance del usuario
        if (['adjustment', 'bonus', 'refund', 'manual_deposit'].includes(type)) {
          user.balances.available += Math.abs(amount);
        } else if (['penalty', 'manual_withdrawal'].includes(type)) {
          if (user.balances.available >= Math.abs(amount)) {
            user.balances.available -= Math.abs(amount);
          } else {
            throw new Error('Balance insuficiente para realizar la transacción');
          }
        }

        await user.save({ session });
      });

      await logAdminAction(
        req.user.id,
        'create_manual_transaction',
        'transaction',
        transaction._id,
        `Created manual transaction for user ${user.email}. Type: ${type}, Amount: ${amount}. Reason: ${reason}`,
        {
          transactionId: transaction._id,
          userId,
          userEmail: user.email,
          type,
          amount,
          reason,
          description
        },
        'high'
      );

      res.json({
        success: true,
        message: 'Transacción manual creada exitosamente',
        data: {
          transactionId: transaction._id,
          userId,
          type,
          amount,
          newBalance: user.balances.available,
          createdAt: transaction.createdAt
        }
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    logger.error('Error creating manual transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllTransactions,
  getTransactionDetails,
  updateTransactionStatus,
  createManualTransaction
};