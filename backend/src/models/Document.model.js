const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'plan_monetizacion',
      'guias_usuario',
      'terminos_condiciones',
      'documentos_legales',
      'tutoriales',
      'otros'
    ]
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  version: {
    type: String,
    default: '1.0'
  },
  tags: [{
    type: String,
    trim: true
  }],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    language: {
      type: String,
      default: 'es'
    },
    targetAudience: {
      type: String,
      enum: ['all', 'new_users', 'active_users', 'premium_users'],
      default: 'all'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
documentSchema.index({ category: 1, status: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ isPublic: 1, status: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ downloadCount: -1 });

// Middleware para incrementar contador de descargas
documentSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  return this.save();
};

// Virtual para obtener la URL de descarga
documentSchema.virtual('downloadUrl').get(function() {
  return `/api/documents/download/${this._id}`;
});

// Asegurar que los virtuals se incluyan en JSON
documentSchema.set('toJSON', { virtuals: true });
documentSchema.set('toObject', { virtuals: true });

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;