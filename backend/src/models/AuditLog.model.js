const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Información de la acción
  action: {
    type: String,
    required: true,
    index: true
  },
  entity: {
    type: String,
    required: true,
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.Mixed, // Puede ser ObjectId o String
    required: true,
    index: true
  },
  // Usuario que realizó la acción
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Información del usuario afectado (si aplica)
  affectedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  // Resumen del payload (no datos sensibles)
  payloadSummary: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  // Resultado de la acción
  result: {
    status: {
      type: String,
      enum: ['success', 'failure', 'partial', 'pending'],
      required: true,
      index: true
    },
    message: String,
    code: String,
    details: mongoose.Schema.Types.Mixed
  },
  // Información de contexto
  context: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    requestId: String,
    endpoint: String,
    method: String
  },
  // Cambios realizados (antes/después)
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    fields: [String] // Campos modificados
  },
  // Metadatos adicionales
  metadata: {
    category: {
      type: String,
      enum: ['payment', 'user_management', 'commission', 'benefit', 'security', 'system', 'admin_action'],
      required: true,
      index: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true
    },
    tags: [String],
    source: {
      type: String,
      enum: ['web', 'api', 'system', 'cron', 'webhook'],
      default: 'web'
    }
  },
  // Información de tiempo
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  duration: {
    type: Number // milisegundos
  }
}, {
  timestamps: false, // Usamos timestamp personalizado
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos
auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ 'metadata.category': 1, timestamp: -1 });
auditLogSchema.index({ 'result.status': 1, 'metadata.severity': 1 });
auditLogSchema.index({ affectedUserId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 }); // Para cleanup automático

// TTL Index - Auto-delete logs older than 1 year
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Virtuals
auditLogSchema.virtual('isRecent').get(function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return this.timestamp > oneHourAgo;
});

auditLogSchema.virtual('formattedAction').get(function() {
  return this.action.replace(/_/g, ' ').toUpperCase();
});

// Métodos estáticos
auditLogSchema.statics.logAction = function(actionData) {
  const log = new this({
    action: actionData.action,
    entity: actionData.entity,
    entityId: actionData.entityId,
    adminId: actionData.adminId,
    affectedUserId: actionData.affectedUserId,
    payloadSummary: actionData.payloadSummary,
    result: actionData.result,
    context: actionData.context,
    changes: actionData.changes,
    metadata: {
      category: actionData.category,
      severity: actionData.severity || 'medium',
      tags: actionData.tags || [],
      source: actionData.source || 'web'
    },
    duration: actionData.duration
  });
  
  return log.save();
};

auditLogSchema.statics.findByUser = function(userId, options = {}) {
  const query = {
    $or: [
      { adminId: userId },
      { affectedUserId: userId }
    ]
  };
  
  if (options.category) {
    query['metadata.category'] = options.category;
  }
  
  if (options.since) {
    query.timestamp = { $gte: options.since };
  }
  
  return this.find(query)
    .populate('adminId', 'email fullName role')
    .populate('affectedUserId', 'email fullName')
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

auditLogSchema.statics.findByEntity = function(entity, entityId, options = {}) {
  const query = { entity, entityId };
  
  if (options.since) {
    query.timestamp = { $gte: options.since };
  }
  
  return this.find(query)
    .populate('adminId', 'email fullName role')
    .sort({ timestamp: -1 })
    .limit(options.limit || 50);
};

auditLogSchema.statics.getStats = function(timeframe = 24) {
  const since = new Date(Date.now() - timeframe * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: {
          category: '$metadata.category',
          status: '$result.status'
        },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $group: {
        _id: '$_id.category',
        total: { $sum: '$count' },
        success: {
          $sum: {
            $cond: [{ $eq: ['$_id.status', 'success'] }, '$count', 0]
          }
        },
        failure: {
          $sum: {
            $cond: [{ $eq: ['$_id.status', 'failure'] }, '$count', 0]
          }
        },
        avgDuration: { $avg: '$avgDuration' }
      }
    }
  ]);
};

auditLogSchema.statics.findSuspiciousActivity = function(timeframe = 1) {
  const since = new Date(Date.now() - timeframe * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: {
          adminId: '$adminId',
          action: '$action'
        },
        count: { $sum: 1 },
        failures: {
          $sum: {
            $cond: [{ $eq: ['$result.status', 'failure'] }, 1, 0]
          }
        }
      }
    },
    {
      $match: {
        $or: [
          { count: { $gt: 50 } }, // Más de 50 acciones por hora
          { failures: { $gt: 10 } } // Más de 10 fallos por hora
        ]
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id.adminId',
        foreignField: '_id',
        as: 'admin'
      }
    }
  ]);
};

// Métodos de conveniencia para logging específico
auditLogSchema.statics.logPaymentAction = function(action, paymentData, adminId, result) {
  return this.logAction({
    action,
    entity: 'payment',
    entityId: paymentData.id || paymentData._id,
    adminId,
    affectedUserId: paymentData.userId,
    payloadSummary: {
      amount: paymentData.amount,
      currency: paymentData.currency,
      txHash: paymentData.txHash
    },
    result,
    category: 'payment',
    severity: result.status === 'failure' ? 'high' : 'medium'
  });
};

auditLogSchema.statics.logUserAction = function(action, userData, adminId, result) {
  return this.logAction({
    action,
    entity: 'user',
    entityId: userData.id || userData._id,
    adminId,
    affectedUserId: userData.id || userData._id,
    payloadSummary: {
      email: userData.email,
      fullName: userData.fullName,
      status: userData.status
    },
    result,
    category: 'user_management',
    severity: 'medium'
  });
};

auditLogSchema.statics.logCommissionAction = function(action, commissionData, adminId, result) {
  return this.logAction({
    action,
    entity: 'commission',
    entityId: commissionData.id || commissionData._id,
    adminId,
    affectedUserId: commissionData.userId,
    payloadSummary: {
      amount: commissionData.amount,
      type: commissionData.commissionType,
      fromUserId: commissionData.fromUserId
    },
    result,
    category: 'commission',
    severity: 'medium'
  });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);