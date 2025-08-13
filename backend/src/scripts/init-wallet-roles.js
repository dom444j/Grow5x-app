/**
 * Script de inicialización de roles de wallet
 * Crea los roles básicos necesarios para el sistema de gestión de wallets
 */

const mongoose = require('mongoose');
const WalletRole = require('../models/WalletRole.model');
const UserWalletRole = require('../models/UserWalletRole.model');
const User = require('../models/User');
const logger = require('../utils/logger');

// Configuración de conexión a la base de datos
require('dotenv').config();

// Roles de wallet por defecto
const defaultWalletRoles = [
  {
    name: 'wallet_viewer',
    displayName: 'Visualizador de Wallets',
    description: 'Solo puede visualizar wallets y estadísticas',
    permissions: [
      'view_wallets',
      'view_wallet_details',
      'view_wallet_stats',
      'view_wallet_history',
      'view_wallet_notes'
    ],
    restrictions: {
      max_wallets_per_day: 0,
      max_total_wallets: 0,
      allowed_networks: [],
      ip_restrictions: [],
      time_restrictions: {
        enabled: false,
        allowed_hours: { start: 0, end: 23 },
        allowed_days: [0, 1, 2, 3, 4, 5, 6]
      }
    },
    isActive: true,
    isDefault: true
  },
  {
    name: 'wallet_manager',
    displayName: 'Gestor de Wallets',
    description: 'Puede gestionar wallets (crear, actualizar, liberar)',
    permissions: [
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
    restrictions: {
      max_wallets_per_day: 10,
      max_total_wallets: 100,
      allowed_networks: ['BEP20', 'ERC20', 'TRC20', 'POLYGON'],
      ip_restrictions: [],
      time_restrictions: {
        enabled: true,
        allowed_hours: { start: 8, end: 18 },
        allowed_days: [1, 2, 3, 4, 5] // Lunes a Viernes
      }
    },
    isActive: true,
    isDefault: true
  },
  {
    name: 'wallet_admin',
    displayName: 'Administrador de Wallets',
    description: 'Control total sobre wallets y roles',
    permissions: [
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
      'configure_wallet_limits',
      'audit_wallet_changes',
      'view_wallet_logs',
      'generate_wallet_reports',
      'monitor_suspicious_wallets'
    ],
    restrictions: {
      max_wallets_per_day: 50,
      max_total_wallets: 1000,
      allowed_networks: ['BEP20', 'ERC20', 'TRC20', 'POLYGON', 'BTC', 'LTC'],
      ip_restrictions: [],
      time_restrictions: {
        enabled: false,
        allowed_hours: { start: 0, end: 23 },
        allowed_days: [0, 1, 2, 3, 4, 5, 6]
      }
    },
    isActive: true,
    isDefault: true
  }
];

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

async function createDefaultRoles() {
  try {
    console.log('🔧 Creando roles de wallet por defecto...');
    
    // Buscar un usuario admin para asignar como creador
    const User = require('../models/User');
    const adminUser = await User.findOne({ role: { $in: ['admin', 'superadmin'] } });
    
    if (!adminUser) {
      throw new Error('No se encontró un usuario administrador para asignar como creador de roles');
    }
    
    for (const roleData of defaultWalletRoles) {
      const existingRole = await WalletRole.findOne({ name: roleData.name });
      
      if (!existingRole) {
        const role = new WalletRole({
          ...roleData,
          createdBy: adminUser._id
        });
        await role.save();
        console.log(`✅ Rol creado: ${roleData.name}`);
      } else {
        console.log(`ℹ️  Rol ya existe: ${roleData.name}`);
      }
    }
    
    console.log('✅ Roles de wallet inicializados correctamente');
  } catch (error) {
    console.error('❌ Error creando roles por defecto:', error);
    throw error;
  }
}

async function assignDefaultRolesToAdmins() {
  try {
    console.log('👥 Asignando roles por defecto a administradores...');
    
    // Buscar todos los usuarios administradores
    const admins = await User.find({ 
      role: { $in: ['admin', 'superadmin'] },
      status: 'active'
    });
    
    // Buscar el rol wallet_admin
    const walletAdminRole = await WalletRole.findOne({ name: 'wallet_admin' });
    
    if (!walletAdminRole) {
      throw new Error('Rol wallet_admin no encontrado');
    }
    
    for (const admin of admins) {
      const existingAssignment = await UserWalletRole.findOne({
        userId: admin._id,
        walletRole: 'wallet_admin',
        isActive: true
      });
      
      if (!existingAssignment) {
        const assignment = new UserWalletRole({
          userId: admin._id,
          walletRole: 'wallet_admin',
          permissions: walletAdminRole.permissions,
          assignedBy: admin._id, // Auto-asignado
          expiresAt: null, // Sin expiración
          isActive: true,
          reason: 'Asignación automática durante inicialización del sistema',
          restrictions: {
            maxWalletsPerDay: 50,
            maxWalletsTotal: 1000,
            allowedNetworks: ['BEP20', 'ERC20', 'TRC20', 'POLYGON'],
            timeRestrictions: {
              startHour: 0,
              endHour: 23,
              allowedDays: [0, 1, 2, 3, 4, 5, 6]
            }
          }
        });
        
        await assignment.save();
        console.log(`✅ Rol wallet_admin asignado a: ${admin.username || admin.email}`);
      } else {
        console.log(`ℹ️  ${admin.username || admin.email} ya tiene rol wallet_admin`);
      }
    }
    
    console.log('✅ Roles asignados a administradores');
  } catch (error) {
    console.error('❌ Error asignando roles a administradores:', error);
    throw error;
  }
}

async function generateReport() {
  try {
    console.log('\n📊 REPORTE DE INICIALIZACIÓN');
    console.log('================================');
    
    // Contar roles creados
    const totalRoles = await WalletRole.countDocuments({ isActive: true });
    console.log(`📋 Total de roles de wallet: ${totalRoles}`);
    
    // Listar roles
    const roles = await WalletRole.find({ isActive: true }).select('name description');
    roles.forEach(role => {
      console.log(`   - ${role.name}: ${role.description}`);
    });
    
    // Contar asignaciones
    const totalAssignments = await UserWalletRole.countDocuments({ isActive: true });
    console.log(`\n👥 Total de asignaciones de roles: ${totalAssignments}`);
    
    // Listar asignaciones
    const assignments = await UserWalletRole.find({ isActive: true })
      .populate('userId', 'username email');
    
    assignments.forEach(assignment => {
      const user = assignment.userId.username || assignment.userId.email;
      const role = assignment.walletRole;
      console.log(`   - ${user}: ${role}`);
    });
    
    console.log('\n✅ Inicialización completada exitosamente');
  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando configuración de roles de wallet...');
    
    await connectDatabase();
    await createDefaultRoles();
    await assignDefaultRolesToAdmins();
    await generateReport();
    
  } catch (error) {
    console.error('❌ Error en la inicialización:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión a base de datos cerrada');
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = {
  createDefaultRoles,
  assignDefaultRolesToAdmins,
  defaultWalletRoles
};