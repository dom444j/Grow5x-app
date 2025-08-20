/**
 * User Routes
 * Handles user profile, withdrawals, and account management
 */

const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { User, Withdrawal, Transaction, Commission, Purchase, Package, Wallet } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const { validateWithdrawalRequest } = require('../middleware/usdtBep20Hardening');
const otpService = require('../services/otp');
const telegramService = require('../services/telegram');
const logger = require('../config/logger');
const ReferralController = require('../controllers/referralController');
const { toApiNumber, DecimalCalc } = require('../utils/decimal');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Rate limiting for withdrawal requests
const withdrawalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Max 3 withdrawal requests per 15 minutes
  message: {
    success: false,
    message: 'Demasiadas solicitudes de retiro. Intenta nuevamente en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation schemas
const withdrawalRequestSchema = z.object({
  amountUSDT: z.number()
    .min(10, 'El monto mínimo de retiro es 10 USDT')
    .max(10000, 'El monto máximo de retiro es 10,000 USDT'),
  toAddress: z.string()
    .min(26, 'Dirección de destino inválida')
    .max(50, 'Dirección de destino inválida')
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Dirección BEP20 inválida'),
  pin: z.string()
    .length(6, 'PIN debe tener exactamente 6 dígitos')
    .regex(/^\d{6}$/, 'PIN debe contener solo números')
});

const requestOtpSchema = z.object({
  purpose: z.enum(['withdrawal'], 'Propósito no válido').default('withdrawal')
});

const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').optional(),
  lastName: z.string().min(2, 'Apellido debe tener al menos 2 caracteres').optional(),
  phone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos').optional(),
  country: z.string().min(2, 'País debe tener al menos 2 caracteres').optional(),
  telegramUsername: z.string().min(3, 'Usuario de Telegram inválido').optional()
});

const updateSettingsSchema = z.object({
  defaultWithdrawalAddress: z.string()
    .min(26, 'Dirección de retiro inválida')
    .max(50, 'Dirección de retiro inválida')
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Dirección BEP20 inválida')
    .optional(),
  network: z.enum(['BEP20'], {
    errorMap: () => ({ message: 'Solo se permite red BEP20' })
  }).optional()
});

// Purchase schemas
const createPurchaseSchema = z.object({
  packageId: z.string().min(1, 'Package ID es requerido'),
  amountUSDT: z.number().min(1, 'Monto debe ser mayor a 0')
});

const confirmTxSchema = z.object({
  txHash: z.string().min(1, 'Hash de transacción es requerido')
});

