const express = require('express');
const rateLimit = require('express-rate-limit');
const preregistrationController = require('../controllers/preregistration.controller');
const { validatePreregistration } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for preregistration endpoints
const preregistrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many preregistration attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
});

const verificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // limit each IP to 3 verification attempts per windowMs
  message: {
    success: false,
    message: 'Too many verification attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false
});

const resendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 2, // limit each IP to 2 resend attempts per windowMs
  message: {
    success: false,
    message: 'Too many resend attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false
});

// Public routes

/**
 * @route   POST /api/v1/preregistrations
 * @desc    Create new preregistration
 * @access  Public
 * @body    {
 *            email?: string,
 *            telegram?: string,
 *            fullName: string,
 *            country: string,
 *            estimatedAmount: number,
 *            currency?: string,
 *            referralCode?: string,
 *            acceptedTerms: boolean,
 *            acceptedRisk: boolean,
 *            language?: string,
 *            source?: string
 *          }
 */
router.post('/', 
  preregistrationLimiter,
  validatePreregistration,
  preregistrationController.createPreregistration
);

/**
 * @route   POST /api/v1/preregistrations/verify
 * @desc    Verify preregistration email
 * @access  Public
 * @body    { token: string }
 */
router.post('/verify',
  verificationLimiter,
  preregistrationController.verifyPreregistration
);

/**
 * @route   POST /api/v1/preregistrations/resend
 * @desc    Resend verification email
 * @access  Public
 * @body    { email: string }
 */
router.post('/resend',
  resendLimiter,
  preregistrationController.resendVerification
);

/**
 * @route   GET /api/v1/preregistrations/stats
 * @desc    Get public preregistration statistics
 * @access  Public
 */
router.get('/stats',
  preregistrationController.getStats
);

/**
 * @route   POST /api/v1/preregistrations/:preregistrationId/convert
 * @desc    Convert preregistration to full registration
 * @access  Public
 * @body    {
 *            password: string,
 *            acceptedTerms: boolean,
 *            acceptedRisk: boolean,
 *            acceptedMarketing?: boolean
 *          }
 */
router.post('/:preregistrationId/convert',
  preregistrationLimiter,
  preregistrationController.convertToRegistration
);

// Protected routes (require authentication)

/**
 * @route   GET /api/v1/preregistrations/validate
 * @desc    Validate preregistration data (for admin)
 * @access  Private (Admin)
 */
router.get('/validate',
  optionalAuth,
  (req, res) => {
    // This endpoint can be used for admin validation
    // For now, just return success
    res.json({
      success: true,
      message: 'Validation endpoint available'
    });
  }
);

module.exports = router;