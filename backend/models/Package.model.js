const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del paquete es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  slug: {
    type: String,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },
  price: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'draft'
  },
  features: [{
    type: String,
    trim: true
  }],
  images: [{
    url: String,
    alt: String,
    isPrimary: { type: Boolean, default: false }
  }],
  duration: {
    type: Number,
    default: 45, // Duración en días (5 ciclos de 8 días + 5 días de pausa)
    required: true
  },
  benefits: {
    firstWeekReturn: {
      type: String,
      default: '12.5%'
    },
    dailyReturn: {
      type: String,
      default: '12.5%'
    },
    totalReturn: {
      type: String,
      default: '100% semanal'
    },
    referralCommission: {
      type: String,
      default: '10%'
    },
    activationCommission: {
      type: String,
      default: '5%'
    },
    withdrawalTime: {
      type: String,
      default: '24 horas'
    },
    priority: {
      type: String,
      default: 'Baja'
    }
  },
  limits: {
    minInvestment: {
      type: Number,
      default: 50
    },
    maxInvestment: {
      type: Number,
      default: 50
    }
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  salesCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Middleware para generar slug automáticamente
packageSchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name.toLowerCase()
      .replace('licencia ', '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
  next();
});

module.exports = mongoose.model('Package', packageSchema);