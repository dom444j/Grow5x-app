const mongoose = require('mongoose');
const User = require('./src/models/User');
const UserStatus = require('./src/models/UserStatus');
const Transaction = require('./src/models/Transaction.model');
const Wallet = require('./src/models/Wallet.model');
const AdminLog = require('./src/models/AdminLog.model');
require('dotenv').config();

async function testDashboardQueries() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Test User Stats
    console.log('\n📊 Probando consulta de usuarios...');
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

    // Test UserStatus Stats
    console.log('\n📊 Probando consulta de UserStatus...');
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

    // Test Transaction Stats
    console.log('\n📊 Probando consulta de transacciones...');
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

    // Test Wallet Stats
    console.log('\n📊 Probando consulta de wallets...');
    const walletStats = await Wallet.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBalance: { $sum: '$balance' }
        }
      }
    ]);
    console.log('Wallet Stats:', JSON.stringify(walletStats, null, 2));

    // Test Recent Activity
    console.log('\n📊 Probando consulta de actividad reciente...');
    const recentActivity = await AdminLog.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .select('action description timestamp admin')
      .populate('admin', 'fullName email');
    console.log('Recent Activity:', JSON.stringify(recentActivity, null, 2));

    console.log('\n✅ Todas las consultas completadas exitosamente');

  } catch (error) {
    console.error('❌ Error en las consultas:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

testDashboardQueries();