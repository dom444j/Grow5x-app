const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction.model');
const Purchase = require('./src/models/Purchase.model');
const User = require('./src/models/User');

async function debugPurchaseId() {
  try {
    await mongoose.connect('mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority');
    console.log('Conectado a la base de datos');
    
    // Obtener un usuario que tenga transacciones de beneficio
    const recentTransaction = await Transaction.findOne({
      type: 'earnings',
      subtype: 'auto_earnings'
    }).sort({ createdAt: -1 }).lean();
    
    if (!recentTransaction) {
      console.log('No se encontraron transacciones de beneficio');
      return;
    }
    
    const userId = recentTransaction.user;
    console.log(`\n=== DIAGNÓSTICO PARA USUARIO ${userId} ===`);
    
    // Verificar compras del usuario
    const userPurchases = await Purchase.find({ userId: userId }).sort({ createdAt: -1 }).lean();
    console.log(`\nCompras del usuario: ${userPurchases.length}`);
    
    userPurchases.forEach((p, i) => {
      console.log(`${i+1}. Purchase ID: ${p._id}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Amount: ${p.amount}`);
      console.log(`   Created: ${p.createdAt}`);
      console.log(`   FirstCycleCompleted: ${p.firstCycleCompleted}`);
      console.log('');
    });
    
    // Verificar transacciones de beneficio del usuario
    const userTransactions = await Transaction.find({
      user: userId,
      type: 'earnings',
      subtype: 'auto_earnings'
    }).sort({ createdAt: -1 }).limit(10).lean();
    
    console.log(`\nTransacciones de beneficio del usuario: ${userTransactions.length}`);
    
    userTransactions.forEach((t, i) => {
      console.log(`${i+1}. Transaction ID: ${t._id}`);
      console.log(`   Amount: ${t.amount}`);
      console.log(`   Status: ${t.status}`);
      console.log(`   PurchaseId en metadata: ${t.metadata?.purchaseId || 'NO ENCONTRADO'}`);
      console.log(`   Metadata completa: ${JSON.stringify(t.metadata, null, 2)}`);
      console.log(`   Created: ${t.createdAt}`);
      console.log('');
    });
    
    // Simular búsqueda de compra activa como lo hace el código
    console.log('\n=== SIMULANDO BÚSQUEDA DE COMPRA ACTIVA ===');
    const activePurchase = await Purchase.findOne({
      userId: userId,
      status: { $in: ['pending', 'completed', 'ACTIVE'] }
    }).sort({ createdAt: -1 });
    
    if (activePurchase) {
      console.log(`✅ Compra activa encontrada: ${activePurchase._id}`);
      console.log(`   Status: ${activePurchase.status}`);
      console.log(`   Amount: ${activePurchase.amount}`);
    } else {
      console.log('❌ No se encontró compra activa');
    }
    
    // Verificar si hay transacciones con purchaseId
    const transactionsWithPurchaseId = await Transaction.countDocuments({
      user: userId,
      type: 'earnings',
      subtype: 'auto_earnings',
      'metadata.purchaseId': { $exists: true }
    });
    
    console.log(`\nTransacciones con purchaseId: ${transactionsWithPurchaseId}`);
    
    // Contar beneficios para la compra más reciente si existe
    if (activePurchase) {
      const benefitCount = await Transaction.countDocuments({
        user: userId,
        type: 'earnings',
        subtype: 'auto_earnings',
        status: 'completed',
        'metadata.purchaseId': activePurchase._id
      });
      
      console.log(`\nBeneficios completados para compra ${activePurchase._id}: ${benefitCount}`);
      console.log(`¿Primer ciclo completado? ${benefitCount >= 8 ? 'SÍ' : 'NO'}`);
    }
    
  } catch (error) {
    console.error('Error en diagnóstico:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de la base de datos');
  }
}

debugPurchaseId().catch(console.error);