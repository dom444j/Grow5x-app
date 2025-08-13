const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction.model');
const Referral = require('../models/Referral.model');
const Wallet = require('../models/Wallet.model');
const { validatePayment, validateWithdrawal } = require('../utils/validation');
const { sendPaymentConfirmationEmail, sendPaymentFailedEmail } = require('../utils/email');
const { notifyTelegram } = require('../utils/telegram');
const bep20Service = require('../services/bep20.service');
const UserStatusService = require('../services/UserStatusService');
const LicenseActivationService = require('../services/LicenseActivationService');
const logger = require('../utils/logger');

// Pioneer plan configurations
const PIONEER_PLANS = {
  basic: {
    name: 'Basic Pioneer',
    price: 50, // USDT
    duration: 30, // days
    benefits: {
      earlyAccess: true,
      discountRate: 0.1, // 10% discount
      prioritySupport: false,
      exclusiveFeatures: false
    }
  },
  premium: {
    name: 'Premium Pioneer',
    price: 150, // USDT
    duration: 90, // days
    benefits: {
      earlyAccess: true,
      discountRate: 0.2, // 20% discount
      prioritySupport: true,
      exclusiveFeatures: true
    }
  },
  elite: {
    name: 'Elite Pioneer',
    price: 300, // USDT
    duration: 180, // days
    benefits: {
      earlyAccess: true,
      discountRate: 0.3, // 30% discount
      prioritySupport: true,
      exclusiveFeatures: true,
      personalManager: true
    }
  }
};

// Get pioneer plans
exports.getPioneerPlans = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        plans: PIONEER_PLANS
      }
    });
  } catch (error) {
    logger.error('Get pioneer plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Request withdrawal
exports.requestWithdrawal = async (req, res) => {
  try {
    const { error } = validateWithdrawal(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const userId = req.user.id;
    const { amount, currency, walletAddress, network, password } = req.body;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Create withdrawal record
     const withdrawal = new Transaction({
       user: userId,
       type: 'withdrawal',
       subtype: 'withdrawal_request',
       amount: amount,
       currency: currency,
       status: 'pending',
       payment: {
         address: walletAddress,
         network: network
       },
       metadata: {
         ipAddress: req.ip,
         userAgent: req.get('User-Agent')
       }
     });
    
    await withdrawal.save();

    // Process withdrawal request using UserStatusService
    const result = await UserStatusService.processWithdrawalRequest(userId, amount);

    logger.info(`Solicitud de retiro procesada para usuario ${userId}`, {
      userId: userId,
      amount,
      result
    });

    res.status(201).json({
      success: true,
      message: 'Solicitud de retiro procesada exitosamente',
      data: {
        withdrawalId: withdrawal._id,
        status: 'pending',
        amount,
        currency,
        priority: result.priority,
        estimatedProcessingTime: result.estimatedProcessingTime
      }
    });

  } catch (error) {
    logger.error('Error al procesar solicitud de retiro:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
};

// Create payment intent for pioneer plan
exports.createPioneerPayment = async (req, res) => {
  try {
    const { error } = validatePayment(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { planType, paymentMethod = 'usdt' } = req.body;
    const userId = req.user._id;

    // Validate plan type
    if (!PIONEER_PLANS[planType]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pioneer plan type'
      });
    }

    const plan = PIONEER_PLANS[planType];
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already has an active pioneer plan
    if (user.isPioneer && user.pioneerExpiresAt > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active pioneer plan'
      });
    }

    // Generate unique payment reference
    const paymentReference = `PIONEER_${planType.toUpperCase()}_${userId}_${Date.now()}`;
    
    // Obtener billetera disponible (BEP20 por defecto)
    const wallet = await Wallet.getAvailableWallet('BEP20');
    
    if (!wallet) {
      return res.status(503).json({
        success: false,
        message: 'No hay billeteras disponibles en este momento. Intente más tarde.'
      });
    }

    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      type: 'pioneer_payment',
      subtype: planType,
      amount: plan.price,
      currency: 'USDT',
      status: 'pending',
      paymentDetails: {
        method: 'usdt_bep20',
        address: wallet.address,
        network: 'BEP20', // BSC network for USDT (por defecto)
        reference: paymentReference,
        walletId: wallet._id
      },
      pioneerPlan: {
        type: planType,
        name: plan.name,
        duration: plan.duration,
        benefits: plan.benefits
      },
      externalReference: paymentReference,
      description: `Pioneer Plan Payment - ${plan.name}`,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        planDetails: plan,
        assignedWallet: wallet._id
      }
    });

    await transaction.save();

    // Log payment creation
    logger.info(`Pioneer payment created: ${paymentReference}`, {
      userId,
      planType,
      amount: plan.price,
      transactionId: transaction._id
    });

    res.status(201).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        transaction: {
          id: transaction._id,
          reference: paymentReference,
          amount: plan.price,
          currency: 'USDT',
          status: 'pending',
          expiresAt: transaction.expiresAt
        },
        payment: {
          walletAddress: wallet.address,
          network: 'BEP20',
          amount: plan.price,
          currency: 'USDT',
          reference: paymentReference,
          timeLimit: 30, // 30 minutos
          instructions: {
            en: `Send exactly ${plan.price} USDT to the wallet address above using BEP20 network (Binance Smart Chain). You have 30 minutes to complete this payment.`,
            es: `Envía exactamente ${plan.price} USDT a la dirección de billetera anterior usando la red BEP20 (Binance Smart Chain). Tienes 30 minutos para completar este pago.`
          }
        },
        plan: {
          type: planType,
          name: plan.name,
          price: plan.price,
          duration: plan.duration,
          benefits: plan.benefits
        }
      }
    });

  } catch (error) {
    logger.error('Create pioneer payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during payment creation'
    });
  }
};

