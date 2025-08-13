const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const cleanupTestUser = async () => {
  try {
    console.log('🧹 Limpiando usuario de prueba...');
    console.log(`🌐 Base de datos: ${process.env.MONGODB_URI?.includes('mongodb.net') ? 'MongoDB Atlas ✅' : 'Local ❌'}`);
    console.log('\n' + '='.repeat(50));
    
    // Buscar y eliminar usuario de prueba
    const testUser = await User.findOne({ email: 'test@grow5x.com' });
    
    if (testUser) {
      console.log(`🎯 Usuario de prueba encontrado:`);
      console.log(`   📧 Email: ${testUser.email}`);
      console.log(`   👤 Username: ${testUser.username || 'N/A'}`);
      console.log(`   🆔 ID: ${testUser._id}`);
      
      await User.deleteOne({ _id: testUser._id });
      console.log('\n✅ Usuario de prueba eliminado exitosamente');
    } else {
      console.log('ℹ️  No se encontró el usuario de prueba test@grow5x.com');
    }
    
    // Verificar estado final
    const remainingUsers = await User.find();
    console.log(`\n📊 Usuarios restantes: ${remainingUsers.length}`);
    
    const testUsers = remainingUsers.filter(u => 
      u.email?.includes('test') || 
      u.email?.includes('example') ||
      u.username?.toLowerCase().includes('test')
    );
    
    if (testUsers.length === 0) {
      console.log('✨ No quedan usuarios de prueba');
    } else {
      console.log(`⚠️  Usuarios de prueba restantes: ${testUsers.length}`);
      testUsers.forEach(u => {
        console.log(`   - ${u.email} (${u.username})`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Limpieza completada - Sistema listo para producción');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

cleanupTestUser();