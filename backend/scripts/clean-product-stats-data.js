const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('../src/models/Transaction.model');
const Package = require('../src/models/Package.model');
const logger = require('../src/utils/logger');

/**
 * Script para limpiar datos de prueba de estadísticas de productos/paquetes
 * Resetea ventas totales e ingresos totales a cero
 */
async function cleanProductStatsData() {
  try {
    console.log('🔄 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    // Verificar estadísticas actuales
    console.log('\n📊 Verificando estadísticas actuales...');
    
    // Buscar transacciones de compra de licencias completadas
    const licenseTransactions = await Transaction.find({
      type: 'deposit',
      subtype: 'license_purchase',
      status: 'completed'
    });

    console.log(`📦 Transacciones de compra de licencias encontradas: ${licenseTransactions.length}`);
    
    if (licenseTransactions.length > 0) {
      console.log('\n📋 Transacciones que se eliminarán:');
      licenseTransactions.forEach((transaction, index) => {
        console.log(`${index + 1}. ID: ${transaction._id}`);
        console.log(`   Tipo: ${transaction.type}`);
        console.log(`   Subtipo: ${transaction.subtype}`);
        console.log(`   Monto: $${transaction.amount}`);
        console.log(`   Usuario: ${transaction.userId}`);
        console.log(`   Estado: ${transaction.status}`);
        console.log(`   Fecha: ${transaction.createdAt}`);
        console.log(`   Package ID: ${transaction.metadata?.packageId || 'N/A'}`);
        console.log('---');
      });

      // Calcular estadísticas actuales
      const currentStats = await Transaction.aggregate([
        {
          $match: {
            type: 'deposit',
            subtype: 'license_purchase',
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalRevenue: { $sum: '$amount' }
          }
        }
      ]);

      if (currentStats.length > 0) {
        console.log(`\n📈 Estadísticas actuales:`);
        console.log(`   Ventas Totales: ${currentStats[0].totalSales}`);
        console.log(`   Ingresos Totales: $${currentStats[0].totalRevenue.toLocaleString()}`);
      }

      // Eliminar transacciones de compra de licencias
      const deleteResult = await Transaction.deleteMany({
        type: 'deposit',
        subtype: 'license_purchase',
        status: 'completed'
      });

      console.log(`\n🗑️  Transacciones de compra de licencias eliminadas: ${deleteResult.deletedCount}`);
    } else {
      console.log('✅ No hay transacciones de compra de licencias para eliminar');
    }

    // Resetear salesCount en todos los paquetes
    console.log('\n🔄 Reseteando salesCount en paquetes...');
    const packageUpdateResult = await Package.updateMany(
      {},
      { 
        $set: { 
          salesCount: 0,
          'metadata.totalSales': 0
        }
      }
    );
    
    console.log(`📦 Paquetes actualizados: ${packageUpdateResult.modifiedCount}`);

    // Verificar estado final
    const finalStats = await Transaction.aggregate([
      {
        $match: {
          type: 'deposit',
          subtype: 'license_purchase',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$amount' }
        }
      }
    ]);

    console.log('\n📊 Estado final:');
    if (finalStats.length === 0) {
      console.log('   Ventas Totales: 0');
      console.log('   Ingresos Totales: $0');
      console.log('✅ Todas las estadísticas han sido reseteadas correctamente');
    } else {
      console.log(`   Ventas Totales: ${finalStats[0].totalSales}`);
      console.log(`   Ingresos Totales: $${finalStats[0].totalRevenue.toLocaleString()}`);
      console.log('⚠️  Aún quedan algunas estadísticas');
    }

    // Mostrar resumen de paquetes
    const totalPackages = await Package.countDocuments();
    const activePackages = await Package.countDocuments({ status: 'active' });
    
    console.log('\n📦 Resumen de paquetes:');
    console.log(`   Total de paquetes: ${totalPackages}`);
    console.log(`   Paquetes activos: ${activePackages}`);
    console.log(`   Todos los paquetes tienen salesCount: 0`);

  } catch (error) {
    console.error('❌ Error al limpiar estadísticas de productos:', error);
    logger.error('Error cleaning product stats data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
if (require.main === module) {
  cleanProductStatsData()
    .then(() => {
      console.log('\n🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = cleanProductStatsData;