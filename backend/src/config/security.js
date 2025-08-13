const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const logger = require('../utils/logger');

/**
 * Configuración de seguridad centralizada para Grow5X
 * Incluye CORS, Rate Limiting, Headers de seguridad y políticas CSP
 */

// Configuración de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          'https://grow5x.app',
          'https://www.grow5x.app',
          'https://admin.grow5x.app'
        ]
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
          'http://80.78.25.79:5173',
          'http://80.78.25.79:3000'
        ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  maxAge: 86400, // 24 horas
  optionsSuccessStatus: 200
};

// Rate Limiting - General API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.TEST_E2E === 'true' ? 10000 : 100, // máximo requests por ventana por IP
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: 1, // Trust first proxy
  message: {
    error: 'Demasiadas solicitudes, intenta más tarde',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60 // segundos
  },
  skip: (req) => {
    // Skip rate limiting para health checks y modo TEST_E2E
    if (process.env.TEST_E2E === 'true') return true;
    return req.path === '/health' || req.path === '/api/health';
  },
  handler: (req, res) => {
    logger.warn('Rate limit reached', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    res.status(429).json({
      error: 'Demasiadas solicitudes, intenta más tarde',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60
    });
  }
});

// Rate Limiting - Autenticación (más estricto)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: process.env.TEST_E2E === 'true' ? 10000 : 10, // máximo intentos por hora
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: 1, // Trust first proxy
  message: {
    error: 'Demasiados intentos de autenticación, intenta más tarde',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: 60 * 60
  },
  skip: (req) => {
    // Skip rate limiting en modo TEST_E2E
    return process.env.TEST_E2E === 'true';
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit reached', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    res.status(429).json({
      error: 'Demasiados intentos de autenticación, intenta más tarde',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: 60 * 60
    });
  }
});

// Rate Limiting - Admin (muy estricto)
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: process.env.TEST_E2E === 'true' ? 10000 : 50, // máximo requests por ventana
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: 1, // Trust first proxy
  message: {
    error: 'Límite de requests administrativos excedido',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED',
    retryAfter: 5 * 60
  },
  skip: (req) => {
    // Skip rate limiting en modo TEST_E2E
    return process.env.TEST_E2E === 'true';
  },
  handler: (req, res) => {
    logger.warn('Admin rate limit reached', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      user: req.user?.id
    });
    res.status(429).json({
      error: 'Límite de requests administrativos excedido',
      code: 'ADMIN_RATE_LIMIT_EXCEEDED',
      retryAfter: 5 * 60
    });
  }
});

// Configuración de Helmet - Headers de seguridad
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net'
      ],
      imgSrc: [
        "'self'",
        'data:',
        'https:',
        'blob:'
      ],
      scriptSrc: [
        "'self'",
        process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : null
      ].filter(Boolean),
      connectSrc: [
        "'self'",
        process.env.NODE_ENV === 'development' ? 'ws://localhost:*' : null,
        process.env.NODE_ENV === 'development' ? 'http://localhost:*' : null,
        process.env.NODE_ENV === 'development' ? 'http://80.78.25.79:*' : null
      ].filter(Boolean),
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    },
    reportOnly: process.env.NODE_ENV === 'development'
  },
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Headers de seguridad adicionales
const additionalSecurityHeaders = (req, res, next) => {
  // Prevenir información del servidor
  res.removeHeader('X-Powered-By');
  
  // Headers adicionales de seguridad
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Cache control para rutas sensibles
  if (req.path.includes('/admin') || req.path.includes('/api/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

// Middleware de validación de IP (opcional)
const ipValidation = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Lista de IPs bloqueadas (se puede cargar desde base de datos)
  const blockedIPs = process.env.BLOCKED_IPS ? process.env.BLOCKED_IPS.split(',') : [];
  
  if (blockedIPs.includes(clientIP)) {
    logger.warn('Blocked IP attempted access', { ip: clientIP, path: req.path });
    return res.status(403).json({
      error: 'Access denied',
      code: 'IP_BLOCKED'
    });
  }
  
  next();
};

// Middleware de detección de ataques comunes
const attackDetection = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const path = req.path.toLowerCase();
  const query = JSON.stringify(req.query).toLowerCase();
  const body = JSON.stringify(req.body).toLowerCase();
  
  // Patrones sospechosos
  const suspiciousPatterns = [
    /script.*alert/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /<script/i,
    /union.*select/i,
    /drop.*table/i,
    /insert.*into/i,
    /delete.*from/i
  ];
  
  // User agents sospechosos
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burp/i,
    /nmap/i
  ];
  
  // Verificar patrones en path, query y body
  const content = `${path} ${query} ${body}`;
  const isSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(content));
  const isSuspiciousUserAgent = suspiciousUserAgents.some(pattern => pattern.test(userAgent));
  
  if (isSuspiciousContent || isSuspiciousUserAgent) {
    logger.warn('Suspicious request detected', {
      ip: req.ip,
      userAgent,
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body
    });
    
    return res.status(400).json({
      error: 'Bad request',
      code: 'SUSPICIOUS_REQUEST'
    });
  }
  
  next();
};

// Configuración de timeouts
const timeoutConfig = {
  server: 30000, // 30 segundos
  request: 25000, // 25 segundos
  keepAlive: 5000 // 5 segundos
};

module.exports = {
  corsOptions,
  generalLimiter,
  authLimiter,
  adminLimiter,
  helmetConfig,
  additionalSecurityHeaders,
  ipValidation,
  attackDetection,
  timeoutConfig
};