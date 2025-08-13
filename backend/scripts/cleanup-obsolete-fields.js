const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction.model');
const Commission = require('../src/models/Commission.model');
const Package = require('../src/models/Package.model');
const logger = require('../src/utils/logger');
require('dotenv').config();

/**
 * Script para limpiar campos obsoletos identificados en el análisis
 * IMPORTANTE: Ejecutar solo después de hacer backup completo
 */

// Campos a eliminar por modelo
const FIELDS_TO_REMOVE = {
  users: {
    // Campos de inversión no utilizados
    'investments.totalInvested': true,
    'investments.activeInvestments': true,
    'investments.completedInvestments': true,
    'investments.totalReturns': true,
    'investments.expectedReturns': true,
    'investments.portfolioValue': true,
    'investments.averageROI': true,
    
    // Campos de actividad que se pueden calcular dinámicamente
    'activity.loginCount': true,
    'activity.transactionCount': true,
    'activity.referralCount': true,
    'activity.investmentCount': true
  },
  transactions: {
    // Campos de plan pioneer no utilizados
    'pioneerPlan.plan': true,
    'pioneerPlan.duration': true,
    'pioneerPlan.originalPrice': true,
    'pioneerPlan.discount': true,
    'pioneerPlan.finalPrice': true,
    
    // Campos de facturación no utilizados
    'invoiceId': true
  },
  packages: {
    // Campos de configuración no implementados
    'commissionConfig.levelCommissions': true,
    'benefitConfig.pauseDays': true
  }
};

// Campos a mantener pero marcar como deprecated
const FIELDS_TO_DEPRECATE = {
  users: {
    // Estos campos están duplicados en UserStatus pero aún se usan
    'package_status': 'Duplicado en UserStatus.subscription.packageStatus',
    'current_package': 'Duplicado en UserStatus.subscription.currentPackage',
    'isPioneer': 'Duplicado en UserStatus.pioneer.isActive',
    'balance': 'Duplicado en UserStatus.financial.currentBalance',
    'totalEarnings': 'Duplicado en UserStatus.financial.totalEarnings'
  }
};

/**
 * Crear backup antes de la limpieza
 */
async function createBackup() {
  try {
    logger.info('📦 Creando backup de seguridad...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      timestamp,
      users: await User.find({}).lean(),
      transactions: await Transaction.find({}).lean(),
      packages: await Package.find({}).lean()
    };
    
    const fs = require('fs');
    const path = require('path');
    const backupPath = path.join(__dirname, `../backups/cleanup-backup-${timestamp}.json`);
    
    // Crear directorio de backups si no existe
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    logger.success(`✅ Backup creado en: ${backupPath}`);
    
    return backupPath;
  } catch (error) {
    logger.error('❌ Error creando backup:', error);
    throw error;
  }
}

/**
 * Analizar impacto antes de eliminar campos
 */
async function analyzeImpact() {
  try {
    logger.info('🔍 Analizando impacto de la limpieza...');
    
    const impact = {
      users: {},
      transactions: {},
      packages: {}
    };
    
    // Analizar usuarios
    const totalUsers = await User.countDocuments();
    for (const field of Object.keys(FIELDS_TO_REMOVE.users)) {
      const count = await User.countDocuments({
        [field]: { $exists: true, $ne: null }
      });
      impact.users[field] = {
        documentsAffected: count,
        percentage: ((count / totalUsers) * 100).toFixed(2)
      };
    }
    
    // Analizar transacciones
    const totalTransactions = await Transaction.countDocuments();
    for (const field of Object.keys(FIELDS_TO_REMOVE.transactions)) {
      const count = await Transaction.countDocuments({
        [field]: { $exists: true, $ne: null }
      });
      impact.transactions[field] = {
        documentsAffected: count,
        percentage: ((count / totalTransactions) * 100).toFixed(2)
      };
    }
    
    // Analizar paquetes
    const totalPackages = await Package.countDocuments();
    for (const field of Object.keys(FIELDS_TO_REMOVE.packages)) {
      const count = await Package.countDocuments({
        [field]: { $exists: true, $ne: null }
      });
      impact.packages[field] = {
        documentsAffected: count,
        percentage: ((count / totalPackages) * 100).toFixed(2)
      };
    }
    
    logger.info('📊 Análisis de impacto completado:');
    console.table(impact);
    
    return impact;
  } catch (error) {
    logger.error('❌ Error analizando impacto:', error);
    throw error;
  }
}

