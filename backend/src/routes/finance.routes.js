const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const User = require('../models/User');
const Transaction = require('../models/Transaction.model');
const WithdrawalRequest = require('../models/WithdrawalRequest');

/**
 * @route   GET /api/finance/users/:userId/summary
 * @desc    Obtener resumen financiero del usuario
 * @access  Private
 */
router.get('/users/:userId/summary', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar que el usuario puede acceder a estos datos
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estos datos'
      });
    }

    // Obtener datos del usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Calcular retiros pendientes
    const pendingWithdrawals = await WithdrawalRequest.aggregate([
      {
        $match: {
          userId: user._id,
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

    const pendingAmount = pendingWithdrawals[0]?.total || 0;
    const totalBalance = user.balance || 0;
    
    // Calcular balance disponible (nunca negativo)
    const availableBalance = Math.max(0, totalBalance - pendingAmount);

    // Preparar resumen financiero
    const summary = {
      totalBalance: totalBalance,
      availableBalance: availableBalance,
      productionBalance: user.productionBalance || 0,
      pendingWithdrawals: pendingAmount,
      currency: 'USD'
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error('Error getting financial summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/finance/users/:userId/wallets
 * @desc    Obtener billeteras del usuario
 * @access  Private
 */
router.get('/users/:userId/wallets', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar que el usuario puede acceder a estos datos
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estos datos'
      });
    }

    // Obtener datos del usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Por ahora devolvemos las billeteras del usuario desde su perfil
    const wallets = [
      {
        id: 'main',
        type: 'main',
        currency: 'USD',
        balance: user.balance || 0,
        address: user.walletAddress || null,
        network: 'BEP20',
        isActive: true
      }
    ];

    // Si tiene billetera de producción
    if (user.productionBalance > 0) {
      wallets.push({
        id: 'production',
        type: 'production',
        currency: 'USD',
        balance: user.productionBalance || 0,
        address: null,
        network: 'internal',
        isActive: true
      });
    }

    res.json({
      success: true,
      data: wallets
    });

  } catch (error) {
    logger.error('Error getting user wallets:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/finance/users/:userId/transactions
 * @desc    Obtener historial de transacciones del usuario
 * @access  Private
 */
router.get('/users/:userId/transactions', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, type, status } = req.query;
    
    // Verificar que el usuario puede acceder a estos datos
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estos datos'
      });
    }

    // Construir filtros
    const filters = { userId };
    if (type) filters.type = type;
    if (status) filters.status = status;

    // Obtener transacciones con paginación
    const transactions = await Transaction.find(filters)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Transaction.countDocuments(filters);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error getting transaction history:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/finance/users/:userId/withdrawals
 * @desc    Obtener solicitudes de retiro del usuario
 * @access  Private
 */
router.get('/users/:userId/withdrawals', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    
    // Verificar que el usuario puede acceder a estos datos
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estos datos'
      });
    }

    // Construir filtros
    const filters = { userId };
    if (status) filters.status = status;

    // Obtener retiros con paginación
    const withdrawals = await WithdrawalRequest.find(filters)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await WithdrawalRequest.countDocuments(filters);

    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error getting withdrawal requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/finance/users/:userId/stats
 * @desc    Obtener estadísticas financieras del usuario
 * @access  Private
 */
