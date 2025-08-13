const Preregistration = require('../models/Preregistration.model');
const User = require('../models/User');
const { validatePreregistration } = require('../utils/validation');
const { sendPreregistrationEmail, sendWelcomeEmail } = require('../utils/email');
const { generateReferralCode } = require('../utils/helpers');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Create new preregistration
exports.createPreregistration = async (req, res) => {
  try {
    const { error } = validatePreregistration(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const {
      email,
      telegram,
      fullName,
      country,
      estimatedAmount,
      currency = 'USDT',
      referralCode,
      acceptedTerms,
      acceptedRisk,
      language = 'es',
      source = 'website'
    } = req.body;

    // Check if user already exists
    if (email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already registered with this email'
        });
      }

      // Check if already preregistered
      const existingPreregistration = await Preregistration.findOne({
        email: email.toLowerCase(),
        status: { $in: ['pending', 'contacted'] }
      });
      
      if (existingPreregistration) {
        return res.status(409).json({
          success: false,
          message: 'Email already preregistered'
        });
      }
    }

    if (telegram) {
      const existingUser = await User.findOne({ telegram });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already registered with this Telegram'
        });
      }

      const existingPreregistration = await Preregistration.findOne({
        telegram,
        status: { $in: ['pending', 'contacted'] }
      });
      
      if (existingPreregistration) {
        return res.status(409).json({
          success: false,
          message: 'Telegram already preregistered'
        });
      }
    }

    // Validate referral code if provided
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode });
      if (!referrer) {
        return res.status(400).json({
          success: false,
          message: 'Invalid referral code'
        });
      }
    }

    // Determine priority based on amount
    let priority = 'normal';
    if (estimatedAmount >= 5000) {
      priority = 'urgent';
    } else if (estimatedAmount >= 1000) {
      priority = 'high';
    }

    // Create preregistration
    const preregistration = new Preregistration({
      email: email?.toLowerCase(),
      telegram,
      fullName,
      country,
      estimatedAmount,
      currency,
      referralCode,
      referredBy: referrer?._id,
      acceptedTerms,
      acceptedRisk,
      language,
      source,
      priority,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      verification: {
        token: crypto.randomBytes(32).toString('hex'),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    await preregistration.save();

    // Send confirmation email if email provided
    if (email) {
      try {
        await sendPreregistrationEmail(
          email,
          preregistration.verification.token,
          fullName,
          language,
          estimatedAmount
        );
      } catch (emailError) {
        logger.error('Failed to send preregistration email:', emailError);
        // Don't fail preregistration if email fails
      }
    }

    // Log preregistration
    logger.info(`New preregistration: ${email || telegram}`, {
      preregistrationId: preregistration._id,
      email,
      telegram,
      country,
      estimatedAmount,
      priority,
      referredBy: referrer?._id,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Preregistration completed successfully',
      data: {
        id: preregistration._id,
        email: preregistration.email,
        telegram: preregistration.telegram,
        fullName: preregistration.fullName,
        country: preregistration.country,
        estimatedAmount: preregistration.estimatedAmount,
        currency: preregistration.currency,
        priority: preregistration.priority,
        status: preregistration.status,
        needsVerification: !!email
      }
    });

  } catch (error) {
    logger.error('Preregistration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify preregistration email
exports.verifyPreregistration = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    const preregistration = await Preregistration.findOne({
      'verification.token': token,
      'verification.expires': { $gt: new Date() },
      status: 'pending'
    });

    if (!preregistration) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Mark as verified
    preregistration.verification.verified = true;
    preregistration.verification.verifiedAt = new Date();
    preregistration.verification.token = undefined;
    preregistration.verification.expires = undefined;
    
    await preregistration.save();

    logger.info(`Preregistration verified: ${preregistration.email}`, {
      preregistrationId: preregistration._id
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        verified: true,
        email: preregistration.email
      }
    });

  } catch (error) {
    logger.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Resend verification email
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const preregistration = await Preregistration.findOne({
      email: email.toLowerCase(),
      status: 'pending',
      'verification.verified': false
    });

    if (!preregistration) {
      return res.status(404).json({
        success: false,
        message: 'Preregistration not found or already verified'
      });
    }

    // Generate new token
    preregistration.verification.token = crypto.randomBytes(32).toString('hex');
    preregistration.verification.expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await preregistration.save();

    // Send new verification email
    try {
      await sendPreregistrationEmail(
        email,
        preregistration.verification.token,
        preregistration.fullName,
        preregistration.language,
        preregistration.estimatedAmount
      );
    } catch (emailError) {
      logger.error('Failed to resend verification email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get preregistration statistics (public)
exports.getStats = async (req, res) => {
  try {
    const stats = await Preregistration.getStats();
    
    const result = {
      total: 0,
      totalEstimatedCapital: 0,
      averageAmount: 0,
      byStatus: {
        pending: 0,
        contacted: 0,
        converted: 0,
        rejected: 0
      }
    };

    if (stats.length > 0) {
      const data = stats[0];
      result.total = data.total;
      result.totalEstimatedCapital = data.totalEstimatedCapital;
      result.averageAmount = Math.round(data.totalEstimatedCapital / data.total);
      
      data.statuses.forEach(status => {
        result.byStatus[status.status] = status.count;
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Convert preregistration to full registration
exports.convertToRegistration = async (req, res) => {
  try {
    const { preregistrationId } = req.params;
    const {
      password,
      acceptedTerms,
      acceptedRisk,
      acceptedMarketing = false
    } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    const preregistration = await Preregistration.findById(preregistrationId);
    
    if (!preregistration) {
      return res.status(404).json({
        success: false,
        message: 'Preregistration not found'
      });
    }

    if (preregistration.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Preregistration already processed'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: preregistration.email },
        { telegram: preregistration.telegram }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Generate unique referral code
    let newReferralCode;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      newReferralCode = generateReferralCode();
      const existing = await User.findOne({ referralCode: newReferralCode });
      if (!existing) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: 'Unable to generate unique referral code'
      });
    }

    // Create new user
    const user = new User({
      email: preregistration.email,
      telegram: preregistration.telegram,
      password,
      fullName: preregistration.fullName,
      country: preregistration.country,
      language: preregistration.language,
      referralCode: newReferralCode,
      referredBy: preregistration.referredBy,
      status: 'active',
      verification: {
        email: {
          verified: preregistration.verification?.verified || false,
          token: crypto.randomBytes(32).toString('hex'),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      },
      settings: {
        notifications: {
          email: true,
          telegram: !!preregistration.telegram,
          marketing: acceptedMarketing
        },
        privacy: {
          showInLeaderboard: true,
          allowReferrals: true
        }
      }
    });

    await user.save();

    // Convert preregistration
    await preregistration.convertToUser(user._id);

    // Send welcome email
    if (preregistration.email) {
      try {
        await sendWelcomeEmail(
          preregistration.email,
          preregistration.fullName,
          preregistration.language
        );
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
      }
    }

    logger.info(`Preregistration converted to user: ${preregistration.email || preregistration.telegram}`, {
      preregistrationId: preregistration._id,
      userId: user._id
    });

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          telegram: user.telegram,
          fullName: user.fullName,
          country: user.country,
          language: user.language,
          referralCode: user.referralCode,
          status: user.status
        }
      }
    });

  } catch (error) {
    logger.error('Convert to registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};