/**
 * GET /api/me/profile
 * Get current user profile with detailed information
 */
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -security.resetPasswordToken -security.resetPasswordExpires')
      .populate('referredBy', 'userId email firstName lastName')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Get additional statistics
    const [purchaseStats, commissionStats, withdrawalStats] = await Promise.all([
      // Purchase statistics
      Purchase.aggregate([
        { $match: { user: user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]),
      
      // Commission statistics
      Commission.aggregate([
        { $match: { earner: user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$commissionAmount' }
          }
        }
      ]),
      
      // Withdrawal statistics
      Withdrawal.aggregate([
        { $match: { user: user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ])
    ]);
    
    // Transform statistics
    const stats = {
      purchases: {
        total: purchaseStats.reduce((sum, stat) => sum + stat.count, 0),
        totalInvested: toApiNumber(purchaseStats.reduce((sum, stat) => sum + (stat.totalAmount || 0), 0)),
        byStatus: purchaseStats.reduce((acc, stat) => {
          acc[stat._id] = { count: stat.count, amount: toApiNumber(stat.totalAmount || 0) };
          return acc;
        }, {})
      },
      commissions: {
        total: commissionStats.reduce((sum, stat) => sum + stat.count, 0),
        totalEarned: toApiNumber(commissionStats.reduce((sum, stat) => sum + (stat.totalAmount || 0), 0)),
        byStatus: commissionStats.reduce((acc, stat) => {
          acc[stat._id] = { count: stat.count, amount: toApiNumber(stat.totalAmount || 0) };
          return acc;
        }, {})
      },
      withdrawals: {
        total: withdrawalStats.reduce((sum, stat) => sum + stat.count, 0),
        totalWithdrawn: toApiNumber(withdrawalStats.reduce((sum, stat) => sum + (stat.totalAmount || 0), 0)),
        byStatus: withdrawalStats.reduce((acc, stat) => {
          acc[stat._id] = { count: stat.count, amount: toApiNumber(stat.totalAmount || 0) };
          return acc;
        }, {})
      }
    };
    
    res.json({
      success: true,
      data: {
        user: {
          userId: user.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          country: user.country,
          role: user.role,
          referralCode: user.referralCode,
          isActive: user.isActive,
          isVerified: user.isVerified,
          balances: user.balances,
          referralStats: user.referralStats,
          telegramUsername: user.telegramUsername,
          referredBy: user.referredBy ? {
            userId: user.referredBy.userId,
            email: user.referredBy.email,
            fullName: `${user.referredBy.firstName} ${user.referredBy.lastName}`
          } : null,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt
        },
        stats
      }
    });
    
  } catch (error) {
    logger.error('Get user profile error:', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PUT /api/me/profile
 * Update user profile information
 */
// GET /api/me/settings - Get user settings
router.get('/settings', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId })
      .select('defaultWithdrawalAddress network')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        defaultWithdrawalAddress: user.defaultWithdrawalAddress || null,
        network: user.network || 'BEP20'
      }
    });

  } catch (error) {
    logger.error('Error getting user settings:', {
      userId: req.user.userId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/me/settings - Update user settings
router.put('/settings', async (req, res) => {
  try {
    const validation = updateSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos de configuración inválidos',
        errors: validation.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
        code: 'VALIDATION_ERROR'
      });
    }

    const { defaultWithdrawalAddress, network } = validation.data;
    const updateData = {};

    if (defaultWithdrawalAddress !== undefined) {
      updateData.defaultWithdrawalAddress = defaultWithdrawalAddress;
    }
    if (network !== undefined) {
      updateData.network = network;
    }

    const user = await User.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: updateData },
      { new: true, select: 'defaultWithdrawalAddress network' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    logger.info('User settings updated:', {
      userId: req.user.userId,
      updatedFields: Object.keys(updateData)
    });

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: {
        defaultWithdrawalAddress: user.defaultWithdrawalAddress || null,
        network: user.network || 'BEP20'
      }
    });

  } catch (error) {
    logger.error('Error updating user settings:', {
      userId: req.user.userId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

router.put('/profile', async (req, res) => {
  try {
    console.log('Profile update request body:', req.body);
    // Validate request body
    const validatedData = updateProfileSchema.parse(req.body);
    console.log('Validated profile data:', validatedData);
    
    // Update user profile
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        ...validatedData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password -security.resetPasswordToken -security.resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    logger.info('User profile updated', {
      userId: user.userId,
      updatedFields: Object.keys(validatedData),
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: {
          userId: user.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          country: user.country,
          telegramUsername: user.telegramUsername,
          updatedAt: user.updatedAt
        }
      }
    });
    
  } catch (error) {
    logger.error('Update user profile error:', {
      error: error.message,
      userId: req.user?.userId,
      body: req.body,
      ip: req.ip
    });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Datos de perfil inválidos',
        code: 'VALIDATION_ERROR',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/me/transactions
 * Get user transaction history
 */
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    
    // Build filter
    const filter = { user: req.user._id };
    
    if (type) {
      filter.type = type;
    }
    
    if (status) {
      filter.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get transactions
    const transactions = await Transaction.find(filter)
      .populate('relatedPurchase', 'purchaseId package')
      .populate('relatedCommission', 'commissionId level')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalCount = await Transaction.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        transactions: transactions.map(tx => ({
          transactionId: tx.transactionId,
          type: tx.type,
          amount: toApiNumber(tx.amount),
          currency: tx.currency,
          status: tx.status,
          description: tx.description,
          balanceAfter: toApiNumber(tx.balanceAfter),
          relatedPurchase: tx.relatedPurchase ? {
            purchaseId: tx.relatedPurchase.purchaseId,
            package: tx.relatedPurchase.package
          } : null,
          relatedCommission: tx.relatedCommission ? {
            commissionId: tx.relatedCommission.commissionId,
            level: tx.relatedCommission.level
          } : null,
          createdAt: tx.createdAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: DecimalCalc.round(totalCount / parseInt(limit)),
          totalCount,
          hasNext: skip + transactions.length < totalCount,
          hasPrev: parseInt(page) > 1
        }
      }
    });
    
  } catch (error) {
    logger.error('Get user transactions error:', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/me/otp/request
 * Request OTP PIN for withdrawal
 */
router.post('/otp/request', withdrawalLimiter, async (req, res) => {
  try {
    const validatedData = requestOtpSchema.parse(req.body);
    const { purpose } = validatedData;
    const userId = req.user._id;

    // Get user data
    const user = await User.findById(userId).select('telegramUsername isActive');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta no activa. Contacte al soporte.',
        code: 'ACCOUNT_NOT_ACTIVE'
      });
    }

    // Check if user has Telegram configured
    if (!user.telegramUsername) {
      return res.status(400).json({
        success: false,
        message: 'Debe configurar su Telegram para recibir códigos OTP',
        code: 'TELEGRAM_NOT_CONFIGURED'
      });
    }

    // Check if there's already an active OTP
    const existingOtp = otpService.getOtpStatus(userId, purpose);
    if (existingOtp && !existingOtp.expired && !existingOtp.used) {
      return res.status(429).json({
        success: false,
        message: `Ya tiene un código OTP activo. Expira en ${DecimalCalc.round(existingOtp.timeRemaining / 60)} minutos.`,
        code: 'OTP_ALREADY_ACTIVE',
        data: {
          timeRemaining: existingOtp.timeRemaining,
          remainingAttempts: existingOtp.remainingAttempts
        }
      });
    }

    // Generate new OTP
    const otpData = otpService.createOtp(userId, purpose);
    
    // Send OTP via Telegram
    const telegramSent = await telegramService.sendOtpPin(
      user.telegramUsername,
      otpData.pin,
      purpose
    );

    if (!telegramSent) {
      // Remove the OTP if Telegram sending failed
      otpService.removeOtp(userId, purpose);
      
      return res.status(500).json({
        success: false,
        message: 'Error enviando código OTP. Intente nuevamente.',
        code: 'OTP_DELIVERY_FAILED'
      });
    }

    logger.info('OTP requested and sent', {
      userId: req.user.userId,
      purpose,
      otpId: otpData.otpId,
      expiresAt: otpData.expiresAt.toISOString()
    });

    res.json({
      success: true,
      message: 'Código OTP enviado a su Telegram',
      data: {
        otpId: otpData.otpId,
        expiresAt: otpData.expiresAt.toISOString(),
        purpose
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
        errors: error.errors
      });
    }

    logger.error('Request OTP error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/me/otp/status
 * Get OTP status for user
 */
router.get('/otp/status', async (req, res) => {
  try {
    const { purpose = 'withdrawal' } = req.query;
    const userId = req.user._id;

    const otpStatus = otpService.getOtpStatus(userId, purpose);

    if (!otpStatus) {
      return res.json({
        success: true,
        data: {
          hasActiveOtp: false,
          purpose
        }
      });
    }

    res.json({
      success: true,
      data: {
        hasActiveOtp: true,
        ...otpStatus,
        purpose
      }
    });

  } catch (error) {
    logger.error('Get OTP status error:', {
      error: error.message,
      userId: req.user?.userId,
      query: req.query
    });

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/me/withdrawals/otp
 * Request OTP specifically for withdrawals
 */
router.post('/withdrawals/otp', withdrawalLimiter, async (req, res) => {
  try {
    const userId = req.user._id;
    const purpose = 'withdrawal';

    // Get user data
    const user = await User.findById(userId).select('telegramUsername isActive');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta no activa. Contacte al soporte.',
        code: 'ACCOUNT_NOT_ACTIVE'
      });
    }

    // Check if user has Telegram configured
    if (!user.telegramUsername) {
      return res.status(400).json({
        success: false,
        message: 'Debe configurar su Telegram para recibir códigos OTP',
        code: 'TELEGRAM_NOT_CONFIGURED'
      });
    }

    // Check if there's already an active OTP
    const existingOtp = otpService.getOtpStatus(userId, purpose);
    if (existingOtp && !existingOtp.expired && !existingOtp.used) {
      return res.status(200).json({
        sent: true,
        expiresAt: existingOtp.expiresAt,
        message: `Ya tiene un código OTP activo. Expira en ${DecimalCalc.round(existingOtp.timeRemaining / 60)} minutos.`
      });
    }

    // Generate new OTP
    const otpData = otpService.createOtp(userId, purpose);
    
    // Send OTP via Telegram
    const telegramSent = await telegramService.sendOtpPin(
      user.telegramUsername,
      otpData.pin,
      purpose
    );

    if (!telegramSent) {
      // Remove the OTP if Telegram sending failed
      otpService.removeOtp(userId, purpose);
      
      return res.status(500).json({
        sent: false,
        message: 'Error enviando código OTP. Intente nuevamente.',
        code: 'OTP_DELIVERY_FAILED'
      });
    }

    logger.info('Withdrawal OTP requested and sent', {
      userId: req.user.userId,
      purpose,
      otpId: otpData.otpId,
      expiresAt: otpData.expiresAt.toISOString()
    });

    res.json({
      sent: true,
      expiresAt: otpData.expiresAt.toISOString()
    });

  } catch (error) {
    logger.error('Request withdrawal OTP error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      body: req.body
    });

    res.status(500).json({
      sent: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/me/withdrawals
 * Request a new withdrawal
 */
router.post('/withdrawals', withdrawalLimiter, validateWithdrawalRequest, async (req, res) => {
  try {
    // Validate request body
    const validatedData = withdrawalRequestSchema.parse(req.body);
    const { amountUSDT, toAddress, pin } = validatedData;
    
    // Set fixed values for currency and network
    const amount = amountUSDT;
    const currency = 'USDT';
    const destinationAddress = toAddress;
    const network = 'BEP20';
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if user is active and verified
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta inactiva. Contacta al soporte.',
        code: 'ACCOUNT_INACTIVE'
      });
    }
    
    // Check if user has sufficient balance
    const availableBalance = user.balances[currency]?.available || 0;
    if (availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: `Saldo insuficiente. Disponible: ${availableBalance} ${currency}`,
        code: 'INSUFFICIENT_BALANCE'
      });
    }
    
    // Check for pending withdrawals
    const pendingWithdrawal = await Withdrawal.findOne({
      user: user._id,
      status: { $in: ['pending', 'approved', 'processing'] }
    });
    
    if (pendingWithdrawal) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes un retiro pendiente. Espera a que se complete.',
        code: 'PENDING_WITHDRAWAL_EXISTS'
      });
    }
    
    // Validate OTP PIN
    const otpValidation = otpService.validateOtp(user._id, pin, 'withdrawal');
    
    if (!otpValidation.valid) {
      return res.status(400).json({
        success: false,
        message: otpValidation.message,
        code: otpValidation.error,
        data: {
          remainingAttempts: otpValidation.remainingAttempts
        }
      });
    }
    
    // Create withdrawal request
    const withdrawal = await Withdrawal.createWithdrawal(
      user._id,
      amount,
      currency,
      destinationAddress,
      network
    );
    
    // Update user balance (reserve the amount)
    await user.updateBalance(currency, -amount, 'withdrawal_reserved');
    
    logger.info('Withdrawal request created', {
      userId: user.userId,
      withdrawalId: withdrawal.withdrawalId,
      amount,
      currency,
      network,
      destinationAddress: destinationAddress.substring(0, 6) + '...' + destinationAddress.substring(-4),
      ip: req.ip
    });
    
    res.json({
      success: true
    });
    
  } catch (error) {
    logger.error('Create withdrawal error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      body: req.body,
      ip: req.ip
    });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Datos de retiro inválidos',
        code: 'VALIDATION_ERROR',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/me/withdrawals
 * Get user withdrawal history with summary
 */
router.get('/withdrawals', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const { Ledger } = require('../models');
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Build filter
    const filter = { user: req.user._id };
    
    if (status) {
      filter.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get withdrawals
    const withdrawals = await Withdrawal.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalCount = await Withdrawal.countDocuments(filter);
    
    // Calculate availableUSDT from Ledger according to instructions
    const ledgerAggregation = await Ledger.aggregate([
      {
        $match: {
          userId: req.user._id,
          currency: 'USDT',
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: null,
          credits: {
            $sum: {
              $cond: [
                { $in: ['$type', ['BENEFIT_ACCRUAL', 'REFERRAL_DIRECT', 'REFERRAL_INDIRECT', 'BONUS', 'ADJUSTMENT']] },
                '$amount',
                0
              ]
            }
          },
          withdrawals: {
            $sum: {
              $cond: [
                { $eq: ['$type', 'WITHDRAWAL'] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);
    
    const ledgerSummary = ledgerAggregation[0] || { credits: 0, withdrawals: 0 };
    const availableUSDT = DecimalCalc.max(0, DecimalCalc.add(ledgerSummary.credits, ledgerSummary.withdrawals)); // withdrawals are negative
    
    // Get pending amount from withdrawals
    const pendingWithdrawals = await Withdrawal.find({
      user: req.user._id,
      status: { $in: ['pending', 'approved', 'processing'] }
    });
    const pendingUSDT = pendingWithdrawals.reduce((sum, w) => DecimalCalc.add(sum, w.amount || 0), 0);
    
    const minWithdrawalUSDT = 10;
    const sla = '24–48h manual';
    
    res.json({
      summary: {
        availableUSDT: toApiNumber(availableUSDT),
        pendingUSDT: toApiNumber(pendingUSDT),
        minWithdrawalUSDT,
        sla
      },
      items: withdrawals.map(withdrawal => ({
        id: withdrawal.withdrawalId || withdrawal._id.toString(),
        amountUSDT: toApiNumber(withdrawal.amount),
        toAddress: withdrawal.destinationAddress,
        status: withdrawal.status?.toUpperCase() || 'REQUESTED',
        createdAt: withdrawal.createdAt
      })),
      total: totalCount
    });
    
  } catch (error) {
    logger.error('Get user withdrawals error:', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/me/withdrawals/stats
 * Get user withdrawal statistics and summary
 */
router.get('/withdrawals/stats', async (req, res) => {
  try {
    const { Ledger } = require('../models');
    
    const user = await User.findById(req.user._id).select('balances');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Calculate availableUSDT from Ledger according to instructions
    const ledgerAggregation = await Ledger.aggregate([
      {
        $match: {
          userId: req.user._id,
          currency: 'USDT',
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: null,
          credits: {
            $sum: {
              $cond: [
                { $in: ['$type', ['BENEFIT_ACCRUAL', 'REFERRAL_DIRECT', 'REFERRAL_INDIRECT', 'BONUS', 'ADJUSTMENT']] },
                '$amount',
                0
              ]
            }
          },
          withdrawals: {
            $sum: {
              $cond: [
                { $eq: ['$type', 'WITHDRAWAL'] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);
    
    const ledgerSummary = ledgerAggregation[0] || { credits: 0, withdrawals: 0 };
    const availableUSDT = DecimalCalc.max(0, DecimalCalc.add(ledgerSummary.credits, ledgerSummary.withdrawals)); // withdrawals are negative
    
    // Get pending withdrawals amount
    const pendingWithdrawals = await Withdrawal.aggregate([
      {
        $match: {
          userId: req.user._id,
          status: { $in: ['pending', 'approved', 'processing'] }
        }
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$amount' }
        }
      }
    ]);
    
    const pendingUSDT = pendingWithdrawals[0]?.totalPending || 0;
    
    // Minimum withdrawal amount (from validation schema)
    const minWithdrawalUSDT = 10;
    
    // SLA in hours (typical processing time)
    const sla = '24–48h manual';
    
    // Get withdrawal history for additional stats
    const withdrawalStats = await Withdrawal.aggregate([
      {
        $match: {
          userId: req.user._id
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    const items = await Withdrawal.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('withdrawalId amount currency destinationAddress network status createdAt approvedAt completedAt txHash');
    
    res.json({
      success: true,
      data: {
        items: items.map(withdrawal => ({
          withdrawalId: withdrawal.withdrawalId,
          amount: withdrawal.amount,
          currency: withdrawal.currency,
          destinationAddress: withdrawal.destinationAddress,
          network: withdrawal.network,
          status: withdrawal.status,
          createdAt: withdrawal.createdAt,
          approvedAt: withdrawal.approvedAt,
          completedAt: withdrawal.completedAt,
          txHash: withdrawal.txHash
        })),
        summary: {
          availableUSDT: toApiNumber(availableUSDT),
          pendingUSDT: toApiNumber(pendingUSDT),
          minWithdrawalUSDT,
          sla
        }
      }
    });
    
  } catch (error) {
    logger.error('Get withdrawal stats error:', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/me/commissions
 * Get user commission history
 */
router.get('/commissions', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, level } = req.query;
    
    // Build filter
    const filter = { earner: req.user._id };
    
    if (status) {
      filter.status = status;
    }
    
    if (level) {
      filter.level = parseInt(level);
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get commissions
    const commissions = await Commission.find(filter)
      .populate('referredUser', 'userId email firstName lastName')
      .populate('relatedPurchase', 'purchaseId totalAmount')
      .populate('relatedPackage', 'packageId name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalCount = await Commission.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        commissions: commissions.map(commission => ({
          commissionId: commission.commissionId,
          level: commission.level,
          commissionRate: commission.commissionRate,
          commissionAmount: toApiNumber(commission.commissionAmount),
          currency: commission.currency,
          status: commission.status,
          referredUser: {
            userId: commission.referredUser.userId,
            email: commission.referredUser.email,
            fullName: `${commission.referredUser.firstName} ${commission.referredUser.lastName}`
          },
          relatedPurchase: {
            purchaseId: commission.relatedPurchase.purchaseId,
            amount: toApiNumber(commission.relatedPurchase.totalAmount)
          },
          relatedPackage: {
            packageId: commission.relatedPackage.packageId,
            name: commission.relatedPackage.name
          },
          unlockDate: commission.unlockDate,
          createdAt: commission.createdAt,
          unlockedAt: commission.unlockedAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: DecimalCalc.round(totalCount / parseInt(limit)),
          totalCount,
          hasNext: skip + commissions.length < totalCount,
          hasPrev: parseInt(page) > 1
        }
      }
    });
    
  } catch (error) {
    logger.error('Get user commissions error:', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/me/benefits
 * Get user benefit schedules and history
 */
router.get('/benefits', async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const { BenefitSchedule, Ledger } = require('../models');
    
    // Build filter for benefit schedules
    const filter = { userId: req.user._id };
    
    if (status) {
      filter.scheduleStatus = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get benefit schedules
    let benefitSchedules;
    try {
      benefitSchedules = await BenefitSchedule.find(filter)
        .populate({
          path: 'purchaseId',
          select: 'purchaseId totalAmount packageId confirmedAt',
          populate: {
            path: 'packageId',
            select: 'packageId name'
          }
        })
        .sort({ startAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    } catch (populateError) {
      logger.error('Error in populate query:', {
        error: populateError.message,
        stack: populateError.stack
      });
      throw populateError;
    }
    
    // Get total count
    const totalCount = await BenefitSchedule.countDocuments(filter);
    
    // Get benefit ledger entries for this user
    const benefitLedgerEntries = await Ledger.find({
      userId: req.user._id,
      type: 'BENEFIT_ACCRUAL',
      status: 'confirmed'
    }).sort({ createdAt: -1 });
    
    // Get commission ledger entries for this user
    const commissionLedgerEntries = await Ledger.find({
      userId: req.user._id,
      type: 'REFERRAL_DIRECT',
      status: 'confirmed'
    }).sort({ createdAt: -1 });
    
    // Calculate summary statistics
    const summary = {
      totalBenefits: toApiNumber(benefitLedgerEntries.reduce((sum, entry) => sum + entry.amount, 0)),
      totalCommissions: toApiNumber(commissionLedgerEntries.reduce((sum, entry) => sum + entry.amount, 0)),
      activeBenefitSchedules: benefitSchedules.filter(schedule => schedule.scheduleStatus === 'active').length,
      completedBenefitSchedules: benefitSchedules.filter(schedule => schedule.scheduleStatus === 'completed').length
    };
    
    // Filter out schedules without purchaseId or packageId
    const validSchedules = benefitSchedules.filter(schedule => 
      schedule.purchaseId && schedule.purchaseId.packageId
    );
    
    // Transform benefit schedules for response
    const transformedSchedules = validSchedules
      .map(schedule => {
        const dailyBenefits = [];
        
        // Create daily benefit entries
        for (let day = 0; day < schedule.days; day++) {
          const dayData = schedule.statusByDay.get(day.toString());
          const dayStatus = dayData ? dayData.status : 'pending';
          const releaseDate = new Date(schedule.startAt);
          releaseDate.setDate(releaseDate.getDate() + day);
          
          dailyBenefits.push({
            day: day + 1,
            amount: toApiNumber(schedule.dailyBenefitAmount),
            releaseDate: releaseDate,
            status: dayStatus,
            releasedAt: dayData ? dayData.releasedAt : null
          });
        }
        
        return {
          scheduleId: schedule._id,
          purchase: {
            purchaseId: schedule.purchaseId.purchaseId,
            totalAmount: toApiNumber(schedule.purchaseId.totalAmount),
            package: {
              packageId: schedule.purchaseId.packageId.packageId,
              name: schedule.purchaseId.packageId.name
            },
            confirmedAt: schedule.purchaseId.confirmedAt
          },
          startAt: schedule.startAt,
          days: schedule.days,
          dailyRate: schedule.dailyRate,
          dailyBenefitAmount: toApiNumber(schedule.dailyBenefitAmount),
          scheduleStatus: schedule.scheduleStatus,
          totalReleased: toApiNumber(schedule.totalReleased),
          daysReleased: schedule.daysReleased,
          dailyBenefits: dailyBenefits,
          createdAt: schedule.createdAt
        };
      });
    
    res.json({
      success: true,
      data: {
        summary,
        benefitSchedules: transformedSchedules,
        benefitHistory: benefitLedgerEntries.map(entry => ({
          id: entry._id,
          amount: toApiNumber(entry.amount),
          currency: entry.currency,
          description: entry.description,
          purchaseId: entry.purchaseReference,
          dayIndex: entry.metadata?.dayIndex,
          createdAt: entry.createdAt
        })),
        commissionHistory: commissionLedgerEntries.map(entry => ({
          id: entry._id,
          amount: toApiNumber(entry.amount),
          currency: entry.currency,
          description: entry.description,
          purchaseId: entry.purchaseReference,
          referredUserId: entry.userReference,
          createdAt: entry.createdAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: DecimalCalc.round(totalCount / parseInt(limit)),
          totalCount,
          hasNext: skip + benefitSchedules.length < totalCount,
          hasPrev: parseInt(page) > 1
        }
      }
    });
    
  } catch (error) {
    logger.error('Get user benefits error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/me/purchases
 * Create a new purchase
 */
router.post('/purchases', paymentLimiter, async (req, res) => {
  try {
    const validatedData = createPurchaseSchema.parse(req.body);
    const { packageId, amountUSDT } = validatedData;
    const user = req.user;

    // Find the package
    const package = await Package.findOne({ packageId, isActive: true });
    if (!package) {
      return res.status(404).json({ 
        success: false,
        error: 'Paquete no encontrado o no disponible' 
      });
    }

    // Get available wallet from pool (simplified for now)
    const wallet = await Wallet.findOne({ 
      isActive: true, 
      isAssigned: false 
    }).sort({ lastUsed: 1 });
    
    if (!wallet) {
      return res.status(503).json({ 
        success: false,
        error: 'No hay wallets disponibles en este momento' 
      });
    }

    // Create purchase
    const purchase = await Purchase.create({
      userId: user.userId,
      packageId,
      amountUSDT,
      payTo: wallet.address,
      network: 'BEP20',
      status: 'PENDING_PAYMENT',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });

    // Mark wallet as temporarily assigned
    wallet.isAssigned = true;
    wallet.lastUsed = new Date();
    await wallet.save();

    res.status(201).json({
      success: true,
      message: 'Compra creada exitosamente',
      data: {
        purchase: {
          purchaseId: purchase.purchaseId,
          totalAmount: purchase.amountUSDT,
          expiresAt: purchase.expiresAt
        },
        payment: {
          walletAddress: purchase.payTo,
          networkName: purchase.network
        }
      }
    });

  } catch (error) {
    logger.error('Create purchase error:', {
      error: error.message,
      userId: req.user?.userId,
      body: req.body,
      ip: req.ip
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/me/purchases/:id/confirm
 * Confirm transaction hash for a purchase
 */
router.post('/purchases/:id/confirm', async (req, res) => {
  try {
    const validatedData = confirmTxSchema.parse(req.body);
    const { txHash } = validatedData;
    const purchaseId = req.params.id;
    const user = req.user;

    // Find purchase
    const purchase = await Purchase.findOne({ 
      purchaseId, 
      userId: user.userId 
    });
    
    if (!purchase) {
      return res.status(404).json({ 
        success: false,
        error: 'Compra no encontrada' 
      });
    }

    if (purchase.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({ 
        success: false,
        error: `La compra está en estado ${purchase.status}, no se puede confirmar` 
      });
    }

    // Check if txHash already exists
    const existingPurchase = await Purchase.findOne({
      txHash,
      _id: { $ne: purchase._id }
    });

    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        error: 'Este hash de transacción ya está siendo usado en otra compra',
        code: 'TX_HASH_ALREADY_EXISTS'
      });
    }

    // Update purchase with transaction hash
    purchase.txHash = txHash;
    purchase.status = 'CONFIRMING';
    purchase.hashSubmittedAt = new Date();
    await purchase.save();

    res.json({ 
      success: true,
      message: 'Hash de transacción confirmado exitosamente' 
    });

  } catch (error) {
    logger.error('Confirm transaction error:', {
      error: error.message,
      purchaseId: req.params.id,
      userId: req.user?.userId,
      body: req.body,
      ip: req.ip
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/me/purchases
 * Get user's purchase history (alias for /api/payments/my-purchases)
 */
router.get('/purchases', async (req, res) => {
  try {
    const user = req.user;
    const { status, page = 1, limit = 10 } = req.query;
    
    // Build filter
    const filter = { user: user._id };
    if (status) {
      filter.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get purchases
    const purchases = await Purchase.find(filter)
      .populate('package', 'packageId name price currency')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalCount = await Purchase.countDocuments(filter);
    
    // Transform purchases for response
    const transformedPurchases = purchases.map(purchase => ({
      purchaseId: purchase.purchaseId,
      package: {
        packageId: purchase.package.packageId,
        name: purchase.package.name
      },
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      totalAmount: purchase.totalAmount,
      currency: purchase.currency,
      status: purchase.status,
      paymentAddress: purchase.paymentAddress,
      transactionHash: purchase.transactionHash,
      benefitProgress: {
        currentCycle: purchase.currentCycle,
        currentDay: purchase.currentDay,
        totalCycles: purchase.totalCycles,
        benefitDays: purchase.benefitDays,
        remainingDays: purchase.remainingDays,
        remainingCycles: purchase.remainingCycles
      },
      createdAt: purchase.createdAt,
      activatedAt: purchase.activatedAt,
      expiresAt: purchase.expiresAt
    }));
    
    res.json({
      success: true,
      data: {
        purchases: transformedPurchases,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasNext: skip + purchases.length < totalCount,
          hasPrev: parseInt(page) > 1
        }
      }
    });
    
  } catch (error) {
    logger.error('Get user purchases error:', {
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/me/referrals
 * Get user's referral data and referred users
 */
router.get('/referrals', ReferralController.getUserReferrals);

/**
 * GET /api/me/referrals/stats
 * Get user's referral statistics
 */
router.get('/referrals/stats', ReferralController.getUserReferralStats);

module.exports = router;