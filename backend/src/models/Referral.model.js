const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  // Relaciones principales
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referred: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referralCode: {
    type: String,
    required: true
  },
  status: { 
    type: String, 
    enum: [
      'pending',     // User registered but not activated
      'active',      // User activated and eligible for commission
      'completed',   // Commission paid
      'cancelled',   // Referral cancelled
      'expired'      // Referral expired
    ], 
    default: 'pending' 
  },
  commissionRate: { 
    type: Number, 
    default: 0.10,  // 10%
    min: 0,
    max: 1
  },
  commissionAmount: {
    type: Number,
    default: 0
  },
  commissionPaid: { 
    type: Number, 
    default: 0 
  },
  commissionCurrency: {
    type: String,
    default: 'USDT'
  },
  // Sistema de referidos de UN SOLO NIVEL DIRECTO
  // NO ES MULTINIVEL - Solo referidos directos
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 1  // MÁXIMO 1 NIVEL - Solo referidos directos
  },
  // Comisión directa únicamente (10% del cashback completado)
  directCommission: {
    rate: {
      type: Number,
      default: 0.10  // 10% del cashback total al completar 100%
    },
    earned: {
      type: Number,
      default: 0
    },
    paid: {
      type: Number,
      default: 0
    },
    paidAt: Date,
    cashbackCompleted: {
      type: Boolean,
      default: false
    }
  },
  // Bonos especiales
  // Bonos especiales para códigos líder/padre (5% cada uno)
  specialBonuses: {
    leaderBonus: {
      rate: {
        type: Number,
        default: 0.05  // 5% del monto de todas las licencias
      },
      earned: {
        type: Number,
        default: 0
      },
      paid: {
        type: Number,
        default: 0
      },
      paidAt: Date,
      secondCycleCompleted: {
        type: Boolean,
        default: false
      },
      lastCalculated: Date
    },
    parentBonus: {
      rate: {
        type: Number,
        default: 0.05  // 5% del monto de todas las licencias
      },
      earned: {
        type: Number,
        default: 0
      },
      paid: {
        type: Number,
        default: 0
      },
      paidAt: Date,
      secondCycleCompleted: {
        type: Boolean,
        default: false
      },
      lastCalculated: Date
    }
  },
  // Métricas de rendimiento
  // Métricas de rendimiento para sistema de UN SOLO NIVEL
  performance: {
    directReferralsCount: {
      type: Number,
      default: 0
    },
    activeReferralsCount: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    },
    averageReferralValue: {
      type: Number,
      default: 0
    },
    totalDirectCommissions: {
      type: Number,
      default: 0
    },
    lastPerformanceUpdate: Date
  },
  // Tracking referred user's activity
  referredActivity: {
    firstDeposit: {
      amount: Number,
      date: Date,
      transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
      }
    },
    totalDeposits: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    lastActivity: Date
  },
  // Commission tracking
  commissionHistory: [{
    amount: Number,
    date: { type: Date, default: Date.now },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    reason: String // 'first_deposit', 'monthly_earnings', etc.
  }],
  // Metadata
  source: {
    type: String,
    default: 'direct_link'
  },
  metadata: {
    utm_source: String,
    utm_medium: String,
    utm_campaign: String,
    ipAddress: String,
    userAgent: String
  },
  // Timestamps
  activatedAt: Date,
  completedAt: Date,
  expiresAt: {
    type: Date,
    default: function() {
      // Referrals expire after 90 days if not activated
      return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }
  },
  // Admin fields
  notes: String,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
referralSchema.index({ referrer: 1 });
referralSchema.index({ referred: 1 });
referralSchema.index({ referralCode: 1 });
referralSchema.index({ status: 1 });
referralSchema.index({ createdAt: -1 });
referralSchema.index({ expiresAt: 1 });

// Compound indexes
referralSchema.index({ referrer: 1, status: 1 });
referralSchema.index({ referred: 1, status: 1 });
referralSchema.index({ status: 1, createdAt: 1 });

// Ensure unique referral relationship
referralSchema.index({ referrer: 1, referred: 1 }, { unique: true });

// Índices para sistema de referidos de UN SOLO NIVEL
referralSchema.index({ level: 1 });
referralSchema.index({ referrer: 1, level: 1 });
referralSchema.index({ 'performance.directReferralsCount': -1 });
referralSchema.index({ 'performance.activeReferralsCount': -1 });
referralSchema.index({ 'performance.conversionRate': -1 });
referralSchema.index({ 'specialBonuses.leaderBonus.lastCalculated': 1 });
referralSchema.index({ 'specialBonuses.parentBonus.lastCalculated': 1 });
referralSchema.index({ 'directCommission.earned': -1 });
referralSchema.index({ 'directCommission.cashbackCompleted': 1 });
referralSchema.index({ 'specialBonuses.leaderBonus.secondCycleCompleted': 1 });
referralSchema.index({ 'specialBonuses.parentBonus.secondCycleCompleted': 1 });
referralSchema.index({ activatedAt: -1 });
referralSchema.index({ completedAt: -1 });