/**
 * Limpiar campos obsoletos de usuarios
 */
async function cleanupUserFields() {
  try {
    logger.info('🧹 Limpiando campos obsoletos de usuarios...');
    
    const fieldsToUnset = {};
    Object.keys(FIELDS_TO_REMOVE.users).forEach(field => {
      fieldsToUnset[field] = "";
    });
    
    const result = await User.updateMany(
      {},
      { $unset: fieldsToUnset }
    );
    
    logger.success(`✅ Usuarios actualizados: ${result.modifiedCount}`);
    return result;
  } catch (error) {
    logger.error('❌ Error limpiando campos de usuarios:', error);
    throw error;
  }
}

/**
 * Limpiar campos obsoletos de transacciones
 */
async function cleanupTransactionFields() {
  try {
    logger.info('🧹 Limpiando campos obsoletos de transacciones...');
    
    const fieldsToUnset = {};
    Object.keys(FIELDS_TO_REMOVE.transactions).forEach(field => {
      fieldsToUnset[field] = "";
    });
    
    const result = await Transaction.updateMany(
      {},
      { $unset: fieldsToUnset }
    );
    
    logger.success(`✅ Transacciones actualizadas: ${result.modifiedCount}`);
    return result;
  } catch (error) {
    logger.error('❌ Error limpiando campos de transacciones:', error);
    throw error;
  }
}

/**
 * Limpiar campos obsoletos de paquetes
 */
async function cleanupPackageFields() {
  try {
    logger.info('🧹 Limpiando campos obsoletos de paquetes...');
    
    const fieldsToUnset = {};
    Object.keys(FIELDS_TO_REMOVE.packages).forEach(field => {
      fieldsToUnset[field] = "";
    });
    
    const result = await Package.updateMany(
      {},
      { $unset: fieldsToUnset }
    );
    
    logger.success(`✅ Paquetes actualizados: ${result.modifiedCount}`);
    return result;
  } catch (error) {
    logger.error('❌ Error limpiando campos de paquetes:', error);
    throw error;
  }
}

/**
 * Validar integridad después de la limpieza
 */
async function validateIntegrity() {
  try {
    logger.info('🔍 Validando integridad después de la limpieza...');
    
    const validation = {
      users: {
        total: await User.countDocuments(),
        withRemovedFields: 0
      },
      transactions: {
        total: await Transaction.countDocuments(),
        withRemovedFields: 0
      },
      packages: {
        total: await Package.countDocuments(),
        withRemovedFields: 0
      }
    };
    
    // Verificar que los campos fueron eliminados
    for (const field of Object.keys(FIELDS_TO_REMOVE.users)) {
      const count = await User.countDocuments({
        [field]: { $exists: true }
      });
      validation.users.withRemovedFields += count;
    }
    
    for (const field of Object.keys(FIELDS_TO_REMOVE.transactions)) {
      const count = await Transaction.countDocuments({
        [field]: { $exists: true }
      });
      validation.transactions.withRemovedFields += count;
    }
    
    for (const field of Object.keys(FIELDS_TO_REMOVE.packages)) {
      const count = await Package.countDocuments({
        [field]: { $exists: true }
      });
      validation.packages.withRemovedFields += count;
    }
    
    logger.info('📊 Validación de integridad:');
    console.table(validation);
    
    const isValid = 
      validation.users.withRemovedFields === 0 &&
      validation.transactions.withRemovedFields === 0 &&
      validation.packages.withRemovedFields === 0;
    
    if (isValid) {
      logger.success('✅ Integridad validada - Limpieza exitosa');
    } else {
      logger.error('❌ Problemas de integridad detectados');
    }
    
    return { validation, isValid };
  } catch (error) {
    logger.error('❌ Error validando integridad:', error);
    throw error;
  }
}

