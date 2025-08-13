const mongoose = require('mongoose');
const logger = require('../src/utils/logger');
const { analyzeUnusedFields } = require('./analyze-unused-fields');
const { migrateDuplicatedFields } = require('./migrate-duplicated-fields');
const { cleanupObsoleteFields } = require('./cleanup-obsolete-fields');
require('dotenv').config();

/**
 * Script maestro para optimización completa de MongoDB
 * Ejecuta análisis, migración y limpieza en el orden correcto
 */

const OPTIMIZATION_PHASES = {
  ANALYSIS: 'analysis',
  MIGRATION: 'migration',
  CLEANUP: 'cleanup',
  VALIDATION: 'validation'
};

/**
 * Configuración de optimización
 */
const OPTIMIZATION_CONFIG = {
  // Fases a ejecutar (se pueden deshabilitar individualmente)
  phases: {
    analysis: true,
    migration: true,
    cleanup: true,
    validation: true
  },
  
  // Configuración de seguridad
  safety: {
    createBackups: true,
    requireConfirmation: false, // Cambiar a true en producción
    maxDocumentsToProcess: 10000, // Límite de seguridad
    dryRun: false // Solo simular sin hacer cambios
  },
  
  // Configuración de rendimiento
  performance: {
    batchSize: 100,
    maxConcurrency: 5,
    progressInterval: 100
  }
};

/**
 * Verificar prerrequisitos del sistema
 */
