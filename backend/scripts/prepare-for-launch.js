require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const UserStatus = require('../src/models/UserStatus');
const Transaction = require('../src/models/Transaction');
const Wallet = require('../src/models/Wallet');
const Commission = require('../src/models/Commission');
const AdminLog = require('../src/models/AdminLog');
const Package = require('../src/models/Package');
const WithdrawalRequest = require('../src/models/WithdrawalRequest');
const fs = require('fs').promises;
const path = require('path');

/**
 * 🚀 SCRIPT DE PREPARACIÓN PARA LANZAMIENTO
 * 
 * Este script prepara el sistema Grow5X para el lanzamiento en producción:
 * 1. Limpia datos de prueba y desarrollo
 * 2. Mantiene usuarios esenciales (admin, líderes)
 * 3. Resetea contadores y estadísticas
 * 4. Optimiza la base de datos
 * 5. Configura el entorno de producción
 */

class LaunchPreparation {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups/pre-launch');
    this.report = {
      timestamp: new Date().toISOString(),
      actions: [],
      errors: [],
      summary: {}
    };
  }

  async init() {
    try {
      console.log('🚀 INICIANDO PREPARACIÓN PARA LANZAMIENTO');
      console.log('=' .repeat(60));
      
      await this.connectDB();
      await this.createBackupDir();
      await this.analyzeCurrentState();
      await this.createFullBackup();
      await this.cleanTestData();
      await this.resetCounters();
      await this.optimizeDatabase();
      await this.setupProductionUsers();
      await this.validateSystem();
      await this.generateReport();
      
      console.log('\n✅ PREPARACIÓN PARA LANZAMIENTO COMPLETADA');
      
    } catch (error) {
      console.error('❌ Error en preparación:', error);
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
      console.log('📁 Directorio de backup creado');
    } catch (error) {
      console.log('📁 Directorio de backup ya existe');
    }
  }

  async analyzeCurrentState() {
    console.log('\n🔍 ANALIZANDO ESTADO ACTUAL');
    console.log('-'.repeat(40));
    
    const stats = {
      users: await User.countDocuments(),
      userStatus: await UserStatus.countDocuments(),
      transactions: await Transaction.countDocuments(),
      wallets: await Wallet.countDocuments(),
      commissions: await Commission.countDocuments(),
      adminLogs: await AdminLog.countDocuments(),
      packages: await Package.countDocuments(),
      withdrawals: await WithdrawalRequest.countDocuments()
    };
    
    console.log('📊 Estado actual:');
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    this.report.summary.beforeCleanup = stats;
  }

  async createFullBackup() {
    console.log('\n💾 CREANDO BACKUP COMPLETO');
    console.log('-'.repeat(40));
    
    const collections = [
      { name: 'users', model: User },
      { name: 'userStatus', model: UserStatus },
      { name: 'transactions', model: Transaction },
      { name: 'wallets', model: Wallet },
      { name: 'commissions', model: Commission },
      { name: 'adminLogs', model: AdminLog },
      { name: 'packages', model: Package },
      { name: 'withdrawals', model: WithdrawalRequest }
    ];
    
    for (const collection of collections) {
      try {
        const data = await collection.model.find({}).lean();
        const backupFile = path.join(this.backupDir, `${collection.name}-backup.json`);
        await fs.writeFile(backupFile, JSON.stringify(data, null, 2));
        console.log(`✅ Backup ${collection.name}: ${data.length} documentos`);
        this.report.actions.push(`Backup ${collection.name}: ${data.length} documentos`);
      } catch (error) {
        console.error(`❌ Error backup ${collection.name}:`, error.message);
        this.report.errors.push(`Backup ${collection.name}: ${error.message}`);
      }
    }
  }

  async cleanTestData() {
    console.log('\n🧹 LIMPIANDO DATOS DE PRUEBA');
    console.log('-'.repeat(40));
    
    // Usuarios esenciales que NO se deben eliminar
    const essentialUsers = [
      'admin@grow5x.com',
      'negociosmillonaris1973@gmail.com', // PADRE
      'edgarpayares2005@gmail.com', // LÍDER
    ];
    
    // 1. Eliminar usuarios de prueba
    const testUsers = await User.find({
      email: { 
        $not: { $in: essentialUsers },
        $regex: /(test|demo|prueba|temp|example)/i
      }
    });
    
    console.log(`🗑️ Eliminando ${testUsers.length} usuarios de prueba...`);
    for (const user of testUsers) {
      await UserStatus.deleteMany({ user: user._id });
      await Transaction.deleteMany({ user: user._id });
      await Wallet.deleteMany({ user: user._id });
      await Commission.deleteMany({ user: user._id });
      await WithdrawalRequest.deleteMany({ user: user._id });
      await User.deleteOne({ _id: user._id });
    }
    
    // 2. Limpiar transacciones de prueba
    const testTransactions = await Transaction.deleteMany({
      $or: [
        { description: /test|prueba|demo/i },
        { amount: { $lt: 1 } }, // Transacciones muy pequeñas
        { status: 'failed' }
      ]
    });
    
    console.log(`🗑️ Eliminadas ${testTransactions.deletedCount} transacciones de prueba`);
    
    // 3. Limpiar logs antiguos
    const oldLogs = await AdminLog.deleteMany({
      timestamp: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Más de 30 días
    });
    
    console.log(`🗑️ Eliminados ${oldLogs.deletedCount} logs antiguos`);
    
    this.report.actions.push(`Usuarios de prueba eliminados: ${testUsers.length}`);
    this.report.actions.push(`Transacciones de prueba eliminadas: ${testTransactions.deletedCount}`);
    this.report.actions.push(`Logs antiguos eliminados: ${oldLogs.deletedCount}`);
  }

  async resetCounters() {
    console.log('\n🔄 RESETEANDO CONTADORES');
    console.log('-'.repeat(40));
    
    // Resetear contadores de usuarios esenciales
    const resetResult = await User.updateMany(
      { email: { $in: ['admin@grow5x.com', 'negociosmillonaris1973@gmail.com', 'edgarpayares2005@gmail.com'] } },
      {
        $set: {
          'activity.loginCount': 0,
          'activity.transactionCount': 0,
          'activity.referralCount': 0,
          'activity.investmentCount': 0,
          'security.loginAttempts': 0,
          'security.lastFailedLogin': null,
          'security.isLocked': false,
          'sessions': [],
          'securityLog': []
        }
      }
    );
    
    console.log(`🔄 Contadores reseteados para ${resetResult.modifiedCount} usuarios`);
    this.report.actions.push(`Contadores reseteados: ${resetResult.modifiedCount} usuarios`);
  }

  async optimizeDatabase() {
    console.log('\n⚡ OPTIMIZANDO BASE DE DATOS');
    console.log('-'.repeat(40));
    
    try {
      // Verificar y crear índices esenciales
      const indexes = [
        { collection: 'users', index: { email: 1 }, options: { unique: true } },
        { collection: 'users', index: { referralCode: 1 }, options: { unique: true, sparse: true } },
        { collection: 'transactions', index: { user: 1, createdAt: -1 } },
        { collection: 'transactions', index: { status: 1, type: 1 } },
        { collection: 'userstatus', index: { user: 1 }, options: { unique: true } },
        { collection: 'wallets', index: { user: 1 } },
        { collection: 'commissions', index: { user: 1, status: 1 } }
      ];
      
      for (const indexDef of indexes) {
        try {
          await mongoose.connection.db.collection(indexDef.collection)
            .createIndex(indexDef.index, indexDef.options || {});
          console.log(`✅ Índice creado: ${indexDef.collection}`);
        } catch (error) {
          if (error.code !== 85) { // Índice ya existe
            console.log(`⚠️ Índice ${indexDef.collection}: ${error.message}`);
          }
        }
      }
      
      this.report.actions.push('Índices de base de datos optimizados');
      
    } catch (error) {
      console.error('❌ Error optimizando base de datos:', error.message);
      this.report.errors.push(`Optimización DB: ${error.message}`);
    }
  }

  async setupProductionUsers() {
    console.log('\n👥 CONFIGURANDO USUARIOS DE PRODUCCIÓN');
    console.log('-'.repeat(40));
    
    // Asegurar que usuarios esenciales estén configurados correctamente
    const productionUsers = [
      {
        email: 'admin@grow5x.com',
        role: 'admin',
        status: 'active',
        updates: {
          'verification.isVerified': true,
          'verification.verifiedAt': new Date(),
          'preferences.notifications.email': true,
          'preferences.notifications.system': true,
          'adminFlags.isSystemAdmin': true,
          'adminFlags.canManageUsers': true,
          'adminFlags.canManageFinances': true
        }
      },
      {
        email: 'negociosmillonaris1973@gmail.com',
        role: 'user',
        status: 'active',
        updates: {
          'verification.isVerified': true,
          'verification.verifiedAt': new Date(),
          'specialUserType': 'parent',
          'isSpecialUser': true
        }
      },
      {
        email: 'edgarpayares2005@gmail.com',
        role: 'user',
        status: 'active',
        updates: {
          'verification.isVerified': true,
          'verification.verifiedAt': new Date(),
          'specialUserType': 'leader',
          'isSpecialUser': true
        }
      }
    ];
    
    for (const userData of productionUsers) {
      const result = await User.updateOne(
        { email: userData.email },
        { $set: userData.updates },
        { upsert: false }
      );
      
      if (result.matchedCount > 0) {
        console.log(`✅ Usuario configurado: ${userData.email}`);
      } else {
        console.log(`⚠️ Usuario no encontrado: ${userData.email}`);
      }
    }
    
    this.report.actions.push('Usuarios de producción configurados');
  }

  async validateSystem() {
    console.log('\n✅ VALIDANDO SISTEMA');
    console.log('-'.repeat(40));
    
    const validations = {
      adminExists: await User.countDocuments({ email: 'admin@grow5x.com', role: 'admin' }),
      activeUsers: await User.countDocuments({ status: 'active' }),
      verifiedUsers: await User.countDocuments({ 'verification.isVerified': true }),
      totalTransactions: await Transaction.countDocuments(),
      activePackages: await Package.countDocuments({ status: 'active' })
    };
    
    console.log('🔍 Validaciones:');
    Object.entries(validations).forEach(([key, value]) => {
      const status = value > 0 ? '✅' : '⚠️';
      console.log(`   ${status} ${key}: ${value}`);
    });
    
    this.report.summary.validations = validations;
  }

  async generateReport() {
    console.log('\n📊 GENERANDO REPORTE FINAL');
    console.log('-'.repeat(40));
    
    // Estado final
    const finalStats = {
      users: await User.countDocuments(),
      userStatus: await UserStatus.countDocuments(),
      transactions: await Transaction.countDocuments(),
      wallets: await Wallet.countDocuments(),
      commissions: await Commission.countDocuments(),
      adminLogs: await AdminLog.countDocuments(),
      packages: await Package.countDocuments(),
      withdrawals: await WithdrawalRequest.countDocuments()
    };
    
    this.report.summary.afterCleanup = finalStats;
    this.report.summary.reductionPercentage = {};
    
    // Calcular reducción
    Object.keys(finalStats).forEach(key => {
      const before = this.report.summary.beforeCleanup[key] || 0;
      const after = finalStats[key] || 0;
      const reduction = before > 0 ? ((before - after) / before * 100).toFixed(2) : 0;
      this.report.summary.reductionPercentage[key] = `${reduction}%`;
    });
    
    // Guardar reporte
    const reportFile = path.join(this.backupDir, 'launch-preparation-report.json');
    await fs.writeFile(reportFile, JSON.stringify(this.report, null, 2));
    
    console.log('\n📋 REPORTE DE PREPARACIÓN:');
    console.log(`📁 Backup guardado en: ${this.backupDir}`);
    console.log(`📊 Acciones realizadas: ${this.report.actions.length}`);
    console.log(`❌ Errores encontrados: ${this.report.errors.length}`);
    console.log('\n📈 Reducción de datos:');
    Object.entries(this.report.summary.reductionPercentage).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    if (this.report.errors.length > 0) {
      console.log('\n❌ ERRORES:');
      this.report.errors.forEach(error => console.log(`   - ${error}`));
    }
  }
}

// Función principal
async function prepareForLaunch() {
  const preparation = new LaunchPreparation();
  await preparation.init();
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  prepareForLaunch().catch(console.error);
}

module.exports = { LaunchPreparation, prepareForLaunch };