const mongoose = require('mongoose');
const crypto = require('crypto');

const transactionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  type: { 
    type: String, 
    enum: [
      'deposit', 
      'withdrawal', 
      'earnings', 
      'commission', 
      'pioneer_payment',
      'package_purchase',
      'refund',
      'fee',
      'admin_adjustment',
      'manual_correction'
    ], 
    required: true 
  },
  subtype: {
    type: String,
    enum: [
      'manual_deposit',
      'auto_earnings',
      'referral_commission',
      'pioneer_monthly',
      'pioneer_quarterly', 
      'pioneer_annual',
      'withdrawal_request',
      'system_fee',
      'license_purchase',
      'balance_adjustment',
      'system_error_fix',
      'admin_correction'
    ]
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  currency: { 
    type: String, 
    default: 'USDT',
    enum: ['USDT', 'USD', 'EUR', 'BTC', 'ETH']
  },
  status: { 
    type: String, 
    enum: [
      'pending', 
      'processing', 
      'completed', 
      'failed', 
      'cancelled',
      'expired',
      'refunded'
    ], 
    default: 'pending' 
  },
  // Payment details
  payment: {
    method: {
      type: String,
      enum: ['crypto', 'bank_transfer', 'card', 'manual'],
      default: 'crypto'
    },
    address: String, // Wallet address for crypto payments
    txHash: String, // Transaction hash for crypto
    network: {
      type: String,
      enum: ['BEP20'],
      default: 'BEP20'
    },
    confirmations: {
      type: Number,
      default: 0
    },
    requiredConfirmations: {
      type: Number,
      default: 1
    }
  },
  // Pioneer plan details (for pioneer payments)
  pioneerPlan: {
    plan: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual']
    },
    duration: Number, // days
    originalPrice: Number,
    discount: Number,
    finalPrice: Number
  },
  // External references
  externalId: String, // Payment processor ID
  externalReference: String, // External reference for payment verification
  invoiceId: String,
  
  description: String,
  notes: String,
  
  // Metadata for tracking
  metadata: {
    platform: String,
    reference: String,
    ipAddress: String,
    userAgent: String,
    source: String,
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase'
    },
    packageType: String,
    cycleNumber: Number,
    dayInCycle: Number,
    benefitRate: Number,
    baseAmount: Number
  },
  
  // Timestamps
  processedAt: Date,
  completedAt: Date,
  failedAt: Date,
  expiresAt: Date,
  
  // Error handling
  error: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed
  },
  
  // Admin fields
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminNotes: String
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ user: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ 'payment.txHash': 1 });
transactionSchema.index({ externalId: 1 });
transactionSchema.index({ externalReference: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ completedAt: -1 });

// Compound indexes
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ user: 1, status: 1 });
transactionSchema.index({ status: 1, createdAt: 1 });
transactionSchema.index({ type: 1, status: 1 });

// Virtual for display amount
transactionSchema.virtual('displayAmount').get(function() {
  return `${this.amount} ${this.currency}`;
});

// Virtual for is expired
transactionSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Pre-save middleware
transactionSchema.pre('save', function(next) {
  // Set expiration for pending transactions (24 hours)
  if (this.isNew && this.status === 'pending' && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  
  // Set processed timestamp
  if (this.isModified('status')) {
    const now = new Date();
    
    switch(this.status) {
      case 'processing':
        if (!this.processedAt) this.processedAt = now;
        break;
      case 'completed':
        if (!this.completedAt) this.completedAt = now;
        break;
      case 'failed':
        if (!this.failedAt) this.failedAt = now;
        break;
    }
  }
  
  next();
});

// Method to mark as completed
transactionSchema.methods.markAsCompleted = function(txHash, confirmations = 1) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (txHash) this.payment.txHash = txHash;
  if (confirmations) this.payment.confirmations = confirmations;
  return this.save();
};

// Method to mark as failed
transactionSchema.methods.markAsFailed = function(errorCode, errorMessage) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.error = {
    code: errorCode,
    message: errorMessage
  };
  return this.save();
};

// Method to update confirmations
transactionSchema.methods.updateConfirmations = function(confirmations) {
  this.payment.confirmations = confirmations;
  
  // Auto-complete if enough confirmations
  if (confirmations >= this.payment.requiredConfirmations && this.status === 'processing') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  return this.save();
};

// Static method to get user balance
transactionSchema.statics.getUserBalance = function(userId) {
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    },
    {
      $group: {
        _id: null,
        deposits: {
          $sum: {
            $cond: [{ $eq: ['$_id', 'deposit'] }, '$total', 0]
          }
        },
        withdrawals: {
          $sum: {
            $cond: [{ $eq: ['$_id', 'withdrawal'] }, '$total', 0]
          }
        },
        earnings: {
          $sum: {
            $cond: [{ $eq: ['$_id', 'earnings'] }, '$total', 0]
          }
        },
        commissions: {
          $sum: {
            $cond: [{ $eq: ['$_id', 'commission'] }, '$total', 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        deposits: 1,
        withdrawals: 1,
        earnings: 1,
        commissions: 1,
        balance: {
          $subtract: [
            { $add: ['$deposits', '$earnings', '$commissions'] },
            '$withdrawals'
          ]
        }
      }
    }
  ]);
};

// Static method to get transaction statistics
transactionSchema.statics.getStats = function(dateFrom, dateTo) {
  const match = { status: 'completed' };
  
  if (dateFrom || dateTo) {
    match.completedAt = {};
    if (dateFrom) match.completedAt.$gte = new Date(dateFrom);
    if (dateTo) match.completedAt.$lte = new Date(dateTo);
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);
};

// Static method to get pending transactions
transactionSchema.statics.getPending = function() {
  return this.find({ 
    status: { $in: ['pending', 'processing'] },
    expiresAt: { $gt: new Date() }
  })
  .populate('user', 'email telegram fullName')
  .sort({ createdAt: 1 });
};

module.exports = mongoose.model('Transaction', transactionSchema);