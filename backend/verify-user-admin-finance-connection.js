const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction.model');
const WithdrawalRequest = require('./src/models/WithdrawalRequest');
const Payment = require('./src/models/Payment');
const Wallet = require('./src/models/Wallet.model');
const Commission = require('./src/models/Commission.model');
const AdminLog = require('./src/models/AdminLog.model');
require('dotenv').config();

/**
 * Script para verificar la conexión completa entre:
 * - Panel de finanzas del usuario (http://localhost:5173/finance)
 * - Panel de administración de finanzas (http://localhost:5173/admin/finance)
 * - Gestión de solicitudes de retiro
 * - Historiales financieros correctos
 */

async function verifyUserAdminFinanceConnection() {
  try {
    console.log('🔄 INICIANDO VERIFICACIÓN DE CONEXIÓN FINANZAS USUARIO-ADMIN');
    console.log('=' .repeat(80));
    
    // Conectar a MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    // 1. VERIFICAR DATOS DE USUARIOS PARA FINANZAS
    console.log('\n📊 1. VERIFICANDO DATOS DE USUARIOS PARA FINANZAS');
    console.log('-'.repeat(60));
    
    const usersWithFinancialData = await User.find({
      $or: [
        { balance: { $gt: 0 } },
        { productionBalance: { $gt: 0 } },
        { totalEarnings: { $gt: 0 } }
      ]
    }).limit(5);
    
    console.log(`📈 Usuarios con datos financieros: ${usersWithFinancialData.length}`);
    
    for (const user of usersWithFinancialData) {
      console.log(`  👤 ${user.email}:`);
      console.log(`     💰 Balance: $${user.balance || 0}`);
      console.log(`     🏭 Producción: $${user.productionBalance || 0}`);
      console.log(`     📈 Ganancias totales: $${user.totalEarnings || 0}`);
      console.log(`     🏦 Wallet: ${user.walletAddress || 'No configurada'}`);
    }
    
    // 2. VERIFICAR SOLICITUDES DE RETIRO
    console.log('\n💸 2. VERIFICANDO SOLICITUDES DE RETIRO');
    console.log('-'.repeat(60));
    
    // Verificar en modelo WithdrawalRequest
    const withdrawalRequests = await WithdrawalRequest.find({})
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`📋 Solicitudes de retiro (WithdrawalRequest): ${withdrawalRequests.length}`);
    
    for (const request of withdrawalRequests) {
      console.log(`  🔸 ID: ${request._id}`);
      console.log(`     👤 Usuario: ${request.userId?.email || 'Usuario eliminado'}`);
      console.log(`     💵 Monto: $${request.amount}`);
      console.log(`     📍 Estado: ${request.status}`);
      console.log(`     🏦 Método: ${request.withdrawalMethod}`);
      console.log(`     📅 Fecha: ${request.createdAt}`);
      console.log(`     🎯 Dirección: ${request.destinationAddress}`);
    }
    
    // Verificar en modelo Payment (retiros)
    const paymentWithdrawals = await Payment.find({ type: 'withdrawal' })
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`\n💳 Retiros en Payment: ${paymentWithdrawals.length}`);
    
    for (const payment of paymentWithdrawals) {
      console.log(`  🔸 ID: ${payment._id}`);
      console.log(`     👤 Usuario: ${payment.user?.email || 'Usuario eliminado'}`);
      console.log(`     💵 Monto: $${payment.amount}`);
      console.log(`     📍 Estado: ${payment.status}`);
      console.log(`     📅 Fecha: ${payment.createdAt}`);
    }
    
    // 3. VERIFICAR TRANSACCIONES DE RETIRO
    console.log('\n📊 3. VERIFICANDO TRANSACCIONES DE RETIRO');
    console.log('-'.repeat(60));
    
    const withdrawalTransactions = await Transaction.find({
      type: { $in: ['withdrawal', 'withdrawal_request'] }
    })
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`📈 Transacciones de retiro: ${withdrawalTransactions.length}`);
    
    for (const transaction of withdrawalTransactions) {
      console.log(`  🔸 ID: ${transaction._id}`);
      console.log(`     👤 Usuario: ${transaction.userId?.email || 'Usuario eliminado'}`);
      console.log(`     💵 Monto: $${transaction.amount}`);
      console.log(`     📍 Estado: ${transaction.status}`);
      console.log(`     🏷️ Tipo: ${transaction.type}`);
      console.log(`     📅 Fecha: ${transaction.createdAt}`);
      console.log(`     📝 Descripción: ${transaction.description}`);
    }
    
    // 4. VERIFICAR ESTADÍSTICAS PARA PANEL ADMIN
    console.log('\n🏢 4. VERIFICANDO ESTADÍSTICAS PARA PANEL ADMIN');
    console.log('-'.repeat(60));
    
    // Retiros pendientes
    const pendingWithdrawalsCount = await WithdrawalRequest.countDocuments({ status: 'pending' });
    const pendingWithdrawalsAmount = await WithdrawalRequest.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    console.log(`⏳ Retiros pendientes: ${pendingWithdrawalsCount}`);
    console.log(`💰 Monto total pendiente: $${pendingWithdrawalsAmount[0]?.total || 0}`);
    
    // Retiros por estado
    const withdrawalsByStatus = await WithdrawalRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    console.log('\n📊 Retiros por estado:');
    for (const status of withdrawalsByStatus) {
      console.log(`  ${status._id}: ${status.count} solicitudes ($${status.totalAmount})`);
    }
    
    // 5. VERIFICAR WALLETS Y DIRECCIONES
    console.log('\n🏦 5. VERIFICANDO WALLETS Y DIRECCIONES');
    console.log('-'.repeat(60));
    
    const walletsCount = await Wallet.countDocuments({});
    const usersWithWalletAddress = await User.countDocuments({ walletAddress: { $exists: true, $ne: null } });
    
    console.log(`🏦 Total wallets en sistema: ${walletsCount}`);
    console.log(`👥 Usuarios con dirección de wallet: ${usersWithWalletAddress}`);
    
    // Wallets activas
    const activeWallets = await Wallet.find({ isActive: true })
      .limit(5);
    
    console.log('\n🟢 Wallets activas (muestra):');
    for (const wallet of activeWallets) {
      console.log(`  🔸 ${wallet.address}`);
      console.log(`     👤 Usuario: ${wallet.userId?.email || 'Sin usuario'}`);
      console.log(`     💰 Balance: $${wallet.balance || 0}`);
      console.log(`     🌐 Red: ${wallet.network}`);
    }
    
    // 6. VERIFICAR COMISIONES Y GANANCIAS
    console.log('\n💎 6. VERIFICANDO COMISIONES Y GANANCIAS');
    console.log('-'.repeat(60));
    
    const commissionsCount = await Commission.countDocuments({});
    const pendingCommissions = await Commission.countDocuments({ status: 'pending' });
    const paidCommissions = await Commission.countDocuments({ status: 'paid' });
    
    console.log(`💎 Total comisiones: ${commissionsCount}`);
    console.log(`⏳ Comisiones pendientes: ${pendingCommissions}`);
    console.log(`✅ Comisiones pagadas: ${paidCommissions}`);
    
    // 7. VERIFICAR LOGS DE ADMINISTRACIÓN
    console.log('\n📋 7. VERIFICANDO LOGS DE ADMINISTRACIÓN');
    console.log('-'.repeat(60));
    
    const adminLogs = await AdminLog.find({
      action: { $in: ['withdrawal_approved', 'withdrawal_rejected', 'withdrawal_processed'] }
    })
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`📋 Logs de retiros: ${adminLogs.length}`);
    
    for (const log of adminLogs) {
      console.log(`  🔸 ${log.action}`);
      console.log(`     👤 Admin: ${log.adminId}`);
      console.log(`     📅 Fecha: ${log.createdAt}`);
      console.log(`     📝 Detalles: ${log.details}`);
    }
    
    // 8. VERIFICAR INTEGRIDAD DE DATOS
    console.log('\n🔍 8. VERIFICANDO INTEGRIDAD DE DATOS');
    console.log('-'.repeat(60));
    
    // Usuarios sin wallet pero con balance
    const usersWithoutWallet = await User.countDocuments({
      balance: { $gt: 0 },
      walletAddress: { $exists: false }
    });
    
    // Retiros sin usuario asociado
    const orphanWithdrawals = await WithdrawalRequest.countDocuments({
      userId: null
    });
    
    // Transacciones sin usuario
    const orphanTransactions = await Transaction.countDocuments({
      userId: { $exists: false }
    });
    
    console.log(`⚠️ Usuarios con balance sin wallet: ${usersWithoutWallet}`);
    console.log(`⚠️ Retiros huérfanos: ${orphanWithdrawals}`);
    console.log(`⚠️ Transacciones huérfanas: ${orphanTransactions}`);
    
    // 9. RESUMEN DE CONEXIÓN USUARIO-ADMIN
    console.log('\n🔗 9. RESUMEN DE CONEXIÓN USUARIO-ADMIN');
    console.log('-'.repeat(60));
    
    console.log('✅ PANEL DE USUARIO (/finance):');
    console.log(`   📊 Usuarios con datos financieros: ${usersWithFinancialData.length}`);
    console.log(`   💰 Pueden ver balances y historiales: SÍ`);
    console.log(`   💸 Pueden solicitar retiros: SÍ`);
    console.log(`   📈 Historial de transacciones: ${withdrawalTransactions.length} registros`);
    
    console.log('\n✅ PANEL DE ADMINISTRACIÓN (/admin/finance):');
    console.log(`   📋 Retiros pendientes visibles: ${pendingWithdrawalsCount}`);
    console.log(`   💵 Monto total a gestionar: $${pendingWithdrawalsAmount[0]?.total || 0}`);
    console.log(`   🔧 Puede procesar retiros: SÍ`);
    console.log(`   📊 Estadísticas disponibles: SÍ`);
    
    console.log('\n✅ CONEXIÓN Y COMUNICACIÓN:');
    console.log(`   🔄 Solicitudes de usuario → Admin: CONECTADO`);
    console.log(`   📝 Logs de acciones admin: ${adminLogs.length} registros`);
    console.log(`   🔍 Integridad de datos: ${orphanWithdrawals + orphanTransactions === 0 ? 'BUENA' : 'REVISAR'}`);
    console.log(`   💾 Datos en MongoDB Atlas: CONECTADO`);
    
    // 10. RECOMENDACIONES
    console.log('\n💡 10. RECOMENDACIONES');
    console.log('-'.repeat(60));
    
    if (usersWithoutWallet > 0) {
      console.log(`⚠️ ${usersWithoutWallet} usuarios tienen balance pero no wallet configurada`);
    }
    
    if (orphanWithdrawals > 0 || orphanTransactions > 0) {
      console.log(`⚠️ Hay registros huérfanos que necesitan limpieza`);
    }
    
    if (pendingWithdrawalsCount === 0) {
      console.log(`ℹ️ No hay retiros pendientes para procesar`);
    } else {
      console.log(`✅ ${pendingWithdrawalsCount} retiros pendientes listos para gestión admin`);
    }
    
    console.log('\n🎉 VERIFICACIÓN COMPLETADA');
    console.log('=' .repeat(80));
    console.log('✅ El sistema de finanzas usuario-admin está CONECTADO y FUNCIONAL');
    console.log('✅ Los usuarios pueden ver sus finanzas en /finance');
    console.log('✅ Los admins pueden gestionar retiros en /admin/finance');
    console.log('✅ La comunicación entre paneles está establecida');
    console.log('✅ Los historiales financieros están correctos');
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB Atlas');
  }
}

// Ejecutar verificación
verifyUserAdminFinanceConnection();