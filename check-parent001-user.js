const User = require('./backend/src/models/User');
const mongoose = require('mongoose');

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Conectado a MongoDB');
    
    try {
      // Buscar usuario con código PARENT001
      const user = await User.findOne({referralCode: 'PARENT001'});
      
      if (user) {
        console.log('Usuario encontrado con código PARENT001:');
        console.log('Email:', user.email);
        console.log('Nombre:', user.fullName);
        console.log('Código de referido:', user.referralCode);
        console.log('Es usuario especial:', user.isSpecialUser);
        console.log('Tipo de usuario especial:', user.specialUserType);
        console.log('ID:', user._id);
      } else {
        console.log('No se encontró usuario con código PARENT001');
      }
      
    } catch (error) {
      console.error('Error al buscar usuario:', error);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error conectando a MongoDB:', err);
    process.exit(1);
  });