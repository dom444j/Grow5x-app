const express = require('express');
const rateLimit = require('express-rate-limit');
const paymentWebhooks = require('../webhooks/payment.webhooks');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting específico para webhooks (más permisivo para servicios externos)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // hasta 100 llamadas de webhook por minuto
  message: {
    error: 'Webhook rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: 1,
  handler: (req, res) => {
    logger.logSecurityEvent('webhook_rate_limit_exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Webhook rate limit exceeded'
    });
  }
});

// Middleware para logging de webhooks
const webhookLogger = (req, res, next) => {
  logger.info('Webhook received', {
    endpoint: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    signature: req.headers['x-webhook-signature'] ? 'present' : 'missing'
  });
  next();
};

/**
 * @route   POST /api/webhooks/license-activation
 * @desc    Webhook para activación de licencia después de confirmación de pago USDT BEP-20
 * @access  Public (webhook con firma)
 */
router.post('/license-activation', 
  webhookLimiter,
  webhookLogger,
  paymentWebhooks.licenseActivationWebhook
);

/**
 * @route   POST /api/webhooks/second-week-completion
 * @desc    Webhook para eventos de segunda semana completa
 * @access  Public (webhook con firma)
 */
router.post('/second-week-completion', 
  webhookLimiter,
  webhookLogger,
  paymentWebhooks.secondWeekCompletionWebhook
);

/**
 * @route   POST /api/webhooks/payment-confirmation
 * @desc    Webhook para confirmación de pago USDT BEP-20
 * @access  Public (webhook con firma)
 */
router.post('/payment-confirmation', 
  webhookLimiter,
  webhookLogger,
  paymentWebhooks.paymentConfirmationWebhook
);

/**
 * @route   GET /api/webhooks/health
 * @desc    Health check para webhooks
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook service is healthy',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/webhooks/license-activation',
      '/api/webhooks/second-week-completion',
      '/api/webhooks/payment-confirmation'
    ]
  });
});

module.exports = router;