require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User.js');
const UserStatus = require('../src/models/UserStatus.js');
const Transaction = require('../src/models/Transaction.model.js');
const Wallet = require('../src/models/Wallet.model.js');
const Commission = require('../src/models/Commission.model.js');
const WithdrawalRequest = require('../src/models/WithdrawalRequest.js');

/**
 * 🔍 VERIFICACIÓN POST-RESETEO FINANCIERO
 * 
 * Este script verifica que el reseteo financiero se haya completado correctamente:
 * - Confirma que todos los montos están en $0
 * - Verifica que la estructura de usuarios se mantiene
 * - Muestra el estado actual del sistema
 */

async function verifyFinancialReset() {
  try {
    console.log('🔍 VERIFICANDO ESTADO POST-RESETEO FINANCIERO');
    console.log('=' .repeat(60));
    
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    // 1. Verificar estructura de usuarios (debe mantenerse)
    console.log('\n👥 VERIFICANDO ESTRUCTURA DE USUARIOS');
    console.log('-'.repeat(50));
    
    const userStats = {
      total: await User.countDocuments(),
      active: await User.countDocuments({ status: 'active' }),
      verified: await User.countDocuments({ 'verification.isVerified': true }),
      admin: await User.countDocuments({ role: 'admin' }),
      withReferralCode: await User.countDocuments({ referralCode: { $exists: true, $ne: null } })
    };
    
    console.log('📊 Usuarios:');
    Object.entries(userStats).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    // 2. Verificar que montos están en $0
    console.log('\n💰 VERIFICANDO MONTOS FINANCIEROS (DEBEN SER $0)');
    console.log('-'.repeat(50));
    
    // Verificar wallets
    const walletCheck = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$balance' },
          totalEarnings: { $sum: '$totalEarnings' },
          totalWithdrawn: { $sum: '$totalWithdrawn' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const walletStats = walletCheck[0] || { totalBalance: 0, totalEarnings: 0, totalWithdrawn: 0, count: 0 };
    console.log('💳 Wallets:');
    console.log(`   Total: ${walletStats.count}`);
    console.log(`   Balance total: $${walletStats.totalBalance} ${walletStats.totalBalance === 0 ? '✅' : '❌'}`);
    console.log(`   Ganancias totales: $${walletStats.totalEarnings} ${walletStats.totalEarnings === 0 ? '✅' : '❌'}`);
    console.log(`   Retirado total: $${walletStats.totalWithdrawn} ${walletStats.totalWithdrawn === 0 ? '✅' : '❌'}`);
    
    // Verificar transacciones
    const transactionCheck = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const transactionStats = transactionCheck[0] || { totalAmount: 0, count: 0 };
    console.log('\n💸 Transacciones:');
    console.log(`   Total: ${transactionStats.count}`);
    console.log(`   Monto total: $${transactionStats.totalAmount} ${transactionStats.totalAmount === 0 ? '✅' : '❌'}`);
    
    // Verificar comisiones
    const commissionCheck = await Commission.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const commissionStats = commissionCheck[0] || { totalAmount: 0, count: 0 };
    console.log('\n🎯 Comisiones:');
    console.log(`   Total: ${commissionStats.count}`);
    console.log(`   Monto total: $${commissionStats.totalAmount} ${commissionStats.totalAmount === 0 ? '✅' : '❌'}`);
    
    // Verificar ganancias de usuarios
    const usersWithEarnings = await User.countDocuments({ 'financial.totalEarnings': { $gt: 0 } });
    const usersWithBalance = await User.countDocuments({ 'financial.availableBalance': { $gt: 0 } });
    
    console.log('\n👤 Ganancias de Usuarios:');
    console.log(`   Usuarios con ganancias > $0: ${usersWithEarnings} ${usersWithEarnings === 0 ? '✅' : '❌'}`);
    console.log(`   Usuarios con balance > $0: ${usersWithBalance} ${usersWithBalance === 0 ? '✅' : '❌'}`);
    
    // 3. Mostrar usuarios esenciales (deben mantenerse)
    console.log('\n🔑 VERIFICANDO USUARIOS ESENCIALES');
    console.log('-'.repeat(50));
    
    const essentialUsers = await User.find({
      email: { $in: ['admin@grow5x.com', 'negociosmillonaris1973@gmail.com', 'edgarpayares2005@gmail.com'] }
    }, 'email role status verification.isVerified financial.totalEarnings').lean();
    
    essentialUsers.forEach(user => {
      console.log(`✅ ${user.email}:`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Estado: ${user.status}`);
      console.log(`   Verificado: ${user.verification?.isVerified ? 'Sí' : 'No'}`);
      console.log(`   Ganancias: $${user.financial?.totalEarnings || 0}`);
      console.log('');
    });
    
    // 4. Verificar UserStatus
    console.log('\n📋 VERIFICANDO USER STATUS');
    console.log('-'.repeat(50));
    
    const userStatusStats = {
      total: await UserStatus.countDocuments(),
      withActivePackages: await UserStatus.countDocuments({ hasActivePackage: true }),
      needingAttention: await UserStatus.countDocuments({ needsAttention: true })
    };
    
    console.log('📊 UserStatus:');
    Object.entries(userStatusStats).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    // 5. Resumen final
    console.log('\n🎯 RESUMEN DE VERIFICACIÓN');
    console.log('-'.repeat(50));
    
    const allFinancialAmountsZero = (
      walletStats.totalBalance === 0 &&
      walletStats.totalEarnings === 0 &&
      walletStats.totalWithdrawn === 0 &&
      transactionStats.totalAmount === 0 &&
      commissionStats.totalAmount === 0 &&
      usersWithEarnings === 0 &&
      usersWithBalance === 0
    );
    
    const structureIntact = (
      userStats.total >= 3 && // Al menos admin, parent, leader
      userStats.admin >= 1 &&
      essentialUsers.length === 3
    );
    
    console.log(`💰 Montos financieros reseteados: ${allFinancialAmountsZero ? '✅ SÍ' : '❌ NO'}`);
    console.log(`👥 Estructura de usuarios intacta: ${structureIntact ? '✅ SÍ' : '❌ NO'}`);
    console.log(`🔑 Usuarios esenciales presentes: ${essentialUsers.length === 3 ? '✅ SÍ' : '❌ NO'}`);
    
    if (allFinancialAmountsZero && structureIntact) {
      console.log('\n🎉 RESETEO FINANCIERO VERIFICADO EXITOSAMENTE');
      console.log('✅ El sistema está listo para operaciones reales');
      console.log('✅ Todos los montos están en $0');
      console.log('✅ Estructura de usuarios preservada');
    } else {
      console.log('\n⚠️ VERIFICACIÓN INCOMPLETA');
      console.log('❌ Algunos aspectos requieren revisión');
    }
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB Atlas');
  }
}

// Ejecutar verificación
if (require.main === module) {
  verifyFinancialReset().catch(console.error);
}

module.exports = { verifyFinancialReset };