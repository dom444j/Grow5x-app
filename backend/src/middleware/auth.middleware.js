const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { createResponse } = require('../utils/helpers');
const { authProtection } = require('./auth-protection');

// Load User model
const User = require('../models/User');

// Authenticate JWT token with enhanced protection
const authenticateToken = async (req, res, next) => {
  try {
    // Usar el sistema de protección blindado para extraer y validar el token
    const authResult = await authProtection.validateRequest(req);
    
    if (!authResult.success) {
      logger.logAuthEvent('auth_protection_failed', {
        error: authResult.error,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });
      
      return res.status(401).json(
        createResponse(false, authResult.error, null, authResult.code || 'AUTH_FAILED')
      );
    }
    
    const { token, decoded, user } = authResult.data;
    
    // El sistema de protección ya validó el usuario y el token
    // Solo necesitamos verificaciones adicionales específicas del negocio
    
    // Verificación adicional de estado del usuario (por si cambió después del caché)
    if (user.status !== 'active') {
      logger.logAuthEvent('inactive_user_access', {
        userId: user._id,
        status: user.status,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json(
        createResponse(false, 'Account is not active', null, 'ACCOUNT_INACTIVE')
      );
    }

    // Verificación adicional de cuenta bloqueada
    if (user.isLocked) {
      logger.logAuthEvent('locked_account_access', {
        userId: user._id,
        lockUntil: user.lockUntil,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json(
        createResponse(false, 'Account is temporarily locked', null, 'ACCOUNT_LOCKED')
      );
    }

    // Add user to request object
    req.user = user;
    req.token = token;
    req.tokenData = decoded;

    // Log successful authentication
    logger.logAuthEvent('token_validated', {
      userId: user._id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.logAuthEvent('invalid_token', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json(
        createResponse(false, 'Invalid token', null, 'INVALID_TOKEN')
      );
    }

    if (error.name === 'TokenExpiredError') {
      logger.logAuthEvent('token_expired', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json(
        createResponse(false, 'Token expired', null, 'TOKEN_EXPIRED')
      );
    }

    // Handle CastError specifically (invalid ObjectId)
    if (error.name === 'CastError') {
      logger.error('Auth middleware error:', error.message);
      return res.status(401).json(
        createResponse(false, 'Invalid user ID', null, 'INVALID_USER_ID')
      );
    }

    logger.logAuthEvent('authentication_error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(500).json(
      createResponse(false, 'Authentication error', null, 'AUTH_ERROR')
    );
  }
};

// Optional authentication with enhanced protection (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    // Intentar validar con el sistema de protección blindado
    const authResult = await authProtection.validateRequest(req, { optional: true });
    
    if (authResult.success) {
      const { token, decoded, user } = authResult.data;
      
      // Verificar que el usuario esté en buen estado
      if (user && user.status === 'active' && !user.isLocked) {
        req.user = user;
        req.token = token;
        req.tokenData = decoded;
      }
    }

    // Siempre continuar, incluso si falla la autenticación
    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

// Require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json(
      createResponse(false, 'Authentication required', null, 'AUTH_REQUIRED')
    );
  }

  if (req.user.role !== 'admin') {
    logger.logSecurityEvent('unauthorized_admin_access', {
      userId: req.user._id,
      role: req.user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });
    
    return res.status(403).json(
      createResponse(false, 'Admin access required', null, 'ADMIN_REQUIRED')
    );
  }

  next();
};

// Require pioneer status - DISABLED
const requirePioneer = (req, res, next) => {
  // Pioneer status disabled - permitir acceso sin verificación
  next();
  return;
  
  /* CÓDIGO ORIGINAL DESHABILITADO
  if (!req.user) {
    return res.status(401).json(
      createResponse(false, 'Authentication required', null, 'AUTH_REQUIRED')
    );
  }

  if (!req.user.isPioneer || req.user.pioneerStatus !== 'active') {
    logger.logSecurityEvent('unauthorized_pioneer_access', {
      userId: req.user._id,
      isPioneer: req.user.isPioneer,
      pioneerStatus: req.user.pioneerStatus,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });
    
    return res.status(403).json(
      createResponse(false, 'Pioneer status required', null, 'PIONEER_REQUIRED')
    );
  }
  */

  /* VERIFICACIÓN DE EXPIRACIÓN DESHABILITADA
  // Check if pioneer status has expired
  if (req.user.pioneerExpiresAt && req.user.pioneerExpiresAt < new Date()) {
    logger.logSecurityEvent('expired_pioneer_access', {
      userId: req.user._id,
      pioneerExpiresAt: req.user.pioneerExpiresAt,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(403).json(
      createResponse(false, 'Pioneer status has expired', null, 'PIONEER_EXPIRED')
    );
  }
  */

  // next(); ya se ejecuta arriba
};

// Require verified email
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json(
      createResponse(false, 'Authentication required', null, 'AUTH_REQUIRED')
    );
  }

  // Skip email verification in test mode
  if (process.env.TEST_E2E === 'true') {
    return next();
  }

  if (!req.user.verification.isVerified) {
    return res.status(403).json(
      createResponse(false, 'Email verification required', null, 'EMAIL_NOT_VERIFIED')
    );
  }

  next();
};

// Require verified Telegram
const requireVerifiedTelegram = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json(
      createResponse(false, 'Authentication required', null, 'AUTH_REQUIRED')
    );
  }

  if (!req.user.telegram || !req.user.verification.telegramVerified) {
    return res.status(403).json(
      createResponse(false, 'Telegram verification required', null, 'TELEGRAM_NOT_VERIFIED')
    );
  }

  next();
};

