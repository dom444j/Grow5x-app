const mongoose = require('mongoose');

const userBenefitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'bonus',           // Bonos generales
      'cashback',        // Devolución de dinero
      'reward',          // Recompensas por actividad
      'promotion',       // Beneficios promocionales
      'referral_bonus',  // Bonos por referidos
      'loyalty_bonus',   // Bonos por lealtad
      'milestone_bonus', // Bonos por hitos alcanzados
      'special_offer',   // Ofertas especiales
      'compensation',    // Compensaciones
      'welcome_bonus',   // Bono de bienvenida
      'birthday_bonus',  // Bono de cumpleaños
      'anniversary_bonus' // Bono de aniversario
    ]
  },
  subtype: {
    type: String,
    enum: [
      'direct_referral',
      'indirect_referral',
      'leader_bonus',
      'parent_bonus',
      'pioneer_bonus',
      'volume_bonus',
      'performance_bonus',
      'early_adopter',
      'loyalty_tier',
      'special_event',
      'system_error_compensation',
      'manual_adjustment'
    ]
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
    enum: ['USDT', 'BTC', 'ETH', 'BNB', 'USD']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'paid', 'cancelled', 'expired', 'processing'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  source: {
    type: String,
    required: true,
    enum: [
      'system_automatic',  // Generado automáticamente por el sistema
      'admin_manual',      // Creado manualmente por admin
      'referral_system',   // Generado por sistema de referidos
      'promotion_system',  // Generado por sistema de promociones
      'loyalty_system',    // Generado por sistema de lealtad
      'compensation_system', // Generado por sistema de compensaciones
      'api_integration',   // Generado por integración externa
      'migration'          // Generado durante migración de datos
    ],
    default: 'system_automatic'
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  details: {
    // Información específica según el tipo de beneficio
    referralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Referral'
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    investmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment'
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package'
    },
    promotionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promotion'
    },
    originalAmount: Number,
    percentage: Number,
    multiplier: Number,
    calculationBase: String,
    eligibilityCriteria: [String],
    metadata: mongoose.Schema.Types.Mixed
  },
  eligibility: {
    isEligible: {
      type: Boolean,
      default: true
    },
    eligibilityCheckedAt: {
      type: Date
    },
    eligibilityCheckedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    eligibilityNotes: String,
    requirements: [{
      requirement: String,
      met: Boolean,
      checkedAt: Date,
      notes: String
    }]
  },
  processing: {
    requestedAt: {
      type: Date,
      default: Date.now
    },
    approvedAt: {
      type: Date
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedAt: {
      type: Date
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paidAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelReason: String,
    paymentTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    paymentMethod: {
      type: String,
      enum: ['wallet_credit', 'direct_transfer', 'manual_payment', 'system_credit']
    },
    paymentReference: String,
    notes: String
  },
  schedule: {
    isScheduled: {
      type: Boolean,
      default: false
    },
    scheduledFor: {
      type: Date
    },
    recurringType: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    recurringEndDate: Date,
    nextOccurrence: Date,
    occurrenceCount: {
      type: Number,
      default: 0
    },
    maxOccurrences: Number
  },
  validation: {
    isValidated: {
      type: Boolean,
      default: false
    },
    validatedAt: Date,
    validatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    validationNotes: String,
    requiresManualValidation: {
      type: Boolean,
      default: false
    },
    validationErrors: [String],
    validationWarnings: [String]
  },
  expiration: {
    expiresAt: {
      type: Date
    },
    isExpired: {
      type: Boolean,
      default: false
    },
    expiredAt: Date,
    autoExpire: {
      type: Boolean,
      default: true
    },
    expirationWarningsSent: {
      type: Number,
      default: 0
    }
  },
  audit: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifications: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      modifiedAt: {
        type: Date,
        default: Date.now
      },
      modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: String
    }],
    ipAddress: String,
    userAgent: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices compuestos para optimizar consultas
