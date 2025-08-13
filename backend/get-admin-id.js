const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const User = require('./src/models/User');

// Conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

// Obtener ID del usuario admin
const getAdminId = async () => {
  try {
    console.log('🔍 Buscando usuario admin...');
    
    // Buscar usuario admin
    const adminUser = await User.findOne({ 
      $or: [
        { role: 'admin' },
        { email: 'admin@grow5x.com' }
      ]
    });
    
    if (adminUser) {
      console.log('✅ Usuario admin encontrado:');
      console.log('- ID:', adminUser._id.toString());
      console.log('- Email:', adminUser.email);
      console.log('- Rol:', adminUser.role);
      console.log('- Estado:', adminUser.status);
      console.log('- Nombre:', adminUser.fullName);
      
      return adminUser._id.toString();
    } else {
      console.log('❌ No se encontró usuario admin');
      
      // Mostrar todos los usuarios para referencia
      console.log('\n📋 Usuarios disponibles:');
      const allUsers = await User.find({}, 'email role status fullName').limit(10);
      allUsers.forEach(user => {
        console.log(`- ${user.email} (${user.role}) - ${user.status} - ${user.fullName}`);
      });
      
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
};

// Ejecutar
const main = async () => {
  await connectDB();
  const adminId = await getAdminId();
  
  if (adminId) {
    console.log(`\n🎯 ID del admin para usar en tokens: ${adminId}`);
  }
};

main().catch(console.error);