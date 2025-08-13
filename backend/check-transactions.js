const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction.model');
const Purchase = require('./src/models/Purchase.model');

async function checkTransactions() {
  try {
    await mongoose.connect('mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority');
    console.log('Conectado a la base de datos');
    
    // Verificar últimas transacciones de beneficio
    console.log('\n=== ÚLTIMAS 5 TRANSACCIONES DE BENEFICIO ===');
    const recentTransactions = await Transaction.find({
      type: 'earnings',
      subtype: 'auto_earnings'
    }).sort({ createdAt: -1 }).limit(5).lean();
    
    recentTransactions.forEach((t, i) => {
      console.log(`${i+1}. ID: ${t._id}`);
      console.log(`   User: ${t.user}`);
      console.log(`   Amount: ${t.amount}`);
      console.log(`   PurchaseId en metadata: ${t.metadata?.purchaseId || 'NO ENCONTRADO'}`);
      console.log(`   Created: ${t.createdAt}`);
      console.log('');
    });
    
    // Verificar compras con firstCycleCompleted
    console.log('\n=== COMPRAS CON PRIMER CICLO COMPLETADO ===');
    const completedCyclePurchases = await Purchase.find({
      firstCycleCompleted: true
    }).limit(5).lean();
    
    console.log(`Encontradas ${completedCyclePurchases.length} compras con primer ciclo completado`);
    
    completedCyclePurchases.forEach((p, i) => {
      console.log(`${i+1}. Purchase ID: ${p._id}`);
      console.log(`   User ID: ${p.userId}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Amount: ${p.amount}`);
      console.log(`   FirstCycleCompleted: ${p.firstCycleCompleted}`);
      console.log('');
    });
    
    // Verificar todas las compras
    const allPurchases = await Purchase.countDocuments({});
    const activePurchases = await Purchase.countDocuments({ status: 'ACTIVE' });
    const completedPurchases = await Purchase.countDocuments({ status: 'completed' });
    console.log(`\nTotal compras: ${allPurchases}`);
    console.log(`Compras activas (ACTIVE): ${activePurchases}`);
    console.log(`Compras completadas (completed): ${completedPurchases}`);
    
    // Verificar estados de compras
    const purchaseStatuses = await Purchase.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n=== ESTADOS DE COMPRAS ===');
    purchaseStatuses.forEach(p => {
      console.log(`${p._id}: ${p.count}`);
    });
    
    // Verificar algunas compras recientes
    const recentPurchases = await Purchase.find({}).sort({ createdAt: -1 }).limit(3).lean();
    console.log('\n=== ÚLTIMAS 3 COMPRAS ===');
    recentPurchases.forEach((p, i) => {
      console.log(`${i+1}. Purchase ID: ${p._id}`);
      console.log(`   User ID: ${p.userId}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Amount: ${p.amount}`);
      console.log(`   Metadata: ${JSON.stringify(p.metadata || {})}`);
      console.log(`   FirstCycleCompleted: ${p.firstCycleCompleted}`);
      console.log('');
    });
    
    // Contar transacciones con purchaseId en metadata
    console.log('\n=== ESTADÍSTICAS DE TRANSACCIONES ===');
    const totalBenefits = await Transaction.countDocuments({
      type: 'earnings',
      subtype: 'auto_earnings'
    });
    
    const benefitsWithPurchaseId = await Transaction.countDocuments({
      type: 'earnings',
      subtype: 'auto_earnings',
      'metadata.purchaseId': { $exists: true, $ne: null }
    });
    
    console.log(`Total transacciones de beneficio: ${totalBenefits}`);
    console.log(`Con purchaseId en metadata: ${benefitsWithPurchaseId}`);
    console.log(`Sin purchaseId: ${totalBenefits - benefitsWithPurchaseId}`);
    
    // También verificar todos los tipos de transacciones
    const allTransactions = await Transaction.countDocuments({});
    console.log(`Total de todas las transacciones: ${allTransactions}`);
    
    // Verificar tipos de transacciones existentes
    const transactionTypes = await Transaction.aggregate([
      { $group: { _id: { type: '$type', subtype: '$subtype' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n=== TIPOS DE TRANSACCIONES EXISTENTES ===');
    transactionTypes.forEach(t => {
      console.log(`${t._id.type}/${t._id.subtype}: ${t.count}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de la base de datos');
  }
}

checkTransactions();