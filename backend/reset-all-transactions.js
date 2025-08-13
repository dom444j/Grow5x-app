const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('./src/models/Transaction.model');
const User = require('./src/models/User');
const Wallet = require('./src/models/Wallet.model');
const Commission = require('./src/models/Commission.model');
const logger = require('./src/utils/logger');

/**
 * Script para reiniciar completamente todas las transacciones
 * Elimina todas las 973 transacciones y reinicia el sistema desde cero
 */
async function resetAllTransactions() {
  try {
    console.log('🔄 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    // 1. Verificar estado actual
    console.log('\n📊 ESTADO ACTUAL DEL SISTEMA');
    console.log('='.repeat(50));
    
    const currentTransactions = await Transaction.countDocuments({});
    const currentUsers = await User.countDocuments({});
    const currentWallets = await Wallet.countDocuments({});
    const currentCommissions = await Commission.countDocuments({});
    
    console.log(`📦 Transacciones actuales: ${currentTransactions}`);
    console.log(`👥 Usuarios actuales: ${currentUsers}`);
    console.log(`💰 Wallets actuales: ${currentWallets}`);
    console.log(`💸 Comisiones actuales: ${currentCommissions}`);

    // 2. Mostrar resumen de transacciones por tipo
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
      console.log('\n📈 Transacciones por tipo:');
      transactionsByType.forEach(type => {
        console.log(`   ${type._id}: ${type.count} transacciones, $${type.totalAmount} total`);
      });
    }

    // 3. Mostrar resumen de transacciones por estado
    const transactionsByStatus = await Transaction.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    if (transactionsByStatus.length > 0) {
      console.log('\n📊 Transacciones por estado:');
      transactionsByStatus.forEach(status => {
        console.log(`   ${status._id}: ${status.count} transacciones`);
      });
    }

    console.log('\n⚠️  ADVERTENCIA: Se eliminarán TODAS las transacciones');
    console.log('⚠️  Esta acción NO se puede deshacer');
    console.log('⚠️  Se mantendrán usuarios, wallets y estructura del sistema');
    
    // 4. Crear backup de información crítica antes de eliminar
    console.log('\n💾 Creando backup de información crítica...');
    const backupData = {
      timestamp: new Date().toISOString(),
      totalTransactions: currentTransactions,
      transactionsByType,
      transactionsByStatus,
      userCount: currentUsers,
      walletCount: currentWallets,
      commissionCount: currentCommissions
    };
    
    // Guardar backup en archivo
    const fs = require('fs');
    const backupPath = `./backups/transactions-backup-${Date.now()}.json`;
    
    // Crear directorio de backups si no existe
    if (!fs.existsSync('./backups')) {
      fs.mkdirSync('./backups', { recursive: true });
    }
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`💾 Backup guardado en: ${backupPath}`);

    // 5. ELIMINAR TODAS LAS TRANSACCIONES
    console.log('\n🗑️  ELIMINANDO TODAS LAS TRANSACCIONES...');
    console.log('='.repeat(50));
    
    const deleteResult = await Transaction.deleteMany({});
    console.log(`🗑️  Transacciones eliminadas: ${deleteResult.deletedCount}`);

    // 6. ELIMINAR TODAS LAS COMISIONES RELACIONADAS
    console.log('\n🗑️  ELIMINANDO TODAS LAS COMISIONES...');
    const deleteCommissionsResult = await Commission.deleteMany({});
    console.log(`🗑️  Comisiones eliminadas: ${deleteCommissionsResult.deletedCount}`);

    // 7. RESETEAR BALANCES DE USUARIOS A CERO
    console.log('\n💰 RESETEANDO BALANCES DE USUARIOS...');
    const resetUsersResult = await User.updateMany(
      {},
      {
        $set: {
          balance: 0,
          totalEarnings: 0,
          totalWithdrawals: 0,
          'balances.available': 0,
          'balances.pending': 0,
          'balances.frozen': 0
        }
      }
    );
    console.log(`💰 Usuarios reseteados: ${resetUsersResult.modifiedCount}`);

    // 8. RESETEAR BALANCES DE WALLETS A CERO
    console.log('\n💳 RESETEANDO BALANCES DE WALLETS...');
    const resetWalletsResult = await Wallet.updateMany(
      {},
      {
        $set: {
          balance: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          pendingBalance: 0
        }
      }
    );
    console.log(`💳 Wallets reseteadas: ${resetWalletsResult.modifiedCount}`);

    // 9. VERIFICACIÓN FINAL
    console.log('\n✅ VERIFICACIÓN FINAL');
    console.log('='.repeat(50));
    
    const finalTransactions = await Transaction.countDocuments({});
    const finalCommissions = await Commission.countDocuments({});
    const finalUsers = await User.countDocuments({});
    const finalWallets = await Wallet.countDocuments({});
    
    // Verificar que todos los balances están en cero
    const usersWithBalance = await User.countDocuments({ balance: { $gt: 0 } });
    const walletsWithBalance = await Wallet.countDocuments({ balance: { $gt: 0 } });
    
    console.log(`📦 Transacciones restantes: ${finalTransactions}`);
    console.log(`💸 Comisiones restantes: ${finalCommissions}`);
    console.log(`👥 Usuarios mantenidos: ${finalUsers}`);
    console.log(`💰 Wallets mantenidas: ${finalWallets}`);
    console.log(`⚠️  Usuarios con balance > 0: ${usersWithBalance}`);
    console.log(`⚠️  Wallets con balance > 0: ${walletsWithBalance}`);
    
    if (finalTransactions === 0 && finalCommissions === 0 && usersWithBalance === 0 && walletsWithBalance === 0) {
      console.log('\n🎉 REINICIO COMPLETADO EXITOSAMENTE');
      console.log('✅ Todas las transacciones han sido eliminadas');
      console.log('✅ Todas las comisiones han sido eliminadas');
      console.log('✅ Todos los balances han sido reseteados a $0');
      console.log('✅ La estructura de usuarios y wallets se mantiene intacta');
      console.log('✅ El sistema está listo para comenzar desde cero');
      
      // Crear reporte final
      const finalReport = {
        timestamp: new Date().toISOString(),
        action: 'COMPLETE_TRANSACTION_RESET',
        results: {
          transactionsDeleted: deleteResult.deletedCount,
          commissionsDeleted: deleteCommissionsResult.deletedCount,
          usersReset: resetUsersResult.modifiedCount,
          walletsReset: resetWalletsResult.modifiedCount,
          finalState: {
            transactions: finalTransactions,
            commissions: finalCommissions,
            users: finalUsers,
            wallets: finalWallets,
            usersWithBalance,
            walletsWithBalance
          }
        },
        backupFile: backupPath
      };
      
      const reportPath = `./backups/reset-report-${Date.now()}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
      console.log(`\n📋 Reporte final guardado en: ${reportPath}`);
      
    } else {
      console.log('\n❌ ADVERTENCIA: El reinicio no se completó correctamente');
      console.log('❌ Algunos registros no fueron eliminados o reseteados');
      console.log('❌ Revise los logs para más detalles');
    }

  } catch (error) {
    console.error('❌ Error durante el reinicio de transacciones:', error);
    logger.error('Error resetting all transactions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    console.log('🏁 Proceso completado');
  }
}

// Ejecutar el script
if (require.main === module) {
  resetAllTransactions();
}

module.exports = resetAllTransactions;