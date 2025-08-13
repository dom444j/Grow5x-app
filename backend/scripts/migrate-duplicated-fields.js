const mongoose = require('mongoose');
const User = require('../src/models/User');
const UserStatus = require('../src/models/UserStatus');
const logger = require('../src/utils/logger');
require('dotenv').config();

/**
 * Script para migrar campos duplicados entre User y UserStatus
 * Este script sincroniza los datos y prepara para la eliminación de duplicados
 */

// Mapeo de campos duplicados
const FIELD_MAPPING = {
  // User -> UserStatus
  'package_status': 'subscription.packageStatus',
  'current_package': 'subscription.currentPackage',
  'isPioneer': 'pioneer.isActive',
  'balance': 'financial.currentBalance',
  'totalEarnings': 'financial.totalEarnings'
};

/**
 * Analizar inconsistencias entre User y UserStatus
 */
async function analyzeInconsistencies() {
  try {
    logger.info('🔍 Analizando inconsistencias entre User y UserStatus...');
    
    const inconsistencies = {
      missingUserStatus: [],
      fieldMismatches: [],
      summary: {
        totalUsers: 0,
        usersWithStatus: 0,
        usersWithoutStatus: 0,
        inconsistentFields: 0
      }
    };
    
    // Obtener todos los usuarios
    const users = await User.find({}).lean();
    inconsistencies.summary.totalUsers = users.length;
    
    for (const user of users) {
      // Verificar si existe UserStatus
      const userStatus = await UserStatus.findOne({ user: user._id }).lean();
      
      if (!userStatus) {
        inconsistencies.missingUserStatus.push({
          userId: user._id,
          email: user.email,
          package_status: user.package_status,
          current_package: user.current_package,
          isPioneer: user.isPioneer,
          balance: user.balance,
          totalEarnings: user.totalEarnings
        });
        inconsistencies.summary.usersWithoutStatus++;
      } else {
        inconsistencies.summary.usersWithStatus++;
        
        // Verificar inconsistencias en campos
        const mismatches = [];
        
        // package_status vs subscription.packageStatus
        if (user.package_status !== userStatus.subscription?.packageStatus) {
          mismatches.push({
            field: 'package_status',
            userValue: user.package_status,
            statusValue: userStatus.subscription?.packageStatus
          });
        }
        
        // current_package vs subscription.currentPackage
        if (user.current_package?.toString() !== userStatus.subscription?.currentPackage?.toString()) {
          mismatches.push({
            field: 'current_package',
            userValue: user.current_package,
            statusValue: userStatus.subscription?.currentPackage
          });
        }
        
        // isPioneer vs pioneer.isActive
        if (user.isPioneer !== userStatus.pioneer?.isActive) {
          mismatches.push({
            field: 'isPioneer',
            userValue: user.isPioneer,
            statusValue: userStatus.pioneer?.isActive
          });
        }
        
        // balance vs financial.currentBalance
        if (Math.abs((user.balance || 0) - (userStatus.financial?.currentBalance || 0)) > 0.01) {
          mismatches.push({
            field: 'balance',
            userValue: user.balance,
            statusValue: userStatus.financial?.currentBalance
          });
        }
        
        // totalEarnings vs financial.totalEarnings
        if (Math.abs((user.totalEarnings || 0) - (userStatus.financial?.totalEarnings || 0)) > 0.01) {
          mismatches.push({
            field: 'totalEarnings',
            userValue: user.totalEarnings,
            statusValue: userStatus.financial?.totalEarnings
          });
        }
        
        if (mismatches.length > 0) {
          inconsistencies.fieldMismatches.push({
            userId: user._id,
            email: user.email,
            mismatches
          });
          inconsistencies.summary.inconsistentFields++;
        }
      }
    }
    
    logger.info('📊 Análisis de inconsistencias completado:');
    console.table(inconsistencies.summary);
    
    if (inconsistencies.missingUserStatus.length > 0) {
      logger.warn(`⚠️ ${inconsistencies.missingUserStatus.length} usuarios sin UserStatus`);
    }
    
    if (inconsistencies.fieldMismatches.length > 0) {
      logger.warn(`⚠️ ${inconsistencies.fieldMismatches.length} usuarios con campos inconsistentes`);
    }
    
    return inconsistencies;
  } catch (error) {
    logger.error('❌ Error analizando inconsistencias:', error);
    throw error;
  }
}

/**
 * Crear UserStatus faltantes
 */
