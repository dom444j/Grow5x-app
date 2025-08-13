const mongoose = require('mongoose');
const User = require('./src/models/User.js');
const UserWalletRole = require('./src/models/UserWalletRole.model');
const WalletRole = require('./src/models/WalletRole.model');
require('dotenv').config();

async function fixWalletPermissions() {
  try {
    console.log('🔍 Conectando a MongoDB Atlas...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado a MongoDB Atlas');
    console.log('🔧 Asignando permisos de wallet a admin@grow5x.app...');
    
    // Buscar el usuario admin@grow5x.app
    const adminUser = await User.findOne({ email: 'admin@grow5x.app' });
    
    if (!adminUser) {
      console.log('❌ Usuario admin@grow5x.app no encontrado');
      return;
    }
    
    console.log(`👤 Usuario encontrado: ${adminUser.email} (ID: ${adminUser._id})`);
    
    // Verificar si ya tiene rol de wallet
    const existingRole = await UserWalletRole.findOne({
      userId: adminUser._id,
      isActive: true
    });
    
    if (existingRole) {
      console.log(`ℹ️  Usuario ya tiene rol: ${existingRole.walletRole}`);
      return;
    }
    
    // Buscar el rol wallet_admin
    const walletAdminRole = await WalletRole.findOne({ name: 'wallet_admin' });
    
    if (!walletAdminRole) {
      console.log('❌ Rol wallet_admin no encontrado');
      return;
    }
    
    // Crear asignación de rol
    const roleAssignment = new UserWalletRole({
      userId: adminUser._id,
      walletRole: 'wallet_admin',
      permissions: walletAdminRole.permissions,
      restrictions: {
        maxWalletsPerDay: 50,
        maxWalletsTotal: 1000,
        allowedNetworks: ['BEP20'],
        ipWhitelist: [],
        timeRestrictions: {
          startHour: 0,
          endHour: 23,
          allowedDays: [0, 1, 2, 3, 4, 5, 6]
        }
      },
      isActive: true,
      assignedBy: adminUser._id,
      assignedAt: new Date(),
      reason: 'Asignación automática de permisos de administrador de wallets'
    });
    
    await roleAssignment.save();
    
    console.log('✅ Rol wallet_admin asignado exitosamente');
    console.log(`📋 Permisos asignados: ${walletAdminRole.permissions.length} permisos`);
    
    // Verificar la asignación
    const verification = await UserWalletRole.findOne({
      userId: adminUser._id,
      isActive: true
    });
    
    if (verification) {
      console.log('✅ Verificación exitosa: Rol asignado correctamente');
      console.log(`   Rol: ${verification.walletRole}`);
      console.log(`   Permisos: ${verification.permissions.length}`);
    } else {
      console.log('❌ Error en la verificación');
    }
    
  } catch (error) {
    console.error('❌ Error asignando permisos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Ejecutar reparación
fixWalletPermissions();