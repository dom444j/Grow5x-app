const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  // Información del usuario que recibe la comisión
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Información del usuario que generó la comisión
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Tipo de comisión
  commissionType: {
    type: String,
    enum: ['direct_referral', 'leader_bonus', 'parent_bonus', 'pool_bonus'], // ⚠️ 'assignment_bonus' ELIMINADO - NO EXISTE
    required: true
  },
  
  // Monto de la comisión
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Moneda
  currency: {
    type: String,
    default: 'USDT',
    enum: ['USD', 'EUR', 'BTC', 'ETH', 'USDT']
  },
  
  // Estado de la comisión
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  
  // Referencia al código especial (para bonos de líder/padre)
  specialCodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpecialCode',
    sparse: true
  },
  
  // Referencia al referido (para comisiones directas)
  referralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral',
    sparse: true
  },
  
  // Referencia a la transacción que generó la comisión
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    sparse: true
  },
  
  // ID de la compra que generó la comisión (para índice único)
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    sparse: true
  },
  
  // Información del pago
  paymentInfo: {
    paidAt: {
      type: Date
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paymentMethod: {
      type: String,
      enum: ['wallet', 'bank_transfer', 'crypto', 'manual']
    },
    transactionHash: String,
    notes: String
  },
  
  // Metadatos adicionales
  metadata: {
    // Para comisiones de segunda semana
    weekNumber: {
      type: Number,
      min: 1
    },
    // Número de ciclo
    cycleNumber: {
      type: Number,
      min: 1
    },
    // Día dentro del ciclo
    dayInCycle: {
      type: Number,
      min: 1,
      max: 30
    },
    // Porcentaje aplicado
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    // Monto base sobre el que se calculó
    baseAmount: {
      type: Number,
      min: 0
    },
    // ID de la compra que generó la comisión
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      sparse: true
    },
    // Información adicional
    description: String,
    calculatedAt: {
      type: Date,
      default: Date.now
    }
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
commissionSchema.index({ userId: 1, status: 1 });
commissionSchema.index({ commissionType: 1, status: 1 });
commissionSchema.index({ specialCodeId: 1, status: 1 });
commissionSchema.index({ createdAt: 1, status: 1 });

// Índice único para idempotencia de comisiones directas
commissionSchema.index({ 
  commissionType: 1, 
  userId: 1, 
  fromUserId: 1, 
  purchaseId: 1 
}, { 
  unique: true, 
  sparse: true,
  name: 'unique_direct_referral_commission'
});

// Virtual para obtener información del usuario
commissionSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual para obtener información del usuario origen
commissionSchema.virtual('fromUser', {
  ref: 'User',
  localField: 'fromUserId',
  foreignField: '_id',
  justOne: true
});

// Virtual para obtener información del código especial
commissionSchema.virtual('specialCode', {
  ref: 'SpecialCode',
  localField: 'specialCodeId',
  foreignField: '_id',
  justOne: true
});

// Métodos de instancia
commissionSchema.methods.markAsPaid = function(paymentInfo) {
  this.status = 'paid';
  this.paymentInfo = {
    ...this.paymentInfo,
    ...paymentInfo,
    paidAt: new Date()
  };
  return this.save();
};

commissionSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.paymentInfo.notes = reason;
  return this.save();
};

// Métodos estáticos
commissionSchema.statics.getCommissionsByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.commissionType) {
    query.commissionType = options.commissionType;
  }
  
  if (options.dateFrom || options.dateTo) {
    query.createdAt = {};
    if (options.dateFrom) {
      query.createdAt.$gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      query.createdAt.$lte = new Date(options.dateTo);
    }
  }
  
  return this.find(query)
    .populate('fromUser', 'username email')
    .populate('specialCode', 'code type')
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

commissionSchema.statics.getCommissionStats = function(filters = {}) {
  const matchStage = {};
  
  if (filters.userId) {
    matchStage.userId = mongoose.Types.ObjectId(filters.userId);
  }
  
  if (filters.commissionType) {
    matchStage.commissionType = filters.commissionType;
  }
  
  if (filters.status) {
    matchStage.status = filters.status;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          type: '$commissionType',
          status: '$status'
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        stats: {
          $push: {
            status: '$_id.status',
            totalAmount: '$totalAmount',
            count: '$count',
            avgAmount: '$avgAmount'
          }
        },
        totalAmount: { $sum: '$totalAmount' },
        totalCount: { $sum: '$count' }
      }
    }
  ]);
};

// Middleware pre-save
commissionSchema.pre('save', function(next) {
  if (this.isNew) {
    // Validar que el monto sea positivo
    if (this.amount <= 0) {
      return next(new Error('El monto de la comisión debe ser mayor a 0'));
    }
    
    // Establecer fecha de cálculo si no existe
    if (!this.metadata.calculatedAt) {
      this.metadata.calculatedAt = new Date();
    }
  }
  
  next();
});

// Middleware post-save para logging
commissionSchema.post('save', function(doc) {
});

module.exports = mongoose.model('Commission', commissionSchema);