const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: true,
    unique: true
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
    trim: true,
    maxlength: 2000
  },
  category: {
    type: String,
    required: true,
    enum: ['general', 'technical', 'financial', 'account'],
    default: 'general'
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolution: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userRating: {
    type: Number,
    min: 1,
    max: 5
  },
  userFeedback: {
    type: String,
    trim: true,
    maxlength: 500
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isInternal: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar rendimiento
ticketSchema.index({ user: 1, status: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ priority: 1, status: 1 });
ticketSchema.index({ category: 1 });

// Virtual para obtener el tiempo transcurrido
ticketSchema.virtual('timeElapsed').get(function() {
  const now = new Date();
  const created = this.createdAt;
  const diffMs = now - created;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  }
});

// Virtual para determinar si el ticket está vencido
ticketSchema.virtual('isOverdue').get(function() {
  if (this.status === 'resolved' || this.status === 'closed') {
    return false;
  }
  
  const now = new Date();
  const created = this.createdAt;
  const diffHours = (now - created) / (1000 * 60 * 60);
  
  // Definir SLA basado en prioridad
  const slaHours = {
    urgent: 4,
    high: 24,
    normal: 72,
    low: 168
  };
  
  return diffHours > (slaHours[this.priority] || 72);
});

// Middleware para actualizar lastActivity
ticketSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastActivity = new Date();
  }
  next();
});

// Middleware para actualizar lastActivity en findOneAndUpdate
ticketSchema.pre('findOneAndUpdate', function(next) {
  this.set({ lastActivity: new Date() });
  next();
});

// Método estático para obtener estadísticas
ticketSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const priorityStats = await this.aggregate([
    {
      $match: { status: { $in: ['open', 'in_progress'] } }
    },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    byStatus: stats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    byPriority: priorityStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

// Método para marcar como resuelto
ticketSchema.methods.resolve = function(resolution, resolvedBy) {
  this.status = 'resolved';
  this.resolution = resolution;
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  return this.save();
};

// Método para asignar ticket
ticketSchema.methods.assignTo = function(adminId) {
  this.assignedTo = adminId;
  this.status = 'in_progress';
  return this.save();
};

// Método para calificar ticket
ticketSchema.methods.rate = function(rating, feedback) {
  this.userRating = rating;
  this.userFeedback = feedback;
  return this.save();
};

module.exports = mongoose.model('Ticket', ticketSchema);