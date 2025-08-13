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

async function fixSpecificUsers() {
  try {
    console.log('🔧 Reparando usuarios específicos...');
    
    // Usuarios problemáticos
    const usersToFix = [
      {
        email: 'negociosmillonaris1973@gmail.com',
        newPassword: 'Parent2024!',
        role: 'PADRE'
      },
      {
        email: 'edgarpayares2005@gmail.com',
        newPassword: 'Leader2024!',
        role: 'LIDER'
      }
    ];
    
    for (const userData of usersToFix) {
      console.log(`\n🔍 Procesando ${userData.role}: ${userData.email}`);
      
      // Buscar usuario
      const user = await User.findOne({ email: userData.email });
      
      if (user) {
        console.log(`✅ Usuario encontrado: ${user._id}`);
        
        // Generar nuevo hash con salt alto
        const saltRounds = 12;
        const newHashedPassword = await bcrypt.hash(userData.newPassword, saltRounds);
        
        console.log(`🔐 Nuevo hash generado (primeros 20 chars): ${newHashedPassword.substring(0, 20)}...`);
        
        // Actualizar directamente en la base de datos
        const updateResult = await User.updateOne(
          { _id: user._id },
          { 
            $set: {
              password: newHashedPassword,
              status: 'active',
              updatedAt: new Date()
            }
          }
        );
        
        console.log(`📝 Resultado de actualización:`, updateResult);
        
        // Verificar que se actualizó
        const updatedUser = await User.findById(user._id);
        
        // Probar la nueva contraseña
        const isPasswordValid = await bcrypt.compare(userData.newPassword, updatedUser.password);
        
        if (isPasswordValid) {
          console.log(`✅ ${userData.role} - Contraseña actualizada y verificada correctamente`);
        } else {
          console.log(`❌ ${userData.role} - Error: La contraseña no se verificó correctamente`);
        }
        
      } else {
        console.log(`❌ Usuario no encontrado: ${userData.email}`);
      }
    }
    
    console.log('\n🧪 Realizando prueba final de autenticación...');
    
    // Probar autenticación final
    for (const userData of usersToFix) {
      const user = await User.findOne({ email: userData.email });
      if (user) {
        const isValid = await bcrypt.compare(userData.newPassword, user.password);
        const status = isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA';
        console.log(`${status} - ${userData.role}: ${userData.email}`);
      }
    }
    
    console.log('\n✅ Proceso de reparación completado!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar reparación
fixSpecificUsers();