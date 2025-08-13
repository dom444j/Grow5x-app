require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcrypt');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('🔍 Verificando contraseñas en MongoDB Atlas...');
  
  // Usuarios específicos para verificar
  const specificUsers = [
    'admin@grow5x.com',
    'negociosmillonaris1973@gmail.com',
    'edgarpayares2005@gmail.com'
  ];
  
  console.log('🔐 Verificando hashes de contraseñas:');
  for (const email of specificUsers) {
    const user = await User.findOne({ email });
    if (user) {
      console.log(`\n📧 Usuario: ${email}`);
      console.log(`🔑 Hash: ${user.password.substring(0, 20)}...`);
      console.log(`📅 Creado: ${user.createdAt}`);
      console.log(`🔄 Actualizado: ${user.updatedAt}`);
      
      // Probar contraseñas comunes para este usuario
      const commonPasswords = [
        'Parent2024!',
        'admin123',
        'password123',
        'Admin2024!',
        'grow5x123'
      ];
      
      console.log('🧪 Probando contraseñas comunes:');
      for (const pwd of commonPasswords) {
        const isValid = await bcrypt.compare(pwd, user.password);
        console.log(`  - ${pwd}: ${isValid ? '✅ VÁLIDA' : '❌ Inválida'}`);
      }
    } else {
      console.log(`❌ ${email} - No encontrado`);
    }
  }
  
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});