const express = require('express');
const rateLimit = require('express-rate-limit');
const paymentController = require('../controllers/payment.controller');
const { authenticateToken, requirePioneer, requireAdmin } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { paymentSchema, withdrawalSchema } = require('../utils/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting for payment routes
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment requests per windowMs
  message: {
    error: 'Too many payment requests, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  handler: (req, res) => {
    logger.logSecurityEvent('payment_rate_limit_exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many payment requests, please try again later.',
      retryAfter: 15 * 60
    });
  }
});

// Webhook rate limiting (more permissive for external services)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // allow up to 100 webhook calls per minute
  message: {
    error: 'Webhook rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
});

// Withdrawal rate limiting (more restrictive)
const withdrawalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 withdrawal requests per hour
  message: {
    error: 'Too many withdrawal requests, please try again later.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Routes

/**
 * @route   GET /api/payments/plans
 * @desc    Get available pioneer plans
 * @access  Public
 */
router.get('/plans', paymentController.getPioneerPlans);

/**
 * @route   POST /api/payments/pioneer/intent
 * @desc    Create payment intent for pioneer plan
 * @access  Private
 */
router.post('/pioneer/intent', 
  authenticateToken,
  paymentLimiter,
  validateRequest(paymentSchema),
  paymentController.createPioneerPaymentIntent
);

/**
 * @route   GET /api/payments/status/:reference
 * @desc    Get payment status
 * @access  Private
 */
router.get('/status/:reference', 
  authenticateToken,
  paymentController.getPaymentStatus
);

/**
 * @route   GET /api/payments/history
 * @desc    Get user payment history
 * @access  Private
 */
router.get('/history', 
  authenticateToken,
  paymentController.getPaymentHistory
);

/**
 * @route   POST /api/payments/webhook/confirmation
 * @desc    Handle payment confirmation webhook (Pioneer plans)
 * @access  Public (webhook)
 */
router.post('/webhook/confirmation', 
  webhookLimiter,
  paymentController.paymentWebhook
);

/**
 * @route   POST /api/payments/webhook/package-confirmation
 * @desc    Handle package/license payment confirmation webhook
 * @access  Public (webhook)
 */
router.post('/webhook/package-confirmation', 
  webhookLimiter,
  paymentController.packagePaymentWebhook
);

/**
 * @route   POST /api/payments/verify/:reference
 * @desc    Manually verify payment (admin only)
 * @access  Private (Admin)
 */
router.post('/verify/:reference', 
  authenticateToken,
  requireAdmin,
  paymentController.verifyPaymentManually
);

/**
 * @route   POST /api/payments/verify-bep20/:transactionId
 * @desc    Verify BEP20 transaction with hash
 * @access  Private
 */
router.post('/verify-bep20/:transactionId', 
  authenticateToken,
  paymentLimiter,
  paymentController.verifyBEP20Transaction
);

/**
 * @route   POST /api/payments/verify-bsc-transaction
 * @desc    Verify BSC transaction with hash
 * @access  Private
 */
router.post('/verify-bsc-transaction', 
  authenticateToken,
  paymentLimiter,
  paymentController.verifyBSCTransaction
);

/**
 * @route   POST /api/payments/generate-qr
 * @desc    Generate QR code for wallet address
 * @access  Public
 */
router.post('/generate-qr', 
  paymentController.generateQRCode
);

/**
 * @route   GET /api/payments/methods
 * @desc    Get user payment methods
 * @access  Private
 */
router.get('/methods', 
  authenticateToken,
  paymentController.getPaymentMethods
);

/**
 * @route   POST /api/payments/methods
 * @desc    Add new payment method
 * @access  Private
 */
router.post('/methods', 
  authenticateToken,
  paymentController.addPaymentMethod
);

/**
 * @route   PUT /api/payments/methods/:id
 * @desc    Update payment method
 * @access  Private
 */
router.put('/methods/:id', 
  authenticateToken,
  paymentController.updatePaymentMethod
);

/**
 * @route   DELETE /api/payments/methods/:id
 * @desc    Delete payment method
 * @access  Private
 */
router.delete('/methods/:id', 
  authenticateToken,
  paymentController.deletePaymentMethod
);

/**
 * @route   GET /api/payments/purchases
 * @desc    Get user purchase history
 * @access  Private
 */
router.get('/purchases', 
  authenticateToken,
  paymentController.getPurchaseHistory
);

/**
 * @route   POST /api/payments/purchases
 * @desc    Create new purchase
 * @access  Private
 */
router.post('/purchases', 
  authenticateToken,
  require('../controllers/purchases.controller').createPurchase
);

/**
 * @route   POST /api/payments/withdrawal/request
 * @desc    Request withdrawal
 * @access  Private (Pioneer)
 */
router.post('/withdrawal/request', 
  authenticateToken,
  requirePioneer,
  withdrawalLimiter,
  validateRequest(withdrawalSchema),
  paymentController.requestWithdrawal
);

/**
 * @route   GET /api/payments/withdrawal/history
 * @desc    Get withdrawal history
 * @access  Private
 */
router.get('/withdrawal/history', 
  authenticateToken,
  paymentController.getWithdrawalHistory
);

/**
 * @route   POST /api/payments/withdrawal/approve/:id
 * @desc    Approve withdrawal request (admin only)
 * @access  Private (Admin)
 */
/*
router.post('/withdrawal/approve/:id', 
  authenticateToken,
  requireAdmin,
  paymentController.approveWithdrawal
);

router.post('/withdrawal/reject/:id', 
  authenticateToken,
  requireAdmin,
  paymentController.rejectWithdrawal
);
*/

/**
 * @route   GET /api/payments/balance
 * @desc    Get user balance
 * @access  Private
 */
router.get('/balance', 
  authenticateToken,
  paymentController.getUserBalance
);

/**
 * @route   GET /api/payments/transactions
 * @desc    Get user transactions
 * @access  Private
 */
router.get('/transactions', 
  authenticateToken,
  paymentController.getUserTransactions
);

/**
 * @route   GET /api/payments/transaction/:id
 * @desc    Get specific transaction details
 * @access  Private
 */
router.get('/transaction/:id', 
  authenticateToken,
  paymentController.getTransactionDetails
);

/**
 * @route   POST /api/payments/refund/:id
 * @desc    Process refund (admin only)
 * @access  Private (Admin)
 */
/*
router.post('/refund/:id', 
  authenticateToken,
  requireAdmin,
  paymentController.processRefund
);
*/

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/stats', 
  authenticateToken,
  requireAdmin,
  paymentController.getPaymentStats
);

