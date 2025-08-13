const mongoose = require('mongoose');
require('dotenv').config();

// Verificar usuarios con rol admin
async function checkAdminUsers() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    // Buscar todos los usuarios
    const allUsers = await User.find({});
    console.log(`\n👥 Total de usuarios: ${allUsers.length}`);
    
    // Buscar usuarios admin
    const adminUsers = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    console.log(`\n🔑 Usuarios con rol admin/superadmin: ${adminUsers.length}`);
    
    if (adminUsers.length > 0) {
      console.log('\n📋 Lista de administradores:');
      adminUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.fullName} (${user.email}) - Rol: ${user.role} - Status: ${user.status}`);
      });
    } else {
      console.log('\n❌ No se encontraron usuarios con rol admin');
    }
    
    // Mostrar todos los usuarios con sus roles
    console.log('\n📊 Todos los usuarios y sus roles:');
    allUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.fullName} (${user.email}) - Rol: ${user.role || 'user'} - Status: ${user.status}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Desconectado de MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdminUsers();