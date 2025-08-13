const mongoose = require('mongoose');
const User = require('./src/models/User');
const Purchase = require('./src/models/Purchase.model');
const Transaction = require('./src/models/Transaction.model');

async function debugSmokeUsers() {
  try {
    // Conectar a la base de datos
    await mongoose.connect('mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority'
    });
    console.log('✅ Conectado a la base de datos');

    // Buscar usuarios del smoke test (que contengan 'test' en el email)
    const testUsers = await User.find({
      email: { $regex: /test/i }
    }).lean();
    
    console.log(`📋 Usuarios de test encontrados: ${testUsers.length}`);
    
    for (const user of testUsers) {
      console.log(`\n=== USUARIO: ${user.email} (${user._id}) ===`);
      
      // Buscar compras del usuario
      const purchases = await Purchase.find({ userId: user._id }).lean();
      console.log(`📦 Compras encontradas: ${purchases.length}`);
      
      if (purchases.length > 0) {
        for (const purchase of purchases) {
          console.log(`  - Compra ID: ${purchase._id}`);
          console.log(`    Estado: ${purchase.status}`);
          console.log(`    Monto: ${purchase.amount}`);
          console.log(`    Fecha: ${purchase.createdAt}`);
        }
      }
      
      // Buscar transacciones del usuario
      const transactions = await Transaction.find({ 
        user: user._id,
        type: 'earnings',
        subtype: 'auto_earnings'
      }).lean();
      
      console.log(`💰 Transacciones de beneficios: ${transactions.length}`);
      
      if (transactions.length > 0) {
        console.log('  Últimas 3 transacciones:');
        const recentTransactions = transactions.slice(-3);
        for (const tx of recentTransactions) {
          console.log(`    - ID: ${tx._id}`);
          console.log(`      Monto: ${tx.amount}`);
          console.log(`      Metadata: ${JSON.stringify(tx.metadata)}`);
          console.log(`      Fecha: ${tx.createdAt}`);
        }
      }
    }
    
    // Buscar la compra más reciente en general
    console.log('\n=== COMPRA MÁS RECIENTE EN EL SISTEMA ===');
    const latestPurchase = await Purchase.findOne({}).sort({ createdAt: -1 }).lean();
    if (latestPurchase) {
      console.log(`Compra ID: ${latestPurchase._id}`);
      console.log(`Usuario ID: ${latestPurchase.userId}`);
      console.log(`Estado: ${latestPurchase.status}`);
      console.log(`Monto: ${latestPurchase.amount}`);
      console.log(`Fecha: ${latestPurchase.createdAt}`);
      
      // Buscar el usuario de esta compra
      const purchaseUser = await User.findById(latestPurchase.userId).lean();
      if (purchaseUser) {
        console.log(`Email del usuario: ${purchaseUser.email}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de la base de datos');
  }
}

debugSmokeUsers();