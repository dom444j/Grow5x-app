const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { validateRequest } = require('../middleware/validation.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const { registerSchema, loginSchema } = require('../utils/validation');
const logger = require('../utils/logger');
const userController = require('../controllers/user.controller');

// Load auth controller - use main controller with MongoDB
const authController = require('../controllers/auth.controller');
console.log('🔄 Using main auth controller with MongoDB');

const router = express.Router();

// Rate limiting for auth routes (more permissive for development)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 100, // Increased for production testing
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  handler: (req, res) => {
    logger.logSecurityEvent('rate_limit_exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 15 * 60
    });
  }
});

// More restrictive rate limiting for registration (relaxed for development)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 1000 : 3, // 1000 for dev (testing), 3 for production
  message: {
    error: 'Too many registration attempts, please try again later.',
    retryAfter: 60 * 60 // 1 hour in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.logSecurityEvent('registration_rate_limit_exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body?.email
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many registration attempts, please try again later.',
      retryAfter: 60 * 60
    });
  }
});

// Verification rate limiting
const verificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // limit each IP to 3 verification attempts per 5 minutes
  message: {
    error: 'Too many verification attempts, please try again later.',
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Password reset rate limiting
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts, please try again later.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Routes

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  registerLimiter,
  validateRequest(registerSchema),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', 
  authLimiter,
  validateRequest(loginSchema),
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   GET /api/auth/verify/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get('/verify/:token', 
  verificationLimiter,
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post('/resend-verification', 
  verificationLimiter,
  authController.resendVerification
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', 
  passwordResetLimiter,
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', 
  passwordResetLimiter,
  authController.resetPassword
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 */
router.post('/change-password', 
  authenticateToken,
  authController.changePassword
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', 
  authenticateToken,
  userController.getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', 
  authenticateToken,
  userController.updateProfile
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', 
  authenticateToken,
  authController.logout
);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', 
  authenticateToken,
  authController.logoutAll
);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get active sessions
 * @access  Private
 */
router.get('/sessions', 
  authenticateToken,
  authController.getActiveSessions
);

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Terminate specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId', 
  authenticateToken,
  authController.terminateSession
);

/**
 * @route   POST /api/auth/verify-telegram
 * @desc    Verify Telegram account
 * @access  Private
 */
router.post('/verify-telegram', 
  authenticateToken,
  authController.verifyTelegram
);

/**
 * @route   POST /api/auth/unlink-telegram
 * @desc    Unlink Telegram account
 * @access  Private
 */
router.post('/unlink-telegram', 
  authenticateToken,
  authController.unlinkTelegram
);

/**
 * @route   GET /api/auth/security-log
 * @desc    Get user security log
 * @access  Private
 */
router.get('/security-log', 
  authenticateToken,
  authController.getSecurityLog
);

/**
 * @route   POST /api/auth/enable-2fa
 * @desc    Enable two-factor authentication
 * @access  Private
 */
router.post('/enable-2fa', 
  authenticateToken,
  authController.enable2FA
);

/**
 * @route   POST /api/auth/disable-2fa
 * @desc    Disable two-factor authentication
 * @access  Private
 */
router.post('/disable-2fa', 
  authenticateToken,
  authController.disable2FA
);

/**
 * @route   POST /api/auth/verify-2fa
 * @desc    Verify 2FA code
 * @access  Private
 */
router.post('/verify-2fa', 
  authenticateToken,
  authController.verify2FA
);

/**
 * @route   GET /api/auth/backup-codes
 * @desc    Get 2FA backup codes
 * @access  Private
 */
router.get('/backup-codes', 
  authenticateToken,
  authController.getBackupCodes
);

/**
 * @route   POST /api/auth/regenerate-backup-codes
 * @desc    Regenerate 2FA backup codes
 * @access  Private
 */
router.post('/regenerate-backup-codes', 
  authenticateToken,
  authController.regenerateBackupCodes
);

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', 
  authenticateToken,
  authController.deleteAccount
);

/**
 * @route   POST /api/auth/export-data
 * @desc    Export user data
 * @access  Private
 */
router.post('/export-data', 
  authenticateToken,
  authController.exportUserData
);

/**
 * @route   POST /api/auth/process-referral
 * @desc    Manually process referral for testing
 * @access  Public (for testing only)
 */
router.post('/process-referral', 
  authController.processReferral
);

/**
 * @route   POST /api/auth/test-email
 * @desc    Test email configuration
 * @access  Public (for testing only)
 */
router.post('/test-email', 
  authController.testEmail
);

// Error handling middleware for auth routes
router.use((error, req, res, next) => {
  logger.logAuthEvent('route_error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
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