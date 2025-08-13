const mongoose = require('mongoose');
require('dotenv').config();

// Importar el modelo de Wallet
const Wallet = require('./src/models/Wallet.model');

async function testWalletStats() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado exitosamente');

    // Ejecutar la misma agregación que el controlador
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

    const networkStats = await Wallet.aggregate([
      {
        $group: {
          _id: '$network',
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          totalBalance: { $sum: '$balance' }
        }
      }
    ]);

    // Estructura exacta que devuelve el controlador
    const result = {
      success: true,
      data: {
        general: stats[0] || {
          total: 0,
          active: 0,
          inactive: 0,
          inUse: 0,
          totalBalance: 0,
          totalReceived: 0,
          totalTransactions: 0
        },
        byNetwork: networkStats
      }
    };

    console.log('\n=== ESTRUCTURA DE RESPUESTA DEL ENDPOINT ===');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n=== DATOS PARA EL FRONTEND ===');
    const apiData = result.data;
    const generalStats = apiData.general;
    console.log('Total Wallets:', generalStats.total);
    console.log('Active Wallets:', generalStats.active);
    console.log('Inactive Wallets:', generalStats.inactive);
    console.log('Total Balance:', generalStats.totalBalance);
    
    await mongoose.disconnect();
    console.log('\nPrueba completada exitosamente');
    
  } catch (error) {
    console.error('Error en la prueba:', error);
    process.exit(1);
  }
}

testWalletStats();