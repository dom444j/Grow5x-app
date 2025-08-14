const mongoose = require('mongoose');
const Payment = require('../../models/Payment');
const AdminLoggerService = require('../../services/admin/adminLogger.service');
const ValidationService = require('../../services/admin/validation.service');
const AdminUtilsService = require('../../services/admin/utils.service');
const { validationResult } = require('express-validator');

/**
 * Controlador para gestión de lotes de retiros
 * Maneja la creación, seguimiento y procesamiento de lotes de retiros
 */

// Crear lote de retiros para procesamiento externo
const createWithdrawalBatch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { withdrawalIds, batchName, priority = 'normal' } = req.body;
    
    if (!withdrawalIds || withdrawalIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos un ID de retiro'
      });
    }

    // Validar que el lote tenga exactamente 10 retiros (recomendado)
    if (withdrawalIds.length !== 10) {
      return res.status(400).json({
        success: false,
        message: `Se recomienda crear lotes de exactamente 10 retiros. Recibidos: ${withdrawalIds.length}`,
        suggestion: 'Seleccione exactamente 10 retiros para optimizar el procesamiento'
      });
    }

    // Generar ID único para el lote
    const batchId = `BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();
    
    // Actualizar retiros con el ID del lote
    const updateResult = await Payment.updateMany(
      { 
        _id: { $in: withdrawalIds },
        status: 'pending'
      },
      {
        $set: {
          batchId: batchId,
          batchName: batchName || `Lote ${timestamp.toISOString().split('T')[0]}`,
          priority: priority,
          batchCreatedAt: timestamp,
          batchCreatedBy: req.user.id,
          status: 'batched'
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se pudieron agregar retiros al lote. Verifique que estén en estado pendiente.'
      });
    }

    // Obtener información del lote creado
    const batchWithdrawals = await Payment.find({ batchId })
      .populate('user', 'email username walletAddress')
      .select('amount currency user createdAt fee network');

    const batchSummary = {
      batchId,
      batchName: batchName || `Lote ${timestamp.toISOString().split('T')[0]}`,
      totalWithdrawals: batchWithdrawals.length,
      totalAmount: batchWithdrawals.reduce((sum, w) => sum + w.amount, 0),
      currency: batchWithdrawals[0]?.currency || 'USDT',
      priority,
      createdAt: timestamp,
      createdBy: req.user.id,
      withdrawals: batchWithdrawals
    };

    // Registrar acción de admin
    await AdminLoggerService.logAction(
      req.user.id,
      'create_withdrawal_batch',
      'batch',
      batchId,
      `Lote de retiros creado con ${batchWithdrawals.length} retiros`,
      { batchSummary },
      'medium'
    );

    res.json({
      success: true,
      message: 'Lote de retiros creado exitosamente',
      data: batchSummary
    });

  } catch (error) {
    console.error('Error creando lote de retiros:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de lotes de retiros
const getWithdrawalBatchStats = async (req, res) => {
  try {
    const stats = await Payment.aggregate([
      {
        $match: {
          batchId: { $exists: true, $ne: null },
          type: 'withdrawal'
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          batches: { $addToSet: '$batchId' }
        }
      }
    ]);

    const totalBatches = await Payment.distinct('batchId', {
      batchId: { $exists: true, $ne: null },
      type: 'withdrawal'
    });

    res.json({
      success: true,
      data: {
        totalBatches: totalBatches.length,
        statusBreakdown: stats,
        summary: {
          totalWithdrawalsInBatches: stats.reduce((sum, s) => sum + s.count, 0),
          totalAmountInBatches: stats.reduce((sum, s) => sum + s.totalAmount, 0)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de lotes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener lista de lotes de retiros
const getWithdrawalBatches = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;
    const skip = (page - 1) * limit;

    let matchConditions = {
      batchId: { $exists: true, $ne: null },
      type: 'withdrawal'
    };

    if (status) {
      matchConditions.status = status;
    }
    if (priority) {
      matchConditions.priority = priority;
    }

    const batches = await Payment.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$batchId',
          batchName: { $first: '$batchName' },
          priority: { $first: '$priority' },
          status: { $first: '$status' },
          createdAt: { $first: '$batchCreatedAt' },
          createdBy: { $first: '$batchCreatedBy' },
          withdrawalCount: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          currency: { $first: '$currency' }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    const totalBatches = await Payment.aggregate([
      { $match: matchConditions },
      { $group: { _id: '$batchId' } },
      { $count: 'total' }
    ]);

    res.json({
      success: true,
      data: {
        batches,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil((totalBatches[0]?.total || 0) / limit),
          totalBatches: totalBatches[0]?.total || 0,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo lotes de retiros:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener retiros para crear lote
const getWithdrawalsForBatch = async (req, res) => {
  try {
    const { limit = 10, currency = 'USDT', minAmount, maxAmount } = req.query;

    let matchConditions = {
      type: 'withdrawal',
      status: 'pending',
      batchId: { $exists: false }
    };

    if (currency) {
      matchConditions.currency = currency;
    }

    if (minAmount || maxAmount) {
      matchConditions.amount = {};
      if (minAmount) matchConditions.amount.$gte = parseFloat(minAmount);
      if (maxAmount) matchConditions.amount.$lte = parseFloat(maxAmount);
    }

    const withdrawals = await Payment.find(matchConditions)
      .populate('user', 'email username walletAddress')
      .select('amount currency user createdAt fee network walletAddress')
      .sort({ createdAt: 1 })
      .limit(parseInt(limit));

    const summary = {
      totalWithdrawals: withdrawals.length,
      totalAmount: withdrawals.reduce((sum, w) => sum + w.amount, 0),
      currency: currency,
      recommendedBatchSize: 10
    };

    res.json({
      success: true,
      data: {
        withdrawals,
        summary
      }
    });

  } catch (error) {
    console.error('Error obteniendo retiros para lote:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Exportar retiros pendientes
const exportPendingWithdrawals = async (req, res) => {
  try {
    const { format = 'json', batchId, status = 'pending' } = req.query;

    let matchConditions = {
      type: 'withdrawal',
      status: status
    };

    if (batchId) {
      matchConditions.batchId = batchId;
    }

    const withdrawals = await Payment.find(matchConditions)
      .populate('user', 'email username walletAddress')
      .select('amount currency user createdAt fee network walletAddress batchId')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      const csvData = AdminUtilsService.formatForExport(withdrawals, 'csv');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="withdrawals_${Date.now()}.csv"`);
      return res.send(csvData);
    }

    res.json({
      success: true,
      data: {
        withdrawals,
        exportedAt: new Date(),
        totalCount: withdrawals.length,
        totalAmount: withdrawals.reduce((sum, w) => sum + w.amount, 0)
      }
    });

  } catch (error) {
    console.error('Error exportando retiros:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Marcar retiros como exportados
const markWithdrawalsAsExported = async (req, res) => {
  try {
    const { withdrawalIds, batchId } = req.body;

    if (!withdrawalIds && !batchId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere withdrawalIds o batchId'
      });
    }

    let matchConditions = {};
    if (withdrawalIds) {
      matchConditions._id = { $in: withdrawalIds };
    } else {
      matchConditions.batchId = batchId;
    }

    const updateResult = await Payment.updateMany(
      matchConditions,
      {
        $set: {
          status: 'exported',
          exportedAt: new Date(),
          exportedBy: req.user.id
        }
      }
    );

    await AdminLoggerService.logAction(
      req.user.id,
      'mark_withdrawals_exported',
      'withdrawal',
      batchId || 'multiple',
      `${updateResult.modifiedCount} retiros marcados como exportados`,
      { withdrawalIds, batchId },
      'medium'
    );

    res.json({
      success: true,
      message: `${updateResult.modifiedCount} retiros marcados como exportados`,
      data: {
        modifiedCount: updateResult.modifiedCount
      }
    });

  } catch (error) {
    console.error('Error marcando retiros como exportados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Marcar retiros como procesados
const markWithdrawalsAsProcessed = async (req, res) => {
  try {
    const { withdrawalIds, batchId, txHashes } = req.body;

    if (!withdrawalIds && !batchId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere withdrawalIds o batchId'
      });
    }

    let matchConditions = {};
    if (withdrawalIds) {
      matchConditions._id = { $in: withdrawalIds };
    } else {
      matchConditions.batchId = batchId;
    }

    const updateData = {
      status: 'completed',
      processedAt: new Date(),
      processedBy: req.user.id
    };

    if (txHashes && Array.isArray(txHashes)) {
      updateData.txHash = txHashes[0]; // Para compatibilidad
      updateData.txHashes = txHashes;
    }

    const updateResult = await Payment.updateMany(matchConditions, { $set: updateData });

    await AdminLoggerService.logAction(
      req.user.id,
      'mark_withdrawals_processed',
      'withdrawal',
      batchId || 'multiple',
      `${updateResult.modifiedCount} retiros marcados como procesados`,
      { withdrawalIds, batchId, txHashes },
      'high'
    );

    res.json({
      success: true,
      message: `${updateResult.modifiedCount} retiros marcados como procesados`,
      data: {
        modifiedCount: updateResult.modifiedCount
      }
    });

  } catch (error) {
    console.error('Error marcando retiros como procesados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  createWithdrawalBatch,
  getWithdrawalBatchStats,
  getWithdrawalBatches,
  getWithdrawalsForBatch,
  exportPendingWithdrawals,
  markWithdrawalsAsExported,
  markWithdrawalsAsProcessed
};