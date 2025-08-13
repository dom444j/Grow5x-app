const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  summary: {
    type: String,
    required: true,
    maxlength: 300
  },
  category: {
    type: String,
    required: true,
    enum: [
      'announcement',
      'update',
      'maintenance',
      'promotion',
      'security',
      'general'
    ]
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publishedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  targetAudience: {
    type: String,
    enum: ['all', 'pioneers', 'regular_users', 'new_users'],
    default: 'all'
  },
  languages: {
    es: {
      title: String,
      content: String,
      summary: String
    },
    en: {
      title: String,
      content: String,
      summary: String
    }
  },
  metadata: {
    tags: [String],
    featured: {
      type: Boolean,
      default: false
    },
    allowComments: {
      type: Boolean,
      default: false
    },
    notifyUsers: {
      type: Boolean,
      default: false
    },
    sendEmail: {
      type: Boolean,
      default: false
    },
    sendTelegram: {
      type: Boolean,
      default: false
    }
  },
  statistics: {
    views: {
      type: Number,
      default: 0
    },
    uniqueViews: {
      type: Number,
      default: 0
    },
    viewedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      viewedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices
newsSchema.index({ status: 1, publishedAt: -1 });
newsSchema.index({ category: 1, status: 1 });
newsSchema.index({ priority: 1, publishedAt: -1 });
newsSchema.index({ targetAudience: 1, status: 1 });
newsSchema.index({ 'metadata.featured': 1, publishedAt: -1 });
newsSchema.index({ expiresAt: 1 });
newsSchema.index({ author: 1, createdAt: -1 });

// TTL index para auto-eliminar noticias expiradas
newsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual para verificar si la noticia está activa
newsSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'published' && 
         (!this.expiresAt || this.expiresAt > now) &&
         this.publishedAt <= now;
});

// Middleware para actualizar publishedAt cuando se publica
newsSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  if (this.isModified() && !this.isNew) {
    this.lastModified = new Date();
  }
  
  next();
});

// Método para incrementar vistas
newsSchema.methods.incrementView = async function(userId = null) {
  this.statistics.views += 1;
  
  if (userId) {
    // Verificar si el usuario ya vio esta noticia
    const alreadyViewed = this.statistics.viewedBy.some(
      view => view.user.toString() === userId.toString()
    );
    
    if (!alreadyViewed) {
      this.statistics.uniqueViews += 1;
      this.statistics.viewedBy.push({
        user: userId,
        viewedAt: new Date()
      });
      
      // Mantener solo los últimos 1000 viewers para evitar documentos muy grandes
      if (this.statistics.viewedBy.length > 1000) {
        this.statistics.viewedBy = this.statistics.viewedBy.slice(-1000);
      }
    }
  }
  
  return this.save();
};

// Método estático para obtener noticias activas
newsSchema.statics.getActiveNews = function(targetAudience = 'all', limit = 10) {
  const now = new Date();
  return this.find({
    status: 'published',
    publishedAt: { $lte: now },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } }
    ],
    targetAudience: { $in: [targetAudience, 'all'] }
  })
  .sort({ 'metadata.featured': -1, priority: -1, publishedAt: -1 })
  .limit(limit)
  .populate('author', 'fullName email')
  .select('-statistics.viewedBy'); // Excluir la lista de viewers para mejor performance
};

// Método estático para obtener noticias destacadas
newsSchema.statics.getFeaturedNews = function(limit = 5) {
  const now = new Date();
  return this.find({
    status: 'published',
    'metadata.featured': true,
    publishedAt: { $lte: now },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } }
    ]
  })
  .sort({ priority: -1, publishedAt: -1 })
  .limit(limit)
  .populate('author', 'fullName')
  .select('-statistics.viewedBy');
};

const News = mongoose.model('News', newsSchema);

module.exports = News;