const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  purchase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    required: false
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    enum: ['USDT', 'BTC', 'ETH', 'BNB', 'USD', 'EUR'],
    default: 'USDT',
    required: true
  },
  network: {
    type: String,
    enum: ['BSC', 'ETH', 'TRX', 'BTC'],
    default: 'BSC',
    required: true
  },
  from: {
    type: String,
    required: [true, 'From address is required'],
    trim: true
  },
  to: {
    type: String,
    required: [true, 'To address is required'],
    trim: true
  },
  amountRaw: {
    type: String,
    required: true,
    trim: true
  },
  confirmations: {
    type: Number,
    default: 0,
    min: 0
  },
  blockNumber: {
    type: Number,
    required: true
  },
  txHash: {
    type: String,
    required: [true, 'Transaction hash is required'],
    unique: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  gasUsed: {
    type: String,
    trim: true
  },
  gasPrice: {
    type: String,
    trim: true
  },
  contractAddress: {
    type: String,
    trim: true
  },
  verifiedAt: {
    type: Date
  },
  processedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: String,
    endpoint: String,
    verificationData: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimizar consultas
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ txHash: 1 }, { unique: true });
paymentSchema.index({ status: 1 });
paymentSchema.index({ network: 1 });
paymentSchema.index({ purchase: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ blockNumber: 1 });
paymentSchema.index({ confirmations: 1 });

// Virtual para verificar si el pago está confirmado
paymentSchema.virtual('isConfirmed').get(function() {
  return this.confirmations >= 3 && this.status === 'completed';
});

// Virtual para obtener el explorador de blockchain
paymentSchema.virtual('explorerUrl').get(function() {
  const explorers = {
    'BSC': `https://bscscan.com/tx/${this.txHash}`,
    'ETH': `https://etherscan.io/tx/${this.txHash}`,
    'TRX': `https://tronscan.org/#/transaction/${this.txHash}`,
    'BTC': `https://blockstream.info/tx/${this.txHash}`
  };
  return explorers[this.network] || '#';
});

// Middleware para actualizar timestamps
paymentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'processing' && !this.processedAt) {
      this.processedAt = new Date();
    }
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
  }
  next();
});

// Método estático para buscar por hash
paymentSchema.statics.findByTxHash = function(txHash) {
  return this.findOne({ txHash: txHash.toLowerCase() });
};

// Método estático para buscar pagos pendientes
paymentSchema.statics.findPending = function() {
  return this.find({ 
    status: { $in: ['pending', 'processing'] },
    confirmations: { $lt: 3 }
  });
};

// Método estático para buscar por usuario
paymentSchema.statics.findByUser = function(userId, options = {}) {
  const query = this.find({ user: userId });
  
  if (options.status) {
    query.where('status', options.status);
  }
  
  if (options.network) {
    query.where('network', options.network);
  }
  
  return query.sort({ createdAt: -1 });
};

module.exports = mongoose.model('Payment', paymentSchema);