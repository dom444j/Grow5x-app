require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('🔍 Verificando usuarios en MongoDB Atlas...');
  
  const users = await User.find({}, 'email role status').limit(10);
  console.log('📊 Usuarios encontrados:');
  
  users.forEach(user => {
    console.log(`- Email: ${user.email}, Rol: ${user.role}, Estado: ${user.status}`);
  });
  
  const totalUsers = await User.countDocuments();
  console.log(`\n📈 Total de usuarios: ${totalUsers}`);
  
  // Verificar usuarios específicos mencionados en la documentación
  const specificUsers = [
    'admin@grow5x.com',
    'negociosmillonaris1973@gmail.com',
    'edgarpayares2005@gmail.com',
    'clubnetwin@hotmail.com'
  ];
  
  console.log('\n🎯 Verificando usuarios específicos:');
  for (const email of specificUsers) {
    const user = await User.findOne({ email });
    if (user) {
      console.log(`✅ ${email} - Rol: ${user.role}, Estado: ${user.status}`);
    } else {
      console.log(`❌ ${email} - No encontrado`);
    }
  }
  
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});