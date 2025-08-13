const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Conectar a MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI);

// Esquema de usuario
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { type: String, default: 'user' },
  emailVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function initAdminUser() {
  try {
    const email = 'negociosmillonaris1973@gmail.com';
    const password = 'Parent2024!';
    const fullName = 'Administrador';
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      console.log('✅ Usuario ya existe:', email);
      console.log('- Role:', existingUser.role);
      console.log('- EmailVerified:', existingUser.emailVerified);
      
      // Actualizar si es necesario
      if (!existingUser.emailVerified) {
        await User.updateOne({ email }, { emailVerified: true });
        console.log('✅ Email verificado actualizado');
      }
      
      return;
    }
    
    // Crear nuevo usuario
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const newUser = new User({
      email,
      password: hashedPassword,
      fullName,
      role: 'admin',
      emailVerified: true
    });
    
    await newUser.save();
    console.log('✅ Usuario administrador creado exitosamente');
    console.log('- Email:', email);
    console.log('- Role: admin');
    console.log('- EmailVerified: true');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.disconnect();
  }
}

initAdminUser();