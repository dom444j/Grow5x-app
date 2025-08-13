const User = require('./src/models/User');
const mongoose = require('mongoose');

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Conectado a MongoDB');
    
    // Buscar usuario con código PARENT001
    const user = await User.findOne({referralCode: 'PARENT001'});
    
    if (user) {
      console.log('Usuario con código PARENT001 encontrado:');
      console.log({
        id: user._id,
        name: user.fullName,
        email: user.email,
        code: user.referralCode
      });
    } else {
      console.log('No se encontró usuario con código PARENT001');
      
      // Crear usuario con código PARENT001
      console.log('Creando usuario con código PARENT001...');
      
      const newUser = new User({
        email: 'parent001@grow5x.com',
        password: '$2a$12$dummy.hash.for.parent001.user', // Hash dummy
        fullName: 'Usuario Padre 001',
        country: 'Global',
        language: 'es',
        referralCode: 'PARENT001',
        role: 'user',
        isSpecialUser: true,
        specialUserType: 'parent',
        verification: {
          email: {
            isVerified: true,
            verifiedAt: new Date()
          }
        }
      });
      
      await newUser.save();
      console.log('Usuario PARENT001 creado exitosamente');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });