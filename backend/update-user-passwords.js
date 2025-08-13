const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Conectar a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Esquema de usuario simplificado
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
  status: String
});

const User = mongoose.model('User', userSchema);

async function updateUserPasswords() {
  try {
    console.log('🔄 Conectando a MongoDB Atlas...');
    
    // Usuarios a actualizar
    const usersToUpdate = [
      {
        email: 'negociosmillonaris1973@gmail.com',
        newPassword: 'Parent2024!',
        role: 'PADRE'
      },
      {
        email: 'edgarpayares2005@gmail.com', 
        newPassword: 'Leader2024!',
        role: 'LIDER'
      },
      {
        email: 'clubnetwin@hotmail.com',
        newPassword: 'Test2024!',
        role: 'TEST'
      }
    ];

    console.log('📋 Actualizando contraseñas de usuarios...');
    
    for (const userData of usersToUpdate) {
      console.log(`\n🔍 Buscando usuario: ${userData.email}`);
      
      // Buscar usuario
      const user = await User.findOne({ email: userData.email });
      
      if (user) {
        console.log(`✅ Usuario encontrado: ${user.email}`);
        console.log(`   - ID: ${user._id}`);
        console.log(`   - Estado actual: ${user.status}`);
        
        // Hashear nueva contraseña
        const hashedPassword = await bcrypt.hash(userData.newPassword, 12);
        
        // Actualizar contraseña y asegurar que esté activo
        await User.updateOne(
          { _id: user._id },
          { 
            password: hashedPassword,
            status: 'active'
          }
        );
        
        console.log(`✅ Contraseña actualizada para ${userData.role}: ${userData.email}`);
        console.log(`   - Nueva contraseña: ${userData.newPassword}`);
        
      } else {
        console.log(`❌ Usuario NO encontrado: ${userData.email}`);
        
        // Listar usuarios similares
        const similarUsers = await User.find({
          email: { $regex: userData.email.split('@')[0], $options: 'i' }
        }).limit(3);
        
        if (similarUsers.length > 0) {
          console.log('   📝 Usuarios similares encontrados:');
          similarUsers.forEach(u => {
            console.log(`      - ${u.email} (${u.status})`);
          });
        }
      }
    }
    
    console.log('\n🎯 Verificando usuarios actualizados...');
    
    // Verificar todos los usuarios
    for (const userData of usersToUpdate) {
      const user = await User.findOne({ email: userData.email });
      if (user) {
        console.log(`✅ ${userData.role}: ${user.email} - Estado: ${user.status}`);
      }
    }
    
    console.log('\n✅ Proceso completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar
updateUserPasswords();