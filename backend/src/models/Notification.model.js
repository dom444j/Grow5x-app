const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: [
      'system_alert',
      'liquidity_warning',
      'daily_report',
      'user_action',
      'automation_status',
      'security_alert',
      'info',
      'success',
      'warning',
      'error'
    ],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending'
  },
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'sms', 'push'],
    default: 'in_app'
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  actionUrl: {
    type: String,
    default: null
  },
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  sentAt: {
    type: Date,
    default: null
  },
  failedAt: {
    type: Date,
    default: null
  },
  metadata: {
    source: {
      type: String,
      default: 'system'
    },
    category: {
      type: String,
      default: null
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    relatedModel: {
      type: String,
      default: null
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    error: {
      type: String,
      default: null
    },
    retryCount: {
      type: Number,
      default: 0
    },
    lastRetryAt: {
      type: Date,
      default: null
    }
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Índices compuestos
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ status: 1, scheduledFor: 1 });
notificationSchema.index({ type: 1, priority: 1 });
notificationSchema.index({ recipient: 1, type: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1, status: 1 });

// TTL index para auto-eliminar notificaciones expiradas
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual para verificar si la notificación está activa
notificationSchema.virtual('isActive').get(function() {
  const now = new Date();
  return !this.expiresAt || this.expiresAt > now;
});

// Virtual para verificar si la notificación está pendiente de envío
notificationSchema.virtual('isPending').get(function() {
  return this.status === 'pending' && this.scheduledFor <= new Date();
});

// Virtual para obtener el tiempo transcurrido desde la creación
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} día${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hora${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
  } else {
    return 'Ahora';
  }
});

// Middleware pre-save
notificationSchema.pre('save', function(next) {
  // Actualizar sentAt cuando el status cambia a 'sent'
  if (this.isModified('status') && this.status === 'sent' && !this.sentAt) {
    this.sentAt = new Date();
  }
  
  // Actualizar failedAt cuando el status cambia a 'failed'
  if (this.isModified('status') && this.status === 'failed' && !this.failedAt) {
    this.failedAt = new Date();
  }
  
  // Marcar como leída cuando se actualiza readAt
  if (this.isModified('readAt') && this.readAt && !this.isRead) {
    this.isRead = true;
  }
  
  // Establecer expiresAt por defecto según el tipo
  if (this.isNew && !this.expiresAt) {
    const now = new Date();
    switch (this.type) {
      case 'system_alert':
      case 'security_alert':
        // Alertas críticas expiran en 30 días
        this.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'daily_report':
        // Reportes diarios expiran en 7 días
        this.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'user_action':
        // Acciones de usuario expiran en 3 días
        this.expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        break;
      default:
        // Notificaciones generales expiran en 15 días
        this.expiresAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    }
  }
  
  next();
});

// Métodos de instancia
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsFailed = function(errorMessage = null) {
  this.status = 'failed';
  this.failedAt = new Date();
  if (errorMessage) {
    this.metadata.error = errorMessage;
  }
  this.metadata.retryCount = (this.metadata.retryCount || 0) + 1;
  this.metadata.lastRetryAt = new Date();
  return this.save();
};

notificationSchema.methods.reschedule = function(newDate) {
  this.scheduledFor = newDate;
  this.status = 'pending';
  return this.save();
};

notificationSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// Métodos estáticos
notificationSchema.statics.findPending = function() {
  return this.find({
    status: 'pending',
    scheduledFor: { $lte: new Date() }
  }).sort({ priority: -1, createdAt: 1 });
};

notificationSchema.statics.findByRecipient = function(recipientId, options = {}) {
  const {
    unreadOnly = false,
    type = null,
    limit = 20,
    skip = 0
  } = options;
  
  const query = { recipient: recipientId };
  
  if (unreadOnly) {
    query.isRead = false;
  }
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('recipient', 'email firstName lastName');
};

notificationSchema.statics.getUnreadCount = function(recipientId) {
  return this.countDocuments({
    recipient: recipientId,
    isRead: false
  });
};

notificationSchema.statics.markAllAsRead = function(recipientId) {
  return this.updateMany(
    {
      recipient: recipientId,
      isRead: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
};

notificationSchema.statics.cleanupOld = function(daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: ['sent', 'failed', 'cancelled'] }
  });
};

notificationSchema.statics.getStatistics = function(days = 7) {
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
          type: '$type',
          priority: '$priority'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$count' },
        byStatus: {
          $push: {
            status: '$_id.status',
            type: '$_id.type',
            priority: '$_id.priority',
            count: '$count'
          }
        }
      }
    }
  ]);
};

notificationSchema.statics.createBulk = function(notifications) {
  return this.insertMany(notifications, { ordered: false });
};

notificationSchema.statics.findFailedForRetry = function(maxRetries = 3) {
  return this.find({
    status: 'failed',
    'metadata.retryCount': { $lt: maxRetries },
    $or: [
      { 'metadata.lastRetryAt': { $exists: false } },
      {
        'metadata.lastRetryAt': {
          $lt: new Date(Date.now() - 60 * 60 * 1000) // 1 hora
        }
      }
    ]
  }).sort({ priority: -1, failedAt: 1 });
};

// Middleware post-save para logging
notificationSchema.post('save', function(doc) {
  if (doc.isNew) {
  }
});

// Middleware post-remove para cleanup
notificationSchema.post('remove', function(doc) {
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;