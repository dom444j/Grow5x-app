const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido']
  },
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    required: [true, 'El ID de la compra es requerido']
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'El ID del producto es requerido']
  },
  downloadUrl: {
    type: String,
    required: [true, 'La URL de descarga es requerida']
  },
  temporaryToken: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      // Expira en 24 horas
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  fileSize: {
    type: Number, // en bytes
    min: 0
  },
  downloadDuration: {
    type: Number, // en segundos
    min: 0
  },
  downloadSpeed: {
    type: Number, // bytes por segundo
    min: 0
  },
  errorMessage: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'expired'],
    default: 'pending'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
downloadSchema.index({ userId: 1, createdAt: -1 });
downloadSchema.index({ purchaseId: 1 });
downloadSchema.index({ temporaryToken: 1 });
downloadSchema.index({ expiresAt: 1 });
downloadSchema.index({ status: 1 });
downloadSchema.index({ createdAt: -1 });

// Virtuals
downloadSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

downloadSchema.virtual('isValid').get(function() {
  return !this.isUsed && !this.isExpired && this.status === 'pending';
});

// Middleware
downloadSchema.pre('save', function(next) {
  if (this.isModified('isUsed') && this.isUsed) {
    this.usedAt = new Date();
    this.status = 'completed';
  }
  
  if (this.isExpired && this.status === 'pending') {
    this.status = 'expired';
  }
  
  next();
});

// Métodos estáticos
downloadSchema.statics.findValidToken = function(token) {
  return this.findOne({
    temporaryToken: token,
    isUsed: false,
    expiresAt: { $gt: new Date() },
    status: 'pending'
  }).populate('purchaseId productId userId');
};

downloadSchema.statics.cleanupExpired = function() {
  return this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      status: 'pending'
    },
    {
      status: 'expired'
    }
  );
};

module.exports = mongoose.model('Download', downloadSchema);
