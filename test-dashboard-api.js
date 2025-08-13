const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

// Conectar a la base de datos
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Función para probar la API del dashboard
const testDashboardAPI = async () => {
  try {
    console.log('🔍 Probando API del dashboard...');
    
    // Hacer la petición directamente al controlador
    const User = require('./backend/src/models/User');
    const UserStatus = require('./backend/src/models/UserStatus');
    const Transaction = require('./backend/src/models/Transaction.model');
    const Wallet = require('./backend/src/models/Wallet.model');
    
    console.log('📊 Obteniendo estadísticas de usuarios...');
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
    
    console.log('👥 Estadísticas de usuarios:', userStats[0] || 'No hay datos');
    
    console.log('📈 Obteniendo estadísticas de transacciones...');
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
    
    console.log('💰 Estadísticas de transacciones:', transactionStats[0] || 'No hay datos');
    
    console.log('👛 Obteniendo estadísticas de wallets...');
    const walletStats = await Wallet.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBalance: { $sum: '$balance' }
        }
      }
    ]);
    
    console.log('💳 Estadísticas de wallets:', walletStats);
    
    // Contar documentos totales
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const totalWallets = await Wallet.countDocuments();
    const totalUserStatus = await UserStatus.countDocuments();
    
    console.log('\n📋 Resumen de la base de datos:');
    console.log(`- Total usuarios: ${totalUsers}`);
    console.log(`- Total transacciones: ${totalTransactions}`);
    console.log(`- Total wallets: ${totalWallets}`);
    console.log(`- Total user status: ${totalUserStatus}`);
    
  } catch (error) {
    console.error('❌ Error probando la API:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
};

// Ejecutar el test
const main = async () => {
  await connectDB();
  await testDashboardAPI();
};

main().catch(console.error);