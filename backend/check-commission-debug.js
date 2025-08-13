const mongoose = require('mongoose');
const Commission = require('./src/models/Commission.model');
const User = require('./src/models/User');
require('dotenv').config();

async function checkCommissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Buscar todas las comisiones directas recientes
    const commissions = await Commission.find({
      commissionType: 'direct_referral'
    }).sort({ createdAt: -1 }).limit(5).lean();
    
    console.log('\n📊 Últimas 5 comisiones directas:');
    for (const commission of commissions) {
      console.log('---');
      console.log('ID:', commission._id);
      console.log('userId (referrer):', commission.userId);
      console.log('fromUserId (referred):', commission.fromUserId);
      console.log('purchaseId (raíz):', commission.purchaseId);
      console.log('amount:', commission.amount);
      console.log('status:', commission.status);
      console.log('createdAt:', commission.createdAt);
      console.log('metadata:', JSON.stringify(commission.metadata, null, 2));
      
      // Verificar si tiene runId en metadata
      if (commission.metadata?.runId) {
        console.log('✅ Tiene runId en metadata:', commission.metadata.runId);
      } else {
        console.log('❌ NO tiene runId en metadata');
      }
      
      // Verificar si tiene purchaseId en metadata
      if (commission.metadata?.purchaseId) {
        console.log('✅ Tiene purchaseId en metadata:', commission.metadata.purchaseId);
      } else {
        console.log('❌ NO tiene purchaseId en metadata');
      }
    }
    
    // Buscar usuarios de test recientes
    console.log('\n👥 Usuarios de test recientes:');
    const testUsers = await User.find({
      'metadata.isTest': true
    }).sort({ createdAt: -1 }).limit(3).lean();
    
    for (const user of testUsers) {
      console.log('---');
      console.log('ID:', user._id);
      console.log('email:', user.email);
      console.log('referredBy:', user.referredBy);
      console.log('metadata.runId:', user.metadata?.runId);
      console.log('createdAt:', user.createdAt);
    }
    
    console.log('\n🔍 Verificando global.testRunId actual:', global.testRunId);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Desconectado de MongoDB');
  }
}

checkCommissions();