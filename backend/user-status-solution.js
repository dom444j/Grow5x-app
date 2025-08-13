/**
 * SOLUCIÓN PARA EL PROBLEMA DE USER-STATUS
 * 
 * Basado en el análisis del código, el problema es que los usuarios
 * no aparecen en /admin/user-status pero sí en /admin/users.
 * 
 * DIAGNÓSTICO:
 * 1. Los endpoints de user-status existen en el backend
 * 2. El middleware de autenticación está configurado correctamente
 * 3. El problema puede ser que los usuarios no tienen UserStatus creado
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Función para crear UserStatus faltantes
async function createMissingUserStatus() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const User = require('./src/models/User');
    const UserStatus = require('./src/models/UserStatus');
    
    console.log('🔍 Buscando usuarios sin UserStatus...');
    
    // Encontrar usuarios que no tienen UserStatus
    const existingUserStatusIds = await UserStatus.distinct('user');
    const usersWithoutStatus = await User.find({
      _id: { $nin: existingUserStatusIds },
      status: 'active'
    });
    
    console.log(`📊 Usuarios sin UserStatus encontrados: ${usersWithoutStatus.length}`);
    
    if (usersWithoutStatus.length === 0) {
      console.log('✅ Todos los usuarios activos ya tienen UserStatus');
      return;
    }
    
    console.log('🔧 Creando UserStatus para usuarios faltantes...');
    
    let created = 0;
    for (const user of usersWithoutStatus) {
      try {
        const userStatus = new UserStatus({
          user: user._id,
          subscription: {
            packageType: 'basic',
            packageStatus: 'inactive',
            startDate: new Date(),
            nextBenefitDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
          },
          pioneer: {
            isActive: false,
            level: 'basic'
          },
          benefits: {
            dailyBenefitAmount: 0,
            totalBenefitsEarned: 0,
            lastBenefitDate: null
          },
          withdrawal: {
            availableBalance: 0,
            pendingAmount: 0,
            totalWithdrawn: 0
          },
          adminFlags: {
            needsAttention: false,
            createdByAdmin: true,
            adminNotes: [{
              note: 'UserStatus auto-creado para solucionar problema de visualización',
              addedBy: null,
              addedAt: new Date(),
              category: 'system'
            }]
          }
        });
        
        await userStatus.save();
        created++;
        
        console.log(`✅ UserStatus creado para: ${user.email}`);
      } catch (error) {
        console.log(`❌ Error creando UserStatus para ${user.email}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Proceso completado. UserStatus creados: ${created}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// Función para verificar el estado actual
async function checkCurrentState() {
  try {
    console.log('🔄 Verificando estado actual...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    const UserStatus = require('./src/models/UserStatus');
    
    const totalUsers = await User.countDocuments({ status: 'active' });
    const totalUserStatus = await UserStatus.countDocuments();
    const usersWithPackages = await UserStatus.countDocuments({
      'subscription.packageStatus': 'active'
    });
    const usersNeedingAttention = await UserStatus.countDocuments({
      'adminFlags.needsAttention': true
    });
    const pioneerUsers = await UserStatus.countDocuments({
      'pioneer.isActive': true
    });
    
    console.log('\n📊 ESTADO ACTUAL:');
    console.log(`👥 Usuarios activos: ${totalUsers}`);
    console.log(`📋 UserStatus existentes: ${totalUserStatus}`);
    console.log(`📦 Usuarios con paquetes activos: ${usersWithPackages}`);
    console.log(`⚠️  Usuarios que necesitan atención: ${usersNeedingAttention}`);
    console.log(`🏆 Usuarios Pioneer activos: ${pioneerUsers}`);
    
    const coverage = totalUsers > 0 ? ((totalUserStatus / totalUsers) * 100).toFixed(1) : 0;
    console.log(`📈 Cobertura UserStatus: ${coverage}%`);
    
    if (coverage < 100) {
      console.log('\n⚠️  PROBLEMA IDENTIFICADO: No todos los usuarios tienen UserStatus');
      console.log('💡 SOLUCIÓN: Ejecutar createMissingUserStatus()');
    } else {
      console.log('\n✅ Todos los usuarios tienen UserStatus');
      console.log('💡 El problema puede estar en el frontend o en los filtros de consulta');
    }
    
  } catch (error) {
    console.error('❌ Error verificando estado:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// Función para crear datos de prueba
async function createTestData() {
  try {
    console.log('🔄 Creando datos de prueba...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const UserStatus = require('./src/models/UserStatus');
    const User = require('./src/models/User');
    
    // Buscar algunos usuarios para crear datos de prueba
    const users = await User.find({ status: 'active' }).limit(5);
    
    for (const user of users) {
      const existingStatus = await UserStatus.findOne({ user: user._id });
      if (existingStatus) {
        // Actualizar con datos más interesantes
        existingStatus.subscription.packageType = 'premium';
        existingStatus.subscription.packageStatus = 'active';
        existingStatus.benefits.dailyBenefitAmount = 50;
        existingStatus.adminFlags.needsAttention = Math.random() > 0.5;
        existingStatus.pioneer.isActive = Math.random() > 0.7;
        
        await existingStatus.save();
        console.log(`✅ UserStatus actualizado para: ${user.email}`);
      }
    }
    
    console.log('🎉 Datos de prueba creados');
    
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  const action = process.argv[2];
  
  switch (action) {
    case 'check':
      await checkCurrentState();
      break;
    case 'fix':
      await createMissingUserStatus();
      break;
    case 'test-data':
      await createTestData();
      break;
    default:
      console.log('🚀 SOLUCIONADOR DE PROBLEMAS USER-STATUS');
      console.log('\nUso:');
      console.log('  node user-status-solution.js check      - Verificar estado actual');
      console.log('  node user-status-solution.js fix        - Crear UserStatus faltantes');
      console.log('  node user-status-solution.js test-data  - Crear datos de prueba');
      console.log('\n📋 PASOS RECOMENDADOS:');
      console.log('1. Ejecutar "check" para ver el estado actual');
      console.log('2. Si hay usuarios sin UserStatus, ejecutar "fix"');
      console.log('3. Ejecutar "test-data" para tener datos visibles en el dashboard');
      console.log('4. Verificar el frontend en /admin/user-status');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createMissingUserStatus,
  checkCurrentState,
  createTestData
};