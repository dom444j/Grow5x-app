require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const { generateToken } = require('./src/middleware/auth');

const testAdminLogin = async () => {
  try {
    console.log('🔍 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    // Credenciales del admin
    const adminEmail = 'admin@grow5x.com';
    const adminPassword = 'Admin2024!';
    
    console.log('\n🔍 Buscando usuario admin...');
    const user = await User.findOne({
      $or: [
        { email: adminEmail.toLowerCase() },
        { telegram: adminEmail }
      ]
    });
    
    if (!user) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }
    
    console.log('✅ Usuario admin encontrado:');
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Rol: ${user.role}`);
    console.log(`📊 Estado: ${user.status}`);
    console.log(`🔑 Hash: ${user.password.substring(0, 20)}...`);
    
    console.log('\n🔐 Verificando contraseña...');
    const isPasswordValid = await bcrypt.compare(adminPassword, user.password);
    console.log(`🔐 Contraseña válida: ${isPasswordValid ? '✅ SÍ' : '❌ NO'}`);
    
    if (isPasswordValid) {
      console.log('\n🎫 Generando token...');
      const token = generateToken(user._id);
      console.log(`🎫 Token generado: ${token.substring(0, 20)}...`);
      
      console.log('\n✅ LOGIN ADMIN EXITOSO');
      console.log('📋 Datos del usuario:');
      console.log({
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin
      });
    } else {
      console.log('\n❌ LOGIN ADMIN FALLIDO - Contraseña incorrecta');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
};

testAdminLogin();