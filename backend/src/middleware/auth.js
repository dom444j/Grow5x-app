<<<<<<< HEAD
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Required authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Get user from database
    let user;
    
    if (mongoose.connection.readyState === 1) {
      // Database is connected, find user
      try {
        // Check if userId is a valid ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(decoded.userId)) {
          user = await User.findById(decoded.userId).select('-password');
        } else {
          // Invalid ObjectId format, user not found
          user = null;
        }
      } catch (dbError) {
        // Database query failed
        logger.error('Database query failed:', dbError);
        user = null;
      }
    } else {
      // Database not connected
      logger.error('Database not connected');
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }
=======
/**
 * Authentication Middleware
 * Handles JWT token validation and user authentication
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');

/**
 * JWT Authentication Middleware
 * Validates JWT token and attaches user to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Try to get token from cookie first, then from Authorization header
    const cookieToken = req.cookies?.access_token;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    const token = cookieToken || bearerToken;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by custom userId field
    const user = await User.findOne({ userId: decoded.userId }).select('-password');
>>>>>>> clean-reset
    
    if (!user) {
      return res.status(401).json({
        success: false,
<<<<<<< HEAD
        message: 'User not found'
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is not active'
      });
    }

    // Check if user is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
=======
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada',
        code: 'ACCOUNT_DISABLED'
      });
    }
    
    // Check if user is verified (if verification is required)
    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta no verificada',
        code: 'ACCOUNT_NOT_VERIFIED'
      });
    }
    
    // Check token version for session invalidation
    const tokenVersion = decoded.tokenVersion || 0;
    const userTokenVersion = user.tokenVersion || 0;
    
    if (tokenVersion !== userTokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Sesión invalidada. Por favor, inicia sesión nuevamente',
        code: 'TOKEN_INVALIDATED'
      });
    }
    
    // Attach user to request
    req.user = user;
    req.userId = user.userId;
    
    // Log successful authentication
    logger.debug('User authenticated successfully', {
      userId: user.userId,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    next();
    
  } catch (error) {
    logger.error('Authentication error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
>>>>>>> clean-reset
    });
  }
};

<<<<<<< HEAD
// Optional authentication middleware
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      req.user = null;
      return next();
    }

    // Get user from database
    let user;
    
    if (mongoose.connection.readyState === 1) {
      // Database is connected, find user
      try {
        // Check if userId is a valid ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(decoded.userId)) {
          user = await User.findById(decoded.userId).select('-password');
        } else {
          // Invalid ObjectId format, user not found
          user = null;
        }
      } catch (dbError) {
        // Database query failed
        logger.error('Database query failed:', dbError);
        user = null;
      }
    } else {
      // Database not connected, continue without user
      user = null;
    }
    
    if (!user || user.status !== 'active') {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    req.user = null;
    next();
  }
};

// Admin role middleware
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    logger.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Moderator role middleware
const requireModerator = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const allowedRoles = ['admin', 'superadmin', 'moderator'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Moderator access required'
      });
    }

    next();
  } catch (error) {
    logger.error('Moderator middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Email verification middleware
const requireEmailVerification = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Skip email verification in test mode
    if (process.env.TEST_E2E === 'true') {
      return next();
    }

    if (!req.user.verification?.email?.verified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    next();
  } catch (error) {
    logger.error('Email verification middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Check specific permissions
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Superadmin has all permissions
      if (req.user.role === 'superadmin') {
        return next();
      }

      // Check if user has the specific permission
      if (!req.user.permissions || !req.user.permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Permission '${permission}' required`
        });
      }

      next();
    } catch (error) {
      logger.error('Permission middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Rate limiting by user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    if (requests.has(userId)) {
      const userRequests = requests.get(userId).filter(time => time > windowStart);
      requests.set(userId, userRequests);
    }
    
    const userRequests = requests.get(userId) || [];
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
    }
    
    userRequests.push(now);
    requests.set(userId, userRequests);
    
    next();
  };
};

// Check if user owns resource
const requireOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const resourceId = req.params[resourceIdParam];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Admin can access any resource
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        req.resource = resource;
        return next();
      }

      // Check ownership
      if (resource.userId?.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Ownership middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Generate JWT token
const generateToken = (userId, expiresIn = '7d') => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
=======
// Import the unified requireAdmin middleware
const requireAdmin = require('./requireAdmin');

/**
 * Optional Authentication Middleware
 * Attaches user to request if token is provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Try to get token from cookie first, then from Authorization header
    const cookieToken = req.cookies?.access_token;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.split(' ')[1];
    
    const token = cookieToken || bearerToken;
    
    if (!token) {
      // No token provided, continue without user
      return next();
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by userId field (not MongoDB _id)
    const user = await User.findOne({ userId: decoded.userId }).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
      req.userId = user._id;
    }
    
    next();
    
  } catch (error) {
    // If token is invalid, continue without user (don't throw error)
    logger.debug('Optional auth failed, continuing without user', {
      error: error.message,
      ip: req.ip
    });
    
    next();
  }
};

/**
 * Generate JWT Token
 * Creates a new JWT token for the user
 */
const generateToken = (user) => {
  const payload = {
    userId: user.userId,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion || 0
  };
  
  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'grow5x-api',
    audience: 'grow5x-client'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Verify JWT Token
 * Verifies a JWT token and returns the decoded payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Extract User ID from Token
 * Extracts user ID from JWT token without full verification
 */
const extractUserIdFromToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded?.userId || null;
>>>>>>> clean-reset
  } catch (error) {
    return null;
  }
};

module.exports = {
<<<<<<< HEAD
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireModerator,
  requireEmailVerification,
  requirePermission,
  requireOwnership,
  userRateLimit,
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken
=======
  authenticateToken,
  requireAdmin,
  optionalAuth,
  generateToken,
  verifyToken,
  extractUserIdFromToken
>>>>>>> clean-reset
};