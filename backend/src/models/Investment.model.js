const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USDT',
    enum: ['USDT', 'BTC', 'ETH', 'BNB']
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // Duración en días
    required: true
  },
  currentYield: {
    type: Number,
    default: 0,
    min: 0
  },
  totalReturns: {
    type: Number,
    default: 0,
    min: 0
  },
  expectedReturns: {
    type: Number,
    required: true,
    min: 0
  },
  dailyYieldRate: {
    type: Number,
    required: true,
    min: 0,
    max: 1 // Porcentaje como decimal (ej: 0.02 = 2%)
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'active', 'completed', 'cancelled', 'paused'],
    default: 'pending'
  },
  nextPaymentDate: {
    type: Date,
    required: function() {
      return this.status === 'active';
    }
  },
  lastPaymentDate: {
    type: Date
  },
  paymentHistory: [{
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    type: {
      type: String,
      required: true,
      enum: ['daily_yield', 'principal_return', 'bonus', 'penalty']
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    notes: String
  }],
  autoReinvest: {
    type: Boolean,
    default: false
  },
  reinvestPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  activatedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancelReason: {
    type: String
  },
  metadata: {
    purchaseTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    referralBonus: {
      type: Number,
      default: 0
    },
    specialBonus: {
      type: Number,
      default: 0
    },
    notes: String,
    tags: [String]
  },
  performance: {
    actualYieldRate: {
      type: Number,
      default: 0
    },
    totalDaysActive: {
      type: Number,
      default: 0
    },
    missedPayments: {
      type: Number,
      default: 0
    },
    lastCalculatedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Índices compuestos para optimizar consultas
investmentSchema.index({ user: 1, status: 1 });
investmentSchema.index({ user: 1, createdAt: -1 });
investmentSchema.index({ package: 1, status: 1 });
investmentSchema.index({ status: 1, nextPaymentDate: 1 });
investmentSchema.index({ status: 1, endDate: 1 });
investmentSchema.index({ createdAt: -1 });
investmentSchema.index({ 'metadata.purchaseTransactionId': 1 });

// Middleware para calcular fechas automáticamente
investmentSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('startDate') || this.isModified('duration')) {
    // Calcular fecha de finalización
    if (this.startDate && this.duration) {
      this.endDate = new Date(this.startDate.getTime() + (this.duration * 24 * 60 * 60 * 1000));
    }
    
    // Calcular retornos esperados
    if (this.amount && this.dailyYieldRate && this.duration) {
      this.expectedReturns = this.amount * this.dailyYieldRate * this.duration;
    }
  }
  
  // Establecer próxima fecha de pago si está activo
  if (this.status === 'active' && !this.nextPaymentDate) {
    this.nextPaymentDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Mañana
  }
  
  next();
});

// Métodos estáticos
investmentSchema.statics.getActiveInvestments = function(userId) {
  return this.find({ user: userId, status: 'active' })
    .populate('package', 'name description yieldRate')
    .sort({ createdAt: -1 });
};

investmentSchema.statics.getUserPortfolioValue = async function(userId) {
  const result = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), status: { $in: ['active', 'completed'] } } },
    {
      $group: {
        _id: null,
        totalInvested: { $sum: '$amount' },
        totalReturns: { $sum: '$totalReturns' },
        activeInvestments: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
          }
        },
        activeAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, '$amount', 0]
          }
        }
      }
    }
  ]);
  
  return result[0] || {
    totalInvested: 0,
    totalReturns: 0,
    activeInvestments: 0,
    activeAmount: 0
  };
};

investmentSchema.statics.getInvestmentsDueForPayment = function() {
  return this.find({
    status: 'active',
    nextPaymentDate: { $lte: new Date() }
  }).populate('user package');
};

investmentSchema.statics.getExpiringInvestments = function(days = 7) {
  const futureDate = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
  return this.find({
    status: 'active',
    endDate: { $lte: futureDate }
  }).populate('user package');
};

// Métodos de instancia
investmentSchema.methods.calculateCurrentYield = function() {
  const now = new Date();
  const startDate = this.activatedAt || this.startDate;
  const daysActive = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  
  if (daysActive <= 0) return 0;
  
  const maxDays = Math.min(daysActive, this.duration);
  return this.amount * this.dailyYieldRate * maxDays;
};

investmentSchema.methods.addPayment = function(amount, type = 'daily_yield', transactionId = null, notes = '') {
  this.paymentHistory.push({
    date: new Date(),
    amount: amount,
    type: type,
    transactionId: transactionId,
    notes: notes
  });
  
  this.totalReturns += amount;
  this.lastPaymentDate = new Date();
  
  // Calcular próxima fecha de pago (solo para pagos diarios)
  if (type === 'daily_yield') {
    this.nextPaymentDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  
  // Actualizar performance
  this.performance.lastCalculatedAt = new Date();
  this.performance.totalDaysActive = Math.floor((new Date() - (this.activatedAt || this.startDate)) / (1000 * 60 * 60 * 24));
  
  return this.save();
};

investmentSchema.methods.activate = function() {
  this.status = 'active';
  this.activatedAt = new Date();
  this.nextPaymentDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return this.save();
};

investmentSchema.methods.complete = function(reason = 'matured') {
  this.status = 'completed';
  this.completedAt = new Date();
  this.nextPaymentDate = undefined;
  this.metadata.notes = this.metadata.notes ? `${this.metadata.notes}. Completed: ${reason}` : `Completed: ${reason}`;
  return this.save();
};

investmentSchema.methods.cancel = function(reason = 'user_request') {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelReason = reason;
  this.nextPaymentDate = undefined;
  return this.save();
};

const Investment = mongoose.model('Investment', investmentSchema);

module.exports = Investment;