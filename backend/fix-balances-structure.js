const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixBalancesStructure() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🔧 Corrigiendo estructura de balances...');
    
    // 1. Corregir estructura de balances para todos los usuarios
    const users = await db.collection('users').find({}).toArray();
    
    for (const user of users) {
      let needsUpdate = false;
      let balances = user.balances || {};
      
      // Asegurar que todos los campos de balance sean números
      const balanceFields = ['available', 'pending', 'frozen', 'investment', 'commission', 'bonus', 'referral', 'withdrawal'];
      
      balanceFields.forEach(field => {
        if (typeof balances[field] !== 'number') {
          balances[field] = 0;
          needsUpdate = true;
        }
      });
      
      if (needsUpdate) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { balances: balances } }
        );
      }
    }
    
    console.log('✅ Estructura de balances corregida');
    
    // 2. Verificar y mostrar estadísticas financieras para el admin
    console.log('\n📊 ESTADÍSTICAS FINANCIERAS DEL SISTEMA:');
    console.log('==========================================');
    
    // Total de usuarios activos
    const activeUsersCount = await db.collection('users').countDocuments({
      status: 'active',
      email: { $not: { $regex: 'test|demo|example' } },
      'metadata.isTest': { $ne: true }
    });
    
    // Total de balances en el sistema
    const totalBalances = await db.collection('users').aggregate([
      {
        $match: {
          email: { $not: { $regex: 'test|demo|example' } },
          'metadata.isTest': { $ne: true }
        }
      },
      {
        $group: {
          _id: null,
          totalAvailable: { $sum: '$balances.available' },
          totalPending: { $sum: '$balances.pending' },
          totalFrozen: { $sum: '$balances.frozen' },
          totalInvestment: { $sum: '$balances.investment' },
          totalCommission: { $sum: '$balances.commission' },
          totalBonus: { $sum: '$balances.bonus' },
          totalReferral: { $sum: '$balances.referral' },
          totalWithdrawal: { $sum: '$balances.withdrawal' }
        }
      }
    ]).toArray();
    
    const balancesSummary = totalBalances[0] || {};
    
    console.log(`👥 Usuarios activos: ${activeUsersCount}`);
    console.log(`💰 Balance disponible total: $${balancesSummary.totalAvailable || 0}`);
    console.log(`⏳ Balance pendiente total: $${balancesSummary.totalPending || 0}`);
    console.log(`🔒 Balance congelado total: $${balancesSummary.totalFrozen || 0}`);
    console.log(`📈 Inversiones totales: $${balancesSummary.totalInvestment || 0}`);
    console.log(`💸 Comisiones totales: $${balancesSummary.totalCommission || 0}`);
    console.log(`🎁 Bonos totales: $${balancesSummary.totalBonus || 0}`);
    console.log(`👥 Referidos totales: $${balancesSummary.totalReferral || 0}`);
    console.log(`💳 Retiros totales: $${balancesSummary.totalWithdrawal || 0}`);
    
    // Total de transacciones por mes
    const monthlyTransactions = await db.collection('transactions').aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]).toArray();
    
    console.log('\n📈 Transacciones por mes (últimos 6 meses):');
    monthlyTransactions.forEach(month => {
      const monthName = new Date(month._id.year, month._id.month - 1).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
      console.log(`   ${monthName}: ${month.count} transacciones, $${month.totalAmount}`);
    });
    
    // Comisiones pendientes vs pagadas
    const commissionsStatus = await db.collection('commissions').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]).toArray();
    
    console.log('\n💸 Estado de comisiones:');
    commissionsStatus.forEach(status => {
      console.log(`   ${status._id}: ${status.count} comisiones, $${status.totalAmount}`);
    });
    
    // Top usuarios por balance
    const topUsers = await db.collection('users').aggregate([
      {
        $match: {
          email: { $not: { $regex: 'test|demo|example' } },
          'metadata.isTest': { $ne: true }
        }
      },
      {
        $addFields: {
          totalBalance: {
            $add: [
              '$balances.available',
              '$balances.pending',
              '$balances.investment',
              '$balances.commission',
              '$balances.bonus',
              '$balances.referral'
            ]
          }
        }
      },
      { $sort: { totalBalance: -1 } },
      { $limit: 5 }
    ]).toArray();
    
    console.log('\n🏆 Top 5 usuarios por balance:');
    topUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - $${user.totalBalance || 0}`);
    });
    
    // Verificar integridad de datos
    console.log('\n🔍 VERIFICACIÓN DE INTEGRIDAD:');
    console.log('===============================');
    
    // Usuarios sin balances
    const usersWithoutBalances = await db.collection('users').countDocuments({
      balances: { $exists: false }
    });
    console.log(`⚠️ Usuarios sin estructura de balances: ${usersWithoutBalances}`);
    
    // Transacciones sin usuario
    const orphanTransactions = await db.collection('transactions').countDocuments({
      user: { $exists: false }
    });
    console.log(`⚠️ Transacciones huérfanas: ${orphanTransactions}`);
    
    // Comisiones sin usuario
    const orphanCommissions = await db.collection('commissions').countDocuments({
      userId: { $exists: false }
    });
    console.log(`⚠️ Comisiones huérfanas: ${orphanCommissions}`);
    
    console.log('\n✅ Verificación de finanzas admin completada');
    console.log('📊 Datos listos para el panel administrativo');
    console.log('🔗 Sistema conectado a MongoDB Atlas');
    
  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    await client.close();
  }
}

fixBalancesStructure();