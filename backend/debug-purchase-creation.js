const mongoose = require('mongoose');
const Purchase = require('./src/models/Purchase.model');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction.model');

// Configuración de MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority';

async function debugPurchaseCreation() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar usuarios de prueba más recientes
    const testUsers = await User.find({
      email: { $regex: /@test\.com$/ }
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`👥 Usuarios de prueba encontrados: ${testUsers.length}`);
    
    for (const user of testUsers) {
      console.log(`\n👤 Usuario: ${user.email} (${user._id})`);
      
      // Buscar compras de este usuario
      const purchases = await Purchase.find({ userId: user._id.toString() });
      console.log(`📦 Compras: ${purchases.length}`);
      
      if (purchases.length > 0) {
        for (const purchase of purchases) {
          console.log(`  - Compra ID: ${purchase._id}`);
          console.log(`  - Estado: ${purchase.status}`);
          console.log(`  - Método de pago: ${purchase.paymentMethod}`);
          console.log(`  - Metadata:`, purchase.metadata);
          console.log(`  - Creada: ${purchase.createdAt}`);
          console.log(`  - Actualizada: ${purchase.updatedAt}`);
        }
      }
      
      // Buscar transacciones de este usuario
      const transactions = await Transaction.find({ user: user._id });
      console.log(`💰 Transacciones: ${transactions.length}`);
      
      if (transactions.length > 0) {
        const latestTransaction = transactions[transactions.length - 1];
        console.log(`  - Última transacción: ${latestTransaction.type} - ${latestTransaction.status}`);
        console.log(`  - Metadata:`, latestTransaction.metadata);
      }
    }

    // Buscar todas las compras con metadata de prueba
    console.log('\n🔍 Buscando compras con metadata de prueba...');
    const testPurchases = await Purchase.find({
      'metadata.isTest': true
    });
    
    console.log(`📦 Compras de prueba encontradas: ${testPurchases.length}`);
    
    for (const purchase of testPurchases) {
      console.log(`\n📦 Compra de prueba:`);
      console.log(`  - ID: ${purchase._id}`);
      console.log(`  - Usuario: ${purchase.userId}`);
      console.log(`  - Estado: ${purchase.status}`);
      console.log(`  - Metadata:`, purchase.metadata);
      console.log(`  - Creada: ${purchase.createdAt}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

debugPurchaseCreation();