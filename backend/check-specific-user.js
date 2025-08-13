const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importar modelo de usuario
const User = require('./src/models/User');

async function checkSpecificUser() {
  try {
    console.log('🔗 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    const targetEmail = 'negociosmillonaris1973@gmail.com';
    console.log(`\n🔍 Buscando usuario: ${targetEmail}`);
    
    const user = await User.findOne({ email: targetEmail });
    
    if (!user) {
      console.log('❌ Usuario NO encontrado en la base de datos');
      console.log('\n📋 Usuarios disponibles con emails similares:');
      
      // Buscar usuarios con emails similares
      const similarUsers = await User.find({
        email: { $regex: 'negocio', $options: 'i' }
      }).select('email fullName status role createdAt');
      
      if (similarUsers.length > 0) {
        similarUsers.forEach(u => {
          console.log(`   📧 ${u.email} - ${u.fullName} (${u.status})`);
        });
      } else {
        console.log('   No se encontraron usuarios similares');
      }
      
      // Mostrar algunos usuarios de ejemplo
      console.log('\n📋 Primeros 10 usuarios en la base de datos:');
      const sampleUsers = await User.find({}).limit(10).select('email fullName status role');
      sampleUsers.forEach(u => {
        console.log(`   📧 ${u.email} - ${u.fullName} (${u.status})`);
      });
      
    } else {
      console.log('✅ Usuario encontrado:');
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Nombre: ${user.fullName}`);
      console.log(`   🎭 Rol: ${user.role}`);
      console.log(`   📊 Estado: ${user.status}`);
      console.log(`   🔐 Password Hash: ${user.password.substring(0, 20)}...`);
      console.log(`   ✅ Verificado: ${user.verification?.isVerified || false}`);
      console.log(`   📅 Creado: ${user.createdAt}`);
      console.log(`   🔑 Código Referido: ${user.referralCode || 'No asignado'}`);
      
      // Probar contraseña común
      const commonPasswords = ['Parent2024!', 'Test123@', '123456', 'password', 'admin'];
      console.log('\n🔐 Probando contraseñas comunes...');
      
      for (const password of commonPasswords) {
        try {
          const isMatch = await bcrypt.compare(password, user.password);
          if (isMatch) {
            console.log(`✅ CONTRASEÑA ENCONTRADA: ${password}`);
            break;
          } else {
            console.log(`❌ ${password} - No coincide`);
          }
        } catch (error) {
          console.log(`⚠️ Error probando ${password}:`, error.message);
        }
      }
    }
    
    // Estadísticas generales
    console.log('\n📊 ESTADÍSTICAS DE LA BASE DE DATOS:');
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const verifiedUsers = await User.countDocuments({ 'verification.isVerified': true });
    
    console.log(`   👥 Total usuarios: ${totalUsers}`);
    console.log(`   ✅ Usuarios activos: ${activeUsers}`);
    console.log(`   🔐 Usuarios verificados: ${verifiedUsers}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n🔌 Desconectando de MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Desconectado');
  }
}

checkSpecificUser();