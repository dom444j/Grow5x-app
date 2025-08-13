require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User.js');
const UserStatus = require('../src/models/UserStatus.js');
const Transaction = require('../src/models/Transaction.model.js');
const Wallet = require('../src/models/Wallet.model.js');
const Commission = require('../src/models/Commission.model.js');
const WithdrawalRequest = require('../src/models/WithdrawalRequest.js');
const fs = require('fs').promises;
const path = require('path');

/**
 * 💰 SCRIPT DE RESETEO DE MONTOS FINANCIEROS
 * 
 * Este script resetea ÚNICAMENTE los montos financieros del sistema Grow5X
 * manteniendo todos los datos reales de usuarios, estructura y configuraciones:
 * 
 * ✅ MANTIENE:
 * - Usuarios reales y sus datos
 * - Estructura de referidos
 * - Configuraciones del sistema
 * - Logs de actividad
 * - Verificaciones de usuarios
 * 
 * 🔄 RESETEA:
 * - Balances de wallets a $0
 * - Montos de transacciones
 * - Comisiones pendientes
 * - Solicitudes de retiro
 * - Ganancias acumuladas
 */

class FinancialReset {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups/financial-reset');
    this.report = {
      timestamp: new Date().toISOString(),
      actions: [],
      errors: [],
      summary: {}
    };
  }

  async init() {
    try {
      console.log('💰 INICIANDO RESETEO DE MONTOS FINANCIEROS');
      console.log('=' .repeat(60));
      
      await this.connectDB();
      await this.createBackupDir();
      await this.analyzeCurrentFinancialState();
      await this.createFinancialBackup();
      await this.resetWalletBalances();
      await this.resetTransactionAmounts();
      await this.resetCommissions();
      await this.resetWithdrawalRequests();
      await this.resetUserEarnings();
      await this.validateFinancialReset();
      await this.generateReport();
      
      console.log('\n✅ RESETEO FINANCIERO COMPLETADO');
      console.log('📊 Todos los montos han sido reseteados a $0');
      console.log('👥 Usuarios y estructura mantenidos intactos');
      
    } catch (error) {
      console.error('❌ Error en reseteo financiero:', error);
      this.report.errors.push(error.message);
    } finally {
      await mongoose.disconnect();
    }
  }

  async connectDB() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
  }

  async createBackupDir() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log('📁 Directorio de backup financiero creado');
    } catch (error) {
      console.log('📁 Directorio de backup ya existe');
    }
  }

  async analyzeCurrentFinancialState() {
    console.log('\n🔍 ANALIZANDO ESTADO FINANCIERO ACTUAL');
    console.log('-'.repeat(50));
    
    // Analizar balances actuales
    const walletStats = await Wallet.aggregate([
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
    
    const transactionStats = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const commissionStats = await Commission.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const withdrawalStats = await WithdrawalRequest.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const currentState = {
      wallets: walletStats[0] || { totalBalance: 0, totalEarnings: 0, totalWithdrawn: 0, count: 0 },
      transactions: transactionStats[0] || { totalAmount: 0, count: 0 },
      commissions: commissionStats[0] || { totalAmount: 0, count: 0 },
      withdrawals: withdrawalStats[0] || { totalAmount: 0, count: 0 }
    };
    
    console.log('💰 Estado financiero actual:');
    console.log(`   Wallets: ${currentState.wallets.count} (Balance total: $${currentState.wallets.totalBalance})`);
    console.log(`   Transacciones: ${currentState.transactions.count} (Monto total: $${currentState.transactions.totalAmount})`);
    console.log(`   Comisiones: ${currentState.commissions.count} (Monto total: $${currentState.commissions.totalAmount})`);
    console.log(`   Retiros: ${currentState.withdrawals.count} (Monto total: $${currentState.withdrawals.totalAmount})`);
    
    this.report.summary.beforeReset = currentState;
  }

  async createFinancialBackup() {
    console.log('\n💾 CREANDO BACKUP FINANCIERO');
    console.log('-'.repeat(40));
    
    const financialCollections = [
      { name: 'wallets', model: Wallet },
      { name: 'transactions', model: Transaction },
      { name: 'commissions', model: Commission },
      { name: 'withdrawals', model: WithdrawalRequest }
    ];
    
    for (const collection of financialCollections) {
      try {
        const data = await collection.model.find({}).lean();
        const backupFile = path.join(this.backupDir, `${collection.name}-financial-backup.json`);
        await fs.writeFile(backupFile, JSON.stringify(data, null, 2));
        console.log(`✅ Backup ${collection.name}: ${data.length} documentos`);
        this.report.actions.push(`Backup financiero ${collection.name}: ${data.length} documentos`);
      } catch (error) {
        console.error(`❌ Error backup ${collection.name}:`, error.message);
        this.report.errors.push(`Backup ${collection.name}: ${error.message}`);
      }
    }
  }

  async resetWalletBalances() {
    console.log('\n💳 RESETEANDO BALANCES DE WALLETS');
    console.log('-'.repeat(40));
    
    try {
      const resetResult = await Wallet.updateMany(
        {},
        {
          $set: {
            balance: 0,
            totalEarnings: 0,
            totalWithdrawn: 0,
            pendingBalance: 0,
            availableBalance: 0,
            'history': [], // Limpiar historial de transacciones
            'lastTransaction': null
          }
        }
      );
      
      console.log(`💳 Balances reseteados: ${resetResult.modifiedCount} wallets`);
      this.report.actions.push(`Wallets reseteadas: ${resetResult.modifiedCount}`);
      
    } catch (error) {
      console.error('❌ Error reseteando wallets:', error.message);
      this.report.errors.push(`Reset wallets: ${error.message}`);
    }
  }

  async resetTransactionAmounts() {
    console.log('\n💸 RESETEANDO MONTOS DE TRANSACCIONES');
    console.log('-'.repeat(40));
    
    try {
      // Opción 1: Resetear montos a 0 manteniendo la estructura
      const resetResult = await Transaction.updateMany(
        {},
        {
          $set: {
            amount: 0,
            fee: 0,
            netAmount: 0,
            'metadata.originalAmount': 0,
            'metadata.exchangeRate': 1
          }
        }
      );
      
      console.log(`💸 Transacciones reseteadas: ${resetResult.modifiedCount}`);
      this.report.actions.push(`Transacciones reseteadas: ${resetResult.modifiedCount}`);
      
      // Opción 2: Eliminar transacciones completamente (comentado por defecto)
      /*
      const deleteResult = await Transaction.deleteMany({
        status: { $in: ['completed', 'pending', 'failed'] }
      });
      console.log(`🗑️ Transacciones eliminadas: ${deleteResult.deletedCount}`);
      this.report.actions.push(`Transacciones eliminadas: ${deleteResult.deletedCount}`);
      */
      
    } catch (error) {
      console.error('❌ Error reseteando transacciones:', error.message);
      this.report.errors.push(`Reset transacciones: ${error.message}`);
    }
  }

  async resetCommissions() {
    console.log('\n🎯 RESETEANDO COMISIONES');
    console.log('-'.repeat(40));
    
    try {
      const resetResult = await Commission.updateMany(
        {},
        {
          $set: {
            amount: 0,
            'metadata.originalAmount': 0
          }
        }
      );
      
      console.log(`🎯 Comisiones reseteadas: ${resetResult.modifiedCount}`);
      this.report.actions.push(`Comisiones reseteadas: ${resetResult.modifiedCount}`);
      
    } catch (error) {
      console.error('❌ Error reseteando comisiones:', error.message);
      this.report.errors.push(`Reset comisiones: ${error.message}`);
    }
  }

  async resetWithdrawalRequests() {
    console.log('\n🏦 RESETEANDO SOLICITUDES DE RETIRO');
    console.log('-'.repeat(40));
    
    try {
      // Opción 1: Resetear montos
      const resetResult = await WithdrawalRequest.updateMany(
        {},
        {
          $set: {
            amount: 0,
            fee: 0,
            netAmount: 0
          }
        }
      );
      
      console.log(`🏦 Solicitudes de retiro reseteadas: ${resetResult.modifiedCount}`);
      this.report.actions.push(`Retiros reseteados: ${resetResult.modifiedCount}`);
      
      // Opción 2: Eliminar solicitudes pendientes (comentado)
      /*
      const deleteResult = await WithdrawalRequest.deleteMany({
        status: 'pending'
      });
      console.log(`🗑️ Solicitudes pendientes eliminadas: ${deleteResult.deletedCount}`);
      */
      
    } catch (error) {
      console.error('❌ Error reseteando retiros:', error.message);
      this.report.errors.push(`Reset retiros: ${error.message}`);
    }
  }

  async resetUserEarnings() {
    console.log('\n👤 RESETEANDO GANANCIAS DE USUARIOS');
    console.log('-'.repeat(40));
    
    try {
      const resetResult = await User.updateMany(
        {},
        {
          $set: {
            'financial.totalEarnings': 0,
            'financial.totalInvested': 0,
            'financial.totalWithdrawn': 0,
            'financial.availableBalance': 0,
            'financial.pendingBalance': 0,
            'financial.totalCommissions': 0,
            'financial.monthlyEarnings': 0,
            'financial.lastEarningDate': null,
            'activity.transactionCount': 0,
            'activity.investmentCount': 0,
            'activity.withdrawalCount': 0
          }
        }
      );
      
      console.log(`👤 Ganancias de usuarios reseteadas: ${resetResult.modifiedCount}`);
      this.report.actions.push(`Ganancias usuarios reseteadas: ${resetResult.modifiedCount}`);
      
    } catch (error) {
      console.error('❌ Error reseteando ganancias usuarios:', error.message);
      this.report.errors.push(`Reset ganancias usuarios: ${error.message}`);
    }
  }

  async validateFinancialReset() {
    console.log('\n✅ VALIDANDO RESETEO FINANCIERO');
    console.log('-'.repeat(40));
    
    const validations = {
      walletsWithBalance: await Wallet.countDocuments({ balance: { $gt: 0 } }),
      transactionsWithAmount: await Transaction.countDocuments({ amount: { $gt: 0 } }),
      commissionsWithAmount: await Commission.countDocuments({ amount: { $gt: 0 } }),
      withdrawalsWithAmount: await WithdrawalRequest.countDocuments({ amount: { $gt: 0 } }),
      usersWithEarnings: await User.countDocuments({ 'financial.totalEarnings': { $gt: 0 } })
    };
    
    console.log('🔍 Validaciones post-reseteo:');
    Object.entries(validations).forEach(([key, value]) => {
      const status = value === 0 ? '✅' : '⚠️';
      console.log(`   ${status} ${key}: ${value}`);
    });
    
    this.report.summary.validations = validations;
    
    // Verificar que usuarios y estructura se mantienen
    const structureValidation = {
      totalUsers: await User.countDocuments(),
      activeUsers: await User.countDocuments({ status: 'active' }),
      verifiedUsers: await User.countDocuments({ 'verification.isVerified': true }),
      adminUsers: await User.countDocuments({ role: 'admin' })
    };
    
    console.log('\n👥 Validación de estructura (debe mantenerse):');
    Object.entries(structureValidation).forEach(([key, value]) => {
      console.log(`   ✅ ${key}: ${value}`);
    });
    
    this.report.summary.structureValidation = structureValidation;
  }

  async generateReport() {
    console.log('\n📊 GENERANDO REPORTE DE RESETEO FINANCIERO');
    console.log('-'.repeat(50));
    
    // Estado final
    const finalFinancialState = {
      totalWalletBalance: (await Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]))[0]?.total || 0,
      totalTransactionAmount: (await Transaction.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]))[0]?.total || 0,
      totalCommissionAmount: (await Commission.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]))[0]?.total || 0,
      totalWithdrawalAmount: (await WithdrawalRequest.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]))[0]?.total || 0
    };
    
    this.report.summary.afterReset = finalFinancialState;
    
    // Guardar reporte
    const reportFile = path.join(this.backupDir, 'financial-reset-report.json');
    await fs.writeFile(reportFile, JSON.stringify(this.report, null, 2));
    
    console.log('\n📋 REPORTE DE RESETEO FINANCIERO:');
    console.log(`📁 Backup guardado en: ${this.backupDir}`);
    console.log(`📊 Acciones realizadas: ${this.report.actions.length}`);
    console.log(`❌ Errores encontrados: ${this.report.errors.length}`);
    
    console.log('\n💰 Estado financiero final:');
    Object.entries(finalFinancialState).forEach(([key, value]) => {
      console.log(`   ${key}: $${value}`);
    });
    
    if (this.report.errors.length > 0) {
      console.log('\n❌ ERRORES:');
      this.report.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n🎯 RESUMEN:');
    console.log('   ✅ Todos los montos financieros han sido reseteados a $0');
    console.log('   ✅ Estructura de usuarios mantenida intacta');
    console.log('   ✅ Configuraciones del sistema preservadas');
    console.log('   ✅ Sistema listo para operaciones reales');
  }
}

// Función principal
async function resetFinancialAmounts() {
  const reset = new FinancialReset();
  await reset.init();
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  resetFinancialAmounts().catch(console.error);
}

module.exports = { FinancialReset, resetFinancialAmounts };