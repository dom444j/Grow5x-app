const mongoose = require('mongoose');
const Wallet = require('./src/models/Wallet.model');
const logger = require('./src/utils/logger');

// Cargar variables de entorno
require('dotenv').config();

// Configuración de MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority';

async function resetWalletsForDelivery() {
  try {
    console.log('🔄 Conectando a MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB Atlas');

    // Contar wallets antes del reset
    const totalWallets = await Wallet.countDocuments();
    console.log(`📊 Total de wallets encontradas: ${totalWallets}`);

    if (totalWallets === 0) {
      console.log('⚠️  No hay wallets para resetear');
      return;
    }

    // Resetear todos los balances a 0
    console.log('🔄 Reseteando balances de todas las wallets...');
    const resetResult = await Wallet.updateMany(
      {}, // Actualizar todas las wallets
      {
        $set: {
          balance: 0,
          totalReceived: 0,
          transactionCount: 0,
          lastTransactionDate: null
        }
      }
    );

    console.log(`✅ Wallets actualizadas: ${resetResult.modifiedCount}`);

    // Verificar el reset
    console.log('\n🔍 Verificando estadísticas después del reset...');
    const stats = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          totalWallets: { $sum: 1 },
          totalBalance: { $sum: '$balance' },
          totalReceived: { $sum: '$totalReceived' },
          totalTransactions: { $sum: '$transactionCount' },
          activeWallets: {
            $sum: {
              $cond: [{ $gt: ['$balance', 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    if (stats.length > 0) {
      const stat = stats[0];
      console.log('📈 Estadísticas después del reset:');
      console.log(`   Total Billeteras: ${stat.totalWallets}`);
      console.log(`   Billeteras Activas: ${stat.activeWallets}`);
      console.log(`   Balance Total: ${stat.totalBalance} USDT`);
      console.log(`   Total Recibido: ${stat.totalReceived} USDT`);
      console.log(`   Total Transacciones: ${stat.totalTransactions}`);
    }

    // Mostrar algunas wallets de ejemplo
    console.log('\n📋 Primeras 5 wallets después del reset:');
    const sampleWallets = await Wallet.find({}).limit(5).select('address network balance totalReceived transactionCount');
    sampleWallets.forEach((wallet, index) => {
      console.log(`   ${index + 1}. ${wallet.address} (${wallet.network}) - Balance: ${wallet.balance} USDT`);
    });

    console.log('\n✅ Reset completado exitosamente para entrega final');
    console.log('📦 Las wallets están listas para producción con balances en 0');

  } catch (error) {
    console.error('❌ Error durante el reset:', error);
    logger.error('Error en reset de wallets:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
resetWalletsForDelivery().catch(console.error);