const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  // Información básica del ticket
  ticketNumber: {
    type: String,
    unique: true,
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  category: {
    type: String,
    enum: ['general', 'technical', 'financial', 'account', 'referrals', 'payments', 'other'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_user', 'waiting_admin', 'resolved', 'closed'],
    default: 'open'
  },
  
  // Usuario que creó el ticket
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  
  // Administrador asignado
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  
  // IA y automatización
  aiProcessed: {
    type: Boolean,
    default: false
  },
  aiResponse: {
    type: String,
    default: null
  },
  aiConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  requiresHumanReview: {
    type: Boolean,
    default: true
  },
  
  // Resolución
  resolution: {
    type: String,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Satisfacción del usuario
  userRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  userFeedback: {
    type: String,
    default: null
  },
  
  // Metadatos
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Tiempos de respuesta
  firstResponseAt: {
    type: Date,
    default: null
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  
  // Configuración de notificaciones
  notifications: {
    emailSent: {
      type: Boolean,
      default: false
    },
    telegramSent: {
      type: Boolean,
      default: false
    }
  },
  
  // Notas internas (solo para admins)
  internalNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimizar consultas
ticketSchema.index({ user: 1, status: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ category: 1, status: 1 });
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ lastActivityAt: -1 });

// Virtual para calcular tiempo de respuesta
ticketSchema.virtual('responseTime').get(function() {
  if (this.firstResponseAt && this.createdAt) {
    return Math.round((this.firstResponseAt - this.createdAt) / (1000 * 60)); // en minutos
  }
  return null;
});

// Virtual para calcular tiempo total de resolución
ticketSchema.virtual('resolutionTime').get(function() {
  if (this.resolvedAt && this.createdAt) {
    return Math.round((this.resolvedAt - this.createdAt) / (1000 * 60 * 60)); // en horas
  }
  return null;
});

// Middleware para generar número de ticket único
ticketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    const count = await this.constructor.countDocuments();
    this.ticketNumber = `TK${Date.now().toString().slice(-6)}${(count + 1).toString().padStart(3, '0')}`;
  }
  
  // Actualizar lastActivityAt en cada cambio
  this.lastActivityAt = new Date();
  
  next();
});

// Método estático para obtener estadísticas
ticketSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        avgRating: { $avg: '$userRating' }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    urgent: 0,
    avgRating: null
  };
};

// Método para marcar como procesado por IA
ticketSchema.methods.markAIProcessed = function(response, confidence) {
  this.aiProcessed = true;
  this.aiResponse = response;
  this.aiConfidence = confidence;
  this.requiresHumanReview = confidence < 0.8; // Si la confianza es baja, requiere revisión humana
  return this.save();
};

// Método para asignar a administrador
ticketSchema.methods.assignTo = function(adminId) {
  this.assignedTo = adminId;
  this.assignedAt = new Date();
  if (this.status === 'open') {
    this.status = 'in_progress';
  }
  return this.save();
};

// Método para resolver ticket
ticketSchema.methods.resolve = function(resolution, resolvedBy) {
  this.status = 'resolved';
  this.resolution = resolution;
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  return this.save();
};

module.exports = mongoose.model('Ticket', ticketSchema);