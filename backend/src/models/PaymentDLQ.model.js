const mongoose = require('mongoose');

const paymentDLQSchema = new mongoose.Schema({
  // Información del pago original
  originalPayload: {
    txHash: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USDT'
    },
    network: {
      type: String,
      default: 'BSC'
    },
    token: {
      type: String,
      default: 'USDT'
    },
    expectedReceiver: {
      type: String,
      required: true
    }
  },
  // Información del error
  error: {
    message: {
      type: String,
      required: true
    },
    code: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['validation', 'network', 'blockchain', 'database', 'business_logic', 'timeout', 'unknown'],
      required: true
    },
    stack: String,
    details: mongoose.Schema.Types.Mixed
  },
  // Control de reintentos
  retryInfo: {
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    nextRetryAt: {
      type: Date,
      index: true
    },
    backoffMultiplier: {
      type: Number,
      default: 2
    },
    baseDelayMs: {
      type: Number,
      default: 60000 // 1 minuto
    }
  },
  // Estado del elemento en DLQ
  status: {
    type: String,
    enum: ['pending', 'retrying', 'resolved', 'failed_permanently', 'manual_review'],
    default: 'pending',
    index: true
  },
  // Historial de intentos
  retryHistory: [{
    attemptNumber: {
      type: Number,
      required: true
    },
    attemptedAt: {
      type: Date,
      default: Date.now
    },
    error: {
      message: String,
      code: String,
      type: String
    },
    duration: Number, // milisegundos
    result: {
      type: String,
      enum: ['success', 'failure', 'timeout']
    }
  }],
  // Información de resolución
  resolution: {
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    method: {
      type: String,
      enum: ['auto_retry', 'manual_fix', 'admin_override', 'cancelled']
    },
    notes: String,
    finalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    }
  },
  // Prioridad para procesamiento manual
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal',
    index: true
  },
  // Metadatos adicionales
  metadata: {
    source: {
      type: String,
      enum: ['webhook', 'manual_verification', 'scheduled_check', 'admin_action'],
      required: true
    },
    endpoint: String,
    userAgent: String,
    ipAddress: String,
    requestId: String,
    sessionId: String
  },
  // Flags administrativos
  adminFlags: {
    requiresAttention: {
      type: Boolean,
      default: false,
      index: true
    },
    isHighValue: {
      type: Boolean,
      default: false
    },
    isSuspicious: {
      type: Boolean,
      default: false
    },
    notes: String
  },
  // Auditoría
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos
paymentDLQSchema.index({ 'originalPayload.txHash': 1 }, { unique: true });
paymentDLQSchema.index({ status: 1, priority: 1 });
paymentDLQSchema.index({ 'retryInfo.nextRetryAt': 1, status: 1 });
paymentDLQSchema.index({ 'adminFlags.requiresAttention': 1, status: 1 });
paymentDLQSchema.index({ createdAt: -1 });
paymentDLQSchema.index({ 'originalPayload.userId': 1, status: 1 });

// Virtuals
paymentDLQSchema.virtual('canRetry').get(function() {
  return this.status === 'pending' && 
         this.retryInfo.attempts < this.retryInfo.maxAttempts &&
         (!this.retryInfo.nextRetryAt || this.retryInfo.nextRetryAt <= new Date());
});

paymentDLQSchema.virtual('isExpired').get(function() {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días
  return (Date.now() - this.createdAt.getTime()) > maxAge;
});

paymentDLQSchema.virtual('nextRetryIn').get(function() {
  if (!this.retryInfo.nextRetryAt) return 0;
  return Math.max(0, this.retryInfo.nextRetryAt.getTime() - Date.now());
});

// Métodos de instancia
paymentDLQSchema.methods.scheduleRetry = function() {
  if (this.retryInfo.attempts >= this.retryInfo.maxAttempts) {
    this.status = 'failed_permanently';
    this.adminFlags.requiresAttention = true;
    return this.save();
  }

  const delay = this.retryInfo.baseDelayMs * Math.pow(this.retryInfo.backoffMultiplier, this.retryInfo.attempts);
  this.retryInfo.nextRetryAt = new Date(Date.now() + delay);
  this.status = 'pending';
  
  return this.save();
};

paymentDLQSchema.methods.recordRetryAttempt = function(error, duration, result = 'failure') {
  this.retryInfo.attempts += 1;
  
  this.retryHistory.push({
    attemptNumber: this.retryInfo.attempts,
    attemptedAt: new Date(),
    error: error ? {
      message: error.message,
      code: error.code || 'UNKNOWN',
      type: error.type || 'unknown'
    } : undefined,
    duration,
    result
  });
  
  if (result === 'success') {
    this.status = 'resolved';
    this.resolution = {
      resolvedAt: new Date(),
      method: 'auto_retry'
    };
  } else {
    // Programar siguiente intento
    this.scheduleRetry();
  }
  
  return this.save();
};

paymentDLQSchema.methods.markAsResolved = function(resolvedBy, method, notes, transactionId) {
  this.status = 'resolved';
  this.resolution = {
    resolvedAt: new Date(),
    resolvedBy,
    method,
    notes,
    finalTransactionId: transactionId
  };
  this.adminFlags.requiresAttention = false;
  
  return this.save();
};

paymentDLQSchema.methods.escalate = function(reason) {
  this.priority = 'high';
  this.adminFlags.requiresAttention = true;
  this.adminFlags.notes = reason;
  
  return this.save();
};

// Métodos estáticos
paymentDLQSchema.statics.findReadyForRetry = function() {
  return this.find({
    status: 'pending',
    'retryInfo.nextRetryAt': { $lte: new Date() },
    'retryInfo.attempts': { $lt: this.schema.paths['retryInfo.maxAttempts'].options.default }
  }).sort({ priority: -1, createdAt: 1 });
};

paymentDLQSchema.statics.findRequiringAttention = function() {
  return this.find({
    'adminFlags.requiresAttention': true,
    status: { $in: ['pending', 'failed_permanently', 'manual_review'] }
  }).populate('originalPayload.userId', 'email fullName')
    .sort({ priority: -1, createdAt: 1 });
};

paymentDLQSchema.statics.getStats = function(timeframe = 24) {
  const since = new Date(Date.now() - timeframe * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgAttempts: { $avg: '$retryInfo.attempts' },
        totalAmount: { $sum: '$originalPayload.amount' }
      }
    }
  ]);
};

paymentDLQSchema.statics.cleanup = function(olderThanDays = 30) {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  
  return this.deleteMany({
    status: 'resolved',
    'resolution.resolvedAt': { $lt: cutoff }
  });
};

// Middleware
paymentDLQSchema.pre('save', function(next) {
  // Marcar como high value si el monto es alto
  if (this.originalPayload.amount >= 1000) {
    this.adminFlags.isHighValue = true;
  }
  
  // Auto-escalate si hay muchos intentos fallidos
  if (this.retryInfo.attempts >= 3 && this.priority === 'normal') {
    this.priority = 'high';
  }
  
  next();
});

module.exports = mongoose.model('PaymentDLQ', paymentDLQSchema);