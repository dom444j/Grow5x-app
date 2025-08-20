<<<<<<< HEAD
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Simple console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level}]: ${message}`;
  })
);

// File format
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: {
    service: 'grow5x-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Custom logging methods for specific categories
logger.auth = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'auth' });
};

logger.payment = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'payment' });
};

logger.security = (message, meta = {}) => {
  logger.warn(message, { ...meta, category: 'security' });
};

logger.api = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'api' });
};

logger.database = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'database' });
};

logger.email = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'email' });
};

logger.telegram = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'telegram' });
};

// Request logging middleware
logger.requestMiddleware = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip, headers } = req;
  
  logger.api(`${method} ${url}`, {
    ip,
    userAgent: headers['user-agent'],
    userId: req.user?.id
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    const logLevel = statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel](`${method} ${url} ${statusCode}`, {
      ip,
      statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id
    });
  });

  next();
};

// Error logging middleware
logger.errorMiddleware = (err, req, res, next) => {
  const { method, url, ip, user } = req;
  
  logger.error('Request error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      method,
      url,
      ip,
      userAgent: req.headers['user-agent'],
      userId: user?.id
    }
  });

  next(err);
};

// Utility logging functions
logger.logSecurityEvent = (event, details = {}) => {
  logger.security(`Security event: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logPaymentEvent = (event, details = {}) => {
  logger.payment(`Payment event: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logAuthEvent = (event, details = {}) => {
  logger.auth(`Auth event: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logDatabaseOperation = (operation, collection, details = {}) => {
  logger.database(`Database ${operation} on ${collection}`, {
    operation,
    collection,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logEmailEvent = (event, recipient, details = {}) => {
  logger.email(`Email event: ${event}`, {
    event,
    recipient: recipient.replace(/(.{2}).*(@.*)/, '$1***$2'),
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logTelegramEvent = (event, details = {}) => {
  logger.telegram(`Telegram event: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logPerformance = (operation, duration, details = {}) => {
  const level = duration > 1000 ? 'warn' : 'info';
  
  logger[level](`Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logRateLimit = (ip, endpoint, details = {}) => {
  logger.security('Rate limit exceeded', {
    ip,
    endpoint,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logSystemHealth = (metric, value, details = {}) => {
  logger.info(`System health: ${metric}`, {
    metric,
    value,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Cleanup function
logger.cleanupLogs = () => {
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  const now = Date.now();
  
  fs.readdir(logsDir, (err, files) => {
    if (err) {
      logger.error('Error reading logs directory:', err);
      return;
    }
    
    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlink(filePath, (err) => {
            if (err) {
              logger.error(`Error deleting old log file ${file}:`, err);
            } else {
              logger.info(`Deleted old log file: ${file}`);
            }
          });
        }
      });
    });
  });
};

// Simple startup log without complex metadata
logger.info('Logger initialized successfully');

module.exports = logger;
=======
/**
 * Simple logger utility for the application
 */

const logInfo = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] INFO: ${message}`);
  if (data) {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
};

const logError = (message, error = null) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`);
  if (error) {
    console.error('Error details:', error);
  }
};

const logWarn = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] WARN: ${message}`);
  if (data) {
    console.warn('Data:', JSON.stringify(data, null, 2));
  }
};

const logDebug = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] DEBUG: ${message}`);
  if (data) {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
};

module.exports = {
  logInfo,
  logError,
  logWarn,
  logDebug
};
>>>>>>> clean-reset
