const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del producto es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  slug: {
    type: String,
    lowercase: true,
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
  category: {
    type: String,
    required: [true, 'La categoría es requerida'],
    enum: ['software', 'course', 'ebook', 'template', 'other']
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
  downloadUrl: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'URL de descarga debe ser válida'
    }
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  tags: [{
    type: String,
    trim: true
  }],
  requirements: {
    type: String,
    maxlength: [500, 'Los requisitos no pueden exceder 500 caracteres']
  },
  isDigital: {
    type: Boolean,
    default: true
  },
  stock: {
    type: Number,
    default: -1 // -1 = ilimitado
  },
  salesCount: {
    type: Number,
    default: 0
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
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

// Índices
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ salesCount: -1 });
productSchema.index({ slug: 1 }, { unique: true, sparse: true });

// Middleware para generar slug automáticamente
productSchema.pre('save', function(next) {
  if (this.name && (!this.slug || this.isModified('name'))) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Virtuals
productSchema.virtual('isAvailable').get(function() {
  return this.status === 'active' && (this.stock === -1 || this.stock > 0);
});

// Middleware
productSchema.pre('save', function(next) {
  if (this.isModified('price') && this.price < 0) {
    next(new Error('El precio no puede ser negativo'));
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