async function createMissingUserStatus(missingUsers) {
  try {
    logger.info(`🔄 Creando ${missingUsers.length} UserStatus faltantes...`);
    
    let created = 0;
    
    for (const userData of missingUsers) {
      try {
        const userStatus = new UserStatus({
          user: userData.userId,
          subscription: {
            packageStatus: userData.package_status || 'inactive',
            currentPackage: userData.current_package || null,
            startDate: new Date(),
            isActive: userData.package_status === 'active'
          },
          pioneer: {
            isActive: userData.isPioneer || false,
            startDate: userData.isPioneer ? new Date() : null
          },
          financial: {
            currentBalance: userData.balance || 0,
            totalEarnings: userData.totalEarnings || 0,
            totalWithdrawals: 0,
            totalInvestments: 0
          },
          activity: {
            lastLogin: new Date(),
            loginCount: 0,
            isActive: true
          }
        });
        
        await userStatus.save();
        created++;
        
        if (created % 100 === 0) {
          logger.info(`📈 Progreso: ${created}/${missingUsers.length} UserStatus creados`);
        }
      } catch (error) {
        logger.error(`❌ Error creando UserStatus para usuario ${userData.userId}:`, error.message);
      }
    }
    
    logger.success(`✅ ${created} UserStatus creados exitosamente`);
    return created;
  } catch (error) {
    logger.error('❌ Error creando UserStatus faltantes:', error);
    throw error;
  }
}

/**
 * Sincronizar campos inconsistentes
 */
async function syncInconsistentFields(inconsistentUsers) {
  try {
    logger.info(`🔄 Sincronizando ${inconsistentUsers.length} usuarios con campos inconsistentes...`);
    
    let synced = 0;
    
    for (const userData of inconsistentUsers) {
      try {
        const user = await User.findById(userData.userId);
        const userStatus = await UserStatus.findOne({ user: userData.userId });
        
        if (!user || !userStatus) {
          logger.warn(`⚠️ Usuario o UserStatus no encontrado: ${userData.userId}`);
          continue;
        }
        
        let updated = false;
        const updates = {};
        
        // Sincronizar cada campo inconsistente
        for (const mismatch of userData.mismatches) {
          switch (mismatch.field) {
            case 'package_status':
              updates['subscription.packageStatus'] = user.package_status;
              updates['subscription.isActive'] = user.package_status === 'active';
              updated = true;
              break;
              
            case 'current_package':
              updates['subscription.currentPackage'] = user.current_package;
              updated = true;
              break;
              
            case 'isPioneer':
              updates['pioneer.isActive'] = user.isPioneer;
              if (user.isPioneer && !userStatus.pioneer?.startDate) {
                updates['pioneer.startDate'] = new Date();
              }
              updated = true;
              break;
              
            case 'balance':
              updates['financial.currentBalance'] = user.balance || 0;
              updated = true;
              break;
              
            case 'totalEarnings':
              updates['financial.totalEarnings'] = user.totalEarnings || 0;
              updated = true;
              break;
          }
        }
        
        if (updated) {
          await UserStatus.updateOne(
            { user: userData.userId },
            { $set: updates }
          );
          synced++;
        }
        
        if (synced % 100 === 0) {
          logger.info(`📈 Progreso: ${synced}/${inconsistentUsers.length} usuarios sincronizados`);
        }
      } catch (error) {
        logger.error(`❌ Error sincronizando usuario ${userData.userId}:`, error.message);
      }
    }
    
    logger.success(`✅ ${synced} usuarios sincronizados exitosamente`);
    return synced;
  } catch (error) {
    logger.error('❌ Error sincronizando campos inconsistentes:', error);
    throw error;
  }
}

/**
 * Validar migración
 */