userBenefitSchema.index({ user: 1, status: 1 });
userBenefitSchema.index({ user: 1, type: 1 });
userBenefitSchema.index({ status: 1, priority: 1 });
userBenefitSchema.index({ status: 1, 'processing.requestedAt': 1 });
userBenefitSchema.index({ type: 1, status: 1 });
userBenefitSchema.index({ 'schedule.scheduledFor': 1, 'schedule.isScheduled': 1 });
userBenefitSchema.index({ 'expiration.expiresAt': 1, 'expiration.isExpired': 1 });
userBenefitSchema.index({ source: 1, createdAt: -1 });
userBenefitSchema.index({ 'details.referralId': 1 });
userBenefitSchema.index({ 'details.transactionId': 1 });
userBenefitSchema.index({ 'details.investmentId': 1 });

// Middleware para manejar expiración automática
userBenefitSchema.pre('save', function(next) {
  // Verificar expiración
  if (this.expiration.expiresAt && this.expiration.expiresAt <= new Date() && this.expiration.autoExpire) {
    if (this.status === 'pending' || this.status === 'approved') {
      this.status = 'expired';
      this.expiration.isExpired = true;
      this.expiration.expiredAt = new Date();
    }
  }
  
  // Actualizar próxima ocurrencia para beneficios recurrentes
  if (this.schedule.isScheduled && this.schedule.recurringType !== 'none') {
    this.updateNextOccurrence();
  }
  
  next();
});

// Métodos de instancia
userBenefitSchema.methods.approve = function(approvedBy, notes = '') {
  if (this.status !== 'pending') {
    throw new Error('Solo se pueden aprobar beneficios pendientes');
  }
  
  this.status = 'approved';
  this.processing.approvedAt = new Date();
  this.processing.approvedBy = approvedBy;
  if (notes) this.processing.notes = notes;
  
  this.addAuditEntry('status', 'pending', 'approved', approvedBy, 'Beneficio aprobado');
  
  return this.save();
};

userBenefitSchema.methods.process = function(processedBy, paymentMethod = 'wallet_credit', paymentReference = '', notes = '') {
  if (this.status !== 'approved') {
    throw new Error('Solo se pueden procesar beneficios aprobados');
  }
  
  this.status = 'processing';
  this.processing.processedAt = new Date();
  this.processing.processedBy = processedBy;
  this.processing.paymentMethod = paymentMethod;
  if (paymentReference) this.processing.paymentReference = paymentReference;
  if (notes) this.processing.notes = notes;
  
  this.addAuditEntry('status', 'approved', 'processing', processedBy, 'Beneficio en procesamiento');
  
  return this.save();
};

userBenefitSchema.methods.markAsPaid = function(transactionId, paidBy, notes = '') {
  if (this.status !== 'processing' && this.status !== 'approved') {
    throw new Error('Solo se pueden marcar como pagados beneficios en procesamiento o aprobados');
  }
  
  this.status = 'paid';
  this.processing.paidAt = new Date();
  this.processing.paymentTransactionId = transactionId;
  if (paidBy) this.processing.processedBy = paidBy;
  if (notes) this.processing.notes = notes;
  
  this.addAuditEntry('status', this.status, 'paid', paidBy, 'Beneficio pagado');
  
  return this.save();
};

userBenefitSchema.methods.cancel = function(cancelledBy, reason = '', notes = '') {
  if (this.status === 'paid' || this.status === 'cancelled') {
    throw new Error('No se pueden cancelar beneficios pagados o ya cancelados');
  }
  
  const oldStatus = this.status;
  this.status = 'cancelled';
  this.processing.cancelledAt = new Date();
  this.processing.cancelledBy = cancelledBy;
  this.processing.cancelReason = reason;
  if (notes) this.processing.notes = notes;
  
  this.addAuditEntry('status', oldStatus, 'cancelled', cancelledBy, `Beneficio cancelado: ${reason}`);
  
  return this.save();
};

userBenefitSchema.methods.addAuditEntry = function(field, oldValue, newValue, modifiedBy, reason = '') {
  this.audit.modifications.push({
    field: field,
    oldValue: oldValue,
    newValue: newValue,
    modifiedAt: new Date(),
    modifiedBy: modifiedBy,
    reason: reason
  });
  
  this.audit.lastModifiedBy = modifiedBy;
};

