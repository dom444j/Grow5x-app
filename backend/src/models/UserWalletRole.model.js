const mongoose = require('mongoose');

// Esquema para asignaciones de roles de wallet a usuarios
const userWalletRoleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  walletRole: {
    type: String,
    required: true,
    enum: ['wallet_viewer', 'wallet_manager', 'wallet_admin', 'wallet_auditor']
  },
  permissions: [{
    type: String,
    enum: [
      'view_wallets', 'view_wallet_details', 'view_wallet_stats', 'view_wallet_history',
      'view_wallet_notes', 'create_wallet', 'update_wallet', 'delete_wallet',
      'update_wallet_balance', 'release_wallet', 'add_wallet_notes', 'verify_wallet_address',
      'manage_wallet_permissions', 'bulk_wallet_operations', 'export_wallet_data',
      'configure_wallet_limits', 'audit_wallet_changes', 'view_wallet_logs',
      'generate_wallet_reports', 'monitor_suspicious_wallets'
    ]
  }],
  // Restricciones específicas
  restrictions: {
    maxWalletsPerDay: {
      type: Number,
      default: 10
    },
    maxWalletsTotal: {
      type: Number,
      default: 100
    },
    allowedNetworks: [{
      type: String,
      enum: ['BEP20', 'ERC20', 'TRC20', 'POLYGON']
    }],
    ipWhitelist: [String],
    timeRestrictions: {
      startHour: {
        type: Number,
        min: 0,
        max: 23,
        default: 0
      },
      endHour: {
        type: Number,
        min: 0,
        max: 23,
        default: 23
      },
      allowedDays: [{
        type: Number,
        min: 0,
        max: 6 // 0 = Domingo, 6 = Sábado
      }]
    }
  },
  // Límites de actividad
  activityLimits: {
    dailyWalletCreations: {
      count: {
        type: Number,
        default: 0
      },
      date: {
        type: Date,
        default: Date.now
      },
      limit: {
        type: Number,
        default: 5
      }
    },
    monthlyWalletCreations: {
      count: {
        type: Number,
        default: 0
      },
      month: {
        type: Number,
        default: new Date().getMonth()
      },
      year: {
        type: Number,
        default: new Date().getFullYear()
      },
      limit: {
        type: Number,
        default: 50
      }
    }
  },
  // Metadatos de asignación
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null // null = sin expiración
  },
  isActive: {
    type: Boolean,
    default: true
  },
  reason: {
    type: String,
    required: true
  },
  notes: String,
  // Auditoría
  lastActivity: {
    action: String,
    timestamp: Date,
    ip: String,
    userAgent: String
  },
  activityHistory: [{
    action: {
      type: String,
      required: true
    },
    details: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    },
    ip: String,
    userAgent: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices
userWalletRoleSchema.index({ userId: 1 });
userWalletRoleSchema.index({ walletRole: 1 });
userWalletRoleSchema.index({ isActive: 1 });
userWalletRoleSchema.index({ expiresAt: 1 });
userWalletRoleSchema.index({ assignedBy: 1 });
userWalletRoleSchema.index({ userId: 1, isActive: 1 });
userWalletRoleSchema.index({ 'activityLimits.dailyWalletCreations.date': 1 });

// Método para verificar si el usuario tiene un permiso específico
userWalletRoleSchema.methods.hasPermission = function(permission) {
  return this.isActive && this.permissions.includes(permission);
};

// Método para verificar si el rol ha expirado
userWalletRoleSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < new Date();
};

// Método para verificar límites de actividad
userWalletRoleSchema.methods.canCreateWallet = function() {
  if (!this.isActive || this.isExpired()) {
    return { allowed: false, reason: 'Role inactive or expired' };
  }

  const today = new Date();
  const todayStr = today.toDateString();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Verificar límite diario
  if (this.activityLimits.dailyWalletCreations.date.toDateString() === todayStr) {
    if (this.activityLimits.dailyWalletCreations.count >= this.activityLimits.dailyWalletCreations.limit) {
      return { allowed: false, reason: 'Daily wallet creation limit exceeded' };
    }
  }

  // Verificar límite mensual
  if (this.activityLimits.monthlyWalletCreations.month === currentMonth && 
      this.activityLimits.monthlyWalletCreations.year === currentYear) {
    if (this.activityLimits.monthlyWalletCreations.count >= this.activityLimits.monthlyWalletCreations.limit) {
      return { allowed: false, reason: 'Monthly wallet creation limit exceeded' };
    }
  }

  return { allowed: true };
};

// Método para registrar actividad
userWalletRoleSchema.methods.logActivity = function(action, details, ip, userAgent) {
  this.lastActivity = {
    action,
    timestamp: new Date(),
    ip,
    userAgent
  };

  this.activityHistory.push({
    action,
    details,
    timestamp: new Date(),
    ip,
    userAgent
  });

  // Mantener solo los últimos 100 registros
  if (this.activityHistory.length > 100) {
    this.activityHistory = this.activityHistory.slice(-100);
  }
};

// Método para incrementar contador de wallets creadas
userWalletRoleSchema.methods.incrementWalletCreation = function() {
  const today = new Date();
  const todayStr = today.toDateString();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Incrementar contador diario
  if (this.activityLimits.dailyWalletCreations.date.toDateString() === todayStr) {
    this.activityLimits.dailyWalletCreations.count++;
  } else {
    this.activityLimits.dailyWalletCreations.count = 1;
    this.activityLimits.dailyWalletCreations.date = today;
  }

  // Incrementar contador mensual
  if (this.activityLimits.monthlyWalletCreations.month === currentMonth && 
      this.activityLimits.monthlyWalletCreations.year === currentYear) {
    this.activityLimits.monthlyWalletCreations.count++;
  } else {
    this.activityLimits.monthlyWalletCreations.count = 1;
    this.activityLimits.monthlyWalletCreations.month = currentMonth;
    this.activityLimits.monthlyWalletCreations.year = currentYear;
  }
};

const UserWalletRole = mongoose.model('UserWalletRole', userWalletRoleSchema);

module.exports = UserWalletRole;