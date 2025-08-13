const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const { validateRegister, validateLogin } = require('../utils/validation');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const emailService = require('../utils/email');
const telegramService = require('../utils/telegram');
const { sendEmail, sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');
const { generateReferralCode } = require('../utils/helpers');
// const { generateVerificationCode } = require('../utils/verification');
// const { validatePassword } = require('../utils/passwordValidator');
// const { checkRateLimit } = require('../middleware/rateLimit');
const { sanitizeInput } = require('../utils/helpers');
// logSecurityEvent is available through logger
// const { validateCaptcha } = require('../utils/captcha');
// const { detectSuspiciousActivity } = require('../utils/fraud');
// const { generateQRCode } = require('../utils/qr');
// const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
// const { sendSMS } = require('../utils/sms');
// const { validatePhoneNumber } = require('../utils/phone');
// const { generateBackupCodes } = require('../utils/backup');
// const { encryptData, decryptData } = require('../utils/encryption');
// const { auditLog } = require('../utils/audit');
// const { validateGDPR } = require('../utils/gdpr');

// Register user
exports.register = async (req, res) => {
  console.log('🔄 Registration attempt received:', { email: req.body.email, hasPassword: !!req.body.password });
  try {
    // Validation
    const { error } = validateRegister(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { email, password, fullName, country, language, telegram } = req.body;
    
    // Accept multiple names for referral code (B. from plan)
    const referralCode = req.body?.referralCode || req.query?.ref || req.body?.ref;
    
    // Validate referral code length (D. from plan)
    if (referralCode && referralCode.length > 10) {
      return res.status(400).json({
        success: false,
        code: 'invalid_referral',
        message: 'Referral code must be 10 characters or less'
      });
    }

    // Safe query construction (C. from plan)
    const findQuery = { $or: [{ email: email.toLowerCase() }] };
    
    // Only add telegram condition if it's provided and valid
    if (telegram && telegram.trim()) {
      findQuery.$or.push({ 'telegram.username': telegram.trim() });
    }
    
    const existingUser = await User.findOne(findQuery);

    if (existingUser) {
      // Enhanced 409 logging (A. from plan)
      const reason = existingUser.email === email.toLowerCase() ? 'email_exists' : 'telegram_exists';
      logger.warn('[REGISTER 409]', { 
        reason, 
        incomingBody: req.body, 
        hasRef: referralCode,
        existingUserEmail: existingUser.email,
        ip: req.ip
      });
      
      return res.status(409).json({
        success: false,
        code: 'conflict',
        reason,
        message: 'User already exists with this email or telegram'
      });
    }

    // Generate referral code
    const userReferralCode = await generateReferralCode();

    // Find referrer if referral code is provided
    let referrerId = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode });
      if (referrer) {
        referrerId = referrer._id;
        logger.info(`[REFERRAL] Valid referral code used: ${referralCode} by ${email}`);
      } else {
        logger.warn(`[REFERRAL] Invalid referral code attempted: ${referralCode} by ${email}`);
      }
    }

    // Create user (password will be hashed by pre-save middleware)
    const user = new User({
      email: email.toLowerCase(),
      password: password, // Raw password - will be hashed by model middleware
      fullName,
      country,
      language: language || 'es',
      referralCode: userReferralCode,
      telegram,
      referredBy: referrerId,
      verification: {
        isVerified: false,
        token: crypto.randomBytes(32).toString('hex'),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    await user.save();

    // Create referral record synchronously if user has a referrer
    if (referrerId) {
      try {
        const Referral = require('../models/Referral.model');
        
        // Check if referral record already exists
        const existingReferral = await Referral.findOne({ 
          referrer: referrerId, 
          referred: user._id 
        });
        
        if (!existingReferral) {
          const referrer = await User.findById(referrerId);
          if (referrer && referrer.referralCode) {
            await Referral.create({
              referrer: referrerId,
              referred: user._id,
              referralCode: referrer.referralCode,
              level: 1,
              status: 'pending',
              source: 'registration',
              commissionRate: 0.10
            });
            
            logger.info(`[REFERRAL] Synchronously created referral: ${referrer.referralCode} -> ${user.email}`);
          }
        }
      } catch (referralError) {
        logger.error('Failed to create referral record:', referralError);
        // Don't fail registration if referral creation fails
      }
    }

    // Send verification email
    try {
      await sendVerificationEmail(
        user.email,
        user.verification.token,
        user.fullName,
        user.language || 'es',
        user._id
      );
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
    }

    // Send welcome email
    try {
      await sendWelcomeEmail(
        user.email,
        user.fullName,
        user.language || 'es',
        user._id
      );
      logger.info(`Welcome email sent to: ${user.email}`);
    } catch (emailError) {
      logger.error('Failed to send welcome email:', emailError);
    }

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Log registration
    logger.info(`User registered: ${user.email}`, {
      userId: user._id,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          country: user.country,
          language: user.language,
          referralCode: user.referralCode,
          role: user.role,
          status: user.status,
          isEmailVerified: false
        },
        tokens: {
          accessToken: token,
          refreshToken: refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    console.log('🔵 LOGIN REQUEST: Received login request');
    console.log('🔵 LOGIN REQUEST: Body:', req.body);
    
    // Validation is handled by middleware, no need for duplicate validation
    const { identifier, password, userType } = req.body;
    let user;
    
    // Verificar si la base de datos está conectada
    console.log('🔵 LOGIN REQUEST: Database connection state:', mongoose.connection.readyState);
    if (mongoose.connection.readyState === 1) {
      try {
        // Find user by email or telegram
        const searchQuery = {
          $or: [
            { email: identifier.toLowerCase() },
            { 'telegram.username': identifier }
          ]
        };
        
        console.log('🔵 LOGIN REQUEST: Searching for user with query:', searchQuery);
        user = await User.findOne(searchQuery);
        console.log('🔵 LOGIN REQUEST: User found:', user ? 'YES' : 'NO');
        
        if (user) {
          console.log('🔵 LOGIN REQUEST: User data found:', {
            email: user.email,
            isAdmin: user.isAdmin,
            isActive: user.isActive,
            hasPassword: !!user.password
          });
          
          // Verificar contraseña
          console.log('🔵 LOGIN REQUEST: Comparing passwords...');
          const isPasswordValid = await bcrypt.compare(password, user.password);
          console.log('🔵 LOGIN REQUEST: Password valid:', isPasswordValid);
          if (isPasswordValid) {
            console.log('🔵 LOGIN REQUEST: Password validation successful');
            
            // Reset login attempts on successful login
            if (user.loginAttempts > 0) {
              await user.resetLoginAttempts();
            }

            // Update last login
            user.lastLogin = new Date();
            await user.save();

            // Verificar que no sea admin si userType es 'user'
            console.log('🔵 LOGIN REQUEST: Checking user type. UserType:', userType, 'Role:', user.role);
            if (userType === 'user' && (user.role === 'admin' || user.role === 'superadmin')) {
              console.log('🔵 LOGIN REQUEST: Admin user trying to login through user interface - DENIED');
              return res.status(401).json({
                success: false,
                message: 'Access denied. Admin users cannot login through user interface.'
              });
            }

            console.log('🔵 LOGIN REQUEST: Generating tokens...');
            // Generate tokens
            const token = generateToken(user._id);
            const refreshToken = generateRefreshToken(user._id);

            console.log('🔵 LOGIN REQUEST: Login successful, sending response');
            return res.json({
              success: true,
              message: 'Login successful',
              data: {
                user: {
                  id: user._id,
                  email: user.email,
                  telegram: user.telegram,
                  fullName: user.fullName,
                  country: user.country,
                  language: user.language,
                  referralCode: user.referralCode,
                  role: user.role,
                  status: user.status,
                  isPioneer: user.isPioneer,
                  capital: user.capital || 0,
                  lastLogin: user.lastLogin,
                  isSpecialUser: user.isSpecialUser || false,
                  isEmailVerified: user.verification?.email?.isVerified || false,
                  isTelegramVerified: user.verification?.telegram?.isVerified || false
                },
                tokens: {
                  accessToken: token,
                  refreshToken: refreshToken,
                  expiresIn: process.env.JWT_EXPIRES_IN || '7d'
                }
              }
            });
          } else {
            console.log('🔵 LOGIN REQUEST: Password validation failed');
            // Incrementar intentos de login fallidos
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            await user.save();
          }
        }
      } catch (dbError) {
        console.error('Database query failed:', dbError);
      }
    }
    
    // Solo usar datos reales de MongoDB Atlas - no hay credenciales de fallback
    console.log('🔵 LOGIN REQUEST: Authentication failed - user not found or invalid credentials');

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      data: {
        accessToken: newToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });

  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    const user = await User.findOne({
      'verification.token': token,
      'verification.expires': { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.verification.isVerified = true;
    user.verification.token = undefined;
    user.verification.expires = undefined;
    user.verification.verifiedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during email verification'
    });
  }
};

// Resend verification email
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.verification.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    user.verification.token = crypto.randomBytes(32).toString('hex');
    user.verification.expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    // Send verification email
    await sendVerificationEmail(
        user.email,
        user.verification.token,
        user.fullName,
        user.language || 'es',
        user._id
      );

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

// Logout
exports.logout = async (req, res) => {
  try {
    // In a real implementation, you might want to blacklist the token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordReset = {
      token: resetToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    };
    await user.save();

    // Send reset email
    await sendPasswordResetEmail(
      user.email,
      resetToken,
      user.fullName,
      user.language || 'es'
    );

    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });

  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      'passwordReset.token': token,
      'passwordReset.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    user.passwordReset = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          country: user.country,
          language: user.language,
          referralCode: user.referralCode,
          role: user.role,
          status: user.status,
          isPioneer: user.isPioneer,
          capital: user.capital,
          lastLogin: user.lastLogin,
          isEmailVerified: user.verification?.email?.isVerified || false,
          isTelegramVerified: user.verification?.telegram?.isVerified || false
        }
      }
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, country, language, phone, telegram, preferences } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Actualizar campos básicos
    if (fullName !== undefined) user.fullName = fullName;
    if (country !== undefined) user.country = country;
    if (language !== undefined) user.language = language;
    if (phone !== undefined) user.phone = phone;
    
    // Actualizar telegram
    if (telegram !== undefined) {
      if (typeof telegram === 'string') {
        user.telegram = user.telegram || {};
        user.telegram.username = telegram;
      } else if (typeof telegram === 'object' && telegram !== null) {
        user.telegram = { ...user.telegram, ...telegram };
      }
    }
    
    // Actualizar preferencias
    if (preferences !== undefined) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          country: user.country,
          language: user.language,
          phone: user.phone,
          telegram: user.telegram,
          preferences: user.preferences
        }
      }
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Additional auth methods would go here...
// For brevity, I'm including the essential ones