/**
 * @route   GET /api/payments/pending
 * @desc    Get pending payments (admin only)
 * @access  Private (Admin)
 */
router.get('/pending', 
  authenticateToken,
  requireAdmin,
  paymentController.getPendingPayments
);

/**
 * @route   POST /api/payments/cancel/:reference
 * @desc    Cancel pending payment
 * @access  Private
 */
/*
router.post('/cancel/:reference', 
  authenticateToken,
  paymentController.cancelPayment
);
*/

/**
 * @route   GET /api/payments/fees
 * @desc    Get current fee structure
 * @access  Public
 */
router.get('/fees', paymentController.getFeeStructure);

/**
 * @route   POST /api/payments/estimate-fees
 * @desc    Estimate fees for transaction
 * @access  Private
 */
router.post('/estimate-fees', 
  authenticateToken,
  paymentController.estimateFees
);

/**
 * @route   GET /api/payments/supported-currencies
 * @desc    Get supported currencies
 * @access  Public
 */
router.get('/supported-currencies', paymentController.getSupportedCurrencies);

/**
 * @route   GET /api/payments/exchange-rates
 * @desc    Get current exchange rates
 * @access  Public
 */
router.get('/exchange-rates', paymentController.getExchangeRates);

/**
 * @route   POST /api/payments/convert
 * @desc    Convert between currencies
 * @access  Private (Pioneer)
 */
router.post('/convert', 
  authenticateToken,
  requirePioneer,
  paymentController.convertCurrency
);

/**
 * @route   GET /api/payments/wallet/address
 * @desc    Get available wallet address
 * @access  Public
 */
router.get('/wallet/address', 
  paymentController.getWalletAddress
);



/**
 * @route   POST /api/payments/wallet/generate
 * @desc    Generate new wallet address
 * @access  Private
 */
/*
router.post('/wallet/generate', 
  authenticateToken,
  paymentController.generateWalletAddress
);
*/

/**
 * @route   GET /api/payments/network/status
 * @desc    Get blockchain network status
 * @access  Public
 */
router.get('/network/status', paymentController.getNetworkStatus);

/**
 * @route   POST /api/payments/validate/address
 * @desc    Validate wallet address
 * @access  Public
 */
router.post('/validate/address', paymentController.validateWalletAddress);

/**
 * @route   GET /api/payments/limits
 * @desc    Get user transaction limits
 * @access  Private
 */
router.get('/limits', 
  authenticateToken,
  paymentController.getTransactionLimits
);

/**
 * @route   POST /api/payments/dispute/create
 * @desc    Create payment dispute
 * @access  Private
 */
router.post('/dispute/create', 
  authenticateToken,
  paymentController.createDispute
);

/**
 * @route   GET /api/payments/dispute/:id
 * @desc    Get dispute details
 * @access  Private
 */
router.get('/dispute/:id', 
  authenticateToken,
  paymentController.getDisputeDetails
);

/**
 * @route   POST /api/payments/dispute/:id/resolve
 * @desc    Resolve payment dispute (admin only)
 * @access  Private (Admin)
 */
/*
router.post('/dispute/:id/resolve', 
  authenticateToken,
  requireAdmin,
  paymentController.resolveDispute
);
*/

/**
 * @route   GET /api/payments/reports/daily
 * @desc    Get daily payment reports (admin only)
 * @access  Private (Admin)
 */
router.get('/reports/daily', 
  authenticateToken,
  requireAdmin,
  paymentController.getDailyReports
);

/**
 * @route   GET /api/payments/reports/monthly
 * @desc    Get monthly payment reports (admin only)
 * @access  Private (Admin)
 */
router.get('/reports/monthly', 
  authenticateToken,
  requireAdmin,
  paymentController.getMonthlyReports
);

/**
 * @route   POST /api/payments/bulk/process
 * @desc    Process bulk payments (admin only)
 * @access  Private (Admin)
 */
/*
router.post('/bulk/process', 
  authenticateToken,
  requireAdmin,
  paymentController.processBulkPayments
);
*/

// Error handling middleware for payment routes
router.use((error, req, res, next) => {
  logger.logPaymentEvent('route_error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      success: false,
      error: 'Payment processing error'
    });
  } else {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;