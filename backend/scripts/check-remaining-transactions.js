const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction.model');
const User = require('../src/models/User');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const checkRemainingTransactions = async () => {
  try {
    console.log('🔍 Verificando transacciones restantes...');
    console.log(`🌐 Base de datos: ${process.env.MONGODB_URI?.includes('mongodb.net') ? 'MongoDB Atlas ✅' : 'Local ❌'}`);
    console.log('\n' + '='.repeat(60));
    
    const transactions = await Transaction.find().populate('user', 'email username');
    
    console.log(`📊 Total de transacciones encontradas: ${transactions.length}`);
    console.log('\n📋 Detalle de transacciones:');
    
    transactions.forEach((t, i) => {
      console.log(`\n${i+1}. Transacción ID: ${t._id}`);
      console.log(`   👤 Usuario: ${t.user?.email || 'N/A'} (${t.user?.username || 'N/A'})`);
      console.log(`   📝 Descripción: ${t.description || 'Sin descripción'}`);
      console.log(`   💰 Monto: ${t.amount} ${t.currency || 'USDT'}`);
      console.log(`   📊 Estado: ${t.status}`);
      console.log(`   🕒 Fecha: ${new Date(t.createdAt).toLocaleString('es-ES')}`);
      console.log(`   🔗 Tipo: ${t.type || 'N/A'}`);
      
      // Verificar si parece ser datos de prueba
      const isTestData = (
        t.description?.toLowerCase().includes('prueba') ||
        t.description?.toLowerCase().includes('test') ||
        t.user?.email?.includes('test') ||
        t.user?.email?.includes('example')
      );
      
      if (isTestData) {
        console.log(`   ⚠️  POSIBLE DATO DE PRUEBA`);
      } else {
        console.log(`   ✅ Parece ser dato real`);
      }
    });
    
    // Verificar usuarios también
    const users = await User.find();
    console.log(`\n👥 Total de usuarios: ${users.length}`);
    
    const testUsers = users.filter(u => 
      u.email?.includes('test') || 
      u.email?.includes('example') ||
      u.username?.toLowerCase().includes('test')
    );
    
    if (testUsers.length > 0) {
      console.log(`\n⚠️  Usuarios de prueba encontrados: ${testUsers.length}`);
      testUsers.forEach(u => {
        console.log(`   - ${u.email} (${u.username})`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

checkRemainingTransactions();