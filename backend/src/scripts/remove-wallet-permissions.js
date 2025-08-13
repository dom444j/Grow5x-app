const mongoose = require('mongoose');
const User = require('../models/User');
const UserWalletRole = require('../models/UserWalletRole.model');
require('dotenv').config();

async function removeWalletPermissions() {
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

    // Buscar y eliminar roles de wallet asignados
    const deletedRoles = await UserWalletRole.deleteMany({ userId: user._id });
    
    if (deletedRoles.deletedCount === 0) {
      console.log('El usuario no tenía roles de wallet asignados');
    } else {
      console.log(`✅ Se eliminaron ${deletedRoles.deletedCount} asignaciones de roles de wallet para admin@grow5x.app`);
    }

    // Verificar que solo quede el usuario principal
    console.log('\n--- Verificando usuarios con roles de wallet restantes ---');
    const remainingRoles = await UserWalletRole.find({}).populate('userId', 'email');
    
    if (remainingRoles.length === 0) {
      console.log('⚠️  No quedan usuarios con roles de wallet asignados');
    } else {
      console.log('Usuarios con roles de wallet activos:');
      remainingRoles.forEach(role => {
        console.log(`- ${role.userId.email}: ${role.walletRole}`);
      });
    }

  } catch (error) {
    console.error('❌ Error al eliminar permisos de wallet:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

removeWalletPermissions();