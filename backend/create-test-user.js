const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
require('dotenv').config();

async function createTestUser() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe el usuario de prueba
    const existingUser = await User.findOne({ email: 'test@grow5x.com' });
    
    if (existingUser) {
      console.log('👤 Usuario de prueba ya existe');
      console.log('📧 Email: test@grow5x.com');
      console.log('🔑 Password: Test123@');
      console.log(`📊 Estado: ${existingUser.status}`);
      
      // Activar el usuario si no está activo
      if (existingUser.status !== 'active') {
        existingUser.status = 'active';
        existingUser.isEmailVerified = true;
        await existingUser.save();
        console.log('✅ Usuario activado');
      }
      
      return existingUser;
    }

    // Crear nuevo usuario de prueba
    console.log('👤 Creando usuario de prueba...');
    
    const hashedPassword = await bcrypt.hash('Test123@', 12);
    
    const testUser = new User({
      email: 'test@grow5x.com',
      fullName: 'Usuario de Prueba',
      password: hashedPassword,
      country: 'Colombia',
      role: 'user',
      status: 'active',
      isEmailVerified: true,
      referralCode: 'TEST001',
      profile: {
        firstName: 'Usuario',
        lastName: 'de Prueba',
        phone: '+1234567890',
        country: 'Colombia',
        city: 'Bogotá'
      },
      settings: {
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        privacy: {
          profileVisibility: 'public',
          showEmail: false,
          showPhone: false
        }
      }
    });
    
    await testUser.save();
    
    console.log('✅ Usuario de prueba creado exitosamente');
    console.log('📧 Email: test@grow5x.com');
    console.log('🔑 Password: Test123@');
    console.log('🎭 Rol: user');
    console.log('📊 Estado: active');
    console.log(`🆔 ID: ${testUser._id}`);
    
    return testUser;

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.log('💡 El usuario ya existe con ese email');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

if (require.main === module) {
  createTestUser().catch(console.error);
}

module.exports = { createTestUser };