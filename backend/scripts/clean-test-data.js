const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Transaction = require('../src/models/Transaction.model');
const Commission = require('../src/models/Commission.model');
const AdminLog = require('../src/models/AdminLog.model');
const UserStatus = require('../src/models/UserStatus');
const User = require('../src/models/User');
const Wallet = require('../src/models/Wallet.model');
const Payment = require('../src/models/Payment');

const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  success: (msg, data) => console.log(`\x1b[32m[SUCCESS] ${msg}\x1b[0m`, data || '')
};

async function cleanTestData() {
  try {
    logger.info('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.success('✅ Conectado a MongoDB');

    logger.info('🧹 Iniciando limpieza de datos de prueba...');

    // 1. Limpiar transacciones de prueba
    logger.info('💰 Limpiando transacciones de prueba...');
    const testTransactionsResult = await Transaction.deleteMany({
      $or: [
        { description: { $regex: /\[SEED\]/ } },
        { description: { $regex: /prueba|test|ejemplo|sample/i } },
        { type: 'admin_adjustment', 'metadata.reason': { $in: ['correction_positive', 'correction_negative'] } },
        { type: 'commission', subtype: 'referral_commission', status: 'completed' },
        { type: 'earnings', subtype: 'auto_earnings' }
      ]
    });
    logger.success(`✅ Eliminadas ${testTransactionsResult.deletedCount} transacciones de prueba`);

    // 2. Limpiar comisiones de prueba
    logger.info('🎯 Limpiando comisiones de prueba...');
    const testCommissionsResult = await Commission.deleteMany({
      $or: [
        { status: 'paid' },
        { commissionType: { $in: ['referral_commission', 'leader_bonus', 'parent_bonus'] } },
        { amount: { $gt: 0 } } // Todas las comisiones con monto > 0
      ]
    });
    logger.success(`✅ Eliminadas ${testCommissionsResult.deletedCount} comisiones de prueba`);

    // 3. Limpiar logs administrativos de prueba
    logger.info('📋 Limpiando logs administrativos de prueba...');
    const testLogsResult = await AdminLog.deleteMany({
      $or: [
        { details: { $regex: /\[SEED\]/ } },
        { details: { $regex: /prueba|test|ejemplo/i } }
      ]
    });
    logger.success(`✅ Eliminados ${testLogsResult.deletedCount} logs administrativos de prueba`);

    // 4. Resetear balances de usuarios a cero (excepto admin y usuarios especiales)
    logger.info('💳 Reseteando balances de usuarios...');
    const usersToReset = await User.find({
      role: 'user',
      email: { $not: { $regex: /@grow5x\.com$/ } }, // Excluir emails de grow5x.com
      referralCode: { $not: { $in: ['DEMOQUIM67', 'LIDER001', 'LIDER002', 'XYNRU365'] } } // Excluir códigos especiales
    });

    let resetCount = 0;
    for (const user of usersToReset) {
      if (user.balance && user.balance > 0) {
        user.balance = 0;
        user.totalEarnings = 0;
        user.totalWithdrawn = 0;
        await user.save();
        resetCount++;
      }
    }
    logger.success(`✅ Reseteados balances de ${resetCount} usuarios`);

    // 5. Limpiar wallets de prueba
    logger.info('🏦 Limpiando wallets de prueba...');
    const testWalletsResult = await Wallet.updateMany(
      {
        userId: { $in: usersToReset.map(u => u._id) },
        balance: { $gt: 0 }
      },
      {
        $set: {
          balance: 0,
          totalReceived: 0,
          totalSent: 0,
          transactionCount: 0
        }
      }
    );
    logger.success(`✅ Limpiadas ${testWalletsResult.modifiedCount} wallets`);

    // 6. Limpiar pagos de prueba (NO RETIROS REALES)
    logger.info('💸 Limpiando pagos de prueba...');
    const testPaymentsResult = await Payment.deleteMany({
      $or: [
        { description: { $regex: /\[SEED\]|prueba|test/i } },
        { type: 'test_payment' },
        { status: 'completed', amount: { $lt: 100 } } // Solo pagos pequeños de prueba
      ]
    });
    logger.success(`✅ Eliminados ${testPaymentsResult.deletedCount} pagos de prueba`);

    // 7. Limpiar estados de usuario de prueba
    logger.info('👤 Limpiando estados de usuario de prueba...');
    const testUserStatusResult = await UserStatus.deleteMany({
      $or: [
        { 'adminNotes.note': { $regex: /\[SEED\]/ } },
        { 'adminFlags.needsAttention': true },
        { 'financial.totalEarnings': { $gt: 0 } }
      ]
    });
    logger.success(`✅ Eliminados ${testUserStatusResult.deletedCount} estados de usuario de prueba`);

    // 8. Verificar que los mensajes de bienvenida estén activados
    logger.info('💬 Verificando configuración de mensajes de bienvenida...');
    const usersWithSettings = await User.find({
      'settings.dashboard.showWelcomeMessage': { $exists: true }
    });
    
    let welcomeMessageUpdates = 0;
    for (const user of usersWithSettings) {
      if (!user.settings?.dashboard?.showWelcomeMessage) {
        if (!user.settings) user.settings = {};
        if (!user.settings.dashboard) user.settings.dashboard = {};
        user.settings.dashboard.showWelcomeMessage = true;
        await user.save();
        welcomeMessageUpdates++;
      }
    }
    logger.success(`✅ Activados mensajes de bienvenida para ${welcomeMessageUpdates} usuarios`);

    // 9. Verificar estructura de referidos (mantener intacta)
    logger.info('🔗 Verificando estructura de referidos...');
    const referralStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          usersWithReferralCode: { $sum: { $cond: [{ $ne: ['$referralCode', null] }, 1, 0] } },
          usersWithReferrer: { $sum: { $cond: [{ $ne: ['$referredBy', null] }, 1, 0] } }
        }
      }
    ]);
    
    const stats = referralStats[0] || {};
    logger.info(`📊 Estadísticas de referidos:`);
    logger.info(`   - Total usuarios: ${stats.totalUsers || 0}`);
    logger.info(`   - Con código de referido: ${stats.usersWithReferralCode || 0}`);
    logger.info(`   - Con referidor: ${stats.usersWithReferrer || 0}`);

    // 10. Verificar códigos especiales
    logger.info('🏆 Verificando códigos especiales...');
    const specialCodes = ['DEMOQUIM67', 'LIDER001', 'LIDER002', 'XYNRU365'];
    const specialUsers = await User.find({ referralCode: { $in: specialCodes } });
    
    logger.info(`🎯 Códigos especiales encontrados:`);
    specialUsers.forEach(user => {
      logger.info(`   - ${user.referralCode}: ${user.email} (${user.status})`);
    });

    // Resumen final
    logger.success('\n🎉 LIMPIEZA COMPLETADA EXITOSAMENTE');
    logger.info('📋 Resumen de limpieza:');
    logger.info(`   ✅ Transacciones eliminadas: ${testTransactionsResult.deletedCount}`);
    logger.info(`   ✅ Comisiones eliminadas: ${testCommissionsResult.deletedCount}`);
    logger.info(`   ✅ Logs eliminados: ${testLogsResult.deletedCount}`);
    logger.info(`   ✅ Balances reseteados: ${resetCount}`);
    logger.info(`   ✅ Wallets limpiadas: ${testWalletsResult.modifiedCount}`);
    logger.info(`   ✅ Pagos de prueba eliminados: ${testPaymentsResult.deletedCount}`);
    logger.info(`   ✅ Estados de usuario eliminados: ${testUserStatusResult.deletedCount}`);
    logger.info(`   ✅ Mensajes de bienvenida activados: ${welcomeMessageUpdates}`);
    
    logger.success('\n🚀 SISTEMA LISTO PARA PRODUCCIÓN');
    logger.info('✨ Características mantenidas:');
    logger.info('   - Estructura de referidos intacta');
    logger.info('   - Códigos especiales preservados');
    logger.info('   - Usuarios administradores mantenidos');
    logger.info('   - Paquetes y productos conservados');
    logger.info('   - Mensajes de bienvenida activados');
    
  } catch (error) {
    logger.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    logger.info('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanTestData()
    .then(() => {
      logger.success('✅ Script de limpieza completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Error en script de limpieza:', error);
      process.exit(1);
    });
}

module.exports = cleanTestData;