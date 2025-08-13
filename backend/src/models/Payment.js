const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    enum: ['USDT', 'USD', 'EUR', 'BTC', 'ETH'],
    default: 'USDT',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'referral_commission', 'pioneer_membership', 'investment', 'refund'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'exported', 'processing', 'completed', 'failed', 'cancelled', 'disputed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['crypto', 'bank_transfer', 'credit_card', 'paypal', 'system'],
    default: 'crypto'
  },
  cryptoDetails: {
    network: {
      type: String,
      enum: ['BEP20', ''],
      default: 'BEP20'
    },
    walletAddress: String,
    transactionHash: String,
    confirmations: {
      type: Number,
      default: 0
    }
  },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    swiftCode: String,
    reference: String
  },
  description: String,
  metadata: {
    pioneerPlan: {
      type: String,
      enum: ['basic', 'premium', 'elite', ''],
      default: ''
    },
    investmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment'
    },
    referralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  fees: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USDT'
    }
  },
  exchangeRate: {
    rate: Number,
    baseCurrency: String,
    quoteCurrency: String,
    timestamp: Date
  },
  ipAddress: String,
  userAgent: String,
  webhookEvents: [{
    type: String,
    timestamp: Date,
    data: Object,
    status: String
  }],
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Admin management fields
  adminNotes: String,
  exportedAt: Date,
  exportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  batchId: String,
  txHashes: [String], // Multiple transaction hashes for batch processing
  rejectionReason: String,
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  expiresAt: Date,
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
paymentSchema.index({ user: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ 'cryptoDetails.transactionHash': 1 });
paymentSchema.index({ createdAt: -1 });

// Índices adicionales para administración
paymentSchema.index({ batchId: 1 });
paymentSchema.index({ exportedAt: 1 });
paymentSchema.index({ processedAt: 1 });
paymentSchema.index({ type: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;