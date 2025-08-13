const mongoose = require('mongoose');

// Esquema para roles específicos de wallets
const walletRoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['wallet_viewer', 'wallet_manager', 'wallet_admin', 'wallet_auditor']
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  permissions: [{
    type: String,
    enum: [
      // Permisos de visualización
      'view_wallets',
      'view_wallet_details',
      'view_wallet_stats',
      'view_wallet_history',
      'view_wallet_notes',
      
      // Permisos de gestión
      'create_wallet',
      'update_wallet',
      'delete_wallet',
      'update_wallet_balance',
      'release_wallet',
      'add_wallet_notes',
      'verify_wallet_address',
      
      // Permisos administrativos
      'manage_wallet_permissions',
      'bulk_wallet_operations',
      'export_wallet_data',
      'configure_wallet_limits',
      
      // Permisos de auditoría
      'audit_wallet_changes',
      'view_wallet_logs',
      'generate_wallet_reports',
      'monitor_suspicious_wallets'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
walletRoleSchema.index({ name: 1 });
walletRoleSchema.index({ isActive: 1 });

// Método estático para obtener permisos por rol
walletRoleSchema.statics.getPermissionsByRole = function(roleName) {
  const rolePermissions = {
    wallet_viewer: [
      'view_wallets',
      'view_wallet_details',
      'view_wallet_stats',
      'view_wallet_history'
    ],
    wallet_manager: [
      'view_wallets',
      'view_wallet_details',
      'view_wallet_stats',
      'view_wallet_history',
      'view_wallet_notes',
      'create_wallet',
      'update_wallet',
      'update_wallet_balance',
      'release_wallet',
      'add_wallet_notes',
      'verify_wallet_address'
    ],
    wallet_admin: [
      'view_wallets',
      'view_wallet_details',
      'view_wallet_stats',
      'view_wallet_history',
      'view_wallet_notes',
      'create_wallet',
      'update_wallet',
      'delete_wallet',
      'update_wallet_balance',
      'release_wallet',
      'add_wallet_notes',
      'verify_wallet_address',
      'manage_wallet_permissions',
      'bulk_wallet_operations',
      'export_wallet_data',
      'configure_wallet_limits'
    ],
    wallet_auditor: [
      'view_wallets',
      'view_wallet_details',
      'view_wallet_stats',
      'view_wallet_history',
      'view_wallet_notes',
      'audit_wallet_changes',
      'view_wallet_logs',
      'generate_wallet_reports',
      'monitor_suspicious_wallets'
    ]
  };
  
  return rolePermissions[roleName] || [];
};

const WalletRole = mongoose.model('WalletRole', walletRoleSchema);

module.exports = WalletRole;