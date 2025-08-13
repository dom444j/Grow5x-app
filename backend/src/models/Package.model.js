const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USDT',
    enum: ['USDT', 'USD', 'EUR']
  },
  features: [{
    name: String,
    description: String,
    included: {
      type: Boolean,
      default: true
    }
  }],
  benefits: [{
    type: String
  }],
  category: {
    type: String,
    enum: ['starter', 'basic', 'standard', 'premium', 'gold', 'platinum', 'diamond'],
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  commissionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  maxEarnings: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // días
    default: 45
  },
  // Configuración de beneficios
  benefitConfig: {
    dailyRate: {
      type: Number,
      default: 0.125 // 12.5%
    },
    cyclesTotal: {
      type: Number,
      default: 5
    },
    daysPerCycle: {
      type: Number,
      default: 8
    },
    pauseDays: {
      type: Number,
      default: 1
    },
    totalPotential: {
      type: Number,
      default: 5.0 // 500%
    }
  },
  // Configuración de comisiones
  commissionConfig: {
    directRate: {
      type: Number,
      default: 0.10 // 10%
    },
    leaderRate: {
      type: Number,
      default: 0.05 // 5%
    },
    parentRate: {
      type: Number,
      default: 0.05 // 5%
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  salesCount: {
    type: Number,
    default: 0
  },
  metadata: {
    totalSales: {
      type: Number,
      default: 0
    },
    lastPurchase: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Índices
packageSchema.index({ slug: 1 });
packageSchema.index({ category: 1, status: 1 });
packageSchema.index({ price: 1 });
packageSchema.index({ level: 1 });

// Middleware para generar slug automáticamente
packageSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name.toLowerCase()
      .replace('licencia ', '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
  next();
});

// Métodos virtuales
packageSchema.virtual('formattedPrice').get(function() {
  return `${this.price} ${this.currency}`;
});

packageSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Métodos estáticos
packageSchema.statics.getActivePackages = function() {
  return this.find({ status: 'active' }).sort({ level: 1, sortOrder: 1 });
};

packageSchema.statics.getByCategory = function(category) {
  return this.findOne({ category, status: 'active' });
};

packageSchema.statics.getBySlug = function(slug) {
  return this.findOne({ slug, status: 'active' });
};

// Métodos de instancia
packageSchema.methods.incrementSales = function() {
  this.metadata.totalSales += 1;
  this.metadata.lastPurchase = new Date();
  return this.save();
};

module.exports = mongoose.models.Package || mongoose.model('Package', packageSchema);