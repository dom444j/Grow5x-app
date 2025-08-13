const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize logger first
const logger = require('./src/utils/logger');
logger.info('Starting server initialization...');

// Import security configuration
const { helmetConfig, additionalSecurityHeaders } = require('./src/config/security');

try {
  const { initializeDatabase } = require('./src/config/database');
  logger.info('Database config loaded successfully');
  
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // Trust proxy for production environment (behind Nginx)
  app.set('trust proxy', true);
  
  logger.info('Setting up middleware...');
  
  // CORS configuration for development and production
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://80.78.25.79:5173',
    'http://80.78.25.79:3000',
    'https://grow5x.app',
    process.env.FRONTEND_URL
  ].filter(Boolean);

  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-time', 'x-client-type'],
    exposedHeaders: ['x-request-time']
  }));
  
  // Security middleware
  app.use(helmetConfig);
  app.use(additionalSecurityHeaders);
  
  // Body parsing middleware with error handling
  app.use(express.json({ 
    limit: '10mb'
  }));
  app.use(express.urlencoded({ extended: true }));

  // Handle JSON parsing errors
  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      logger.error('JSON parsing error:', {
        error: err.message,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON format',
        error: 'JSON_PARSE_ERROR'
      });
    }
    next(err);
  });
  
  logger.info('Loading routes...');
  
  // Routes with error handling
  try {
    app.use('/api/auth', require('./src/routes/auth.routes'));
    logger.info('Auth routes loaded');
  } catch (error) {
    logger.error('Failed to load auth routes:', error.message);
    console.error('Full auth routes error:', error);
  }
  
  try {
    app.use('/api/user', require('./src/routes/user.routes'));
    logger.info('User routes loaded');
  } catch (error) {
    logger.error('Failed to load user routes:', error.message);
  }

  try {
    app.use('/api/user/portfolio', require('./src/routes/portfolio.routes'));
    logger.info('Portfolio routes loaded');
  } catch (error) {
    logger.error('Failed to load portfolio routes:', error.message);
  }
  
  try {
    app.use('/api/user-status', require('./src/routes/userStatus.routes'));
    logger.info('User status routes loaded');
  } catch (error) {
    logger.error('Failed to load user status routes:', error.message);
  }
  
  try {
    app.use('/api/admin', require('./src/routes/admin.routes'));
    logger.info('Admin routes loaded');
  } catch (error) {
    logger.error('Failed to load admin routes:', error.message);
    console.error('Full admin routes error:', error);
    console.error('Admin routes error stack:', error.stack);
  }
  
  try {
    app.use('/api/public', require('./src/routes/public.routes'));
    logger.info('Public routes loaded');
  } catch (error) {
    logger.error('Failed to load public routes:', error.message);
  }
  
  try {
    app.use('/api/wallets', require('./src/routes/wallet.routes'));
    logger.info('Wallet routes loaded');
  } catch (error) {
    logger.error('Failed to load wallet routes:', error.message);
  }
  
  try {
    app.use('/api/automation', require('./src/routes/automation.routes'));
    logger.info('Automation routes loaded');
  } catch (error) {
    logger.error('Failed to load automation routes:', error.message);
  }
  
  try {
    app.use('/api/referrals', require('./src/routes/referral.routes'));
    logger.info('Referral routes loaded');
  } catch (error) {
    logger.error('Failed to load referral routes:', error.message);
  }

  try {
    app.use('/api/commissions', require('./src/routes/commissions.routes'));
    logger.info('Commission routes loaded');
  } catch (error) {
    logger.error('Failed to load commission routes:', error.message);
  }

  try {
    app.use('/api/users', require('./src/routes/users.routes'));
    logger.info('Users routes loaded');
  } catch (error) {
    logger.error('Failed to load users routes:', error.message);
  }

  try {
    app.use('/api/admin/special-codes', require('./src/routes/specialCodes.routes'));
    logger.info('Special codes routes loaded');
  } catch (error) {
    logger.error('Failed to load special codes routes:', error.message);
  }
  
  try {
    app.use('/api/withdrawal-pin', require('./src/routes/withdrawalPin.routes'));
    logger.info('Withdrawal PIN routes loaded');
  } catch (error) {
    logger.error('Failed to load withdrawal PIN routes:', error.message);
  }
  
  try {
    app.use('/api/payments', require('./src/routes/payment.routes'));
    logger.info('Payment routes loaded');
  } catch (error) {
    logger.error('Failed to load payment routes:', error.message);
    console.error('Full payment routes error:', error);
  }

  // Support routes removed

  try {
    app.use('/api/documents', require('./src/routes/document.routes'));
    logger.info('Document routes loaded');
  } catch (error) {
    logger.error('Failed to load document routes:', error.message);
  }

  try {
    app.use('/api/support', require('./src/routes/support.routes'));
    logger.info('Support routes loaded');
  } catch (error) {
    logger.error('Failed to load support routes:', error.message);
    console.error('Full support routes error:', error);
  }

  try {
    app.use('/api/emails', require('./src/routes/email.routes'));
    logger.info('Email routes loaded');
  } catch (error) {
    logger.error('Failed to load email routes:', error.message);
  }

  // Product and License routes removed - unified into packages

  try {
    app.use('/api/packages', require('./routes/package.routes'));
    logger.info('Package routes loaded');
  } catch (error) {
    logger.error('Failed to load package routes:', error.message);
  }

  // New API routes
  try {
    app.use('/api/news', require('./src/routes/news.routes'));
    logger.info('News routes loaded');
  } catch (error) {
    logger.error('Failed to load news routes:', error.message);
  }

  try {
    app.use('/api/reports', require('./src/routes/reports.routes'));
    logger.info('Reports routes loaded');
  } catch (error) {
    logger.error('Failed to load reports routes:', error.message);
    logger.error('Reports routes error stack:', error.stack);
  }

  try {
    app.use('/api/system-settings', require('./src/routes/systemSettings.routes'));
    logger.info('System settings routes loaded');
  } catch (error) {
    logger.error('Failed to load system settings routes:', error.message);
  }

  try {
    app.use('/api/purchases', require('./src/routes/purchases.routes'));
    logger.info('Purchases routes loaded');
  } catch (error) {
    logger.error('Failed to load purchases routes:', error.message);
  }

  try {
    app.use('/api/finance', require('./src/routes/finance.routes'));
    logger.info('Finance routes loaded');
  } catch (error) {
    logger.error('Failed to load finance routes:', error.message);
  }

  try {
    app.use('/api/downloads', require('./src/routes/downloads.routes'));
    logger.info('Downloads routes loaded');
  } catch (error) {
    logger.error('Failed to load downloads routes:', error.message);
    logger.error('Downloads routes error stack:', error.stack);
  }

  try {
    app.use('/api/notifications', require('./src/routes/notifications.routes'));
    logger.info('Notifications routes loaded');
  } catch (error) {
    logger.error('Failed to load notifications routes:', error.message);
  }

  try {
    app.use('/api/arbitrage', require('./src/routes/arbitrage.routes'));
    logger.info('Arbitrage routes loaded');
  } catch (error) {
    logger.error('Failed to load arbitrage routes:', error.message);
  }

  try {
    app.use('/api/user-settings', require('./src/routes/settings.routes'));
    logger.info('User settings routes loaded');
  } catch (error) {
    logger.error('Failed to load user settings routes:', error.message);
    logger.error('User settings routes error stack:', error.stack);
  }

  try {
    app.use('/api/benefits', require('./src/routes/optimizedBenefits.routes'));
    logger.info('Optimized benefits routes loaded');
  } catch (error) {
    logger.error('Failed to load optimized benefits routes:', error.message);
    logger.error('Optimized benefits routes error stack:', error.stack);
  }

  try {
    app.use('/api/system', require('./src/routes/system.routes'));
    logger.info('System routes loaded');
  } catch (error) {
    logger.error('Failed to load system routes:', error.message);
  }

  // Staging routes (only available when TEST_E2E=true)
  try {
    app.use('/api/staging', require('./src/routes/staging'));
    logger.info('Staging routes loaded (available only when TEST_E2E=true)');
  } catch (error) {
    logger.error('Failed to load staging routes:', error.message);
  }

  // Health check endpoints
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });
  
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  });
  
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Global error handler - must be last middleware
  app.use((err, req, res, next) => {
    logger.error('Global error handler:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Ensure JSON response for all errors
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  });
  
  logger.info('Routes and middleware configured successfully');
  
  // Initialize database and start server
  const startServer = async () => {
    try {
      logger.info('Initializing database...');
      // Initialize database connection
      await initializeDatabase();
      logger.info('Database initialized successfully');
      
      const server = app.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info('✅ Server started successfully');
      });
      
      server.on('error', (error) => {
        logger.error('Server error:', error);
      });
      
    } catch (error) {
      logger.error('Failed to start server:', error);
      // Don't exit, just log the error for demo purposes
      logger.warn('Continuing without database connection for demo purposes');
      
      const server = app.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT} (demo mode - no database)`);
        logger.info(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.warn('⚠️ Running without database connection');
      });
      
      server.on('error', (error) => {
        logger.error('Server error:', error);
      });
    }
  };
  
  // Start the server
  startServer();
  
  module.exports = app;
  
} catch (error) {
  logger.error('Critical error during server initialization:', error);
  process.exit(1);
}

// Wallet management fixes applied