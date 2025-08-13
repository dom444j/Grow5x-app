const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('../src/models/Transaction.model');
const logger = require('../src/utils/logger');

/**
 * Script para limpiar datos de prueba de transacciones
 * Elimina transacciones con userId undefined y otros datos de prueba
 */
async function cleanTransactionTestData() {
  try {
    console.log('🔄 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    // Buscar todas las transacciones
    const allTransactions = await Transaction.find({});
    console.log(`📊 Total de transacciones encontradas: ${allTransactions.length}`);

    // Identificar transacciones de prueba
    const testTransactions = allTransactions.filter(transaction => {
      return (
        !transaction.userId || // userId undefined o null
        transaction.userId === 'undefined' || // userId como string 'undefined'
        transaction.description?.includes('test') || // descripción con 'test'
        transaction.description?.includes('prueba') // descripción con 'prueba'
      );
    });

    console.log(`🧪 Transacciones de prueba identificadas: ${testTransactions.length}`);
    
    if (testTransactions.length === 0) {
      console.log('✅ No hay datos de prueba para limpiar');
      return;
    }

    // Mostrar detalles de las transacciones que se van a eliminar
    console.log('\n📋 Transacciones que se eliminarán:');
    testTransactions.forEach((transaction, index) => {
      console.log(`${index + 1}. ID: ${transaction._id}`);
      console.log(`   Tipo: ${transaction.type}`);
      console.log(`   Monto: $${transaction.amount}`);
      console.log(`   Usuario: ${transaction.userId || 'undefined'}`);
      console.log(`   Estado: ${transaction.status}`);
      console.log(`   Fecha: ${transaction.createdAt}`);
      console.log(`   Descripción: ${transaction.description || 'N/A'}`);
      console.log('---');
    });

    // Eliminar las transacciones de prueba
    const deleteResult = await Transaction.deleteMany({
      $or: [
        { userId: { $exists: false } },
        { userId: null },
        { userId: 'undefined' },
        { description: { $regex: /test/i } },
        { description: { $regex: /prueba/i } }
      ]
    });

    console.log(`\n🗑️  Transacciones eliminadas: ${deleteResult.deletedCount}`);
    
    // Verificar que se eliminaron correctamente
    const remainingTestTransactions = await Transaction.find({
      $or: [
        { userId: { $exists: false } },
        { userId: null },
        { userId: 'undefined' },
        { description: { $regex: /test/i } },
        { description: { $regex: /prueba/i } }
      ]
    });

    if (remainingTestTransactions.length === 0) {
      console.log('✅ Todos los datos de prueba han sido eliminados correctamente');
    } else {
      console.log(`⚠️  Aún quedan ${remainingTestTransactions.length} transacciones de prueba`);
    }

    // Mostrar estado final
    const totalTransactions = await Transaction.countDocuments({});
    console.log(`\n📊 Total de transacciones restantes en la base de datos: ${totalTransactions}`);

    // Mostrar resumen por tipo de las transacciones restantes
    const transactionsByType = await Transaction.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    if (transactionsByType.length > 0) {
      console.log('\n📈 Resumen de transacciones restantes por tipo:');
      transactionsByType.forEach(type => {
        console.log(`   ${type._id}: ${type.count} transacciones, $${type.totalAmount} total`);
      });
    }

  } catch (error) {
    console.error('❌ Error al limpiar datos de prueba:', error);
    logger.error('Error cleaning transaction test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
if (require.main === module) {
  cleanTransactionTestData()
    .then(() => {
      console.log('\n🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = cleanTransactionTestData;