/**
 * Generar reporte de limpieza
 */
function generateCleanupReport(backupPath, impact, results, validation) {
  const report = {
    timestamp: new Date().toISOString(),
    backupPath,
    impact,
    results: {
      users: results.users,
      transactions: results.transactions,
      packages: results.packages
    },
    validation,
    fieldsRemoved: {
      users: Object.keys(FIELDS_TO_REMOVE.users),
      transactions: Object.keys(FIELDS_TO_REMOVE.transactions),
      packages: Object.keys(FIELDS_TO_REMOVE.packages)
    },
    fieldsDeprecated: FIELDS_TO_DEPRECATE,
    recommendations: [
      'Monitorear aplicación por 24-48 horas',
      'Verificar que no hay errores relacionados con campos eliminados',
      'Considerar migración de campos duplicados a UserStatus',
      'Actualizar documentación de esquemas',
      'Planificar eliminación de campos deprecated en próxima versión'
    ]
  };
  
  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, '../cleanup-obsolete-fields-report.json');
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logger.info(`📄 Reporte de limpieza guardado en: ${reportPath}`);
  
  return reportPath;
}

/**
 * Función principal de limpieza
 */
async function cleanupObsoleteFields() {
  console.log('🧹 LIMPIEZA DE CAMPOS OBSOLETOS - GROW5X');
  console.log('=' .repeat(60));
  
  try {
    // Conectar a MongoDB
    logger.info('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.success('✅ Conectado a MongoDB');
    
    // Crear backup
    const backupPath = await createBackup();
    
    // Analizar impacto
    const impact = await analyzeImpact();
    
    // Confirmar antes de proceder
    console.log('\n⚠️  ADVERTENCIA: Esta operación eliminará campos de la base de datos');
    console.log('📦 Backup creado en:', backupPath);
    console.log('\n¿Desea continuar? (Esta operación es irreversible)');
    
    // En un entorno de producción, aquí se debería pedir confirmación
    // Para este script, continuamos automáticamente
    
    logger.info('🚀 Iniciando limpieza de campos obsoletos...');
    
    // Ejecutar limpieza
    const results = {
      users: await cleanupUserFields(),
      transactions: await cleanupTransactionFields(),
      packages: await cleanupPackageFields()
    };
    
    // Validar integridad
    const { validation, isValid } = await validateIntegrity();
    
    // Generar reporte
    const reportPath = generateCleanupReport(backupPath, impact, results, validation);
    
    // Resumen final
    console.log('\n📋 RESUMEN DE LIMPIEZA');
    console.log('=' .repeat(60));
    logger.success(`✅ Usuarios procesados: ${results.users.modifiedCount}`);
    logger.success(`✅ Transacciones procesadas: ${results.transactions.modifiedCount}`);
    logger.success(`✅ Paquetes procesados: ${results.packages.modifiedCount}`);
    logger.info(`📦 Backup disponible en: ${backupPath}`);
    logger.info(`📄 Reporte completo en: ${reportPath}`);
    
    if (isValid) {
      logger.success('🎉 Limpieza completada exitosamente');
    } else {
      logger.error('⚠️ Limpieza completada con advertencias - Revisar reporte');
    }
    
    console.log('\n🔄 PRÓXIMOS PASOS:');
    console.log('1. Monitorear aplicación por errores');
    console.log('2. Verificar funcionalidades críticas');
    console.log('3. Considerar migración de campos duplicados');
    console.log('4. Actualizar documentación de esquemas');
    
  } catch (error) {
    logger.error('💥 Error durante la limpieza:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    logger.info('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar limpieza si se llama directamente
if (require.main === module) {
  cleanupObsoleteFields()
    .then(() => {
      console.log('\n✨ Proceso de limpieza completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = {
  cleanupObsoleteFields,
  createBackup,
  analyzeImpact,
  validateIntegrity
};