const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Conectar a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Esquema de usuario
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
  status: String,
  fullName: String,
  createdAt: Date,
  updatedAt: Date
});

const User = mongoose.model('User', userSchema);

async function verifyUsersInDatabase() {
  try {
    console.log('🔍 Verificando usuarios en MongoDB Atlas...');
    
    // Usuarios a verificar
    const usersToCheck = [
      {
        name: 'PADRE',
        email: 'negociosmillonaris1973@gmail.com',
        testPassword: 'Parent2024!'
      },
      {
        name: 'LIDER',
        email: 'edgarpayares2005@gmail.com',
        testPassword: 'Leader2024!'
      },
      {
        name: 'ADMIN',
        email: 'admin@grow5x.com',
        testPassword: 'Admin2024!'
      }
    ];
    
    console.log('\n📋 Verificando cada usuario...');
    
    for (const userData of usersToCheck) {
      console.log(`\n🔍 Verificando ${userData.name}: ${userData.email}`);
      
      // Buscar usuario en la base de datos
      const user = await User.findOne({ email: userData.email });
      
      if (user) {
        console.log(`✅ Usuario encontrado en DB:`);
        console.log(`   - ID: ${user._id}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Nombre: ${user.fullName || 'No definido'}`);
        console.log(`   - Rol: ${user.role}`);
        console.log(`   - Estado: ${user.status}`);
        console.log(`   - Creado: ${user.createdAt}`);
        console.log(`   - Actualizado: ${user.updatedAt}`);
        
        // Verificar contraseña
        try {
          const isPasswordValid = await bcrypt.compare(userData.testPassword, user.password);
          
          if (isPasswordValid) {
            console.log(`   ✅ Contraseña VÁLIDA para ${userData.testPassword}`);
          } else {
            console.log(`   ❌ Contraseña INVÁLIDA para ${userData.testPassword}`);
            
            // Probar contraseñas comunes
            const commonPasswords = [
              'Parent2024!',
              'Leader2024!', 
              'Admin2024!',
              'Test2024!',
              'password123',
              '123456',
              'admin'
            ];
            
            console.log(`   🔍 Probando contraseñas comunes...`);
            
            for (const testPass of commonPasswords) {
              const isValid = await bcrypt.compare(testPass, user.password);
              if (isValid) {
                console.log(`   ✅ Contraseña encontrada: ${testPass}`);
                break;
              }
            }
          }
          
        } catch (bcryptError) {
          console.log(`   ❌ Error verificando contraseña: ${bcryptError.message}`);
        }
        
      } else {
        console.log(`❌ Usuario NO encontrado: ${userData.email}`);
        
        // Buscar usuarios similares
        const emailParts = userData.email.split('@');
        const username = emailParts[0];
        
        const similarUsers = await User.find({
          $or: [
            { email: { $regex: username, $options: 'i' } },
            { email: { $regex: emailParts[1], $options: 'i' } }
          ]
        }).limit(5);
        
        if (similarUsers.length > 0) {
          console.log(`   📝 Usuarios similares encontrados:`);
          similarUsers.forEach(u => {
            console.log(`      - ${u.email} (${u.status}) - ${u.fullName || 'Sin nombre'}`);
          });
        }
      }
    }
    
    // Mostrar estadísticas generales
    console.log('\n📊 ESTADÍSTICAS GENERALES:');
    console.log('=' .repeat(50));
    
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    
    console.log(`👥 Total usuarios: ${totalUsers}`);
    console.log(`✅ Usuarios activos: ${activeUsers}`);
    console.log(`🔑 Administradores: ${adminUsers}`);
    
    // Mostrar últimos usuarios creados
    console.log('\n📅 Últimos 5 usuarios creados:');
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('email fullName role status createdAt');
    
    recentUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - ${user.createdAt}`);
    });
    
    console.log('\n✅ Verificación completada!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar verificación
verifyUsersInDatabase();