// Webhook to handle package/license payment confirmations
exports.packagePaymentWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-webhook-signature'];
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid webhook signature for package payment', { signature, expectedSignature });
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const { transactionHash, amount, currency, reference, status, confirmations, packageType } = req.body;

    // Find transaction by reference
    const transaction = await Transaction.findOne({
      externalReference: reference,
      status: 'pending',
      type: 'package_purchase'
    }).populate('user');

    if (!transaction) {
      logger.warn('Package transaction not found for webhook', { reference });
      return res.status(404).json({
        success: false,
        message: 'Package transaction not found'
      });
    }

    // Verify amount and currency
    if (amount !== transaction.amount || currency !== transaction.currency) {
      logger.warn('Package payment amount/currency mismatch', {
        expected: { amount: transaction.amount, currency: transaction.currency },
        received: { amount, currency },
        reference
      });
      
      await transaction.markAsFailed('Amount or currency mismatch');
      return res.status(400).json({
        success: false,
        message: 'Payment amount or currency mismatch'
      });
    }

    // Update transaction with payment details
    transaction.paymentDetails.transactionHash = transactionHash;
    transaction.paymentDetails.confirmations = confirmations || 0;
    transaction.status = status === 'confirmed' ? 'completed' : 'processing';
    transaction.processedAt = new Date();

    if (status === 'confirmed') {
      const user = transaction.user;
      const actualPackageType = packageType || transaction.metadata?.packageType || 'starter';
      
      // Actualizar el status de la compra relacionada
      if (transaction.metadata?.purchaseId) {
        try {
          const Purchase = require('../models/Purchase.model');
          await Purchase.findByIdAndUpdate(
            transaction.metadata.purchaseId,
            { 
              status: 'completed',
              transactionId: transaction._id,
              completedAt: new Date()
            }
          );
          logger.info(`Purchase status updated to completed via webhook`, {
            purchaseId: transaction.metadata.purchaseId,
            transactionId: transaction._id
          });
        } catch (purchaseError) {
          logger.error('Error updating purchase status via webhook:', purchaseError);
        }
      }
      
      // Activar licencia inmediatamente después de confirmación de pago
      const licenseActivationService = new LicenseActivationService();
      const activationResult = await licenseActivationService.activateLicenseAfterPayment(
        user._id,
        transaction,
        actualPackageType
      );

      await transaction.markAsCompleted();

      // Send confirmation email
      if (user.email) {
        try {
          await sendPaymentConfirmationEmail(
            user.email,
            user.fullName,
            transaction,
            user.language
          );
        } catch (emailError) {
          logger.error('Failed to send package payment confirmation email:', emailError);
        }
      }

      // Notify via Telegram
      if (user.telegram) {
        try {
          await notifyTelegram(
            user.telegram,
            `🎉 ¡Licencia ${actualPackageType} activada! Tu sistema de beneficios diarios (12.5% diario) está ahora activo por 45 días.`
          );
        } catch (telegramError) {
          logger.error('Failed to send Telegram notification for package:', telegramError);
        }
      }

      logger.info(`Package payment confirmed: ${reference}`, {
        userId: user._id,
        transactionId: transaction._id,
        packageType: actualPackageType,
        amount: transaction.amount,
        licenseActivated: activationResult.licenseActivated,
        dailyBenefitsActivated: activationResult.dailyBenefitsActivated
      });
    } else {
      await transaction.save();
    }

    res.json({
      success: true,
      message: 'Package payment webhook processed successfully',
      licenseActivated: status === 'confirmed',
      dailyBenefitsActivated: status === 'confirmed'
    });

  } catch (error) {
    logger.error('Package payment webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error processing package payment webhook'
    });
  }
};

// Webhook to handle payment confirmations (Pioneer plans)
exports.paymentWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-webhook-signature'];
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid webhook signature', { signature, expectedSignature });
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const { transactionHash, amount, currency, reference, status, confirmations } = req.body;

    // Find transaction by reference
    const transaction = await Transaction.findOne({
      externalReference: reference,
      status: 'pending'
    }).populate('user');

    if (!transaction) {
      logger.warn('Transaction not found for webhook', { reference });
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Verify amount and currency
    if (amount !== transaction.amount || currency !== transaction.currency) {
      logger.warn('Payment amount/currency mismatch', {
        expected: { amount: transaction.amount, currency: transaction.currency },
        received: { amount, currency },
        reference
      });
      
      await transaction.markAsFailed('Amount or currency mismatch');
      return res.status(400).json({
        success: false,
        message: 'Payment amount or currency mismatch'
      });
    }

    // Update transaction with payment details
    transaction.paymentDetails.transactionHash = transactionHash;
    transaction.paymentDetails.confirmations = confirmations || 0;
    transaction.status = status === 'confirmed' ? 'completed' : 'processing';
    transaction.processedAt = new Date();

    if (status === 'confirmed') {
      // Activate pioneer plan
      const user = transaction.user;
      const plan = transaction.pioneerPlan;
      
      // Pioneer status disabled - mantener código sin activar
      // user.isPioneer = true;
      // user.pioneerStatus = 'active';
      // user.pioneerExpiresAt = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
      
      await user.save();
      await transaction.markAsCompleted();

      // Process referral commission if applicable
      if (user.referredBy) {
        await processReferralCommission(user.referredBy, transaction);
      }

      // Send confirmation email
      if (user.email) {
        try {
          await sendPaymentConfirmationEmail(
            user.email,
            user.fullName,
            transaction,
            user.language
          );
        } catch (emailError) {
          logger.error('Failed to send payment confirmation email:', emailError);
        }
      }

      // Notify via Telegram
      if (user.telegram) {
        try {
          await notifyTelegram(
            user.telegram,
            `🎉 Pioneer plan activated! Your ${plan.name} is now active until ${user.pioneerExpiresAt.toDateString()}.`
          );
        } catch (telegramError) {
          logger.error('Failed to send Telegram notification:', telegramError);
        }
      }

      logger.info(`Pioneer payment confirmed: ${reference}`, {
        userId: user._id,
        transactionId: transaction._id,
        planType: plan.type,
        amount: transaction.amount
      });
    } else {
      await transaction.save();
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    logger.error('Payment webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error processing webhook'
    });
  }
};

