const mongoose = require('mongoose');
const User = require('../models/User');
const UserWalletRole = require('../models/UserWalletRole.model');
const WalletRole = require('../models/WalletRole.model');
require('dotenv').config();

async function fixWalletPermissions() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB Atlas');

    // Buscar el usuario admin@grow5x.app
    const user = await User.findOne({ email: 'admin@grow5x.app' });
    
    if (!user) {
      console.log('Usuario admin@grow5x.app no encontrado');
      return;
    }

    console.log(`Usuario encontrado: ${user.email}`);

    // Verificar si ya tiene roles de wallet asignados
    const existingRole = await UserWalletRole.findOne({ userId: user._id });
    
    if (existingRole) {
      console.log('El usuario ya tiene roles de wallet asignados:', existingRole.walletRole);
      return;
    }

    // Crear asignación de rol wallet_admin
    const walletRoleAssignment = new UserWalletRole({
      userId: user._id,
      walletRole: 'wallet_admin',
      permissions: [
        'view_wallets',
        'view_wallet_details',
        'create_wallet',
        'update_wallet',
        'delete_wallet',
        'manage_wallet_permissions',
        'export_wallet_data'
      ],
      assignedBy: user._id, // Auto-asignado
      reason: 'Asignación automática de permisos de administrador de wallets',
      restrictions: {
        maxWalletsPerDay: 1000,
        maxWalletsTotal: 10000,
        allowedNetworks: ['BEP20', 'ERC20', 'TRC20', 'POLYGON'],
        ipWhitelist: [],
        timeRestrictions: {
          startHour: 0,
          endHour: 23,
          allowedDays: [0, 1, 2, 3, 4, 5, 6]
        }
      }
    });

    await walletRoleAssignment.save();
    console.log('✅ Rol wallet_admin asignado exitosamente al usuario admin@grow5x.app');

  } catch (error) {
    console.error('❌ Error al asignar permisos de wallet:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

fixWalletPermissions();