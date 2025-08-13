const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction.model');
const Purchase = require('../src/models/Purchase.model');
const User = require('../src/models/User');
require('dotenv').config();

async function resetPurchaseHistory() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado a MongoDB');

    // 1. Contar registros antes del reset
    const transactionCount = await Transaction.countDocuments();
    const purchaseCount = await Purchase.countDocuments();
    
    console.log(`📊 Estado actual:`);
    console.log(`   - Transacciones: ${transactionCount}`);
    console.log(`   - Compras: ${purchaseCount}`);

    // 2. Eliminar todas las transacciones
    console.log('\n🗑️  Eliminando todas las transacciones...');
    const deletedTransactions = await Transaction.deleteMany({});
    console.log(`   ✅ ${deletedTransactions.deletedCount} transacciones eliminadas`);

    // 3. Eliminar todas las compras (si existe el modelo)
    try {
      console.log('🗑️  Eliminando todas las compras...');
      const deletedPurchases = await Purchase.deleteMany({});
      console.log(`   ✅ ${deletedPurchases.deletedCount} compras eliminadas`);
    } catch (error) {
      console.log('   ⚠️  Modelo Purchase no disponible o error:', error.message);
    }

    // 4. Resetear balances de usuarios a 0
    console.log('💰 Reseteando balances de usuarios...');
    const updatedUsers = await User.updateMany(
      {},
      {
        $set: {
          balance: 0,
          totalEarnings: 0,
          totalWithdrawals: 0,
          totalDeposits: 0,
          totalCommissions: 0
        }
      }
    );
    console.log(`   ✅ ${updatedUsers.modifiedCount} usuarios actualizados`);

    // 5. Verificar que todo esté en 0
    console.log('\n🔍 Verificando estado final...');
    const finalTransactionCount = await Transaction.countDocuments();
    const finalPurchaseCount = await Purchase.countDocuments();
    const usersWithBalance = await User.countDocuments({ balance: { $gt: 0 } });
    
    console.log(`📊 Estado final:`);
    console.log(`   - Transacciones: ${finalTransactionCount}`);
    console.log(`   - Compras: ${finalPurchaseCount}`);
    console.log(`   - Usuarios con balance > 0: ${usersWithBalance}`);

    // 6. Verificar estadísticas del endpoint
    console.log('\n📈 Verificando estadísticas del endpoint...');
    const stats = {
      total: await Transaction.countDocuments(),
      completed: await Transaction.countDocuments({ status: 'completed' }),
      pending: await Transaction.countDocuments({ status: 'pending' }),
      failed: await Transaction.countDocuments({ status: 'failed' })
    };
    
    const revenueResult = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    
    console.log(`   - Total transacciones: ${stats.total}`);
    console.log(`   - Completadas: ${stats.completed}`);
    console.log(`   - Pendientes: ${stats.pending}`);
    console.log(`   - Fallidas: ${stats.failed}`);
    console.log(`   - Ingresos totales: $${totalRevenue}`);

    console.log('\n✅ Reset del historial de compras completado exitosamente');
    console.log('🎯 El sistema está ahora limpio y listo para uso en producción');
    
  } catch (error) {
    console.error('❌ Error durante el reset:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
resetPurchaseHistory();