const mongoose = require('mongoose');
const Wallet = require('./src/models/Wallet.model');
require('dotenv').config();

async function checkWallets() {
  try {
    console.log('🔍 Conectando a MongoDB Atlas...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado a MongoDB Atlas');
    console.log('📊 Verificando wallets...');
    
    // Contar total de wallets
    const totalWallets = await Wallet.countDocuments();
    console.log(`📈 Total de wallets en BD: ${totalWallets}`);
    
    if (totalWallets === 0) {
      console.log('❌ No se encontraron wallets en la base de datos');
      console.log('💡 Esto explica por qué no aparecen en el panel de administración');
      return;
    }
    
    // Obtener estadísticas por estado
    const stats = await Wallet.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('📊 Estadísticas por estado:');
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });
    
    // Obtener algunas wallets de ejemplo
    const sampleWallets = await Wallet.find().limit(5).select('address network status createdAt');
    console.log('\n📝 Wallets de ejemplo:');
    sampleWallets.forEach((wallet, index) => {
      console.log(`   ${index + 1}. ${wallet.address} (${wallet.network}) - ${wallet.status}`);
    });
    
    // Verificar wallets activas
    const activeWallets = await Wallet.countDocuments({ status: 'active' });
    console.log(`\n✅ Wallets activas: ${activeWallets}`);
    
    // Probar el método getAvailableWallet
    console.log('\n🎯 Probando método getAvailableWallet...');
    const availableWallet = await Wallet.getAvailableWallet('BEP20');
    
    if (availableWallet) {
      console.log('✅ Método getAvailableWallet funciona correctamente');
      console.log(`   Wallet obtenida: ${availableWallet.address}`);
    } else {
      console.log('❌ Método getAvailableWallet no devolvió ninguna wallet');
      console.log('💡 Posibles causas:');
      console.log('   - No hay wallets con status "active"');
      console.log('   - No hay wallets de red "BEP20"');
    }
    
  } catch (error) {
    console.error('❌ Error verificando wallets:', error);
    
    if (error.name === 'MongooseError') {
      console.log('💡 Error de conexión a MongoDB. Verificar:');
      console.log('   - Variable MONGODB_URI en .env');
      console.log('   - Conexión a internet');
      console.log('   - Configuración de MongoDB Atlas');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Ejecutar verificación
checkWallets();