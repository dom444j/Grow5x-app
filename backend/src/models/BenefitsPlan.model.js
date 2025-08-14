const mongoose = require('mongoose');

const benefitsPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    required: true,
    index: true
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'active',
    index: true
  },
  // Configuración del plan
  planConfig: {
    totalCycles: {
      type: Number,
      default: 5
    },
    daysPerCycle: {
      type: Number,
      default: 8
    },
    dailyRate: {
      type: Number,
      default: 0.125 // 12.5%
    },
    baseAmount: {
      type: Number,
      required: true
    },
    totalPotential: {
      type: Number,
      default: 5.0 // 500%
    }
  },
  // Cronograma de beneficios
  schedule: [{
    dayIndex: {
      type: Number,
      required: true
    },
    cycleNumber: {
      type: Number,
      required: true
    },
    percent: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'done', 'failed', 'skipped'],
      default: 'pending'
    },
    scheduledAt: {
      type: Date,
      required: true
    },
    executedAt: {
      type: Date
    },
    jobId: {
      type: String // ID del job de Agenda/Bull
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    error: {
      message: String,
      code: String,
      timestamp: Date
    },
    retryCount: {
      type: Number,
      default: 0
    }
  }],
  // Control de ejecución
  nextRunAt: {
    type: Date,
    index: true
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  pausedAt: {
    type: Date
  },
  // Estadísticas
  stats: {
    totalExecuted: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    totalFailed: {
      type: Number,
      default: 0
    },
    lastExecutionAt: {
      type: Date
    }
  },
  // Versión de reglas para trazabilidad
  rulesVersion: {
    type: String,
    default: '1.0'
  },
  // Metadatos
  metadata: {
    source: {
      type: String,
      enum: ['auto', 'admin', 'manual'],
      default: 'auto'
    },
    notes: String,
    adminNotes: String
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
benefitsPlanSchema.index({ userId: 1, status: 1 });
benefitsPlanSchema.index({ purchaseId: 1 }, { unique: true });
benefitsPlanSchema.index({ nextRunAt: 1, status: 1 });
benefitsPlanSchema.index({ 'schedule.scheduledAt': 1, 'schedule.status': 1 });
benefitsPlanSchema.index({ createdAt: -1 });

// Virtuals
benefitsPlanSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

benefitsPlanSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

benefitsPlanSchema.virtual('progress').get(function() {
  const total = this.schedule.length;
  const executed = this.schedule.filter(item => item.status === 'done').length;
  return total > 0 ? (executed / total) * 100 : 0;
});

benefitsPlanSchema.virtual('nextPayment').get(function() {
  return this.schedule.find(item => item.status === 'pending');
});

// Métodos de instancia
benefitsPlanSchema.methods.markItemAsExecuted = function(dayIndex, transactionId) {
  const item = this.schedule.find(s => s.dayIndex === dayIndex);
  if (item) {
    item.status = 'done';
    item.executedAt = new Date();
    item.transactionId = transactionId;
    
    // Actualizar estadísticas
    this.stats.totalExecuted += 1;
    this.stats.totalAmount += item.amount;
    this.stats.lastExecutionAt = new Date();
    
    // Verificar si está completo
    const allDone = this.schedule.every(s => s.status === 'done');
    if (allDone) {
      this.status = 'completed';
      this.completedAt = new Date();
    } else {
      // Actualizar próxima ejecución
      const nextPending = this.schedule.find(s => s.status === 'pending');
      if (nextPending) {
        this.nextRunAt = nextPending.scheduledAt;
      }
    }
  }
  return this.save();
};

benefitsPlanSchema.methods.markItemAsFailed = function(dayIndex, error) {
  const item = this.schedule.find(s => s.dayIndex === dayIndex);
  if (item) {
    item.status = 'failed';
    item.error = {
      message: error.message,
      code: error.code || 'UNKNOWN',
      timestamp: new Date()
    };
    item.retryCount += 1;
    
    this.stats.totalFailed += 1;
  }
  return this.save();
};

benefitsPlanSchema.methods.pause = function(reason) {
  this.status = 'paused';
  this.pausedAt = new Date();
  this.metadata.notes = reason;
  return this.save();
};

benefitsPlanSchema.methods.resume = function() {
  this.status = 'active';
  this.pausedAt = undefined;
  
  // Actualizar próxima ejecución
  const nextPending = this.schedule.find(s => s.status === 'pending');
  if (nextPending) {
    this.nextRunAt = nextPending.scheduledAt;
  }
  
  return this.save();
};

// Métodos estáticos
benefitsPlanSchema.statics.findActiveForExecution = function(date = new Date()) {
  return this.find({
    status: 'active',
    nextRunAt: { $lte: date }
  }).populate('userId', 'email fullName status')
    .populate('purchaseId', 'amount currency status');
};

benefitsPlanSchema.statics.findByUser = function(userId) {
  return this.find({ userId })
    .populate('purchaseId', 'amount currency status createdAt')
    .populate('packageId', 'name category')
    .sort({ createdAt: -1 });
};

benefitsPlanSchema.statics.getStats = function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$stats.totalAmount' },
        avgProgress: { $avg: '$stats.totalExecuted' }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Middleware
benefitsPlanSchema.pre('save', function(next) {
  if (this.isNew) {
    this.startedAt = new Date();
    
    // Establecer próxima ejecución
    const firstPending = this.schedule.find(s => s.status === 'pending');
    if (firstPending) {
      this.nextRunAt = firstPending.scheduledAt;
    }
  }
  
  next();
});

module.exports = mongoose.model('BenefitsPlan', benefitsPlanSchema);