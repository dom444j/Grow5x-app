const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título del documento es requerido'],
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },
  filename: {
    type: String,
    required: [true, 'El nombre del archivo es requerido']
  },
  originalName: {
    type: String,
    required: [true, 'El nombre original del archivo es requerido']
  },
  filePath: {
    type: String,
    required: [true, 'La ruta del archivo es requerida']
  },
  fileSize: {
    type: Number,
    required: [true, 'El tamaño del archivo es requerido']
  },
  mimeType: {
    type: String,
    required: [true, 'El tipo MIME del archivo es requerido']
  },
  category: {
    type: String,
    required: [true, 'La categoría del documento es requerida'],
    enum: {
      values: ['manual', 'tutorial', 'guia', 'politicas', 'terminos', 'faq', 'otros'],
      message: 'Categoría no válida'
    }
  },
  isPublic: {
    type: Boolean,
    default: true,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: [0, 'El contador de descargas no puede ser negativo']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  version: {
    type: String,
    default: '1.0.0'
  },
  language: {
    type: String,
    default: 'es',
    enum: ['es', 'en', 'pt']
  },
  targetAudience: {
    type: String,
    enum: ['all', 'users', 'admins', 'premium'],
    default: 'all'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario que subió el documento es requerido']
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    author: String,
    subject: String,
    keywords: [String],
    creationDate: Date,
    modificationDate: Date
  },
  accessLog: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    accessDate: {
      type: Date,
      default: Date.now
    },
    action: {
      type: String,
      enum: ['view', 'download', 'share'],
      required: true
    },
    ipAddress: String,
    userAgent: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar el rendimiento
documentSchema.index({ category: 1, isActive: 1, isPublic: 1 });
documentSchema.index({ title: 'text', description: 'text', tags: 'text' });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ downloadCount: -1 });

// Virtual para obtener el tamaño del archivo en formato legible
documentSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual para obtener la URL de descarga
documentSchema.virtual('downloadUrl').get(function() {
  return `/api/documents/${this._id}/download`;
});

// Virtual para verificar si el documento es reciente (últimos 7 días)
documentSchema.virtual('isRecent').get(function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return this.createdAt > sevenDaysAgo;
});

// Middleware pre-save para actualizar lastModifiedBy
documentSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModifiedBy = this.uploadedBy; // Se puede personalizar según el contexto
  }
  next();
});

// Middleware pre-remove para limpiar archivos del sistema de archivos
documentSchema.pre('remove', async function(next) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Eliminar archivo físico si existe
    if (this.filePath) {
      try {
        await fs.unlink(this.filePath);
        console.log(`Archivo eliminado: ${this.filePath}`);
      } catch (error) {
        console.warn(`No se pudo eliminar el archivo: ${this.filePath}`, error.message);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Método estático para obtener estadísticas de documentos
documentSchema.statics.getStatistics = async function() {
  try {
    const stats = await this.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalDownloads: { $sum: '$downloadCount' },
          totalSize: { $sum: '$fileSize' },
          publicDocuments: {
            $sum: { $cond: [{ $eq: ['$isPublic', true] }, 1, 0] }
          },
          privateDocuments: {
            $sum: { $cond: [{ $eq: ['$isPublic', false] }, 1, 0] }
          }
        }
      }
    ]);
    
    const categoryStats = await this.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalDownloads: { $sum: '$downloadCount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    return {
      general: stats[0] || {
        totalDocuments: 0,
        totalDownloads: 0,
        totalSize: 0,
        publicDocuments: 0,
        privateDocuments: 0
      },
      byCategory: categoryStats
    };
  } catch (error) {
    throw new Error(`Error obteniendo estadísticas: ${error.message}`);
  }
};

// Método para incrementar contador de descargas
documentSchema.methods.incrementDownloadCount = async function(userId, ipAddress, userAgent) {
  try {
    this.downloadCount += 1;
    
    // Agregar entrada al log de acceso
    this.accessLog.push({
      userId: userId || null,
      action: 'download',
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown'
    });
    
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Error incrementando contador de descargas: ${error.message}`);
  }
};

// Método para buscar documentos con filtros avanzados
documentSchema.statics.searchDocuments = async function(filters = {}, options = {}) {
  try {
    const {
      search,
      category,
      isPublic,
      targetAudience,
      language,
      tags,
      dateFrom,
      dateTo
    } = filters;
    
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;
    
    // Construir query
    let query = { isActive: true };
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (category) {
      query.category = category;
    }
    
    if (typeof isPublic === 'boolean') {
      query.isPublic = isPublic;
    }
    
    if (targetAudience) {
      query.targetAudience = targetAudience;
    }
    
    if (language) {
      query.language = language;
    }
    
    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    // Configurar ordenamiento
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Ejecutar consulta con paginación
    const skip = (page - 1) * limit;
    
    const [documents, total] = await Promise.all([
      this.find(query)
        .populate('uploadedBy', 'name email')
        .populate('lastModifiedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.countDocuments(query)
    ]);
    
    return {
      documents,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  } catch (error) {
    throw new Error(`Error en búsqueda de documentos: ${error.message}`);
  }
};

module.exports = mongoose.model('Document', documentSchema);