// Check if user owns resource
const requireOwnership = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(
        createResponse(false, 'Authentication required', null, 'AUTH_REQUIRED')
      );
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check ownership based on resource field
    const resourceUserId = req.params.userId || req.body[resourceField] || req.query[resourceField];
    
    if (!resourceUserId || resourceUserId.toString() !== req.user._id.toString()) {
      logger.logSecurityEvent('unauthorized_resource_access', {
        userId: req.user._id,
        resourceUserId,
        resourceField,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });
      
      return res.status(403).json(
        createResponse(false, 'Access denied', null, 'ACCESS_DENIED')
      );
    }

    next();
  };
};

// Rate limiting by user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (userRequests.has(userId)) {
      const requests = userRequests.get(userId).filter(time => time > windowStart);
      userRequests.set(userId, requests);
    } else {
      userRequests.set(userId, []);
    }

    const requests = userRequests.get(userId);

    if (requests.length >= maxRequests) {
      logger.logSecurityEvent('user_rate_limit_exceeded', {
        userId,
        requestCount: requests.length,
        maxRequests,
        windowMs,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(429).json(
        createResponse(false, 'Too many requests', null, 'RATE_LIMIT_EXCEEDED')
      );
    }

    requests.push(now);
    userRequests.set(userId, requests);

    next();
  };
};

// Validate API key (for external integrations)
const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json(
        createResponse(false, 'API key required', null, 'API_KEY_REQUIRED')
      );
    }

    // Find user by API key
    const user = await User.findOne({ 'settings.apiKey': apiKey }).select('-password');

    if (!user) {
      logger.logSecurityEvent('invalid_api_key', {
        apiKey: apiKey.substring(0, 8) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json(
        createResponse(false, 'Invalid API key', null, 'INVALID_API_KEY')
      );
    }

    if (user.status !== 'active') {
      return res.status(401).json(
        createResponse(false, 'Account is not active', null, 'ACCOUNT_INACTIVE')
      );
    }

    req.user = user;
    req.apiKeyAuth = true;

    logger.logAuthEvent('api_key_validated', {
      userId: user._id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    logger.logAuthEvent('api_key_validation_error', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(500).json(
      createResponse(false, 'API key validation error', null, 'API_KEY_ERROR')
    );
  }
};

// Check maintenance mode
const checkMaintenanceMode = (req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    // Allow admin access during maintenance
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    return res.status(503).json(
      createResponse(false, 'System is under maintenance', {
        maintenanceMode: true,
        estimatedDuration: process.env.MAINTENANCE_DURATION || 'Unknown'
      }, 'MAINTENANCE_MODE')
    );
  }

  next();
};

// Log user activity
const logActivity = (action) => {
  return (req, res, next) => {
    if (req.user) {
      logger.logAuthEvent('user_activity', {
        userId: req.user._id,
        action,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requirePioneer,
  requireVerifiedEmail,
  requireVerifiedTelegram,
  requireOwnership,
  userRateLimit,
  validateApiKey,
  checkMaintenanceMode,
  logActivity
};