const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    const count = await User.countDocuments();
    console.log('📊 Total de usuarios en la base de datos:', count);
    
    if (count > 0) {
      const users = await User.find().limit(5).select('fullName email status role createdAt');
      console.log('👥 Primeros 5 usuarios:');
      users.forEach((u, i) => {
        console.log(`${i+1}. ${u.fullName || 'Sin nombre'} (${u.email}) - ${u.status} - ${u.role}`);
      });
    } else {
      console.log('❌ No hay usuarios en la base de datos');
    }
    
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();