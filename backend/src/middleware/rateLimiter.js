const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');
const logger = require('../config/logger');
const { ipKeyGenerator } = require('express-rate-limit');

// MongoDB store for rate limiting (shared across instances)
const mongoStore = new MongoStore({
  uri: process.env.MONGODB_URI,
  collectionName: 'rate_limits',
  expireTimeMs: 15 * 60 * 1000 // 15 minutes
});

/**
 * Rate limiter for authentication endpoints
 * Stricter limits to prevent brute force attacks
 */
const authLimiter = rateLimit({
  store: mongoStore,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP + email for more granular limiting
    const email = req.body?.email || 'unknown';
    const ip = ipKeyGenerator(req);
    return `auth:${ip}:${email}`;
  },
  onLimitReached: (req, res, options) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      email: req.body?.email,
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * Rate limiter for payment endpoints
 * Moderate limits to prevent spam while allowing legitimate use
 */
const paymentLimiter = rateLimit({
  store: mongoStore,
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 payment actions per window
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many payment requests. Please try again in 10 minutes.',
    retryAfter: 10 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP + userId for authenticated requests
    const userId = req.user?.userId || 'anonymous';
    const ip = ipKeyGenerator(req);
    return `payment:${ip}:${userId}`;
  },
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  },
  onLimitReached: (req, res, options) => {
    logger.warn('Payment rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.userId,
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * Rate limiter for withdrawal endpoints
 * Stricter limits due to financial nature
 */
const withdrawalLimiter = rateLimit({
  store: mongoStore,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 withdrawal requests per hour
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many withdrawal requests. Please try again in 1 hour.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.userId || 'anonymous';
    const ip = ipKeyGenerator(req);
    return `withdrawal:${ip}:${userId}`;
  },
  onLimitReached: (req, res, options) => {
    logger.warn('Withdrawal rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.userId,
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * General API rate limiter
 * Broad protection against API abuse
 */
const generalLimiter = rateLimit({
  store: mongoStore,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    return `general:${ip}`;
  },
  skip: (req) => {
    // Skip rate limiting for health checks and static assets
    return req.path === '/api/admin/health' || req.path.startsWith('/static/');
  }
});

/**
 * Admin rate limiter
 * Moderate limits for admin operations
 */
const adminLimiter = rateLimit({
  store: mongoStore,
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // 200 admin actions per window (increased for development)
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many admin requests. Please try again in 5 minutes.',
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.userId || 'anonymous';
    const ip = ipKeyGenerator(req);
    return `admin:${ip}:${userId}`;
  },
  onLimitReached: (req, res, options) => {
    logger.warn('Admin rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.userId,
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * Rate limiter for admin reports endpoints
 * 60 requests per minute per IP (hardening requirement)
 */
const reportsLimiter = rateLimit({
  store: mongoStore,
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many report requests. Please try again in 1 minute.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.userId || 'anonymous';
    const ip = ipKeyGenerator(req);
    return `reports:${ip}:${userId}`;
  },
  onLimitReached: (req, res, options) => {
    logger.warn('Reports rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: req.path,
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * Rate limiter for CSV export endpoints
 * 6 requests per minute per IP (stricter for exports)
 */
const exportLimiter = rateLimit({
  store: mongoStore,
  windowMs: 60 * 1000, // 1 minute
  max: 6, // 6 export requests per minute
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many export requests. Please try again in 1 minute.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.userId || 'anonymous';
    const ip = ipKeyGenerator(req);
    return `export:${ip}:${userId}`;
  },
  onLimitReached: (req, res, options) => {
    logger.warn('Export rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.userId,
      dataset: req.query?.dataset,
      userAgent: req.get('User-Agent')
    });
  }
});

module.exports = {
  authLimiter,
  paymentLimiter,
  withdrawalLimiter,
  generalLimiter,
  adminLimiter,
  reportsLimiter,
  exportLimiter
};