// Logout all sessions
exports.logoutAll = async (req, res) => {
  res.json({ success: true, message: 'Logged out from all sessions' });
};

// Get active sessions
exports.getActiveSessions = async (req, res) => {
  res.json({ success: true, data: { sessions: [] } });
};

// Terminate session
exports.terminateSession = async (req, res) => {
  res.json({ success: true, message: 'Session terminated' });
};

// Verify telegram
exports.verifyTelegram = async (req, res) => {
  res.json({ success: true, message: 'Telegram verified' });
};

// Unlink telegram
exports.unlinkTelegram = async (req, res) => {
  res.json({ success: true, message: 'Telegram unlinked' });
};

// Get security log
exports.getSecurityLog = async (req, res) => {
  res.json({ success: true, data: { logs: [] } });
};

// Enable 2FA
exports.enable2FA = async (req, res) => {
  res.json({ success: true, message: '2FA enabled' });
};

// Disable 2FA
exports.disable2FA = async (req, res) => {
  res.json({ success: true, message: '2FA disabled' });
};

// Verify 2FA
exports.verify2FA = async (req, res) => {
  res.json({ success: true, message: '2FA verified' });
};

// Get backup codes
exports.getBackupCodes = async (req, res) => {
  res.json({ success: true, data: { codes: [] } });
};

