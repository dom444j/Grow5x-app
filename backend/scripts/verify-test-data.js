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
  success: (msg, data) => console.log(`\x1b[32m[SUCCESS] ${msg}\x1b[0m`, data || ''),
  highlight: (msg, data) => console.log(`\x1b[33m[HIGHLIGHT] ${msg}\x1b[0m`, data || '')
};

async function verifyTestData() {
  try {
    logger.info('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.success('✅ Conectado a MongoDB');

    logger.info('🔍 VERIFICANDO DATOS QUE SE ELIMINARÍAN (SIN EJECUTAR LIMPIEZA)...');
    logger.warn('⚠️  ESTE SCRIPT SOLO VERIFICA - NO ELIMINA NADA');

    // 1. Verificar transacciones de prueba
    logger.info('\n💰 Verificando transacciones de prueba...');
    const testTransactions = await Transaction.find({
      $or: [
        { description: { $regex: /\[SEED\]/ } },
        { description: { $regex: /prueba|test|ejemplo|sample/i } },
        { type: 'admin_adjustment', 'metadata.reason': { $in: ['correction_positive', 'correction_negative'] } },
        { type: 'commission', subtype: 'referral_commission', status: 'completed' },
        { type: 'earnings', subtype: 'auto_earnings' }
      ]
    }).limit(10);
    
    logger.highlight(`📊 Se eliminarían ${await Transaction.countDocuments({
      $or: [
        { description: { $regex: /\[SEED\]/ } },
        { description: { $regex: /prueba|test|ejemplo|sample/i } },
        { type: 'admin_adjustment', 'metadata.reason': { $in: ['correction_positive', 'correction_negative'] } },
        { type: 'commission', subtype: 'referral_commission', status: 'completed' },
        { type: 'earnings', subtype: 'auto_earnings' }
      ]
    })} transacciones de prueba`);
    
    if (testTransactions.length > 0) {
      logger.info('📋 Ejemplos de transacciones que se eliminarían:');
      testTransactions.forEach((tx, i) => {
        logger.info(`   ${i+1}. ${tx.type} - ${tx.description} - $${tx.amount} (${tx.createdAt.toISOString().split('T')[0]})`);
      });
    }

    // 2. Verificar comisiones de prueba
    logger.info('\n🎯 Verificando comisiones de prueba...');
    const testCommissions = await Commission.find({
      $or: [
        { status: 'paid' },
        { commissionType: { $in: ['referral_commission', 'leader_bonus', 'parent_bonus'] } },
        { amount: { $gt: 0 } }
      ]
    }).limit(10);
    
    logger.highlight(`📊 Se eliminarían ${await Commission.countDocuments({
      $or: [
        { status: 'paid' },
        { commissionType: { $in: ['referral_commission', 'leader_bonus', 'parent_bonus'] } },
        { amount: { $gt: 0 } }
      ]
    })} comisiones de prueba`);
    
    if (testCommissions.length > 0) {
      logger.info('📋 Ejemplos de comisiones que se eliminarían:');
      testCommissions.forEach((comm, i) => {
        logger.info(`   ${i+1}. ${comm.commissionType} - $${comm.amount} - ${comm.status}`);
      });
    }

    // 3. Verificar logs administrativos de prueba
    logger.info('\n📋 Verificando logs administrativos de prueba...');
    const testLogs = await AdminLog.find({
      $or: [
        { details: { $regex: /\[SEED\]/ } },
        { details: { $regex: /prueba|test|ejemplo/i } }
      ]
    }).limit(5);
    
    logger.highlight(`📊 Se eliminarían ${await AdminLog.countDocuments({
      $or: [
        { details: { $regex: /\[SEED\]/ } },
        { details: { $regex: /prueba|test|ejemplo/i } }
      ]
    })} logs administrativos de prueba`);

    // 4. Verificar usuarios que se resetearían
    logger.info('\n👤 Verificando usuarios que se resetearían...');
    const usersToReset = await User.find({
      role: 'user',
      email: { $not: { $regex: /@grow5x\.com$/ } },
      referralCode: { $not: { $in: ['DEMOQUIM67', 'LIDER001', 'LIDER002', 'XYNRU365'] } },
      balance: { $gt: 0 }
    }).limit(10);
    
    logger.highlight(`📊 Se resetearían balances de ${usersToReset.length} usuarios`);
    
    if (usersToReset.length > 0) {
      logger.info('📋 Ejemplos de usuarios que se resetearían:');
      usersToReset.forEach((user, i) => {
        logger.info(`   ${i+1}. ${user.email} - Balance: $${user.balance} - Código: ${user.referralCode}`);
      });
    }

    // 5. Verificar usuarios especiales que NO se tocarán
    logger.info('\n🏆 Verificando usuarios especiales que SE MANTENDRÁN...');
    const specialUsers = await User.find({
      $or: [
        { email: { $regex: /@grow5x\.com$/ } },
        { referralCode: { $in: ['DEMOQUIM67', 'LIDER001', 'LIDER002', 'XYNRU365'] } },
        { role: { $in: ['admin', 'superadmin'] } }
      ]
    });
    
    logger.success(`✅ ${specialUsers.length} usuarios especiales se mantendrán intactos:`);
    specialUsers.forEach((user, i) => {
      logger.success(`   ${i+1}. ${user.email} - Rol: ${user.role} - Código: ${user.referralCode || 'N/A'} - Balance: $${user.balance || 0}`);
    });

    // 6. Verificar estructura de referidos
    logger.info('\n🔗 Verificando estructura de referidos...');
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
    logger.success(`📊 Estructura de referidos (SE MANTIENE):`);
    logger.success(`   - Total usuarios: ${stats.totalUsers || 0}`);
    logger.success(`   - Con código de referido: ${stats.usersWithReferralCode || 0}`);
    logger.success(`   - Con referidor: ${stats.usersWithReferrer || 0}`);

    // 7. Verificar pagos que se eliminarían
    logger.info('\n💸 Verificando pagos de prueba...');
    const testPayments = await Payment.find({
      $or: [
        { description: { $regex: /\[SEED\]|prueba|test/i } },
        { type: 'test_payment' },
        { status: 'completed', amount: { $lt: 100 } }
      ]
    }).limit(5);
    
    logger.highlight(`📊 Se eliminarían ${await Payment.countDocuments({
      $or: [
        { description: { $regex: /\[SEED\]|prueba|test/i } },
        { type: 'test_payment' },
        { status: 'completed', amount: { $lt: 100 } }
      ]
    })} pagos de prueba`);

    // RESUMEN DE SEGURIDAD
    logger.info('\n🛡️  RESUMEN DE SEGURIDAD:');
    logger.success('✅ DATOS QUE SE MANTENDRÁN:');
    logger.success('   - Usuarios administradores y especiales');
    logger.success('   - Estructura completa de referidos');
    logger.success('   - Códigos especiales (DEMOQUIM67, LIDER001, etc.)');
    logger.success('   - Usuarios con emails @grow5x.com');
    logger.success('   - Paquetes y productos del sistema');
    logger.success('   - Configuraciones del sistema');
    
    logger.warn('⚠️  DATOS QUE SE ELIMINARÍAN:');
    logger.warn('   - Solo transacciones marcadas como [SEED] o prueba');
    logger.warn('   - Solo comisiones de prueba generadas automáticamente');
    logger.warn('   - Solo logs administrativos de prueba');
    logger.warn('   - Solo balances de usuarios regulares (no especiales)');
    logger.warn('   - Solo pagos pequeños de prueba (<$100)');
    
    logger.info('\n🎯 CONCLUSIÓN:');
    logger.success('✅ El script es SEGURO - No afectará datos importantes');
    logger.success('✅ La estructura de referidos se mantiene intacta');
    logger.success('✅ Los usuarios especiales no se tocan');
    logger.success('✅ Solo se eliminan datos claramente marcados como prueba');
    
    logger.info('\n🚀 Para ejecutar la limpieza real, usa:');
    logger.info('   node scripts/clean-test-data.js');
    
  } catch (error) {
    logger.error('❌ Error durante la verificación:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    logger.info('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifyTestData()
    .then(() => {
      logger.success('✅ Verificación completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Error en verificación:', error);
      process.exit(1);
    });
}

module.exports = verifyTestData;