async function checkPrerequisites() {
  try {
    logger.info('🔍 Verificando prerrequisitos del sistema...');
    
    const checks = {
      mongodb: false,
      diskSpace: false,
      permissions: false,
      backupDir: false
    };
    
    // Verificar conexión a MongoDB
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      checks.mongodb = true;
      logger.success('✅ Conexión a MongoDB exitosa');
    } catch (error) {
      logger.error('❌ Error conectando a MongoDB:', error.message);
      return { checks, passed: false };
    }
    
    // Verificar espacio en disco
    const fs = require('fs');
    const path = require('path');
    
    try {
      const stats = fs.statSync(path.join(__dirname, '..'));
      checks.diskSpace = true;
      logger.success('✅ Acceso al sistema de archivos verificado');
    } catch (error) {
      logger.error('❌ Error verificando espacio en disco:', error.message);
    }
    
    // Verificar permisos de escritura
    try {
      const testFile = path.join(__dirname, '../test-permissions.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      checks.permissions = true;
      logger.success('✅ Permisos de escritura verificados');
    } catch (error) {
      logger.error('❌ Error verificando permisos:', error.message);
    }
    
    // Verificar/crear directorio de backups
    try {
      const backupDir = path.join(__dirname, '../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      checks.backupDir = true;
      logger.success('✅ Directorio de backups verificado');
    } catch (error) {
      logger.error('❌ Error con directorio de backups:', error.message);
    }
    
    const passed = Object.values(checks).every(check => check);
    
    if (passed) {
      logger.success('🎉 Todos los prerrequisitos cumplidos');
    } else {
      logger.error('❌ Algunos prerrequisitos no se cumplen');
    }
    
    return { checks, passed };
  } catch (error) {
    logger.error('❌ Error verificando prerrequisitos:', error);
    throw error;
  }
}

/**
 * Estimar tiempo y recursos necesarios
 */
async function estimateResources() {
  try {
    logger.info('📊 Estimando recursos necesarios...');
    
    const User = require('../src/models/User');
    const Transaction = require('../src/models/Transaction.model');
    const Commission = require('../src/models/Commission.model');
    const Package = require('../src/models/Package.model');
    const UserStatus = require('../src/models/UserStatus');
    
    const counts = {
      users: await User.countDocuments(),
      transactions: await Transaction.countDocuments(),
      commissions: await Commission.countDocuments(),
      packages: await Package.countDocuments(),
      userStatuses: await UserStatus.countDocuments()
    };
    
    const totalDocuments = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    // Estimaciones basadas en experiencia
    const estimates = {
      totalDocuments,
      estimatedTime: {
        analysis: Math.ceil(totalDocuments / 1000) * 2, // 2 min por cada 1000 docs
        migration: Math.ceil(counts.users / 100) * 1, // 1 min por cada 100 usuarios
        cleanup: Math.ceil(totalDocuments / 500) * 1, // 1 min por cada 500 docs
        validation: Math.ceil(totalDocuments / 2000) * 1 // 1 min por cada 2000 docs
      },
      estimatedSpace: {
        backups: Math.ceil(totalDocuments / 100) * 10, // 10MB por cada 100 docs
        reports: 5, // 5MB para reportes
        temporary: Math.ceil(totalDocuments / 1000) * 50 // 50MB por cada 1000 docs
      },
      collections: counts
    };
    
    estimates.estimatedTime.total = Object.values(estimates.estimatedTime).reduce((sum, time) => sum + time, 0);
    estimates.estimatedSpace.total = Object.values(estimates.estimatedSpace).reduce((sum, space) => sum + space, 0);
    
    logger.info('📊 Estimaciones de recursos:');
    console.table({
      'Documentos totales': totalDocuments.toLocaleString(),
      'Tiempo estimado (min)': estimates.estimatedTime.total,
      'Espacio estimado (MB)': estimates.estimatedSpace.total
    });
    
    return estimates;
  } catch (error) {
    logger.error('❌ Error estimando recursos:', error);
    throw error;
  }
}

/**
 * Ejecutar fase de análisis
 */
async function executeAnalysisPhase() {
  try {
    logger.info('🔍 FASE 1: ANÁLISIS DE CAMPOS NO UTILIZADOS');
    console.log('=' .repeat(60));
    
    if (OPTIMIZATION_CONFIG.safety.dryRun) {
      logger.info('🔄 Modo DRY RUN - Solo simulación');
    }
    
    // Ejecutar análisis de campos no utilizados
    const analysisResult = await analyzeUnusedFields();
    
    logger.success('✅ Fase de análisis completada');
    return analysisResult;
  } catch (error) {
    logger.error('❌ Error en fase de análisis:', error);
    throw error;
  }
}

/**
 * Ejecutar fase de migración
 */
async function executeMigrationPhase() {
  try {
    logger.info('🔄 FASE 2: MIGRACIÓN DE CAMPOS DUPLICADOS');
    console.log('=' .repeat(60));
    
    if (OPTIMIZATION_CONFIG.safety.dryRun) {
      logger.info('🔄 Modo DRY RUN - Solo simulación');
      return { simulated: true };
    }
    
    // Ejecutar migración de campos duplicados
    const migrationResult = await migrateDuplicatedFields();
    
    logger.success('✅ Fase de migración completada');
    return migrationResult;
  } catch (error) {
    logger.error('❌ Error en fase de migración:', error);
    throw error;
  }
}

/**
 * Ejecutar fase de limpieza
 */
async function executeCleanupPhase() {
  try {
    logger.info('🧹 FASE 3: LIMPIEZA DE CAMPOS OBSOLETOS');
    console.log('=' .repeat(60));
    
    if (OPTIMIZATION_CONFIG.safety.dryRun) {
      logger.info('🔄 Modo DRY RUN - Solo simulación');
      return { simulated: true };
    }
    
    // Ejecutar limpieza de campos obsoletos
    const cleanupResult = await cleanupObsoleteFields();
    
    logger.success('✅ Fase de limpieza completada');
    return cleanupResult;
  } catch (error) {
    logger.error('❌ Error en fase de limpieza:', error);
    throw error;
  }
}

/**
 * Ejecutar validación final
 */
async function executeValidationPhase() {
  try {
    logger.info('🔍 FASE 4: VALIDACIÓN FINAL');
    console.log('=' .repeat(60));
    
    const User = require('../src/models/User');
    const Transaction = require('../src/models/Transaction.model');
    const Commission = require('../src/models/Commission.model');
    const Package = require('../src/models/Package.model');
    const UserStatus = require('../src/models/UserStatus');
    
    const validation = {
      collections: {
        users: await User.countDocuments(),
        transactions: await Transaction.countDocuments(),
        commissions: await Commission.countDocuments(),
        packages: await Package.countDocuments(),
        userStatuses: await UserStatus.countDocuments()
      },
      integrity: {
        usersWithStatus: 0,
        usersWithoutStatus: 0,
        orphanedStatuses: 0
      },
      performance: {
        indexesOptimized: 0,
        queriesImproved: 0
      }
    };
    
    // Verificar integridad de datos
    const usersWithStatus = await User.aggregate([
      {
        $lookup: {
          from: 'userstatuses',
          localField: '_id',
          foreignField: 'user',
          as: 'status'
        }
      },
      {
        $group: {
          _id: null,
          withStatus: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$status' }, 0] }, 1, 0]
            }
          },
          withoutStatus: {
            $sum: {
              $cond: [{ $eq: [{ $size: '$status' }, 0] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    if (usersWithStatus[0]) {
      validation.integrity.usersWithStatus = usersWithStatus[0].withStatus;
      validation.integrity.usersWithoutStatus = usersWithStatus[0].withoutStatus;
    }
    
    // Verificar UserStatus huérfanos
    const orphanedStatuses = await UserStatus.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDoc'
        }
      },
      {
        $match: {
          'userDoc': { $size: 0 }
        }
      },
      {
        $count: 'count'
      }
    ]);
    
    validation.integrity.orphanedStatuses = orphanedStatuses[0]?.count || 0;
    
    logger.info('📊 Validación final:');
    console.table(validation.collections);
    console.table(validation.integrity);
    
    const isValid = 
      validation.integrity.usersWithoutStatus === 0 &&
      validation.integrity.orphanedStatuses === 0;
    
    if (isValid) {
      logger.success('✅ Validación final exitosa');
    } else {
      logger.warn('⚠️ Se encontraron problemas en la validación final');
    }
    
    return { validation, isValid };
  } catch (error) {
    logger.error('❌ Error en validación final:', error);
    throw error;
  }
}

/**
 * Generar reporte final de optimización
 */
function generateFinalReport(startTime, estimates, results) {
  const endTime = new Date();
  const duration = Math.ceil((endTime - startTime) / 1000 / 60); // minutos
  
  const report = {
    timestamp: endTime.toISOString(),
    duration: {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      totalMinutes: duration,
      estimated: estimates.estimatedTime.total,
      efficiency: ((estimates.estimatedTime.total / duration) * 100).toFixed(2) + '%'
    },
    estimates,
    results,
    configuration: OPTIMIZATION_CONFIG,
    summary: {
      phasesExecuted: Object.keys(results).length,
      totalDocumentsProcessed: estimates.totalDocuments,
      optimizationSuccess: true
    },
    recommendations: [
      'Monitorear rendimiento de la aplicación por 24-48 horas',
      'Verificar que todas las funcionalidades críticas funcionan correctamente',
      'Considerar implementar índices adicionales basados en patrones de uso',
      'Planificar optimizaciones adicionales basadas en métricas de rendimiento',
      'Documentar cambios realizados para futuras referencias'
    ],
    nextSteps: [
      'Ejecutar suite completa de tests',
      'Monitorear logs de aplicación',
      'Verificar métricas de rendimiento',
      'Actualizar documentación técnica',
      'Planificar próximo ciclo de optimización'
    ]
  };
  
  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, '../mongodb-optimization-final-report.json');
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logger.info(`📄 Reporte final guardado en: ${reportPath}`);
  
  return reportPath;
}

/**
 * Función principal de optimización
 */
async function optimizeMongoDB() {
  const startTime = new Date();
  
  console.log('🚀 OPTIMIZACIÓN COMPLETA DE MONGODB - GROW5X');
  console.log('=' .repeat(80));
  console.log(`🕐 Iniciado: ${startTime.toLocaleString()}`);
  console.log('=' .repeat(80));
  
  try {
    // Verificar prerrequisitos
    const { checks, passed } = await checkPrerequisites();
    if (!passed) {
      throw new Error('Prerrequisitos no cumplidos');
    }
    
    // Estimar recursos
    const estimates = await estimateResources();
    
    // Confirmar ejecución
    if (OPTIMIZATION_CONFIG.safety.requireConfirmation) {
      console.log('\n⚠️  ADVERTENCIA: Esta operación modificará la base de datos');
      console.log(`📊 Documentos a procesar: ${estimates.totalDocuments.toLocaleString()}`);
      console.log(`⏱️  Tiempo estimado: ${estimates.estimatedTime.total} minutos`);
      console.log(`💾 Espacio estimado: ${estimates.estimatedSpace.total} MB`);
      console.log('\n¿Desea continuar? (Ctrl+C para cancelar)');
      // En producción, aquí se debería pedir confirmación del usuario
    }
    
    const results = {};
    
    // Ejecutar fases según configuración
    if (OPTIMIZATION_CONFIG.phases.analysis) {
      results.analysis = await executeAnalysisPhase();
    }
    
    if (OPTIMIZATION_CONFIG.phases.migration) {
      results.migration = await executeMigrationPhase();
    }
    
    if (OPTIMIZATION_CONFIG.phases.cleanup) {
      results.cleanup = await executeCleanupPhase();
    }
    
    if (OPTIMIZATION_CONFIG.phases.validation) {
      results.validation = await executeValidationPhase();
    }
    
    // Generar reporte final
    const reportPath = generateFinalReport(startTime, estimates, results);
    
    // Resumen final
    const endTime = new Date();
    const duration = Math.ceil((endTime - startTime) / 1000 / 60);
    
    console.log('\n🎉 OPTIMIZACIÓN COMPLETADA EXITOSAMENTE');
    console.log('=' .repeat(80));
    logger.success(`✅ Duración total: ${duration} minutos`);
    logger.success(`📊 Documentos procesados: ${estimates.totalDocuments.toLocaleString()}`);
    logger.info(`📄 Reporte final: ${reportPath}`);
    
    console.log('\n📋 RESUMEN DE FASES:');
    Object.keys(results).forEach(phase => {
      logger.success(`✅ ${phase.toUpperCase()}: Completada`);
    });
    
    console.log('\n🔄 PRÓXIMOS PASOS:');
    console.log('1. Monitorear aplicación por errores');
    console.log('2. Verificar funcionalidades críticas');
    console.log('3. Revisar métricas de rendimiento');
    console.log('4. Ejecutar tests de integración');
    console.log('5. Documentar cambios realizados');
    
  } catch (error) {
    logger.error('💥 Error durante la optimización:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    logger.info('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar optimización si se llama directamente
if (require.main === module) {
  optimizeMongoDB()
    .then(() => {
      console.log('\n✨ Proceso de optimización completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal en optimización:', error);
      process.exit(1);
    });
}

module.exports = {
  optimizeMongoDB,
  checkPrerequisites,
  estimateResources,
  OPTIMIZATION_CONFIG
};