// Virtual for total commission earned
referralSchema.virtual('totalCommissionEarned').get(function() {
  return this.commissionHistory.reduce((total, commission) => total + commission.amount, 0);
});

// Virtual for is expired
referralSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date() && this.status === 'pending';
});

// Pre-save middleware
referralSchema.pre('save', function(next) {
  // Set timestamps based on status changes
  if (this.isModified('status')) {
    const now = new Date();
    
    switch(this.status) {
      case 'active':
        if (!this.activatedAt) this.activatedAt = now;
        break;
      case 'completed':
        if (!this.completedAt) this.completedAt = now;
        break;
      case 'expired':
        if (this.expiresAt > now) this.expiresAt = now;
        break;
    }
  }
  
  next();
});

// Method to activate referral
referralSchema.methods.activate = function(firstDepositAmount, transactionId) {
  this.status = 'active';
  this.activatedAt = new Date();
  
  if (firstDepositAmount && transactionId) {
    this.referredActivity.firstDeposit = {
      amount: firstDepositAmount,
      date: new Date(),
      transactionId: transactionId
    };
    this.referredActivity.totalDeposits = firstDepositAmount;
    this.referredActivity.lastActivity = new Date();
    
    // Calculate commission
    this.commissionAmount = firstDepositAmount * this.commissionRate;
  }
  
  return this.save();
};

// Method to add commission
referralSchema.methods.addCommission = function(amount, transactionId, reason = 'earnings') {
  this.commissionHistory.push({
    amount: amount,
    transactionId: transactionId,
    reason: reason
  });
  
  this.commissionPaid += amount;
  
  // Mark as completed if this was the first commission
  if (this.status === 'active' && this.commissionHistory.length === 1) {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  return this.save();
};

// Method to update referred user activity
referralSchema.methods.updateReferredActivity = function(deposits, earnings) {
  if (deposits) {
    this.referredActivity.totalDeposits += deposits;
  }
  
  if (earnings) {
    this.referredActivity.totalEarnings += earnings;
  }
  
  this.referredActivity.lastActivity = new Date();
  
  return this.save();
};

// Static method to get referrer statistics
referralSchema.statics.getReferrerStats = function(referrer) {
  return this.aggregate([
    {
      $match: {
        referrer: mongoose.Types.ObjectId(referrer)
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalCommission: { $sum: '$commissionPaid' },
        totalReferredDeposits: { $sum: '$referredActivity.totalDeposits' }
      }
    },
    {
      $group: {
        _id: null,
        totalReferrals: { $sum: '$count' },
        totalCommissionEarned: { $sum: '$totalCommission' },
        totalReferredVolume: { $sum: '$totalReferredDeposits' },
        statusBreakdown: {
          $push: {
            status: '$_id',
            count: '$count',
            commission: '$totalCommission',
            volume: '$totalReferredDeposits'
          }
        }
      }
    }
  ]);
};

// Static method to get top referrers
referralSchema.statics.getTopReferrers = function(limit = 10, dateFrom, dateTo) {
  const match = {};
  
  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
    if (dateTo) match.createdAt.$lte = new Date(dateTo);
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$referrer',
        totalReferrals: { $sum: 1 },
        activeReferrals: {
          $sum: {
            $cond: [{ $in: ['$status', ['active', 'completed']] }, 1, 0]
          }
        },
        totalCommission: { $sum: '$commissionPaid' },
        totalVolume: { $sum: '$referredActivity.totalDeposits' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'referrer'
      }
    },
    {
      $unwind: '$referrer'
    },
    {
      $project: {
        referrer: {
          _id: 1,
          email: 1,
          telegram: 1,
          referralCode: 1
        },
        totalReferrals: 1,
        activeReferrals: 1,
        totalCommission: 1,
        totalVolume: 1,
        conversionRate: {
          $cond: [
            { $gt: ['$totalReferrals', 0] },
            { $divide: ['$activeReferrals', '$totalReferrals'] },
            0
          ]
        }
      }
    },
    {
      $sort: { totalCommission: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Static method to expire old pending referrals
referralSchema.statics.expireOldReferrals = function() {
  return this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    {
      $set: { status: 'expired' }
    }
  );
};

// Static method to get referral by code and referred user
referralSchema.statics.findByCodeAndUser = function(referralCode, referredUserId) {
  return this.findOne({
    referralCode: referralCode,
    referred: referredUserId
  }).populate('referrer', 'email telegram referralCode');
};

module.exports = mongoose.model('Referral', referralSchema);