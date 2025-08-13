const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  // Usuario administrador que realizó la acción
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Usuario afectado por la acción (si aplica)
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Tipo de acción realizada
  action: {
    type: String,
    enum: [
      // Gestión de usuarios
      'user_created',
      'user_updated',
      'user_deleted',
      'user_suspended',
      'user_activated',
      'user_role_changed',
      'user_balance_adjusted',
      'user_kyc_approved',
      'user_kyc_rejected',
      'user_password_reset',
      'user_2fa_disabled',
      
      // Gestión de inversiones
      'investment_created',
      'investment_cancelled',
      'investment_paused',
      'investment_resumed',
      'investment_force_completed',
      'investment_payout_processed',
      'investment_payout_failed',
      
      // Gestión financiera
      'withdrawal_approved',
      'withdrawal_rejected',
      'withdrawal_processed',
      'deposit_confirmed',
      'deposit_rejected',
      'balance_adjustment',
      'commission_adjustment',
      'refund_processed',
      
      // Configuración del sistema
      'system_setting_changed',
      'package_created',
      'package_updated',
      'package_deleted',
      'rate_updated',
      'maintenance_mode_toggled',
      'feature_flag_changed',
      
      // Seguridad
      'login_attempt',
      'login_success',
      'login_failed',
      'logout',
      'permission_granted',
      'permission_revoked',
      'security_alert',
      'suspicious_activity',
      
      // Reportes y auditoría
      'report_generated',
      'data_exported',
      'backup_created',
      'database_query',
      'bulk_operation',
      
      // Otros
      'notification_sent',
      'email_sent',
      'api_call',
      'error_occurred',
      'system_alert'
    ],
    required: true
  },
  
  // Categoría de la acción
  category: {
    type: String,
    enum: ['user_management', 'financial', 'investment', 'security', 'system', 'reporting', 'communication'],
    required: true
  },
  
  // Descripción de la acción
  description: {
    type: String,
    required: true
  },
  
  // Detalles específicos de la acción
  details: {
    // Valores anteriores (para cambios)
    previousValues: mongoose.Schema.Types.Mixed,
    
    // Nuevos valores
    newValues: mongoose.Schema.Types.Mixed,
    
    // Parámetros de la acción
    parameters: mongoose.Schema.Types.Mixed,
    
    // Resultado de la acción
    result: {
      success: {
        type: Boolean,
        default: true
      },
      message: String,
      errorCode: String,
      errorDetails: mongoose.Schema.Types.Mixed
    },
    
    // Información adicional
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Entidad afectada
  entityType: {
    type: String,
    enum: ['User', 'Investment', 'Withdrawal', 'Deposit', 'Package', 'SystemSetting', 'AdminLog', 'UserKYC', 'SystemMetric']
  },
  
  // ID de la entidad afectada
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  
  // Nivel de severidad
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Estado del log
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  
  // Información de la sesión
  session: {
    sessionId: String,
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'api'],
      default: 'desktop'
    }
  },
  
  // Información de tiempo
  timestamp: {
    type: Date,
    default: Date.now
  },
  
  duration: {
    type: Number, // Duración en milisegundos
    min: 0
  },
  
  // Flags especiales
  flags: {
    requiresReview: {
      type: Boolean,
      default: false
    },
    isAutomated: {
      type: Boolean,
      default: false
    },
    isSensitive: {
      type: Boolean,
      default: false
    },
    isReversible: {
      type: Boolean,
      default: false
    },
    hasBeenReviewed: {
      type: Boolean,
      default: false
    }
  },
  
  // Información de revisión
  review: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reviewNotes: String,
    reviewStatus: {
      type: String,
      enum: ['approved', 'flagged', 'requires_action']
    }
  },
  
  // Tags para categorización adicional
  tags: [{
    type: String,
    trim: true
  }],
  
  // Información de correlación
  correlation: {
    traceId: String, // Para rastrear operaciones relacionadas
    parentLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminLog'
    },
    childLogs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminLog'
    }]
  }
}, {
  timestamps: true
});

// Índices
adminLogSchema.index({ admin: 1, timestamp: -1 });
adminLogSchema.index({ action: 1, timestamp: -1 });
adminLogSchema.index({ category: 1, timestamp: -1 });
adminLogSchema.index({ targetUser: 1, timestamp: -1 });
adminLogSchema.index({ entityType: 1, entityId: 1 });
adminLogSchema.index({ severity: 1, timestamp: -1 });
adminLogSchema.index({ status: 1 });
adminLogSchema.index({ 'session.ipAddress': 1 });
adminLogSchema.index({ 'flags.requiresReview': 1, 'flags.hasBeenReviewed': 1 });
adminLogSchema.index({ 'correlation.traceId': 1 });

// Índices compuestos
adminLogSchema.index({ admin: 1, action: 1, timestamp: -1 });
adminLogSchema.index({ category: 1, severity: 1, timestamp: -1 });
adminLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
adminLogSchema.index({ action: 1, status: 1, timestamp: -1 });

// Índice de texto para búsqueda
adminLogSchema.index({
  description: 'text',
  'details.result.message': 'text',
  tags: 'text'
});

// Virtual para verificar si es una acción crítica
adminLogSchema.virtual('isCritical').get(function() {
  const criticalActions = [
    'user_deleted',
    'user_balance_adjusted',
    'investment_cancelled',
    'withdrawal_approved',
    'system_setting_changed',
    'permission_granted',
    'permission_revoked'
  ];
  
  return this.severity === 'critical' || criticalActions.includes(this.action);
});

// Virtual para verificar si necesita revisión
adminLogSchema.virtual('needsReview').get(function() {
  return this.flags.requiresReview && !this.flags.hasBeenReviewed;
});

// Método para marcar como revisado
adminLogSchema.methods.markAsReviewed = function(reviewerId, status, notes) {
  this.review.reviewedBy = reviewerId;
  this.review.reviewedAt = new Date();
  this.review.reviewStatus = status;
  this.review.reviewNotes = notes;
  this.flags.hasBeenReviewed = true;
  
  return this.save();
};

// Método estático para crear log
adminLogSchema.statics.createLog = function(logData) {
  // Generar traceId si no existe
  if (!logData.correlation?.traceId) {
    logData.correlation = {
      ...logData.correlation,
      traceId: new mongoose.Types.ObjectId().toString()
    };
  }
  
  return this.create(logData);
};

// Método estático para obtener logs por usuario
adminLogSchema.statics.getByUser = function(userId, limit = 50) {
  return this.find({
    $or: [
      { admin: userId },
      { targetUser: userId }
    ]
  })
  .populate('admin', 'fullName email')
  .populate('targetUser', 'fullName email')
  .sort({ timestamp: -1 })
  .limit(limit);
};

// Método estático para obtener logs que requieren revisión
adminLogSchema.statics.getPendingReview = function() {
  return this.find({
    'flags.requiresReview': true,
    'flags.hasBeenReviewed': false
  })
  .populate('admin', 'fullName email')
  .populate('targetUser', 'fullName email')
  .sort({ timestamp: -1 });
};

// TTL index para auto-eliminar logs antiguos (opcional, mantener 1 año)
adminLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AdminLog = mongoose.model('AdminLog', adminLogSchema);

module.exports = AdminLog;