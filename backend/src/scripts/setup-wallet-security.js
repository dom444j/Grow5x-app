/**
 * Script maestro de configuración de seguridad para wallets
 * Integra todas las medidas de protección y validaciones
 */

const mongoose = require('mongoose');
const { createDefaultRoles, assignDefaultRolesToAdmins } = require('./init-wallet-roles');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

// Configuración
require('dotenv').config();

class WalletSecuritySetup {
  constructor() {
    this.setupSteps = [
      { name: 'Conexión a Base de Datos', fn: this.connectDatabase },
      { name: 'Verificación de Dependencias', fn: this.checkDependencies },
      { name: 'Inicialización de Roles', fn: this.initializeRoles },
      { name: 'Configuración de Validadores', fn: this.setupValidators },
      { name: 'Configuración de Middlewares', fn: this.setupMiddlewares },
      { name: 'Verificación de Seguridad', fn: this.runSecurityChecks },
      { name: 'Configuración de Auditoría', fn: this.setupAuditSystem },
      { name: 'Generación de Reporte', fn: this.generateSetupReport }
    ];
  }

  async connectDatabase() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Conectado a MongoDB');
      return { success: true, message: 'Base de datos conectada' };
    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error);
      throw error;
    }
  }

  async checkDependencies() {
    console.log('🔍 Verificando dependencias del sistema...');
    
    const requiredFiles = [
      '../models/WalletRole.model.js',
      '../models/UserWalletRole.model.js',
      '../middleware/walletAuth.middleware.js',
      '../utils/walletValidator.js',
      './wallet-security-audit.js'
    ];
    
    const missingFiles = [];
    
    for (const file of requiredFiles) {
      try {
        const filePath = path.join(__dirname, file);
        await fs.access(filePath);
        console.log(`✅ ${file}`);
      } catch (error) {
        console.log(`❌ ${file} - FALTANTE`);
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length > 0) {
      throw new Error(`Archivos faltantes: ${missingFiles.join(', ')}`);
    }
    
    return { success: true, message: 'Todas las dependencias verificadas' };
  }

  async initializeRoles() {
    console.log('👥 Inicializando sistema de roles...');
    
    try {
      await createDefaultRoles();
      await assignDefaultRolesToAdmins();
      
      return { success: true, message: 'Roles inicializados correctamente' };
    } catch (error) {
      console.error('❌ Error inicializando roles:', error);
      throw error;
    }
  }

  async setupValidators() {
    console.log('🛡️ Configurando validadores de wallet...');
    
    try {
      // Verificar que el validador funcione correctamente
      const { validateWalletAddress } = require('../utils/walletValidator');
      
      // Pruebas básicas
      const testAddresses = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1', network: 'ERC20' },
        { address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5oNDMnt', network: 'TRC20' },
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1', network: 'BEP20' }
      ];
      
      for (const test of testAddresses) {
        const result = await validateWalletAddress(test.address, test.network);
        if (!result.isValid) {
          console.log(`⚠️  Validación falló para ${test.network}: ${result.errors.join(', ')}`);
        } else {
          console.log(`✅ Validación exitosa para ${test.network}`);
        }
      }
      
      return { success: true, message: 'Validadores configurados' };
    } catch (error) {
      console.error('❌ Error configurando validadores:', error);
      throw error;
    }
  }

  async setupMiddlewares() {
    console.log('🔧 Verificando middlewares de seguridad...');
    
    try {
      // Verificar que los middlewares estén disponibles
      const middlewares = require('../middleware/walletAuth.middleware');
      
      const requiredMiddlewares = [
        'requireWalletPermission',
        'checkWalletCreationLimits',
        'incrementWalletCreationCounter',
        'checkAllowedNetwork'
      ];
      
      for (const middleware of requiredMiddlewares) {
        if (typeof middlewares[middleware] !== 'function') {
          throw new Error(`Middleware ${middleware} no encontrado`);
        }
        console.log(`✅ ${middleware}`);
      }
      
      return { success: true, message: 'Middlewares verificados' };
    } catch (error) {
      console.error('❌ Error verificando middlewares:', error);
      throw error;
    }
  }

  async runSecurityChecks() {
    console.log('🔒 Ejecutando verificaciones de seguridad...');
    
    try {
      // Verificar configuración de variables de entorno
      const requiredEnvVars = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'MONGODB_URI'
      ];
      
      const missingEnvVars = [];
      
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          missingEnvVars.push(envVar);
        } else {
          console.log(`✅ ${envVar} configurado`);
        }
      }
      
      if (missingEnvVars.length > 0) {
        console.log(`⚠️  Variables de entorno faltantes: ${missingEnvVars.join(', ')}`);
      }
      
      // Verificar fortaleza de JWT_SECRET
      if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        console.log('⚠️  JWT_SECRET debería tener al menos 32 caracteres');
      }
      
      return { success: true, message: 'Verificaciones de seguridad completadas' };
    } catch (error) {
      console.error('❌ Error en verificaciones de seguridad:', error);
      throw error;
    }
  }

  async setupAuditSystem() {
    console.log('📊 Configurando sistema de auditoría...');
    
    try {
      // Crear directorio de logs si no existe
      const logsDir = path.join(__dirname, '../logs');
      try {
        await fs.access(logsDir);
      } catch {
        await fs.mkdir(logsDir, { recursive: true });
        console.log('✅ Directorio de logs creado');
      }
      
      // Verificar script de auditoría
      const auditScript = path.join(__dirname, 'wallet-security-audit.js');
      await fs.access(auditScript);
      console.log('✅ Script de auditoría verificado');
      
      return { success: true, message: 'Sistema de auditoría configurado' };
    } catch (error) {
      console.error('❌ Error configurando auditoría:', error);
      throw error;
    }
  }

  async generateSetupReport() {
    console.log('📋 Generando reporte de configuración...');
    
    try {
      const WalletRole = require('../models/WalletRole.model');
      const UserWalletRole = require('../models/UserWalletRole.model');
      const User = require('../models/User');
      
      const report = {
        timestamp: new Date().toISOString(),
        setup_version: '1.0.0',
        database: {
          connected: mongoose.connection.readyState === 1,
          name: mongoose.connection.name
        },
        roles: {
          total: await WalletRole.countDocuments({ isActive: true }),
          list: await WalletRole.find({ isActive: true }).select('name description')
        },
        assignments: {
          total: await UserWalletRole.countDocuments({ isActive: true }),
          by_role: await UserWalletRole.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$walletRoleId', count: { $sum: 1 } } },
            { $lookup: { from: 'walletroles', localField: '_id', foreignField: '_id', as: 'role' } },
            { $project: { roleName: { $arrayElemAt: ['$role.name', 0] }, count: 1 } }
          ])
        },
        security: {
          jwt_configured: !!process.env.JWT_SECRET,
          jwt_refresh_configured: !!process.env.JWT_REFRESH_SECRET,
          mongodb_configured: !!process.env.MONGODB_URI
        },
        recommendations: []
      };
      
      // Agregar recomendaciones
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        report.recommendations.push('Configurar JWT_SECRET con al menos 32 caracteres');
      }
      
      if (report.assignments.total === 0) {
        report.recommendations.push('Asignar roles de wallet a usuarios administradores');
      }
      
      // Guardar reporte
      const reportPath = path.join(__dirname, '../logs/wallet-security-setup.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log('\n📊 REPORTE DE CONFIGURACIÓN');
      console.log('============================');
      console.log(`📅 Fecha: ${report.timestamp}`);
      console.log(`🗄️  Base de datos: ${report.database.connected ? 'Conectada' : 'Desconectada'}`);
      console.log(`👥 Roles creados: ${report.roles.total}`);
      console.log(`🔗 Asignaciones: ${report.assignments.total}`);
      
      if (report.recommendations.length > 0) {
        console.log('\n⚠️  RECOMENDACIONES:');
        report.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
      
      console.log(`\n📄 Reporte guardado en: ${reportPath}`);
      
      return { success: true, message: 'Reporte generado', data: report };
    } catch (error) {
      console.error('❌ Error generando reporte:', error);
      throw error;
    }
  }

  async run() {
    console.log('🚀 INICIANDO CONFIGURACIÓN DE SEGURIDAD PARA WALLETS');
    console.log('====================================================\n');
    
    const results = [];
    
    try {
      for (let i = 0; i < this.setupSteps.length; i++) {
        const step = this.setupSteps[i];
        console.log(`\n[${i + 1}/${this.setupSteps.length}] ${step.name}`);
        console.log('-'.repeat(50));
        
        try {
          const result = await step.fn.call(this);
          results.push({ step: step.name, ...result });
          console.log(`✅ ${step.name} completado`);
        } catch (error) {
          console.error(`❌ Error en ${step.name}:`, error.message);
          results.push({ step: step.name, success: false, error: error.message });
          throw error;
        }
      }
      
      console.log('\n🎉 CONFIGURACIÓN COMPLETADA EXITOSAMENTE');
      console.log('=========================================');
      
    } catch (error) {
      console.error('\n💥 CONFIGURACIÓN FALLÓ');
      console.error('======================');
      console.error('Error:', error.message);
      process.exit(1);
    } finally {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión a base de datos cerrada');
      }
    }
    
    return results;
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  const setup = new WalletSecuritySetup();
  setup.run().catch(console.error);
}

module.exports = WalletSecuritySetup;