const mongoose = require('mongoose');

const ticketResponseSchema = new mongoose.Schema({
  // Ticket al que pertenece esta respuesta
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  
  // Autor de la respuesta
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  authorType: {
    type: String,
    enum: ['user', 'admin', 'ai', 'system'],
    required: true
  },
  
  // Contenido de la respuesta
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  // Información de IA (si aplica)
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  aiModel: {
    type: String,
    default: null
  },
  aiConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  
  // Archivos adjuntos
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
  
  // Estado de la respuesta
  isInternal: {
    type: Boolean,
    default: false // true para notas internas de admin
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  
  // Metadatos
  editedAt: {
    type: Date,
    default: null
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Notificaciones
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
  
  // Reacciones/valoraciones
  helpful: {
    type: Number,
    default: 0
  },
  notHelpful: {
    type: Number,
    default: 0
  },
  
  // Información de seguimiento
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
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
ticketResponseSchema.index({ ticket: 1, createdAt: 1 });
ticketResponseSchema.index({ author: 1, createdAt: -1 });
ticketResponseSchema.index({ authorType: 1, isVisible: 1 });
ticketResponseSchema.index({ isAIGenerated: 1, aiConfidence: -1 });

// Virtual para calcular el score de utilidad
ticketResponseSchema.virtual('helpfulnessScore').get(function() {
  const total = this.helpful + this.notHelpful;
  if (total === 0) return null;
  return (this.helpful / total) * 100;
});

// Middleware para actualizar el ticket cuando se agrega una respuesta
ticketResponseSchema.post('save', async function() {
  try {
    const Ticket = mongoose.model('Ticket');
    const ticket = await Ticket.findById(this.ticket);
    
    if (ticket) {
      // Actualizar firstResponseAt si es la primera respuesta de admin/AI
      if (!ticket.firstResponseAt && (this.authorType === 'admin' || this.authorType === 'ai')) {
        ticket.firstResponseAt = this.createdAt;
      }
      
      // Actualizar estado del ticket basado en quién responde
      if (this.authorType === 'user' && ticket.status === 'waiting_user') {
        ticket.status = 'waiting_admin';
      } else if ((this.authorType === 'admin' || this.authorType === 'ai') && ticket.status === 'waiting_admin') {
        ticket.status = 'waiting_user';
      }
      
      // Actualizar lastActivityAt
      ticket.lastActivityAt = this.createdAt;
      
      await ticket.save();
    }
  } catch (error) {
    console.error('Error updating ticket after response:', error);
  }
});

// Método estático para obtener respuestas de un ticket
ticketResponseSchema.statics.getTicketResponses = function(ticketId, includeInternal = false) {
  const query = { ticket: ticketId };
  if (!includeInternal) {
    query.isInternal = false;
    query.isVisible = true;
  }
  
  return this.find(query)
    .populate('author', 'name email role')
    .sort({ createdAt: 1 });
};

// Método para marcar como leído
ticketResponseSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(r => r.user.toString() === userId.toString());
  if (!existingRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
    return this.save();
  }
  return Promise.resolve(this);
};

// Método para valorar la respuesta
ticketResponseSchema.methods.rate = function(isHelpful) {
  if (isHelpful) {
    this.helpful += 1;
  } else {
    this.notHelpful += 1;
  }
  return this.save();
};

module.exports = mongoose.model('TicketResponse', ticketResponseSchema);