// Get payment status
exports.getPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user._id;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: {
        transaction: {
          id: transaction._id,
          status: transaction.status,
          amount: transaction.amount,
          currency: transaction.currency,
          reference: transaction.externalReference,
          transactionHash: transaction.paymentDetails.transactionHash,
          confirmations: transaction.paymentDetails.confirmations,
          createdAt: transaction.createdAt,
          processedAt: transaction.processedAt,
          expiresAt: transaction.expiresAt
        }
      }
    });

  } catch (error) {
    logger.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user's payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    const { page = 1, limit = 10, type } = req.query;

    const query = { user: userId };
    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-metadata -adminNotes');

    const total = await Transaction.countDocuments(query);

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
    logger.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Process referral commission - ACTUALIZADO para nuevo sistema
async function processReferralCommission(referrerId, transaction) {
  try {
    const referral = await Referral.findOne({
      referrer: referrerId,
      referred: transaction.user,
      status: { $in: ['pending', 'active'] }
    });

    if (!referral) return;

    // NUEVO SISTEMA: Solo procesar comisión inicial por activación de licencia
    // Las comisiones diarias del 10% se procesan en BenefitsProcessor
    
    // Comisión única por activación de licencia (5% del monto de la licencia)
    const activationCommissionRate = 0.05;
    const activationCommission = transaction.amount * activationCommissionRate;

    // Create activation commission transaction
    const commissionTransaction = new Transaction({
      user: referrerId,
      type: 'commission',
      subtype: 'referral_commission',
      amount: activationCommission,
      currency: transaction.currency,
      status: 'completed',
      description: `Comisión por activación de licencia - ${activationCommissionRate * 100}%`,
      externalReference: `ACTIVATION_COMMISSION_${transaction._id}`,
      metadata: {
        originalTransaction: transaction._id,
        referredUser: transaction.user,
        commissionRate: activationCommissionRate,
        commissionType: 'license_activation'
      }
    });

    await commissionTransaction.save();

    // Update referral
    await referral.addCommission(
      activationCommission,
      commissionTransaction._id,
      'license_activation'
    );

    // Update referrer's capital
    await User.findByIdAndUpdate(referrerId, {
      $inc: { 'capital.available': activationCommission }
    });

    logger.info(`Comisión de activación de licencia procesada`, {
      referrerId,
      referredUserId: transaction.user,
      activationCommission,
      originalTransactionId: transaction._id
    });

    // Nota: Las comisiones diarias del 10% sobre cashback se procesan automáticamente
    // en BenefitsProcessor durante los primeros 8 días de cada semana

  } catch (error) {
    logger.error('Process referral commission error:', error);
  }
}

// Verificar transacción BEP20 con hash
exports.verifyBEP20Transaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({
        success: false,
        message: 'Hash de transacción requerido'
      });
    }

    const transaction = await Transaction.findById(transactionId).populate('user');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    if (transaction.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para verificar esta transacción'
      });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'La transacción no está pendiente'
      });
    }

    if (transaction.paymentDetails.network !== 'BEP20') {
      return res.status(400).json({
        success: false,
        message: 'Esta transacción no es BEP20'
      });
    }

    // Verificar la transacción usando el servicio BEP20
    const verification = await bep20Service.verifyTransaction(
      txHash,
      transaction.paymentDetails.address,
      transaction.amount
    );

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.error,
        details: verification.details
      });
    }
    
    // Verificar si se debe inyectar capital real (después de 1.4M USDT)
    const totalCapital = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          type: { $in: ['deposit', 'pioneer_payment'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const currentCapital = totalCapital.length > 0 ? totalCapital[0].total : 0;
    const useRealCapital = currentCapital >= 1400000; // 1.4M USDT

    // Actualizar la transacción con el hash
    transaction.paymentDetails.txHash = txHash;
    transaction.paymentDetails.confirmations = verification.confirmations;
    
    if (verification.status === 'confirmed') {
      // Marcar como completada
      await transaction.markAsCompleted({
        txHash: txHash,
        confirmations: verification.confirmations,
        verifiedAt: new Date(),
        blockNumber: verification.transaction.blockNumber
      });

      // Activar plan pioneer - DISABLED
      const user = transaction.user;
      const plan = transaction.pioneerPlan;
      
      // Pioneer status disabled - mantener código sin activar
      // user.isPioneer = true;
      // user.pioneerStatus = 'active';
      // user.pioneerExpiresAt = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
      
      // Si se ha alcanzado el umbral de 1.4M USDT, usar capital real
      if (useRealCapital) {
        // Marcar que el usuario está usando capital real
        user.usingRealCapital = true;
        logger.info(`Usuario ${user._id} activado con capital real (después de umbral 1.4M USDT)`);
      } else {
        user.usingRealCapital = false;
        logger.info(`Usuario ${user._id} activado con capital simulado (antes de umbral 1.4M USDT)`);
      }
      
      await user.save();

      // Procesar comisión de referido si aplica
      if (user.referredBy) {
        await processReferralCommission(user.referredBy, transaction);
      }

      // Liberar billetera
      if (transaction.paymentDetails.walletId) {
        const wallet = await Wallet.findById(transaction.paymentDetails.walletId);
        if (wallet) {
          await wallet.updateBalance(transaction.amount);
          await wallet.release();
        }
      }

      logger.info(`Transacción BEP20 verificada y completada: ${transaction.externalReference}`, {
        transactionId: transaction._id,
        userId: user._id,
        txHash: txHash
      });

      res.json({
        success: true,
        message: 'Pago verificado y completado exitosamente',
        data: {
          status: 'completed',
          confirmations: verification.confirmations,
          pioneerActivated: true
        }
      });
    } else {
      // Pendiente de confirmaciones
      await transaction.save();
      
      res.json({
        success: true,
        message: 'Transacción encontrada, esperando confirmaciones',
        data: {
          status: 'pending',
          confirmations: verification.confirmations,
          requiredConfirmations: verification.requiredConfirmations
        }
      });
    }

  } catch (error) {
    logger.error('Error verificando transacción BEP20:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener historial de compras del usuario
exports.getPurchaseHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status, type, search } = req.query;

    // Construir filtros de consulta
    const filters = { user: userId };
    if (status && status !== 'all') filters.status = status;
    if (type && type !== 'all') filters.type = type;
    
    // Agregar búsqueda por descripción o ID de transacción
    if (search) {
      filters.$or = [
        { description: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } }
      ];
    }

    // Obtener transacciones con paginación
    const skip = (page - 1) * limit;
    const transactions = await Transaction.find(filters)
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Contar total de transacciones
    const totalTransactions = await Transaction.countDocuments(filters);

    // Calcular estadísticas usando agregación para mejor rendimiento
    const statsAggregation = await Transaction.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Formatear estadísticas
    const stats = {
      total: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      totalSpent: 0,
      completedAmount: 0
    };

    statsAggregation.forEach(stat => {
      stats.total += stat.count;
      stats[stat._id] = stat.count;
      if (['deposit', 'pioneer_payment', 'package_purchase'].includes(stat._id)) {
        stats.totalSpent += stat.totalAmount;
      }
      if (stat._id === 'completed') {
        stats.completedAmount = stat.totalAmount;
      }
    });

    // Formatear transacciones para el frontend
    const formattedTransactions = transactions.map(t => ({
      _id: t._id,
      transactionId: t.transactionId || t._id.toString(),
      amount: t.amount || 0,
      currency: t.currency || 'USDT',
      status: t.status || 'pending',
      type: t.type || 'unknown',
      description: t.description || 'Sin descripción',
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      hash: t.payment?.txHash || t.payment?.hash,
      walletAddress: t.payment?.address,
      paymentMethod: t.payment?.method || 'crypto',
      paymentDetails: {
        network: t.payment?.network || 'BEP20',
        txHash: t.payment?.txHash,
        confirmations: t.payment?.confirmations || 0
      }
    }));

    res.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalTransactions,
          pages: Math.ceil(totalTransactions / limit)
        },
        stats
      }
    });

  } catch (error) {
    logger.error('Error obteniendo historial de compras:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Manual payment verification (admin only)
exports.verifyPaymentManually = async (req, res) => {
  try {
    const { reference } = req.params; // Cambiar de transactionId a reference
    const { transactionHash, amount, currency, network, confirmations, isTestMode, notes } = req.body;

    logger.info(`Verificando pago manualmente - Reference: ${reference}`, {
      reference,
      isTestMode,
      body: req.body
    });

    // Buscar transacción por ID o por externalReference
    let transaction;
    
    // Intentar buscar por ID primero (si es un ObjectId válido)
    if (reference.match(/^[0-9a-fA-F]{24}$/)) {
      logger.info(`Buscando por ObjectId: ${reference}`);
      transaction = await Transaction.findById(reference).populate('user');
    }
    
    // Si no se encuentra por ID, buscar por externalReference
    if (!transaction) {
      logger.info(`Buscando por externalReference: ${reference}`);
      transaction = await Transaction.findOne({ externalReference: reference }).populate('user');
      
      if (!transaction) {
        // Buscar todas las transacciones para debugging
        const allTransactions = await Transaction.find({}).limit(5).select('externalReference _id status');
        logger.info(`Transacciones encontradas en BD:`, allTransactions);
      }
    }
    
    if (!transaction) {
      logger.error(`Transacción no encontrada - Reference: ${reference}`);
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    logger.info(`Transacción encontrada:`, {
      id: transaction._id,
      externalReference: transaction.externalReference,
      status: transaction.status
    });

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Transaction is not pending'
      });
    }

    // Update transaction
    if (transactionHash) {
      transaction.paymentDetails = transaction.paymentDetails || {};
      transaction.paymentDetails.transactionHash = transactionHash;
    }
    
    if (amount) {
      transaction.amount = amount;
    }
    
    if (currency) {
      transaction.currency = currency;
    }
    
    if (network) {
      transaction.paymentDetails = transaction.paymentDetails || {};
      transaction.paymentDetails.network = network;
    }
    
    if (confirmations) {
      transaction.paymentDetails = transaction.paymentDetails || {};
      transaction.paymentDetails.confirmations = confirmations;
    }
    
    transaction.status = 'completed';
    transaction.processedAt = new Date();
    transaction.adminNotes = notes || (isTestMode ? 'Test mode verification' : '');
    transaction.processedBy = req.user._id;

    // Activate pioneer plan - DISABLED
    const user = transaction.user;
    const plan = transaction.pioneerPlan;
    
    // Pioneer status disabled - mantener código sin activar
    // user.isPioneer = true;
    // user.pioneerStatus = 'active';
    // user.pioneerExpiresAt = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
    
    // Verificar si se debe inyectar capital real (después de 1.4M USDT)
    const totalCapital = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          type: { $in: ['deposit', 'pioneer_payment'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const currentCapital = totalCapital.length > 0 ? totalCapital[0].total : 0;
    const useRealCapital = currentCapital >= 1400000; // 1.4M USDT
    
    // Si se ha alcanzado el umbral de 1.4M USDT, usar capital real
    if (useRealCapital) {
      // Marcar que el usuario está usando capital real
      user.usingRealCapital = true;
      logger.info(`Usuario ${user._id} activado manualmente con capital real (después de umbral 1.4M USDT)`);
    } else {
      user.usingRealCapital = false;
      logger.info(`Usuario ${user._id} activado manualmente con capital simulado (antes de umbral 1.4M USDT)`);
    }
    
    await user.save();
    await transaction.markAsCompleted();

    // CRÍTICO: Actualizar Purchase status y activar licencia después de verificación manual de pago
    if (transaction.type === 'package_purchase') {
      const packageType = transaction.metadata?.packageType || 'basic';
      
      // Actualizar el status de la compra relacionada
      if (transaction.metadata?.purchaseId) {
        try {
          const Purchase = require('../models/Purchase.model');
          await Purchase.findByIdAndUpdate(
            transaction.metadata.purchaseId,
            { 
              status: 'completed',
              transactionId: transaction._id,
              completedAt: new Date()
            }
          );
          logger.info(`Purchase status updated to completed`, {
            purchaseId: transaction.metadata.purchaseId,
            transactionId: transaction._id
          });
        } catch (purchaseError) {
          logger.error('Error updating purchase status:', purchaseError);
        }
      }
      
      try {
        const activationResult = await LicenseActivationService.activateLicenseAfterPayment(
          user._id,
          transaction,
          packageType
        );
        
        logger.info(`License activated after manual payment verification`, {
          userId: user._id,
          packageType,
          licenseActivated: activationResult.licenseActivated,
          dailyBenefitsActivated: activationResult.dailyBenefitsActivated
        });
      } catch (activationError) {
        logger.error('Error activating license after manual verification:', activationError);
      }
    }

    // Process referral commission if applicable
    if (user.referredBy) {
      await processReferralCommission(user.referredBy, transaction);
    }

    logger.info(`Payment manually verified: ${transaction.externalReference}`, {
      transactionId: transaction._id,
      adminId: req.user._id,
      userId: user._id
    });

    res.json({
      success: true,
      message: 'Payment verified successfully'
    });

  } catch (error) {
    logger.error('Manual payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get current fee structure
exports.getFeeStructure = async (req, res) => {
  try {
    // Estructura de tarifas para diferentes tipos de transacciones
    const feeStructure = {
      withdrawal: {
        crypto: {
          percentage: 1.5, // 1.5% fee
          minFee: 1, // Minimum fee in USDT
          maxFee: 50 // Maximum fee in USDT
        },
        bank_transfer: {
          percentage: 2.5,
          minFee: 5,
          maxFee: 100
        }
      },
      deposit: {
        crypto: {
          percentage: 0.5,
          minFee: 0.5,
          maxFee: 25
        },
        bank_transfer: {
          percentage: 1.0,
          minFee: 2,
          maxFee: 50
        }
      },
      conversion: {
        percentage: 0.75,
        minFee: 1,
        maxFee: 30
      },
      pioneer_discount: {
        basic: 10, // 10% discount on fees for basic pioneers
        premium: 20, // 20% discount for premium
        elite: 30 // 30% discount for elite
      }
    };

    res.json({
      success: true,
      data: {
        feeStructure
      }
    });
  } catch (error) {
    logger.error('Get fee structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Estimate fees for a transaction
exports.estimateFees = async (req, res) => {
  try {
    const { amount, type, method, currency } = req.body;
    const userId = req.user._id;

    if (!amount || !type || !method) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    // Get fee structure
    const feeStructure = {
      withdrawal: {
        crypto: {
          percentage: 1.5,
          minFee: 1,
          maxFee: 50
        },
        bank_transfer: {
          percentage: 2.5,
          minFee: 5,
          maxFee: 100
        }
      },
      deposit: {
        crypto: {
          percentage: 0.5,
          minFee: 0.5,
          maxFee: 25
        },
        bank_transfer: {
          percentage: 1.0,
          minFee: 2,
          maxFee: 50
        }
      },
      conversion: {
        percentage: 0.75,
        minFee: 1,
        maxFee: 30
      }
    };

    // Get user to check pioneer status
    const user = await User.findById(userId);
    let pioneerDiscount = 0;

    if (user && user.isPioneer && user.pioneerExpiresAt > new Date()) {
      // Apply pioneer discount
      const pioneerDiscounts = {
        basic: 0.1, // 10%
        premium: 0.2, // 20%
        elite: 0.3 // 30%
      };
      pioneerDiscount = pioneerDiscounts[user.pioneerPlan] || 0;
    }

    // Calculate fee
    let fee = 0;
    if (feeStructure[type] && feeStructure[type][method]) {
      const feeConfig = feeStructure[type][method];
      fee = (amount * feeConfig.percentage) / 100;
      
      // Apply min/max constraints
      if (fee < feeConfig.minFee) fee = feeConfig.minFee;
      if (fee > feeConfig.maxFee) fee = feeConfig.maxFee;
      
      // Apply pioneer discount if applicable
      if (pioneerDiscount > 0) {
        fee = fee * (1 - pioneerDiscount);
      }
    } else if (type === 'conversion' && feeStructure.conversion) {
      const feeConfig = feeStructure.conversion;
      fee = (amount * feeConfig.percentage) / 100;
      
      // Apply min/max constraints
      if (fee < feeConfig.minFee) fee = feeConfig.minFee;
      if (fee > feeConfig.maxFee) fee = feeConfig.maxFee;
      
      // Apply pioneer discount if applicable
      if (pioneerDiscount > 0) {
        fee = fee * (1 - pioneerDiscount);
      }
    }

    res.json({
      success: true,
      data: {
        amount,
        fee: parseFloat(fee.toFixed(2)),
        currency: currency || 'USDT',
        netAmount: parseFloat((amount - fee).toFixed(2)),
        pioneerDiscount: pioneerDiscount > 0 ? `${pioneerDiscount * 100}%` : null
      }
    });

  } catch (error) {
    logger.error('Estimate fees error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get supported currencies
exports.getSupportedCurrencies = async (req, res) => {
  try {
    const supportedCurrencies = {
      crypto: [
        {
          code: 'USDT',
          name: 'Tether USD',
          networks: ['TRC20', 'ERC20', 'BEP20'],
          icon: '/images/currencies/usdt.png',
          minAmount: 10,
          maxAmount: 100000,
          decimals: 2
        },
        {
          code: 'BTC',
          name: 'Bitcoin',
          networks: ['BTC'],
          icon: '/images/currencies/btc.png',
          minAmount: 0.001,
          maxAmount: 5,
          decimals: 8
        },
        {
          code: 'ETH',
          name: 'Ethereum',
          networks: ['ERC20'],
          icon: '/images/currencies/eth.png',
          minAmount: 0.01,
          maxAmount: 50,
          decimals: 6
        }
      ],
      fiat: [
        {
          code: 'USD',
          name: 'US Dollar',
          symbol: '$',
          icon: '/images/currencies/usd.png',
          minAmount: 10,
          maxAmount: 100000,
          decimals: 2
        },
        {
          code: 'EUR',
          name: 'Euro',
          symbol: '€',
          icon: '/images/currencies/eur.png',
          minAmount: 10,
          maxAmount: 100000,
          decimals: 2
        }
      ]
    };

    res.json({
      success: true,
      data: {
        currencies: supportedCurrencies
      }
    });
  } catch (error) {
    logger.error('Get supported currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get current exchange rates
exports.getExchangeRates = async (req, res) => {
  try {
    // En un entorno de producción, estos valores se obtendrían de una API externa
    // como CoinGecko, Binance, etc.
    const exchangeRates = {
      base: 'USDT',
      timestamp: new Date(),
      rates: {
        USDT: 1,
        BTC: 0.000038,  // 1 USDT = 0.000038 BTC
        ETH: 0.00052,   // 1 USDT = 0.00052 ETH
        USD: 1.0,       // 1 USDT ≈ 1 USD
        EUR: 0.92       // 1 USDT ≈ 0.92 EUR
      }
    };

    res.json({
      success: true,
      data: {
        exchangeRates
      }
    });
  } catch (error) {
    logger.error('Get exchange rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Convert between currencies
exports.convertCurrency = async (req, res) => {
  try {
    const { amount, from, to } = req.body;
    const userId = req.user._id;

    if (!amount || !from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    // Get current exchange rates
    const exchangeRates = {
      base: 'USDT',
      rates: {
        USDT: 1,
        BTC: 0.000038,
        ETH: 0.00052,
        USD: 1.0,
        EUR: 0.92
      }
    };

    // Check if currencies are supported
    if (!exchangeRates.rates[from] || !exchangeRates.rates[to]) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported currency'
      });
    }

    // Calculate conversion
    const fromRate = exchangeRates.rates[from];
    const toRate = exchangeRates.rates[to];
    const convertedAmount = (amount / fromRate) * toRate;

    // Calculate fee (0.75% for conversions)
    const feePercentage = 0.0075;
    let fee = convertedAmount * feePercentage;

    // Check if user is pioneer for discount
    const user = await User.findById(userId);
    let pioneerDiscount = 0;

    if (user && user.isPioneer && user.pioneerExpiresAt > new Date()) {
      // Apply pioneer discount
      const pioneerDiscounts = {
        basic: 0.1, // 10%
        premium: 0.2, // 20%
        elite: 0.3 // 30%
      };
      pioneerDiscount = pioneerDiscounts[user.pioneerPlan] || 0;
      fee = fee * (1 - pioneerDiscount);
    }

    // Final amount after fee
    const finalAmount = convertedAmount - fee;

    res.json({
      success: true,
      data: {
        from: {
          currency: from,
          amount: parseFloat(amount)
        },
        to: {
          currency: to,
          amount: parseFloat(finalAmount.toFixed(8)),
          amountBeforeFee: parseFloat(convertedAmount.toFixed(8))
        },
        fee: parseFloat(fee.toFixed(8)),
        rate: parseFloat((toRate / fromRate).toFixed(8)),
        timestamp: new Date()
      }
    });

  } catch (error) {
    logger.error('Currency conversion error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Validate wallet address
exports.validateWalletAddress = async (req, res) => {
  try {
    const { address, network } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Dirección de billetera requerida'
      });
    }
    
    // Importar la función de validación de helpers
    const { isValidWalletAddress } = require('../utils/helpers');
    
    // Validar la dirección según la red
    const isValid = isValidWalletAddress(address, network || 'BEP20');
    
    // Responder con el resultado de la validación
    res.json({
      success: true,
      data: {
        address,
        network: network || 'BEP20',
        isValid
      }
    });
    
  } catch (error) {
    logger.error('Error validando dirección de billetera:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Create pioneer payment intent
exports.createPioneerPaymentIntent = async (req, res) => {
  try {
    const { planType, paymentMethod = 'usdt' } = req.body;
    const userId = req.user._id;

    if (!PIONEER_PLANS[planType]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pioneer plan type'
      });
    }

    const plan = PIONEER_PLANS[planType];
    const paymentReference = `PIONEER_${planType.toUpperCase()}_${userId}_${Date.now()}`;
    
    const wallet = await Wallet.getAvailableWallet('BEP20');
    
    if (!wallet) {
      return res.status(503).json({
        success: false,
        message: 'Payment service temporarily unavailable'
      });
    }

    const transaction = new Transaction({
      user: userId,
      type: 'pioneer_payment',
      amount: plan.price,
      currency: 'USDT',
      status: 'pending',
      externalReference: paymentReference,
      pioneerPlan: plan,
      paymentDetails: {
        method: paymentMethod,
        walletAddress: wallet.address,
        network: wallet.network
      }
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      data: {
        paymentReference,
        amount: plan.price,
        currency: 'USDT',
        walletAddress: wallet.address,
        network: wallet.network,
        plan: plan
      }
    });
  } catch (error) {
    logger.error('Create pioneer payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get withdrawal history
exports.getWithdrawalHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    const query = {
      user: userId,
      type: 'withdrawal'
    };

    if (status) {
      query.status = status;
    }

    const withdrawals = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'username email');

    const total = await Transaction.countDocuments(query);

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
    logger.error('Get withdrawal history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Approve withdrawal (admin only)
exports.approveWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { transactionHash, notes } = req.body;

    const withdrawal = await Transaction.findById(withdrawalId).populate('user');
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal is not pending'
      });
    }

    withdrawal.status = 'completed';
    withdrawal.paymentDetails.transactionHash = transactionHash;
    withdrawal.adminNotes = notes;
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();

    await withdrawal.save();

    logger.info(`Withdrawal approved: ${withdrawalId}`, {
      adminId: req.user._id,
      userId: withdrawal.user._id,
      amount: withdrawal.amount
    });

    res.json({
      success: true,
      message: 'Withdrawal approved successfully'
    });
  } catch (error) {
    logger.error('Approve withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Reject withdrawal (admin only)
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { reason } = req.body;

    const withdrawal = await Transaction.findById(withdrawalId).populate('user');
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal is not pending'
      });
    }

    withdrawal.status = 'rejected';
    withdrawal.adminNotes = reason;
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();

    await withdrawal.save();

    logger.info(`Withdrawal rejected: ${withdrawalId}`, {
      adminId: req.user._id,
      userId: withdrawal.user._id,
      reason
    });

    res.json({
      success: true,
      message: 'Withdrawal rejected successfully'
    });
  } catch (error) {
    logger.error('Reject withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user balance
exports.getUserBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        balance: user.balance || 0,
        currency: 'USDT',
        lastUpdated: user.updatedAt
      }
    });
  } catch (error) {
    logger.error('Get user balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user transactions
exports.getUserTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, type, status } = req.query;

    const query = { user: userId };
    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

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
    logger.error('Get user transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get transaction details
exports.getTransactionDetails = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user._id;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: userId
    }).populate('user', 'username email');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    logger.error('Get transaction details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Process refund (admin only)
exports.processRefund = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { reason, amount } = req.body;

    const transaction = await Transaction.findById(transactionId).populate('user');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only refund completed transactions'
      });
    }

    const refundAmount = amount || transaction.amount;

    // Create refund transaction
    const refund = new Transaction({
      user: transaction.user._id,
      type: 'refund',
      amount: refundAmount,
      currency: transaction.currency,
      status: 'completed',
      relatedTransaction: transaction._id,
      adminNotes: reason,
      processedBy: req.user._id,
      processedAt: new Date()
    });

    await refund.save();

    // Update original transaction
    transaction.status = 'refunded';
    transaction.refundAmount = refundAmount;
    transaction.refundReason = reason;
    await transaction.save();

    logger.info(`Refund processed: ${transactionId}`, {
      adminId: req.user._id,
      userId: transaction.user._id,
      refundAmount
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: { refund }
    });
  } catch (error) {
    logger.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get payment stats (admin only)
exports.getPaymentStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    let startDate;

    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const stats = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed'
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
    ]);

    res.json({
      success: true,
      data: {
        period,
        stats
      }
    });
  } catch (error) {
    logger.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get pending payments (admin only)
exports.getPendingPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;

    const query = { status: 'pending' };
    if (type) query.type = type;

    const payments = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'username email');

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get pending payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Cancel payment
exports.cancelPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.user._id;

    const transaction = await Transaction.findOne({
      externalReference: reference,
      user: userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only cancel pending payments'
      });
    }

    transaction.status = 'cancelled';
    transaction.processedAt = new Date();
    await transaction.save();

    res.json({
      success: true,
      message: 'Payment cancelled successfully'
    });
  } catch (error) {
    logger.error('Cancel payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get wallet address
exports.getWalletAddress = async (req, res) => {
  try {
    // El userId es opcional para este endpoint
    const userId = req.user ? req.user._id : null;
    const { network = 'BEP20' } = req.query;

    const wallet = await Wallet.getAvailableWallet(network);
    
    if (!wallet) {
      return res.status(503).json({
        success: false,
        message: 'Wallet service temporarily unavailable'
      });
    }

    res.json({
      success: true,
      data: {
        address: wallet.address,
        network: wallet.network,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${wallet.address}`
      }
    });
  } catch (error) {
    logger.error('Get wallet address error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};



// Generate wallet address
exports.generateWalletAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { network = 'BEP20' } = req.body;

    // This would typically generate a new address
    // For now, return the existing wallet
    const wallet = await Wallet.getAvailableWallet(network);
    
    if (!wallet) {
      return res.status(503).json({
        success: false,
        message: 'Wallet service temporarily unavailable'
      });
    }

    res.json({
      success: true,
      data: {
        address: wallet.address,
        network: wallet.network,
        generated: true
      }
    });
  } catch (error) {
    logger.error('Generate wallet address error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get network status
exports.getNetworkStatus = async (req, res) => {
  try {
    // Mock network status - in production this would check actual blockchain networks
    const networkStatus = {
      BEP20: {
        name: 'Binance Smart Chain',
        status: 'online',
        blockHeight: 12345678,
        avgConfirmationTime: '3 seconds',
        networkFee: '0.0005 BNB'
      },
      ERC20: {
        name: 'Ethereum',
        status: 'online',
        blockHeight: 8765432,
        avgConfirmationTime: '15 seconds',
        networkFee: '0.002 ETH'
      }
    };

    res.json({
      success: true,
      data: { networkStatus }
    });
  } catch (error) {
    logger.error('Get network status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get transaction limits
exports.getTransactionLimits = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Base limits
    let limits = {
      daily: {
        withdrawal: 1000,
        deposit: 10000
      },
      monthly: {
        withdrawal: 30000,
        deposit: 300000
      },
      single: {
        withdrawal: 5000,
        deposit: 50000
      }
    };

    // Increase limits for pioneers
    if (user.isPioneer && user.pioneerExpiresAt > new Date()) {
      const multiplier = user.pioneerPlan === 'elite' ? 3 : user.pioneerPlan === 'premium' ? 2 : 1.5;
      
      Object.keys(limits).forEach(period => {
        Object.keys(limits[period]).forEach(type => {
          limits[period][type] *= multiplier;
        });
      });
    }

    res.json({
      success: true,
      data: { limits }
    });
  } catch (error) {
    logger.error('Get transaction limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create dispute
exports.createDispute = async (req, res) => {
  try {
    const { transactionId, reason, description } = req.body;
    const userId = req.user._id;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Create dispute record (you might want a separate Dispute model)
    const dispute = {
      transactionId,
      userId,
      reason,
      description,
      status: 'open',
      createdAt: new Date()
    };

    // For now, add dispute info to transaction
    transaction.dispute = dispute;
    await transaction.save();

    logger.info(`Dispute created for transaction: ${transactionId}`, {
      userId,
      reason
    });

    res.status(201).json({
      success: true,
      message: 'Dispute created successfully',
      data: { dispute }
    });
  } catch (error) {
    logger.error('Create dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get dispute details
exports.getDisputeDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const transaction = await Transaction.findOne({
      _id: id,
      user: userId,
      dispute: { $exists: true }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    res.json({
      success: true,
      data: {
        dispute: transaction.dispute,
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          currency: transaction.currency,
          type: transaction.type,
          status: transaction.status
        }
      }
    });
  } catch (error) {
    logger.error('Get dispute details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Resolve dispute (admin only)
exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, notes } = req.body;

    const transaction = await Transaction.findOne({
      _id: id,
      dispute: { $exists: true }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    transaction.dispute.status = 'resolved';
    transaction.dispute.resolution = resolution;
    transaction.dispute.adminNotes = notes;
    transaction.dispute.resolvedBy = req.user._id;
    transaction.dispute.resolvedAt = new Date();

    await transaction.save();

    logger.info(`Dispute resolved: ${id}`, {
      adminId: req.user._id,
      resolution
    });

    res.json({
      success: true,
      message: 'Dispute resolved successfully'
    });
  } catch (error) {
    logger.error('Resolve dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get daily reports (admin only)
exports.getDailyReports = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const report = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            status: '$status'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        report
      }
    });
  } catch (error) {
    logger.error('Get daily reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get monthly reports (admin only)
exports.getMonthlyReports = async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const report = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$createdAt' },
            type: '$type',
            status: '$status'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.day': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        month: targetMonth + 1,
        year: targetYear,
        report
      }
    });
  } catch (error) {
    logger.error('Get monthly reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Process bulk payments (admin only)
exports.processBulkPayments = async (req, res) => {
  try {
    const { paymentIds, action, notes } = req.body;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment IDs array is required'
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either approve or reject'
      });
    }

    const results = [];

    for (const paymentId of paymentIds) {
      try {
        const transaction = await Transaction.findById(paymentId);
        
        if (!transaction) {
          results.push({
            paymentId,
            success: false,
            message: 'Transaction not found'
          });
          continue;
        }

        if (transaction.status !== 'pending') {
          results.push({
            paymentId,
            success: false,
            message: 'Transaction is not pending'
          });
          continue;
        }

        transaction.status = action === 'approve' ? 'completed' : 'rejected';
        transaction.adminNotes = notes;
        transaction.processedBy = req.user._id;
        transaction.processedAt = new Date();

        await transaction.save();

        results.push({
          paymentId,
          success: true,
          message: `Transaction ${action}d successfully`
        });

      } catch (error) {
        results.push({
          paymentId,
          success: false,
          message: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logger.info(`Bulk payment processing completed`, {
      adminId: req.user._id,
      action,
      successCount,
      failureCount
    });

    res.json({
      success: true,
      message: `Bulk processing completed: ${successCount} successful, ${failureCount} failed`,
      data: { results }
    });
  } catch (error) {
    logger.error('Process bulk payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify BSC transaction
exports.verifyBSCTransaction = async (req, res) => {
  try {
    const { transactionHash, walletAddress, expectedAmount, packageId } = req.body;
    const userId = req.user.id;

    if (!transactionHash || !walletAddress || !expectedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Transaction hash, wallet address, and expected amount are required'
      });
    }

    // Verificar que la API key de BSCScan esté configurada
    if (!process.env.BSCSCAN_API_KEY || process.env.BSCSCAN_API_KEY === 'YourBSCScanAPIKeyHere') {
      return res.status(500).json({
        success: false,
        message: 'BSC verification service not configured. Please contact support.'
      });
    }

    // Usar el servicio BEP20 para verificar transacciones USDT
    const BEP20Service = require('../services/bep20.service');
    const bep20Service = new BEP20Service();

    try {
      // Verificar transacción USDT BEP20 usando el servicio
      const verificationResult = await bep20Service.verifyTransaction(
        transactionHash,
        walletAddress,
        parseFloat(expectedAmount)
      );

      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          message: verificationResult.error || 'Transaction verification failed',
          status: verificationResult.status
        });
      }

      // Verificar que la transacción no haya sido procesada antes
      const existingTransaction = await Transaction.findOne({
        'payment.transactionHash': transactionHash
      });

      if (existingTransaction) {
        return res.status(400).json({
          success: false,
          message: 'Transaction has already been processed'
        });
      }

      // Crear registro de transacción
      const newTransaction = new Transaction({
        user: userId,
        type: 'payment',
        subtype: 'pioneer_plan',
        amount: parseFloat(expectedAmount),
        currency: 'USDT',
        status: 'completed',
        payment: {
          method: 'bsc_bep20',
          transactionHash: transactionHash,
          address: walletAddress,
          network: 'BSC',
          confirmations: verificationResult.confirmations || 0,
          contractAddress: verificationResult.contractAddress
        },
        metadata: {
          packageId: packageId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          verifiedAt: new Date(),
          verificationData: verificationResult
        }
      });

      await newTransaction.save();

      // Activar licencia y programar beneficio personal usando el nuevo servicio
      const packageType = packageId || 'standard'; // Usar packageId o default
      const activationResult = await LicenseActivationService.activateLicenseAfterPayment(
        userId, 
        newTransaction, 
        packageType
      );

      logger.info(`BSC BEP20 transaction verified successfully`, {
        userId,
        transactionHash,
        amount: parseFloat(expectedAmount),
        confirmations: verificationResult.confirmations || 0
      });

      res.json({
        success: true,
        status: 'confirmed',
        message: 'USDT BEP20 transaction verified, license activated and personal benefit scheduled successfully',
        data: {
          transactionId: newTransaction._id,
          confirmations: verificationResult.confirmations || 0,
          blockNumber: verificationResult.blockNumber,
          licenseActivated: activationResult.licenseActivated,
          personalBenefitScheduled: activationResult.personalBenefitScheduled,
          licenseData: activationResult.licenseData,
          transactionDetails: verificationResult
        }
      });

    } catch (bep20Error) {
      logger.error('BEP20 BSC verification error:', bep20Error);
      
      if (bep20Error.message.includes('API key') || bep20Error.message.includes('Invalid wei value')) {
        return res.status(503).json({
          success: false,
          message: 'BSC verification service temporarily unavailable. Please contact support.'
        });
      }
      
      if (bep20Error.message.includes('network') || bep20Error.message.includes('timeout')) {
        return res.status(503).json({
          success: false,
          message: 'BSC network connection error. Please try again later.'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Error verifying BEP20 transaction'
      });
    }

  } catch (error) {
    logger.error('Verify BSC transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Generate QR Code for wallet address
exports.generateQRCode = async (req, res) => {
  try {
    const { walletAddress, amount, currency = 'USDT' } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }

    const QRCode = require('qrcode');
    
    // Crear datos para el QR (formato BIP21 para criptomonedas)
    let qrData = walletAddress;
    if (amount) {
      qrData = `${walletAddress}?amount=${amount}&currency=${currency}`;
    }

    try {
      // Generar QR code como data URL
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });

      res.json({
        success: true,
        data: {
          qrCode: qrCodeDataURL,
          walletAddress,
          amount,
          currency
        }
      });

    } catch (qrError) {
      logger.error('QR code generation error:', qrError);
      res.status(500).json({
        success: false,
        message: 'Error generating QR code'
      });
    }

  } catch (error) {
     logger.error('Generate QR code error:', error);
     res.status(500).json({
       success: false,
       message: 'Internal server error'
     });
   }
 };

// Get user payment methods
exports.getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user._id;

    // For now, return default crypto payment methods
    // In a real implementation, this would come from a PaymentMethod model
    const defaultMethods = [
      {
        id: 'usdt-bep20',
        type: 'USDT',
        network: 'BEP20',
        address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
        isDefault: true,
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 'usdt-trc20',
        type: 'USDT',
        network: 'TRC20',
        address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
        isDefault: false,
        isActive: false, // Deshabilitado - solo visible sin funcionalidad
        createdAt: new Date()
      }
    ];

    res.json({
      success: true,
      data: {
        methods: defaultMethods
      }
    });

  } catch (error) {
    logger.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Add new payment method
exports.addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, network, address, isDefault = false } = req.body;

    if (!type || !network || !address) {
      return res.status(400).json({
        success: false,
        message: 'Type, network, and address are required'
      });
    }

    // Create new payment method
    const newMethod = {
      id: `${type.toLowerCase()}-${network.toLowerCase()}-${Date.now()}`,
      type,
      network,
      address,
      isDefault,
      isActive: true,
      createdAt: new Date()
    };

    res.status(201).json({
      success: true,
      data: newMethod,
      message: 'Payment method added successfully'
    });

  } catch (error) {
    logger.error('Add payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update payment method
exports.updatePaymentMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { type, network, address, isDefault } = req.body;

    // In a real implementation, you would update the payment method in the database
    const updatedMethod = {
      id,
      type,
      network,
      address,
      isDefault,
      isActive: true,
      updatedAt: new Date()
    };

    res.json({
      success: true,
      data: updatedMethod,
      message: 'Payment method updated successfully'
    });

  } catch (error) {
    logger.error('Update payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete payment method
exports.deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    // In a real implementation, you would delete the payment method from the database
    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });

  } catch (error) {
    logger.error('Delete payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}