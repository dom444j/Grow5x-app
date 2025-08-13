const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./src/models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe un admin
    let adminUser = await User.findOne({ email: 'admin@grow5x.com' });
    
    if (!adminUser) {
      console.log('👤 Creando usuario administrador...');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      adminUser = new User({
        email: 'admin@grow5x.com',
        password: hashedPassword,
        fullName: 'Administrador Sistema',
        role: 'admin',
        isActive: true,
        isVerified: true
      });
      
      await adminUser.save();
      console.log('✅ Usuario administrador creado');
    } else {
      console.log('👤 Usuario administrador ya existe');
    }
    
    // Generar token JWT con rol admin
    const token = jwt.sign(
      { 
        userId: adminUser._id,
        role: adminUser.role,
        email: adminUser.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('\n🔑 Token de administrador generado:');
    console.log(token);
    console.log('\n📧 Email:', adminUser.email);
    console.log('🔒 Password: admin123');
    console.log('👑 Role:', adminUser.role);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdminUser();