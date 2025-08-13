const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  // Información del destinatario
  recipient: {
    type: String,
    required: true,
    index: true
  },
  
  // Usuario relacionado (si aplica)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Tipo de email
  emailType: {
    type: String,
    enum: ['verification', 'welcome', 'password_reset', 'notification', 'marketing', 'system', 'test'],
    required: true,
    index: true
  },
  
  // Asunto del email
  subject: {
    type: String,
    required: true
  },
  
  // Estado del envío
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'bounced', 'delivered', 'opened', 'clicked'],
    default: 'pending',
    index: true
  },
  
  // ID del mensaje (proporcionado por el proveedor de email)
  messageId: {
    type: String,
    index: true
  },
  
  // Número de intentos
  attempts: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Último error (si falló)
  lastError: {
    message: String,
    code: String,
    timestamp: Date
  },
  
  // Proveedor de email utilizado
  provider: {
    type: String,
    enum: ['default', 'welcome', 'recovery', 'backup'],
    default: 'default'
  },
  
  // Metadatos adicionales
  metadata: {
    template: String,
    language: String,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    },
    tags: [String],
    campaignId: String
  },
  
  // Timestamps
  sentAt: Date,
  deliveredAt: Date,
  openedAt: Date,
  clickedAt: Date,
  
  // Información de seguimiento
  tracking: {
    opens: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    lastOpened: Date,
    lastClicked: Date,
    userAgent: String,
    ipAddress: String
  }
}, {
  timestamps: true
});

// Índices compuestos
emailLogSchema.index({ recipient: 1, emailType: 1 });
emailLogSchema.index({ status: 1, createdAt: 1 });
emailLogSchema.index({ userId: 1, createdAt: -1 });
emailLogSchema.index({ emailType: 1, status: 1 });

// Método para marcar como enviado
emailLogSchema.methods.markAsSent = function(messageId) {
  this.status = 'sent';
  this.messageId = messageId;
  this.sentAt = new Date();
  return this.save();
};

// Método para marcar como fallido
emailLogSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.lastError = {
    message: error.message || error,
    code: error.code || 'UNKNOWN',
    timestamp: new Date()
  };
  return this.save();
};

// Método para incrementar intentos
emailLogSchema.methods.incrementAttempts = function() {
  this.attempts += 1;
  return this.save();
};

// Método estático para obtener estadísticas
emailLogSchema.statics.getStats = function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          status: '$status',
          emailType: '$emailType'
        },
        count: { $sum: 1 },
        totalAttempts: { $sum: '$attempts' }
      }
    },
    {
      $group: {
        _id: '$_id.emailType',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count',
            totalAttempts: '$totalAttempts'
          }
        },
        totalEmails: { $sum: '$count' }
      }
    }
  ]);
};

// Método estático para obtener errores recientes
emailLogSchema.statics.getRecentErrors = function(limit = 50) {
  return this.find({
    status: 'failed',
    'lastError.timestamp': { $exists: true }
  })
  .sort({ 'lastError.timestamp': -1 })
  .limit(limit)
  .populate('userId', 'email fullName')
  .select('recipient emailType subject lastError attempts createdAt userId');
};

// Método estático para obtener logs por usuario
emailLogSchema.statics.getByUser = function(userId, limit = 20) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('emailType subject status sentAt lastError attempts');
};

// Método estático para limpiar logs antiguos
emailLogSchema.statics.cleanupOld = function(daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: ['sent', 'delivered', 'failed'] }
  });
};

// TTL index para auto-eliminar logs muy antiguos (6 meses)
emailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

module.exports = EmailLog;