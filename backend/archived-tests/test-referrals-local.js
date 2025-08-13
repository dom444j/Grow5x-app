const mongoose = require('mongoose');
const User = require('./src/models/User.js');
const Referral = require('./src/models/Referral.model.js');
const Commission = require('./src/models/Commission.model.js');
require('dotenv').config();

async function testReferralsConnection() {
  try {
    console.log('🔗 Conectando a MongoDB Atlas...');
    console.log('URI:', process.env.MONGODB_URI?.substring(0, 50) + '...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    // Verificar usuarios
    const userCount = await User.countDocuments();
    console.log(`👥 Total de usuarios: ${userCount}`);
    
    // Verificar referidos
    const referralCount = await Referral.countDocuments();
    console.log(`🔗 Total de referidos: ${referralCount}`);
    
    // Verificar comisiones
    const commissionCount = await Commission.countDocuments();
    console.log(`💰 Total de comisiones: ${commissionCount}`);
    
    // Obtener algunos datos de ejemplo
    const sampleUsers = await User.find({}).limit(3).select('email username referralCode');
    console.log('\n📋 Usuarios de ejemplo:');
    sampleUsers.forEach(user => {
      console.log(`- ${user.email} | Código: ${user.referralCode}`);
    });
    
    const sampleReferrals = await Referral.find({}).limit(3).populate('referrer referred', 'email username');
    console.log('\n🔗 Referidos de ejemplo:');
    sampleReferrals.forEach(ref => {
      console.log(`- ${ref.referrer?.email} -> ${ref.referred?.email} | Estado: ${ref.status}`);
    });
    
    const sampleCommissions = await Commission.find({}).limit(3).populate('user', 'email');
    console.log('\n💰 Comisiones de ejemplo:');
    sampleCommissions.forEach(comm => {
      console.log(`- ${comm.user?.email} | Monto: ${comm.amount} | Estado: ${comm.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

testReferralsConnection();