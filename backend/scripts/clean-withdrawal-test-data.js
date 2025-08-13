const mongoose = require('mongoose');
require('dotenv').config();
const WithdrawalRequest = require('../src/models/WithdrawalRequest');
const logger = require('../src/utils/logger');

/**
 * Script para limpiar datos de prueba de retiros
 * Elimina retiros de $500 con estado 'cancelled' que son datos de prueba
 */
async function cleanWithdrawalTestData() {
  try {
    console.log('🔄 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    // Buscar retiros de prueba (monto $500 y estado cancelled)
    const testWithdrawals = await WithdrawalRequest.find({
      amount: 500,
      status: 'cancelled'
    });

    console.log(`📊 Retiros de prueba encontrados: ${testWithdrawals.length}`);
    
    if (testWithdrawals.length === 0) {
      console.log('✅ No hay datos de prueba para limpiar');
      return;
    }

    // Mostrar detalles de los retiros que se van a eliminar
    console.log('\n📋 Retiros que se eliminarán:');
    testWithdrawals.forEach((withdrawal, index) => {
      console.log(`${index + 1}. ID: ${withdrawal._id}`);
      console.log(`   Monto: $${withdrawal.amount}`);
      console.log(`   Estado: ${withdrawal.status}`);
      console.log(`   Fecha: ${withdrawal.createdAt}`);
      console.log(`   Usuario: ${withdrawal.userId}`);
      console.log('---');
    });

    // Eliminar los retiros de prueba
    const deleteResult = await WithdrawalRequest.deleteMany({
      amount: 500,
      status: 'cancelled'
    });

    console.log(`\n🗑️  Retiros eliminados: ${deleteResult.deletedCount}`);
    
    // Verificar que se eliminaron correctamente
    const remainingTestWithdrawals = await WithdrawalRequest.find({
      amount: 500,
      status: 'cancelled'
    });

    if (remainingTestWithdrawals.length === 0) {
      console.log('✅ Todos los datos de prueba han sido eliminados correctamente');
    } else {
      console.log(`⚠️  Aún quedan ${remainingTestWithdrawals.length} retiros de prueba`);
    }

    // Mostrar estado final
    const totalWithdrawals = await WithdrawalRequest.countDocuments({});
    console.log(`\n📊 Total de retiros restantes en la base de datos: ${totalWithdrawals}`);

  } catch (error) {
    console.error('❌ Error al limpiar datos de prueba:', error);
    logger.error('Error cleaning withdrawal test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
if (require.main === module) {
  cleanWithdrawalTestData()
    .then(() => {
      console.log('\n🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = cleanWithdrawalTestData;