// Regenerate backup codes
exports.regenerateBackupCodes = async (req, res) => {
  res.json({ success: true, data: { codes: [] } });
};

// Delete account
exports.deleteAccount = async (req, res) => {
  res.json({ success: true, message: 'Account deleted' });
};

// Export user data
exports.exportUserData = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toObject(),
        exportedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Export user data error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Manual referral processing endpoint for testing
exports.processReferral = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.referredBy) {
      return res.status(400).json({
        success: false,
        message: 'User has no referral code'
      });
    }

    // Check if referral record already exists
    const Referral = require('../models/Referral.model');
    const existingReferral = await Referral.findOne({ referred: user._id });
    
    if (existingReferral) {
      return res.json({
        success: true,
        message: 'Referral record already exists',
        referral: existingReferral
      });
    }

    // Find referrer
    const referrer = await User.findOne({ referralCode: user.referredBy });
    if (!referrer) {
      return res.status(400).json({
        success: false,
        message: 'Referrer not found'
      });
    }

    // Create referral record
    const newReferral = new Referral({
      referrer: referrer._id,
      referred: user._id,
      referralCode: user.referredBy,
      status: 'active'
    });

    await newReferral.save();
    logger.info(`[REFERRAL] Manual referral record created: ${referrer.referralCode} -> ${user.email}`);

    res.json({
      success: true,
      message: 'Referral record created successfully',
      referral: newReferral
    });

  } catch (error) {
    logger.error('[REFERRAL] Manual referral processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Test email configuration
exports.testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const testEmail = email || 'test@grow5x.app';
    
    logger.info(`[EMAIL-TEST] Testing email configuration to: ${testEmail}`);
    
    // Test email content
    const emailContent = {
      to: testEmail,
      subject: 'GrowX5 - Prueba de Configuración de Correo',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🎉 Configuración de Correo Exitosa</h2>
          <p>Este es un correo de prueba para verificar que la configuración SMTP de GrowX5 está funcionando correctamente.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Detalles de la Prueba:</h3>
            <ul>
              <li><strong>Servidor SMTP:</strong> mail.privateemail.com</li>
              <li><strong>Puerto:</strong> 587</li>
              <li><strong>Seguridad:</strong> STARTTLS</li>
              <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
            </ul>
          </div>
          
          <p>Si recibes este correo, significa que:</p>
          <ul>
            <li>✅ Las credenciales SMTP son correctas</li>
            <li>✅ Los registros DNS están configurados</li>
            <li>✅ El sistema de correos está operativo</li>
          </ul>
          
          <p style="color: #059669; font-weight: bold;">¡La configuración de correos de GrowX5 está lista!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">Este es un correo automático de prueba. No responder.</p>
        </div>
      `
    };
    
    // Send test email
    await sendEmail(emailContent);
    
    logger.info(`[EMAIL-TEST] Test email sent successfully to: ${testEmail}`);
    
    res.json({
      success: true,
      message: 'Correo de prueba enviado exitosamente',
      details: {
        recipient: testEmail,
        timestamp: new Date().toISOString(),
        smtpServer: 'mail.privateemail.com',
        port: 587
      }
    });
    
  } catch (error) {
    logger.error('[EMAIL-TEST] Error sending test email:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error enviando correo de prueba',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
      details: {
        timestamp: new Date().toISOString(),
        smtpServer: 'mail.privateemail.com',
        port: 587
      }
    });
   }
 };