userBenefitSchema.methods.updateNextOccurrence = function() {
  if (!this.schedule.isScheduled || this.schedule.recurringType === 'none') {
    return;
  }
  
  const now = new Date();
  let nextDate = new Date(this.schedule.scheduledFor || now);
  
  switch (this.schedule.recurringType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  // Verificar si no excede la fecha de finalización o el máximo de ocurrencias
  if (this.schedule.recurringEndDate && nextDate > this.schedule.recurringEndDate) {
    this.schedule.nextOccurrence = null;
    return;
  }
  
  if (this.schedule.maxOccurrences && this.schedule.occurrenceCount >= this.schedule.maxOccurrences) {
    this.schedule.nextOccurrence = null;
    return;
  }
  
  this.schedule.nextOccurrence = nextDate;
};

userBenefitSchema.methods.validate = function(validatedBy, notes = '') {
  this.validation.isValidated = true;
  this.validation.validatedAt = new Date();
  this.validation.validatedBy = validatedBy;
  if (notes) this.validation.validationNotes = notes;
  
  this.addAuditEntry('validation', false, true, validatedBy, 'Beneficio validado');
  
  return this.save();
};

// Métodos estáticos
userBenefitSchema.statics.getPendingBenefits = function(limit = 50, priority = null) {
  const query = { status: 'pending' };
  if (priority) query.priority = priority;
  
  return this.find(query)
    .populate('user', 'fullName email')
    .populate('processing.approvedBy', 'fullName')
    .sort({ priority: -1, 'processing.requestedAt': 1 })
    .limit(limit);
};

userBenefitSchema.statics.getBenefitsForProcessing = function(limit = 50) {
  return this.find({ status: 'approved' })
    .populate('user', 'fullName email walletAddresses')
    .populate('processing.approvedBy', 'fullName')
    .sort({ priority: -1, 'processing.approvedAt': 1 })
    .limit(limit);
};

userBenefitSchema.statics.getScheduledBenefits = function(date = new Date()) {
  return this.find({
    'schedule.isScheduled': true,
    'schedule.scheduledFor': { $lte: date },
    status: { $in: ['pending', 'approved'] }
  }).populate('user', 'fullName email');
};

userBenefitSchema.statics.getExpiringBenefits = function(days = 7) {
  const futureDate = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
  
  return this.find({
    'expiration.expiresAt': { $lte: futureDate },
    'expiration.isExpired': false,
    status: { $in: ['pending', 'approved'] }
  }).populate('user', 'fullName email');
};

userBenefitSchema.statics.getUserBenefitsSummary = async function(userId, timeframe = 'all') {
  let dateFilter = {};
  
  if (timeframe !== 'all') {
    const now = new Date();
    switch (timeframe) {
      case 'month':
        dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } };
        break;
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        dateFilter = { createdAt: { $gte: quarterStart } };
        break;
      case 'year':
        dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), 0, 1) } };
        break;
    }
  }
  
  const result = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), ...dateFilter } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
  
  const summary = {
    pending: { count: 0, totalAmount: 0 },
    approved: { count: 0, totalAmount: 0 },
    paid: { count: 0, totalAmount: 0 },
    cancelled: { count: 0, totalAmount: 0 },
    expired: { count: 0, totalAmount: 0 }
  };
  
  result.forEach(item => {
    if (summary[item._id]) {
      summary[item._id] = {
        count: item.count,
        totalAmount: item.totalAmount
      };
    }
  });
  
  return summary;
};

userBenefitSchema.statics.createBenefit = function(benefitData) {
  const benefit = new this(benefitData);
  
  // Establecer expiración por defecto si no se especifica
  if (!benefit.expiration.expiresAt && benefit.type !== 'manual_adjustment') {
    const expirationDays = {
      'bonus': 30,
      'cashback': 90,
      'reward': 60,
      'promotion': 30,
      'referral_bonus': 180,
      'loyalty_bonus': 365,
      'milestone_bonus': 90,
      'special_offer': 14,
      'compensation': 365,
      'welcome_bonus': 30,
      'birthday_bonus': 30,
      'anniversary_bonus': 30
    };
    
    const days = expirationDays[benefit.type] || 30;
    benefit.expiration.expiresAt = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
  }
  
  return benefit.save();
};

const UserBenefit = mongoose.model('UserBenefit', userBenefitSchema);

module.exports = UserBenefit;