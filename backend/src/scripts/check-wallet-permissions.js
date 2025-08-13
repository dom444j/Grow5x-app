const mongoose = require('mongoose');
const User = require('../models/User');
const UserWalletRole = require('../models/UserWalletRole.model');
const WalletRole = require('../models/WalletRole.model');
require('dotenv').config();

async function checkWalletPermissions() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB Atlas');

    // Buscar usuarios administradores
    const adminUsers = await User.find({ 
      role: { $in: ['admin', 'superadmin'] } 
    });
    
    console.log(`\nEncontrados ${adminUsers.length} administradores:`);
    
    for (const user of adminUsers) {
      console.log(`\n--- Usuario: ${user.email} ---`);
      console.log(`Rol: ${user.role}`);
      
      // Buscar roles de wallet asignados
      const walletRoles = await UserWalletRole.find({ 
        userId: user._id,
        isActive: true 
      });
      
      if (walletRoles.length === 0) {
        console.log('❌ No tiene roles de wallet asignados');
      } else {
        console.log('✅ Roles de wallet asignados:');
        walletRoles.forEach(role => {
          console.log(`  - Rol: ${role.walletRole}`);
          console.log(`  - Permisos: ${role.permissions.join(', ')}`);
          console.log(`  - Redes permitidas: ${role.restrictions.allowedNetworks.join(', ')}`);
          console.log(`  - Límite diario: ${role.restrictions.maxWalletsPerDay}`);
          console.log(`  - Límite total: ${role.restrictions.maxWalletsTotal}`);
          console.log(`  - Asignado: ${role.assignedAt}`);
          console.log(`  - Razón: ${role.reason}`);
          console.log(`  - Activo: ${role.isActive}`);
          if (role.expiresAt) {
            console.log(`  - Expira: ${role.expiresAt}`);
          }
        });
      }
    }

    // Mostrar roles de wallet disponibles
    console.log('\n--- Roles de Wallet Disponibles ---');
    const availableRoles = await WalletRole.find({});
    if (availableRoles.length === 0) {
      console.log('No hay roles de wallet configurados en la base de datos');
    } else {
      availableRoles.forEach(role => {
        console.log(`- ${role.name}: ${role.description}`);
      });
    }

  } catch (error) {
    console.error('❌ Error al verificar permisos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

checkWalletPermissions();