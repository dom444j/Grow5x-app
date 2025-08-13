require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const UserStatus = require('./src/models/UserStatus');
const Transaction = require('./src/models/Transaction.model');
const Wallet = require('./src/models/Wallet.model');
const AdminLog = require('./src/models/AdminLog.model');

async function testDashboardData() {
  try {
    console.log('🔄 Conectando a MongoDB Atlas...');
    console.log('URI:', process.env.MONGODB_URI ? 'Configurada' : 'NO CONFIGURADA');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    console.log('Base de datos:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);

    // Test 1: Verificar colecciones existentes
    console.log('\n📋 Verificando colecciones...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Colecciones encontradas:', collections.map(c => c.name));

    // Test 2: Contar documentos en cada colección
    console.log('\n📊 Contando documentos...');
    const userCount = await User.countDocuments();
    const userStatusCount = await UserStatus.countDocuments();
    const transactionCount = await Transaction.countDocuments();
    const walletCount = await Wallet.countDocuments();
    const adminLogCount = await AdminLog.countDocuments();
    
    console.log(`Users: ${userCount}`);
    console.log(`UserStatus: ${userStatusCount}`);
    console.log(`Transactions: ${transactionCount}`);
    console.log(`Wallets: ${walletCount}`);
    console.log(`AdminLogs: ${adminLogCount}`);

    // Test 3: Probar consulta de usuarios
    console.log('\n👥 Probando consulta de usuarios...');
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          verifiedUsers: {
            $sum: { $cond: [{ $eq: ['$verification.isVerified', true] }, 1, 0] }
          },
          totalBalance: { $sum: '$balance' },
          totalEarnings: { $sum: '$totalEarnings' }
        }
      }
    ]);
    console.log('User Stats:', JSON.stringify(userStats, null, 2));

    // Test 4: Probar consulta de UserStatus
    console.log('\n📈 Probando consulta de UserStatus...');
    const userStatusStats = await UserStatus.aggregate([
      {
        $group: {
          _id: null,
          usersWithActivePackages: {
            $sum: { $cond: [{ $eq: ['$subscription.packageStatus', 'active'] }, 1, 0] }
          },
          usersNeedingAttention: {
            $sum: { $cond: [{ $eq: ['$adminFlags.needsAttention', true] }, 1, 0] }
          },
          totalPendingWithdrawals: { $sum: '$financial.withdrawals.pendingAmount' },
          benefitsToProcess: {
            $sum: { $cond: [{ $eq: ['$shouldReceiveBenefitsToday', true] }, 1, 0] }
          }
        }
      }
    ]);
    console.log('UserStatus Stats:', JSON.stringify(userStatusStats, null, 2));

    // Test 5: Probar consulta de transacciones
    console.log('\n💰 Probando consulta de transacciones...');
    const transactionStats = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          completedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          totalVolume: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
          }
        }
      }
    ]);
    console.log('Transaction Stats:', JSON.stringify(transactionStats, null, 2));

    // Test 6: Mostrar algunos documentos de ejemplo
    console.log('\n🔍 Documentos de ejemplo...');
    const sampleUser = await User.findOne().lean();
    console.log('Sample User:', sampleUser ? 'Encontrado' : 'No encontrado');
    if (sampleUser) {
      console.log('User fields:', Object.keys(sampleUser));
    }

    const sampleUserStatus = await UserStatus.findOne().lean();
    console.log('Sample UserStatus:', sampleUserStatus ? 'Encontrado' : 'No encontrado');
    if (sampleUserStatus) {
      console.log('UserStatus fields:', Object.keys(sampleUserStatus));
    }

    const sampleTransaction = await Transaction.findOne().lean();
    console.log('Sample Transaction:', sampleTransaction ? 'Encontrado' : 'No encontrado');
    if (sampleTransaction) {
      console.log('Transaction fields:', Object.keys(sampleTransaction));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

testDashboardData();