async function validateMigration() {
  try {
    logger.info('🔍 Validando migración...');
    
    const validation = {
      totalUsers: await User.countDocuments(),
      totalUserStatus: await UserStatus.countDocuments(),
      usersWithoutStatus: 0,
      remainingInconsistencies: 0
    };
    
    // Verificar usuarios sin UserStatus
    const usersWithoutStatus = await User.aggregate([
      {
        $lookup: {
          from: 'userstatuses',
          localField: '_id',
          foreignField: 'user',
          as: 'status'
        }
      },
      {
        $match: {
          'status': { $size: 0 }
        }
      },
      {
        $count: 'count'
      }
    ]);
    
    validation.usersWithoutStatus = usersWithoutStatus[0]?.count || 0;
    
    // Verificar inconsistencias restantes
    const users = await User.find({}).limit(1000).lean();
    
    for (const user of users) {
      const userStatus = await UserStatus.findOne({ user: user._id }).lean();
      
      if (userStatus) {
        // Verificar si aún hay inconsistencias
        const hasInconsistencies = 
          user.package_status !== userStatus.subscription?.packageStatus ||
          user.current_package?.toString() !== userStatus.subscription?.currentPackage?.toString() ||
          user.isPioneer !== userStatus.pioneer?.isActive ||
          Math.abs((user.balance || 0) - (userStatus.financial?.currentBalance || 0)) > 0.01 ||
          Math.abs((user.totalEarnings || 0) - (userStatus.financial?.totalEarnings || 0)) > 0.01;
        
        if (hasInconsistencies) {
          validation.remainingInconsistencies++;
        }
      }
    }
    
    logger.info('📊 Validación de migración:');
    console.table(validation);
    
    const isValid = 
      validation.usersWithoutStatus === 0 &&
      validation.remainingInconsistencies === 0;
    
    if (isValid) {
      logger.success('✅ Migración validada exitosamente');
    } else {
      logger.warn('⚠️ Se encontraron problemas en la validación');
    }
    
    return { validation, isValid };
  } catch (error) {
    logger.error('❌ Error validando migración:', error);
    throw error;
  }
}

/**
 * Generar reporte de migración
 */
function generateMigrationReport(inconsistencies, results, validation) {
  const report = {
    timestamp: new Date().toISOString(),
    inconsistencies: {
      summary: inconsistencies.summary,
      missingUserStatusCount: inconsistencies.missingUserStatus.length,
      fieldMismatchesCount: inconsistencies.fieldMismatches.length
    },
    results: {
      userStatusCreated: results.created,
      usersSynced: results.synced
    },
    validation,
    fieldMapping: FIELD_MAPPING,
    recommendations: [
      'Verificar que todas las funcionalidades usan UserStatus en lugar de campos duplicados en User',
      'Actualizar consultas y agregaciones para usar UserStatus',
      'Considerar eliminar campos duplicados de User después de validar',
      'Implementar triggers o middleware para mantener sincronización automática',
      'Monitorear rendimiento después de la migración'
    ],
    nextSteps: [
      'Ejecutar tests de integración',
      'Verificar APIs que usan campos duplicados',
      'Actualizar documentación de esquemas',
      'Planificar eliminación de campos duplicados en User'
    ]
  };
  
  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, '../migrate-duplicated-fields-report.json');
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logger.info(`📄 Reporte de migración guardado en: ${reportPath}`);
  
  return reportPath;
}

/**
 * Función principal de migración
 */
async function migrateDuplicatedFields() {
  console.log('🔄 MIGRACIÓN DE CAMPOS DUPLICADOS - GROW5X');
  console.log('=' .repeat(60));
  
  try {
    // Conectar a MongoDB
    logger.info('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.success('✅ Conectado a MongoDB');
    
    // Analizar inconsistencias
    const inconsistencies = await analyzeInconsistencies();
    
    // Crear UserStatus faltantes
    const created = await createMissingUserStatus(inconsistencies.missingUserStatus);
    
    // Sincronizar campos inconsistentes
    const synced = await syncInconsistentFields(inconsistencies.fieldMismatches);
    
    // Validar migración
    const { validation, isValid } = await validateMigration();
    
    // Generar reporte
    const reportPath = generateMigrationReport(
      inconsistencies,
      { created, synced },
      validation
    );
    
    // Resumen final
    console.log('\n📋 RESUMEN DE MIGRACIÓN');
    console.log('=' .repeat(60));
    logger.success(`✅ UserStatus creados: ${created}`);
    logger.success(`✅ Usuarios sincronizados: ${synced}`);
    logger.info(`📄 Reporte completo en: ${reportPath}`);
    
    if (isValid) {
      logger.success('🎉 Migración completada exitosamente');
    } else {
      logger.warn('⚠️ Migración completada con advertencias - Revisar reporte');
    }
    
    console.log('\n🔄 PRÓXIMOS PASOS:');
    console.log('1. Verificar funcionalidades que usan campos duplicados');
    console.log('2. Actualizar consultas para usar UserStatus');
    console.log('3. Ejecutar tests de integración');
    console.log('4. Considerar eliminar campos duplicados de User');
    
  } catch (error) {
    logger.error('💥 Error durante la migración:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    logger.info('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrateDuplicatedFields()
    .then(() => {
      console.log('\n✨ Proceso de migración completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = {
  migrateDuplicatedFields,
  analyzeInconsistencies,
  createMissingUserStatus,
  syncInconsistentFields,
  validateMigration
};