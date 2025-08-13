const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
    enum: ['pending', 'processing', 'completed', 'cancelled', 'failed'],
    default: 'pending'
  },
  withdrawalMethod: {
    type: String,
    enum: ['crypto', 'bank_transfer', 'card'],
    default: 'crypto'
  },
  destinationAddress: {
    type: String,
    required: function() {
      return this.withdrawalMethod === 'crypto';
    }
  },
  network: {
    type: String,
    enum: ['BEP20', 'TRC20', 'ERC20'],
    default: 'BEP20'
  },
  bankDetails: {
    accountNumber: String,
    routingNumber: String,
    bankName: String,
    accountHolderName: String
  },
  transactionHash: String,
  fee: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  reason: String,
  adminNotes: String,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  failedAt: Date,
  metadata: {
    ipAddress: String,
    userAgent: String,
    platform: String
  }
}, {
  timestamps: true
});

// Indexes
withdrawalRequestSchema.index({ userId: 1 });
withdrawalRequestSchema.index({ status: 1 });
withdrawalRequestSchema.index({ createdAt: -1 });
withdrawalRequestSchema.index({ userId: 1, status: 1 });

// Virtual for display amount
withdrawalRequestSchema.virtual('displayAmount').get(function() {
  return `${this.amount} ${this.currency}`;
});

// Pre-save middleware
withdrawalRequestSchema.pre('save', function(next) {
  // Calculate net amount if not set
  if (!this.netAmount) {
    this.netAmount = this.amount - (this.fee || 0);
  }
  
  // Set timestamps based on status changes
  if (this.isModified('status')) {
    const now = new Date();
    
    switch(this.status) {
      case 'processing':
        if (!this.processedAt) this.processedAt = now;
        break;
      case 'completed':
        if (!this.completedAt) this.completedAt = now;
        break;
      case 'cancelled':
        if (!this.cancelledAt) this.cancelledAt = now;
        break;
      case 'failed':
        if (!this.failedAt) this.failedAt = now;
        break;
    }
  }
  
  next();
});

// Instance methods
withdrawalRequestSchema.methods.markAsCompleted = function(transactionHash) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (transactionHash) this.transactionHash = transactionHash;
  return this.save();
};

withdrawalRequestSchema.methods.markAsCancelled = function(reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  if (reason) this.reason = reason;
  return this.save();
};

withdrawalRequestSchema.methods.markAsFailed = function(reason) {
  this.status = 'failed';
  this.failedAt = new Date();
  if (reason) this.reason = reason;
  return this.save();
};

// Static methods
withdrawalRequestSchema.statics.getPendingByUser = function(userId) {
  return this.find({
    userId: userId,
    status: 'pending'
  }).sort({ createdAt: -1 });
};

withdrawalRequestSchema.statics.getTotalPendingAmount = function(userId) {
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        status: 'pending'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);
};

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);