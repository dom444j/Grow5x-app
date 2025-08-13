const mongoose = require('mongoose');
const logger = require('../utils/logger');

// MongoDB connection options (simplified for better compatibility)
const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000, // Increased timeout
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  w: 'majority',
  // Disable autoIndex in production to prevent duplicate index warnings
  autoIndex: process.env.NODE_ENV !== 'production'
};

// Connection state
let isConnected = false;
let connectionAttempts = 0;
const maxRetries = 5;
const retryDelay = 5000; // 5 seconds

// Connect to MongoDB
const connectDB = async () => {
  if (isConnected) {
    logger.info('MongoDB already connected');
    return mongoose.connection;
  }

  if (!process.env.MONGODB_URI) {
    const error = new Error('MONGODB_URI environment variable is not defined');
    logger.error('Database connection failed:', error);
    // Instead of throwing, just log and return
    return null;
  }

  try {
    connectionAttempts++;
    logger.info(`Attempting to connect to MongoDB (attempt ${connectionAttempts}/${maxRetries})`);
    
    // Connect to MongoDB
    const connection = await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    
    isConnected = true;
    connectionAttempts = 0;
    
    logger.database('MongoDB connection successful', {
      host: connection.connection.host,
      port: connection.connection.port,
      name: connection.connection.name
    });
    
    return connection;
  } catch (error) {
    logger.database('MongoDB connection failed', {
      attempt: connectionAttempts,
      error: error.message,
      stack: error.stack
    });
    
    if (connectionAttempts < maxRetries) {
      logger.database(`MongoDB connection failed, retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectDB();
    } else {
      logger.error('MongoDB connection failed after maximum retries');
      // Instead of throwing, just log and return
      return null;
    }
  }
};


// Disconnect from MongoDB
const disconnectDB = async () => {
  if (!isConnected) {
    logger.info('MongoDB already disconnected');
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.database('MongoDB disconnection successful', {
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.database('MongoDB disconnection failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Get connection status
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    isConnected,
    state: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  };
};

// Health check
const healthCheck = async () => {
  try {
    if (!isConnected) {
      return {
        status: 'unhealthy',
        message: 'Database not connected',
        timestamp: new Date().toISOString()
      };
    }

    // Ping the database
    await mongoose.connection.db.admin().ping();
    
    const stats = await mongoose.connection.db.stats();
    
    return {
      status: 'healthy',
      message: 'Database connection is healthy',
      timestamp: new Date().toISOString(),
      stats: {
        collections: stats.collections,
        objects: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes
      }
    };
  } catch (error) {
    logger.database('Health check failed', {
      error: error.message
    });
    
    return {
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Setup event listeners
const setupEventListeners = () => {
  // Connection events
  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.database('MongoDB connected', {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    });
  });

  mongoose.connection.on('error', (error) => {
    logger.database('MongoDB connection error', {
      error: error.message,
      stack: error.stack
    });
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.database('MongoDB disconnected', {
      timestamp: new Date().toISOString()
    });
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    logger.database('MongoDB reconnected', {
      timestamp: new Date().toISOString()
    });
  });

  mongoose.connection.on('close', () => {
    isConnected = false;
    logger.database('MongoDB connection closed', {
      timestamp: new Date().toISOString()
    });
  });

  // Process events
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, closing MongoDB connection...');
    await disconnectDB();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, closing MongoDB connection...');
    await disconnectDB();
    process.exit(0);
  });

  // Temporarily commented out to debug server startup issues
  // process.on('uncaughtException', async (error) => {
  //   logger.error('Uncaught Exception:', error);
  //   await disconnectDB();
  //   process.exit(1);
  // });

  // process.on('unhandledRejection', async (reason, promise) => {
  //   logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  //   await disconnectDB();
  //   process.exit(1);
  // });
};

// Initialize database connection with event listeners
const initializeDatabase = async () => {
  setupEventListeners();
  try {
    return await connectDB();
  } catch (error) {
    logger.warn('Database connection failed, continuing without database for demo purposes', {
      error: error.message
    });
    return null;
  }
};

// Get database statistics
const getDatabaseStats = async () => {
  try {
    if (!isConnected) {
      throw new Error('Database not connected');
    }

    const db = mongoose.connection.db;
    const stats = await db.stats();
    const collections = await db.listCollections().toArray();
    
    const collectionStats = {};
    for (const collection of collections) {
      try {
        const collStats = await db.collection(collection.name).stats();
        collectionStats[collection.name] = {
          count: collStats.count,
          size: collStats.size,
          storageSize: collStats.storageSize,
          indexes: collStats.nindexes
        };
      } catch (error) {
        // Some collections might not support stats
        collectionStats[collection.name] = {
          error: error.message
        };
      }
    }

    return {
      database: {
        name: stats.db,
        collections: stats.collections,
        objects: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize
      },
      collections: collectionStats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to get database stats:', error);
    throw error;
  }
};

// Clean up old data (utility function)
const cleanupOldData = async () => {
  try {
    if (!isConnected) {
      throw new Error('Database not connected');
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    // Clean up old transactions (keep for 60 days)
    const Transaction = mongoose.model('Transaction');
    const oldTransactions = await Transaction.deleteMany({
      createdAt: { $lt: sixtyDaysAgo },
      status: { $in: ['failed', 'cancelled'] }
    });

    // Clean up old preregistrations (keep for 30 days if not converted)
    const Preregistration = mongoose.model('Preregistration');
    const oldPreregistrations = await Preregistration.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      status: { $in: ['rejected', 'expired'] }
    });

    logger.database('Database cleanup completed', {
      transactionsDeleted: oldTransactions.deletedCount,
      preregistrationsDeleted: oldPreregistrations.deletedCount,
      timestamp: new Date().toISOString()
    });

    return {
      transactionsDeleted: oldTransactions.deletedCount,
      preregistrationsDeleted: oldPreregistrations.deletedCount
    };
  } catch (error) {
    logger.database('Database cleanup failed', {
      error: error.message
    });
    throw error;
  }
};

// Create indexes for better performance
const createIndexes = async () => {
  try {
    if (!isConnected) {
      throw new Error('Database not connected');
    }

    const db = mongoose.connection.db;

    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ telegram: 1 }, { sparse: true });
    await db.collection('users').createIndex({ referralCode: 1 }, { unique: true });
    await db.collection('users').createIndex({ referredBy: 1 });
    await db.collection('users').createIndex({ status: 1 });
    await db.collection('users').createIndex({ isPioneer: 1 });
    await db.collection('users').createIndex({ createdAt: 1 });

    // Transaction indexes
    await db.collection('transactions').createIndex({ userId: 1 });
    await db.collection('transactions').createIndex({ type: 1 });
    await db.collection('transactions').createIndex({ status: 1 });
    await db.collection('transactions').createIndex({ createdAt: 1 });
    await db.collection('transactions').createIndex({ 'paymentDetails.transactionHash': 1 }, { sparse: true });
    await db.collection('transactions').createIndex({ reference: 1 }, { unique: true });

    // Preregistration indexes
    await db.collection('preregistrations').createIndex({ email: 1 }, { sparse: true });
    await db.collection('preregistrations').createIndex({ telegram: 1 }, { sparse: true });
    await db.collection('preregistrations').createIndex({ status: 1 });
    await db.collection('preregistrations').createIndex({ createdAt: 1 });
    await db.collection('preregistrations').createIndex({ referralCode: 1 });

    // Referral indexes
    await db.collection('referrals').createIndex({ referrer: 1 });
    await db.collection('referrals').createIndex({ referred: 1 });
    await db.collection('referrals').createIndex({ referralCode: 1 });
    await db.collection('referrals').createIndex({ status: 1 });
    await db.collection('referrals').createIndex({ createdAt: 1 });

    // Automation logs indexes
    await db.collection('automation_logs').createIndex({ job_name: 1 });
    await db.collection('automation_logs').createIndex({ job_type: 1 });
    await db.collection('automation_logs').createIndex({ status: 1 });
    await db.collection('automation_logs').createIndex({ start_time: 1 });
    await db.collection('automation_logs').createIndex({ job_name: 1, start_time: -1 });
    await db.collection('automation_logs').createIndex({ status: 1, start_time: -1 });

    logger.database('Database indexes created', {
      timestamp: new Date().toISOString()
    });

    return true;
  } catch (error) {
    logger.database('Database indexes creation failed', {
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  initializeDatabase,
  getConnectionStatus,
  healthCheck,
  getDatabaseStats,
  cleanupOldData,
  createIndexes,
  mongoose
};