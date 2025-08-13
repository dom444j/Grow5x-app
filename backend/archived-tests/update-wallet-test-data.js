const mongoose = require('mongoose');
const Wallet = require('./src/models/Wallet.model');
const logger = require('./src/utils/logger');

// Configuración de MongoDB
const MONGODB_URI = 'mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority';

const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  w: 'majority'
};

async function updateWalletTestData() {
  try {
    console.log('🔄 Conectando a MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, mongoOptions);
    console.log('✅ Conexión exitosa a MongoDB Atlas');
    
    // Obtener las primeras 5 wallets
    console.log('\n🔍 Obteniendo wallets para actualizar...');
    const wallets = await Wallet.find().limit(5);
    
    if (wallets.length === 0) {
      console.log('❌ No se encontraron wallets para actualizar');
      return;
    }
    
    console.log(`📊 Actualizando ${wallets.length} wallets con datos de prueba...`);
    
    // Actualizar cada wallet con datos de prueba
    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      const testBalance = (i + 1) * 100.50; // 100.50, 201.00, 301.50, etc.
      const testReceived = testBalance * 2;
      const testTransactions = (i + 1) * 3;
      
      await Wallet.findByIdAndUpdate(wallet._id, {
        balance: testBalance,
        totalReceived: testReceived,
        transactionCount: testTransactions,
        lastChecked: new Date()
      });
      
      console.log(`✅ Wallet ${i + 1}: ${wallet.address.substring(0, 10)}... - Balance: ${testBalance} USDT`);
    }
    
    // Verificar las estadísticas después de la actualización
    console.log('\n📈 Verificando estadísticas actualizadas...');
    
    const stats = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          inactive: {
            $sum: {
              $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0]
            }
          },
          inUse: {
            $sum: {
              $cond: ['$isUsed', 1, 0]
            }
          },
          totalBalance: { $sum: '$balance' },
          totalReceived: { $sum: '$totalReceived' },
          totalTransactions: { $sum: '$transactionCount' }
        }
      }
    ]);
    
    console.log('📊 Estadísticas actualizadas:');
    const result = stats[0] || {};
    console.log(`- Total Billeteras: ${result.total || 0}`);
    console.log(`- Billeteras Activas: ${result.active || 0}`);
    console.log(`- Balance Total: ${result.totalBalance || 0} USDT`);
    console.log(`- Balance Promedio: ${result.total > 0 ? (result.totalBalance / result.active).toFixed(2) : 0} USDT`);
    console.log(`- Total Recibido: ${result.totalReceived || 0} USDT`);
    console.log(`- Total Transacciones: ${result.totalTransactions || 0}`);
    
    console.log('\n✅ Actualización completada exitosamente');
    console.log('\n🔄 Ahora puedes probar el frontend para ver si las estadísticas se muestran correctamente');
    
  } catch (error) {
    console.error('❌ Error durante la actualización:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar la actualización
updateWalletTestData();