const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Esquema de usuario
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  userType: { type: String, enum: ['normal', 'special'], default: 'normal' },
  userCode: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function debugUsers() {
  try {
    console.log('🔍 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    const targetUsers = [
      { email: 'negociosmillonaris1973@gmail.com', code: 'PADRE' },
      { email: 'edgarpayares2005@gmail.com', code: 'LIDER' },
      { email: 'admin@grow5x.com', code: 'ADMIN' }
    ];

    for (const targetUser of targetUsers) {
      console.log(`\n🔍 Analizando usuario ${targetUser.code}: ${targetUser.email}`);
      
      const user = await User.findOne({ email: targetUser.email });
      
      if (!user) {
        console.log(`❌ Usuario ${targetUser.code} NO ENCONTRADO`);
        continue;
      }

      console.log(`📋 Detalles del usuario ${targetUser.code}:`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Status: ${user.status}`);
      console.log(`   - UserType: ${user.userType}`);
      console.log(`   - UserCode: ${user.userCode}`);
      console.log(`   - CreatedAt: ${user.createdAt}`);
      console.log(`   - UpdatedAt: ${user.updatedAt}`);
      console.log(`   - Password Hash: ${user.password.substring(0, 20)}...`);
      
      // Verificar contraseñas
      const passwords = {
        'PADRE': 'Parent2024!',
        'LIDER': 'Leader2024!',
        'ADMIN': 'Admin2024!'
      };
      
      const testPassword = passwords[targetUser.code];
      const isValidPassword = await bcrypt.compare(testPassword, user.password);
      
      console.log(`🔐 Verificación de contraseña '${testPassword}': ${isValidPassword ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
      
      // Verificar si el usuario puede hacer login (todos los campos necesarios)
      const canLogin = user.status === 'active' && user.password && user.email;
      console.log(`🚪 Puede hacer login: ${canLogin ? '✅ SÍ' : '❌ NO'}`);
      
      if (!canLogin) {
        console.log(`⚠️  Razones por las que no puede hacer login:`);
        if (user.status !== 'active') console.log(`   - Status no es 'active': ${user.status}`);
        if (!user.password) console.log(`   - No tiene contraseña`);
        if (!user.email) console.log(`   - No tiene email`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB Atlas');
  }
}

debugUsers();