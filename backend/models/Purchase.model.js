const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed, // Permite ObjectId o String para compatibilidad con mock users
    required: [true, 'El ID del usuario es requerido']
  },
  productId: {
    type: mongoose.Schema.Types.Mixed, // Permite ObjectId o String
    required: [true, 'El ID del producto es requerido']
  },
  packageId: {
    type: mongoose.Schema.Types.Mixed, // Permite ObjectId o String para compatibilidad
    ref: 'Package'
  },
  amount: {
    type: Number,
    required: [true, 'El monto es requerido'],
    min: [0, 'El monto no puede ser negativo']
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'BTC', 'ETH'],
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'crypto', 'bank_transfer', 'other', 'usdt-bep20', 'usdt-trc20', 'bitcoin', 'bnb', 'wallet'],
    required: [true, 'El método de pago es requerido']
  },
  customerInfo: {
    email: {
      type: String,
      trim: true
    },
    fullName: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    }
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentGateway: {
    type: String,
    enum: ['stripe', 'paypal', 'coinbase', 'binance', 'manual']
  },
  gatewayTransactionId: {
    type: String
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxDownloads: {
    type: Number,
    default: 5,
    min: 1
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Expira en 1 año por defecto
      return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
  },
  refundReason: {
    type: String,
    maxlength: [200, 'La razón del reembolso no puede exceder 200 caracteres']
  },
  refundedAt: {
    type: Date
  },
  refundedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    referrer: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
purchaseSchema.index({ userId: 1, createdAt: -1 });
purchaseSchema.index({ productId: 1 });
purchaseSchema.index({ status: 1 });
purchaseSchema.index({ transactionId: 1 });
purchaseSchema.index({ createdAt: -1 });
purchaseSchema.index({ expiresAt: 1 });

// Virtuals
purchaseSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

purchaseSchema.virtual('canDownload').get(function() {
  return this.status === 'completed' && 
         !this.isExpired && 
         this.downloadCount < this.maxDownloads;
});

purchaseSchema.virtual('remainingDownloads').get(function() {
  return Math.max(0, this.maxDownloads - this.downloadCount);
});

// Middleware
purchaseSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'refunded') {
    this.refundedAt = new Date();
  }
  next();
});

// Métodos estáticos
purchaseSchema.statics.findByUser = function(userId, options = {}) {
  return this.find({ userId })
    .populate('productId', 'name price category')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

purchaseSchema.statics.findExpired = function() {
  return this.find({
    expiresAt: { $lt: new Date() },
    status: 'completed'
  });
};

module.exports = mongoose.model('Purchase', purchaseSchema);
