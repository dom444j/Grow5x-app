/**
 * Server Entry Point
 * Starts the Express server and handles server lifecycle
 * Updated to fix session expiration issue - restart
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pino = require('pino');
const database = require('./config/database');
const cron = require('node-cron');
const cronManager = require('./cron');

// Import routes
const authRoutes = require('./routes/auth');
const packageRoutes = require('./routes/packages');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const publicRoutes = require('./routes/public');
const referralRoutes = require('./routes/referral');
const withdrawalRoutes = require('./routes/withdrawals');
const withdrawalExportRoutes = require('./routes/withdrawalExport');
const checkoutRoutes = require('./routes/checkout');
const iamRoutes = require('./routes/iamRoutes');

// Logger setup
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard'
    }
  } : undefined
});

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupCronJobs();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info({
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, 'Incoming request');
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      const dbStatus = database.getStatus();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: dbStatus,
        version: '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/packages', packageRoutes);
    this.app.use('/api/payments', paymentRoutes);
    // Mount specific admin routes before general admin routes
    this.app.use('/api/admin/withdrawals', withdrawalRoutes);
    this.app.use('/api/admin/withdrawals', withdrawalExportRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/me', userRoutes);
    this.app.use('/api/public', publicRoutes);
    this.app.use('/api/v1/iam', iamRoutes);

    // Checkout routes (new unified endpoint)
    this.app.use('/api/checkout', checkoutRoutes);

    // ALIASES para rutas legacy (absorber rutas viejas)
    this.app.post('/api/me/purchases', (req, res, next) => {
      req.url = '/start';
      return checkoutRoutes.handle(req, res, next);
    });

    this.app.post('/api/payments/submit', (req, res, next) => {
      req.url = '/start';
      return checkoutRoutes.handle(req, res, next);
    });

    this.app.post('/api/me/purchases/:orderId/confirm', (req, res, next) => {
      req.url = `/${req.params.orderId}/confirm`;
      return checkoutRoutes.handle(req, res, next);
    });

    this.app.post('/api/payments/confirm-hash', (req, res, next) => {
      // body legacy { purchaseId, transactionHash }
      req.params = { orderId: req.body.purchaseId };
      req.body = { txHash: req.body.transactionHash };
      req.url = `/${req.params.orderId}/confirm`;
      return checkoutRoutes.handle(req, res, next);
    });

    // Referral routes (must be before 404 handler)
    this.app.use('/', referralRoutes);

    // CATCH 404 estructurado (debug radical)
    this.app.use('/api', (req, res) => {
      res.status(404).json({ 
        error: 'NOT_FOUND', 
        pathTried: req.originalUrl, 
        method: req.method 
      });
    });

    // 404 handler general
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
      });
    });
  }

  setupCronJobs() {
    // CRON jobs will be initialized after server starts
    // See cronManager.initializeCronJobs() in start() method
    logger.info('CRON jobs setup deferred to post-startup initialization');
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error({
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      }, 'Unhandled error');

      res.status(error.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  async start() {
    try {
      // Connect to database
      await database.connect();
      
      // Run integrity checks before starting server
      // const { runIntegrityChecks } = require('./utils/integrity-checks');
      // await runIntegrityChecks();
      
      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.info(`🚀 Server running on port ${this.port}`);
        logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
        logger.info(`🔗 CORS origin: ${process.env.ALLOWED_ORIGIN}`);
        
        // Initialize CRON jobs after server starts
        try {
          cronManager.initializeCronJobs();
          logger.info('CRON jobs initialized successfully');
        } catch (error) {
          logger.error('Failed to initialize CRON jobs:', {
            error: error.message,
            stack: error.stack
          });
        }
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown(signal) {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    // Stop CRON jobs first
    try {
      cronManager.stopAllCronJobs();
      logger.info('CRON jobs stopped');
    } catch (error) {
      logger.error('Error stopping CRON jobs:', {
        error: error.message
      });
    }
    
    if (this.server) {
      this.server.close(async () => {
        logger.info('HTTP server closed');
        await database.disconnect();
        process.exit(0);
      });
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start();
}

module.exports = Server;