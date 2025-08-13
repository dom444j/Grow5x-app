const axios = require('axios');
const mongoose = require('mongoose');
const Wallet = require('./src/models/Wallet.model');

// Cargar variables de entorno
require('dotenv').config();

async function testAdminWalletStats() {
  try {
    console.log('🔍 PRUEBA DEL ENDPOINT /admin/wallets/stats');
    console.log('=' .repeat(50));

    // 1. Conectar a MongoDB y verificar datos
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // Verificar datos directamente en BD
    const totalWallets = await Wallet.countDocuments();
    console.log(`📊 Total wallets en BD: ${totalWallets}`);

    // 2. Probar el endpoint local
    console.log('\n🌐 Probando endpoint local...');
    try {
      const response = await axios.get('http://localhost:3000/api/admin/wallets/stats', {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Status:', response.status);
      console.log('📊 Respuesta completa:');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Analizar la estructura de la respuesta
      if (response.data && response.data.data && response.data.data.general) {
        const general = response.data.data.general;
        console.log('\n📈 Análisis de la respuesta:');
        console.log(`- Total: ${general.total}`);
        console.log(`- Activas: ${general.active}`);
        console.log(`- Inactivas: ${general.inactive}`);
        console.log(`- En uso: ${general.inUse}`);
        console.log(`- Balance total: ${general.totalBalance}`);
        console.log(`- Total recibido: ${general.totalReceived}`);
        console.log(`- Total transacciones: ${general.totalTransactions}`);
      }
      
    } catch (error) {
      console.log('❌ Error en endpoint local:');
      console.log('Status:', error.response?.status);
      console.log('Message:', error.message);
      if (error.response?.data) {
        console.log('Data:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // 3. Simular la transformación del frontend
    console.log('\n🔄 Simulando transformación del frontend...');
    
    // Obtener datos como lo hace el controlador
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

    const backendResponse = {
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

    console.log('📊 Respuesta simulada del backend:');
    console.log(JSON.stringify(backendResponse, null, 2));

    // Simular transformación del frontend
    const apiData = backendResponse.data;
    const generalStats = apiData.general || {};
    const transformedStats = {
      totalWallets: generalStats.total || 0,
      activeWallets: generalStats.active || 0,
      inactiveWallets: generalStats.inactive || 0,
      totalBalance: generalStats.totalBalance || 0,
      totalReceived: generalStats.totalReceived || 0,
      totalTransactions: generalStats.totalTransactions || 0,
      byNetwork: apiData.byNetwork || []
    };

    console.log('\n🎨 Estadísticas transformadas para el frontend:');
    console.log(JSON.stringify(transformedStats, null, 2));

    // 4. Verificar qué debería mostrar el frontend
    console.log('\n📱 Lo que debería mostrar el frontend:');
    console.log(`- Total Billeteras: ${transformedStats.totalWallets}`);
    console.log(`- Billeteras Activas: ${transformedStats.activeWallets}`);
    console.log(`- Balance Total: ${transformedStats.totalBalance.toFixed(2)} US$`);
    console.log(`- Balance Promedio: ${transformedStats.totalWallets > 0 ? (transformedStats.totalBalance / transformedStats.totalWallets).toFixed(2) : '0.00'} US$`);

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Ejecutar la prueba
testAdminWalletStats().catch(console.error);