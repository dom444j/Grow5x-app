const mongoose = require('mongoose');
const User = require('../src/models/User');
const WithdrawalRequest = require('../src/models/WithdrawalRequest');
const Transaction = require('../src/models/Transaction.model');
const logger = require('../src/utils/logger');

// Configuración de la base de datos
require('dotenv').config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

async function fixUserBalances() {
  try {
    console.log('🔄 Iniciando corrección de balances de usuarios...');
    
    // Obtener todos los usuarios
    const users = await User.find({});
    console.log(`📊 Encontrados ${users.length} usuarios`);
    
    let fixedUsers = 0;
    let usersWithIssues = [];
    
    for (const user of users) {
      console.log(`\n👤 Verificando usuario: ${user.email} (ID: ${user._id})`);
      
      // Verificar balance actual
      const currentBalance = user.balance || 0;
      console.log(`💰 Balance actual: $${currentBalance}`);
      
      // Calcular retiros pendientes
      const pendingWithdrawals = await WithdrawalRequest.aggregate([
        {
          $match: {
            userId: user._id,
            status: 'pending'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);
      
      const pendingAmount = pendingWithdrawals[0]?.total || 0;
      console.log(`⏳ Retiros pendientes: $${pendingAmount}`);
      
      // Calcular balance disponible
      const availableBalance = currentBalance - pendingAmount;
      console.log(`💵 Balance disponible calculado: $${availableBalance}`);
      
      // Verificar si hay problemas
      let hasIssues = false;
      let issues = [];
      
      if (availableBalance < 0) {
        hasIssues = true;
        issues.push(`Balance disponible negativo: $${availableBalance}`);
      }
      
      if (currentBalance < 0) {
        hasIssues = true;
        issues.push(`Balance total negativo: $${currentBalance}`);
      }
      
      if (pendingAmount > currentBalance && currentBalance > 0) {
        hasIssues = true;
        issues.push(`Retiros pendientes ($${pendingAmount}) mayores que balance ($${currentBalance})`);
      }
      
      if (hasIssues) {
        console.log(`⚠️  Problemas encontrados:`);
        issues.forEach(issue => console.log(`   - ${issue}`));
        
        usersWithIssues.push({
          userId: user._id,
          email: user.email,
          currentBalance,
          pendingAmount,
          availableBalance,
          issues
        });
        
        // Corregir balance si es negativo
        if (currentBalance < 0) {
          console.log(`🔧 Corrigiendo balance negativo a $0`);
          user.balance = 0;
          await user.save();
          fixedUsers++;
        }
        
        // Si hay retiros pendientes que exceden el balance, cancelar los excedentes
        if (pendingAmount > currentBalance && currentBalance >= 0) {
          console.log(`🔧 Revisando retiros pendientes excesivos...`);
          
          const pendingWithdrawalRequests = await WithdrawalRequest.find({
            userId: user._id,
            status: 'pending'
          }).sort({ createdAt: 1 }); // Más antiguos primero
          
          let remainingBalance = currentBalance;
          
          for (const withdrawal of pendingWithdrawalRequests) {
            if (withdrawal.amount > remainingBalance) {
              console.log(`   ❌ Cancelando retiro excesivo: $${withdrawal.amount} (ID: ${withdrawal._id})`);
              withdrawal.status = 'cancelled';
              withdrawal.cancelledAt = new Date();
              withdrawal.cancelReason = 'Balance insuficiente - corrección automática';
              await withdrawal.save();
            } else {
              remainingBalance -= withdrawal.amount;
            }
          }
        }
        
      } else {
        console.log(`✅ Usuario sin problemas`);
      }
    }
    
    console.log(`\n📋 RESUMEN DE CORRECCIÓN:`);
    console.log(`✅ Usuarios corregidos: ${fixedUsers}`);
    console.log(`⚠️  Usuarios con problemas: ${usersWithIssues.length}`);
    
    if (usersWithIssues.length > 0) {
      console.log(`\n📊 DETALLE DE USUARIOS CON PROBLEMAS:`);
      usersWithIssues.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.email} (${user.userId})`);
        console.log(`   Balance: $${user.currentBalance}`);
        console.log(`   Pendientes: $${user.pendingAmount}`);
        console.log(`   Disponible: $${user.availableBalance}`);
        console.log(`   Problemas:`);
        user.issues.forEach(issue => console.log(`     - ${issue}`));
      });
    }
    
    console.log(`\n✅ Corrección de balances completada`);
    
  } catch (error) {
    console.error('❌ Error durante la corrección de balances:', error);
  }
}

async function main() {
  await connectDB();
  await fixUserBalances();
  await mongoose.disconnect();
  console.log('🔌 Desconectado de MongoDB');
}

// Ejecutar el script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fixUserBalances };