router.get('/users/:userId/stats', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = 'month' } = req.query;
    
    // Verificar que el usuario puede acceder a estos datos
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estos datos'
      });
    }

    // Calcular fechas según el período
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Obtener estadísticas de transacciones
    const stats = await Transaction.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Calcular totales
    const earnings = stats.find(s => ['commission', 'referral', 'bonus'].includes(s._id));
    const totalEarnings = earnings?.total || 0;
    
    // Obtener ganancias totales históricas
    const totalEarningsAllTime = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: { $in: ['commission', 'referral', 'bonus'] },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        totalEarnings: totalEarningsAllTime[0]?.total || 0,
        periodEarnings: totalEarnings,
        monthlyEarnings: period === 'month' ? totalEarnings : 0,
        weeklyEarnings: period === 'week' ? totalEarnings : 0,
        yearlyEarnings: period === 'year' ? totalEarnings : 0
      }
    });

  } catch (error) {
    logger.error('Error getting financial stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   PUT /api/finance/users/:userId/withdrawals/:withdrawalId/cancel
 * @desc    Cancelar solicitud de retiro
 * @access  Private
 */
router.put('/users/:userId/withdrawals/:withdrawalId/cancel', requireAuth, async (req, res) => {
  try {
    const { userId, withdrawalId } = req.params;
    
    // Verificar que el usuario puede cancelar este retiro
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cancelar este retiro'
      });
    }

    // Buscar el retiro
    const withdrawal = await WithdrawalRequest.findById(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de retiro no encontrada'
      });
    }

    // Verificar que el retiro pertenece al usuario
    if (withdrawal.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cancelar este retiro'
      });
    }

    // Solo se pueden cancelar retiros pendientes
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden cancelar retiros pendientes'
      });
    }

    // Cancelar el retiro
    withdrawal.status = 'cancelled';
    withdrawal.cancelledAt = new Date();
    await withdrawal.save();

    // Devolver el monto al balance del usuario
    const user = await User.findById(userId);
    user.balance = (user.balance || 0) + withdrawal.amount;
    await user.save();

    res.json({
      success: true,
      message: 'Retiro cancelado exitosamente',
      data: withdrawal
    });

  } catch (error) {
    logger.error('Error cancelling withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/finance/users/:userId/withdrawal-limits
 * @desc    Obtener límites de retiro del usuario
 * @access  Private
 */
router.get('/users/:userId/withdrawal-limits', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar que el usuario puede acceder a estos datos
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estos datos'
      });
    }

    // Obtener datos del usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Calcular límites basados en el nivel del usuario
    const limits = {
      daily: {
        min: 10,
        max: user.verificationLevel === 'verified' ? 5000 : 1000
      },
      weekly: {
        min: 50,
        max: user.verificationLevel === 'verified' ? 25000 : 5000
      },
      monthly: {
        min: 100,
        max: user.verificationLevel === 'verified' ? 100000 : 20000
      },
      fees: {
        percentage: 0.02, // 2%
        minimum: 1
      }
    };

    res.json({
      success: true,
      data: limits
    });

  } catch (error) {
    logger.error('Error getting withdrawal limits:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   POST /api/finance/users/:userId/verify-pin
 * @desc    Verificar PIN de retiro
 * @access  Private
 */
router.post('/users/:userId/verify-pin', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { pin } = req.body;
    
    // Verificar que el usuario puede verificar este PIN
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para verificar este PIN'
      });
    }

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: 'PIN es requerido'
      });
    }

    // Obtener datos del usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar PIN (asumiendo que está hasheado)
    const bcrypt = require('bcrypt');
    const isValidPin = user.withdrawalPin ? await bcrypt.compare(pin, user.withdrawalPin) : false;

    if (!isValidPin) {
      return res.status(400).json({
        success: false,
        message: 'PIN incorrecto'
      });
    }

    res.json({
      success: true,
      message: 'PIN verificado correctamente'
    });

  } catch (error) {
    logger.error('Error verifying withdrawal PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   POST /api/finance/users/:userId/withdrawals
 * @desc    Crear solicitud de retiro
 * @access  Private
 */
router.post('/users/:userId/withdrawals', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, method, address, pin } = req.body;
    
    // Verificar que el usuario puede crear retiros
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear retiros'
      });
    }

    // Validaciones básicas
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Monto inválido'
      });
    }

    if (!method || !address) {
      return res.status(400).json({
        success: false,
        message: 'Método y dirección de retiro son requeridos'
      });
    }

    // Obtener datos del usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar balance suficiente
    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Balance insuficiente'
      });
    }

    // Crear solicitud de retiro
    const withdrawalRequest = new WithdrawalRequest({
      userId: user._id,
      amount,
      currency: 'USD',
      withdrawalMethod: method,
      destinationAddress: address,
      network: method === 'usdt' ? 'BEP20' : 'BANK',
      status: 'pending',
      requestDate: new Date()
    });

    await withdrawalRequest.save();

    // Descontar del balance del usuario
    user.balance = user.balance - amount;
    await user.save();

    // Crear transacción de registro
    const transaction = new Transaction({
      userId: user._id,
      type: 'withdrawal_request',
      amount: -amount,
      currency: 'USD',
      status: 'pending',
      description: `Solicitud de retiro por ${method}`,
      metadata: {
        withdrawalRequestId: withdrawalRequest._id,
        method,
        address
      }
    });

    await transaction.save();

    res.json({
      success: true,
      message: 'Solicitud de retiro creada exitosamente',
      data: withdrawalRequest
    });

  } catch (error) {
    logger.error('Error creating withdrawal request:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   POST /api/finance/send-withdrawal-code
 * @desc    Enviar código de verificación para retiros
 * @access  Private
 */
router.post('/send-withdrawal-code', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener datos del usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Generar código de verificación de 6 dígitos
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Guardar código temporalmente en el usuario (expira en 10 minutos)
    const expirationTime = new Date(Date.now() + 10 * 60 * 1000);
    user.withdrawalVerificationCode = {
      code: verificationCode,
      expiresAt: expirationTime
    };
    await user.save();

    // Enviar código por email
    const emailService = require('../utils/email');
    await emailService.sendEmail({
      to: user.email,
      subject: 'Código de verificación para retiro - GrowX5',
      template: 'withdrawal-verification',
      data: {
        firstName: user.firstName || user.username,
        verificationCode: verificationCode,
        expirationMinutes: 10
      }
    });

    res.json({
      success: true,
      message: 'Código de verificación enviado a tu correo electrónico',
      data: {
        codeSent: true,
        expiresIn: 600 // 10 minutos en segundos
      }
    });

  } catch (error) {
    logger.error('Error sending withdrawal verification code:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar código de verificación'
    });
  }
});

module.exports = router;