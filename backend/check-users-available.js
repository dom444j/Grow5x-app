const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function checkAvailableUsers() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar todos los usuarios
    const users = await User.find({}, 'email fullName role status createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log('\n👥 USUARIOS DISPONIBLES:');
    console.log('=' .repeat(60));
    
    if (users.length === 0) {
      console.log('❌ No se encontraron usuarios en la base de datos');
      console.log('\n💡 SUGERENCIA: Crear un usuario de prueba');
      
      // Crear usuario de prueba
      const bcrypt = require('bcryptjs');
      const testUser = new User({
        email: 'test@grow5x.com',
        fullName: 'Usuario de Prueba',
        password: await bcrypt.hash('Test123@', 12),
        role: 'user',
        status: 'active',
        isEmailVerified: true,
        referralCode: 'TEST001'
      });
      
      await testUser.save();
      console.log('✅ Usuario de prueba creado:');
      console.log('📧 Email: test@grow5x.com');
      console.log('🔑 Password: Test123@');
      
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. 📧 ${user.email}`);
        console.log(`   👤 ${user.fullName || 'Sin nombre'}`);
        console.log(`   🎭 ${user.role}`);
        console.log(`   📊 ${user.status}`);
        console.log(`   📅 ${user.createdAt.toLocaleDateString()}`);
        console.log('');
      });
    }

    // Contar usuarios por rol
    const userCount = await User.countDocuments({ role: 'user' });
    const adminCount = await User.countDocuments({ role: 'admin' });
    const totalCount = await User.countDocuments();

    console.log('\n📊 ESTADÍSTICAS:');
    console.log(`👥 Total de usuarios: ${totalCount}`);
    console.log(`🙋 Usuarios regulares: ${userCount}`);
    console.log(`👨‍💼 Administradores: ${adminCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

if (require.main === module) {
  checkAvailableUsers().catch(console.error);
}

module.exports = { checkAvailableUsers };