/**
 * Script para probar los endpoints de user-status directamente
 * sin depender de la red externa
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Importar controlador y modelos directamente
const UserStatusController = require('./src/controllers/userStatus.controller');
const User = require('./src/models/User');
const UserStatus = require('./src/models/UserStatus');

// Mock de request y response
function createMockReq(user = null, params = {}, query = {}) {
  return {
    user: user,
    params: params,
    query: query,
    ip: '127.0.0.1',
    get: () => 'Test User Agent'
  };
}

function createMockRes() {
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.data = data;
      console.log(`📤 Response [${this.statusCode || 200}]:`, JSON.stringify(data, null, 2));
      return this;
    },
    statusCode: 200,
    data: null
  };
  return res;
}

async function testDashboardMetrics() {
  console.log('\n🔍 Probando getDashboardMetrics...');
  
  try {
    // Buscar un usuario admin
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No se encontró usuario admin');
      return;
    }
    
    console.log('👤 Usuario admin encontrado:', adminUser.email);
    
    const req = createMockReq(adminUser);
    const res = createMockRes();
    
    await UserStatusController.getDashboardMetrics(req, res);
    
    if (res.data && res.data.success) {
      console.log('✅ getDashboardMetrics funciona correctamente');
      const data = res.data.data;
      console.log('📊 Métricas obtenidas:');
      console.log(`  - Total usuarios: ${data.totalUsers || 'N/A'}`);
      console.log(`  - Usuarios activos: ${data.activeUsers || 'N/A'}`);
      console.log(`  - Paquetes activos: ${data.activePackages || 'N/A'}`);
      console.log(`  - Usuarios Pioneer: ${data.pioneerUsers || 'N/A'}`);
    } else {
      console.log('❌ getDashboardMetrics falló');
    }
  } catch (error) {
    console.log('❌ Error en getDashboardMetrics:', error.message);
  }
}

async function testAttentionNeeded() {
  console.log('\n🔍 Probando getUsersNeedingAttention...');
  
  try {
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No se encontró usuario admin');
      return;
    }
    
    const req = createMockReq(adminUser);
    const res = createMockRes();
    
    await UserStatusController.getUsersNeedingAttention(req, res);
    
    if (res.data && res.data.success) {
      console.log('✅ getUsersNeedingAttention funciona correctamente');
      const users = res.data.data;
      console.log(`📋 Usuarios que necesitan atención: ${users.length}`);
      if (users.length > 0) {
        console.log('👤 Primer usuario:', {
          email: users[0].user?.email || 'N/A',
          reason: users[0].adminFlags?.attentionReason || 'N/A'
        });
      }
    } else {
      console.log('❌ getUsersNeedingAttention falló');
    }
  } catch (error) {
    console.log('❌ Error en getUsersNeedingAttention:', error.message);
  }
}

async function testBenefitProcessing() {
  console.log('\n🔍 Probando getUsersForBenefitProcessing...');
  
  try {
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No se encontró usuario admin');
      return;
    }
    
    const req = createMockReq(adminUser);
    const res = createMockRes();
    
    await UserStatusController.getUsersForBenefitProcessing(req, res);
    
    if (res.data && res.data.success) {
      console.log('✅ getUsersForBenefitProcessing funciona correctamente');
      const users = res.data.data;
      console.log(`📋 Usuarios con beneficios por procesar: ${users.length}`);
      if (users.length > 0) {
        console.log('👤 Primer usuario:', {
          email: users[0].user?.email || 'N/A',
          packageType: users[0].subscription?.packageType || 'N/A'
        });
      }
    } else {
      console.log('❌ getUsersForBenefitProcessing falló');
    }
  } catch (error) {
    console.log('❌ Error en getUsersForBenefitProcessing:', error.message);
  }
}

async function testPioneerWaiting() {
  console.log('\n🔍 Probando getUsersInPioneerWaiting...');
  
  try {
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No se encontró usuario admin');
      return;
    }
    
    const req = createMockReq(adminUser);
    const res = createMockRes();
    
    await UserStatusController.getUsersInPioneerWaiting(req, res);
    
    if (res.data && res.data.success) {
      console.log('✅ getUsersInPioneerWaiting funciona correctamente');
      const users = res.data.data;
      console.log(`📋 Usuarios Pioneer en espera: ${users.length}`);
      if (users.length > 0) {
        console.log('👤 Primer usuario:', {
          email: users[0].user?.email || 'N/A',
          pioneerLevel: users[0].pioneer?.level || 'N/A'
        });
      }
    } else {
      console.log('❌ getUsersInPioneerWaiting falló');
    }
  } catch (error) {
    console.log('❌ Error en getUsersInPioneerWaiting:', error.message);
  }
}

async function checkRawData() {
  console.log('\n🔍 Verificando datos en bruto...');
  
  try {
    // Verificar UserStatus con diferentes filtros
    const totalUserStatus = await UserStatus.countDocuments();
    const activePackages = await UserStatus.countDocuments({
      'subscription.packageStatus': 'active'
    });
    const needsAttention = await UserStatus.countDocuments({
      'adminFlags.needsAttention': true
    });
    const pioneerActive = await UserStatus.countDocuments({
      'pioneer.isActive': true
    });
    
    console.log('📊 Datos en bruto:');
    console.log(`  - Total UserStatus: ${totalUserStatus}`);
    console.log(`  - Paquetes activos: ${activePackages}`);
    console.log(`  - Necesitan atención: ${needsAttention}`);
    console.log(`  - Pioneer activos: ${pioneerActive}`);
    
    // Mostrar algunos ejemplos
    const sampleUserStatus = await UserStatus.find()
      .populate('user', 'email role status')
      .limit(3);
    
    console.log('\n📄 Ejemplos de UserStatus:');
    sampleUserStatus.forEach((us, index) => {
      console.log(`${index + 1}. Usuario: ${us.user?.email || 'N/A'}`);
      console.log(`   - Paquete: ${us.subscription?.packageType || 'N/A'} (${us.subscription?.packageStatus || 'N/A'})`);
      console.log(`   - Pioneer: ${us.pioneer?.isActive ? 'Activo' : 'Inactivo'}`);
      console.log(`   - Atención: ${us.adminFlags?.needsAttention ? 'Sí' : 'No'}`);
    });
    
  } catch (error) {
    console.log('❌ Error verificando datos en bruto:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando pruebas de endpoints user-status...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Verificar datos en bruto primero
    await checkRawData();
    
    // Probar cada endpoint
    await testDashboardMetrics();
    await testAttentionNeeded();
    await testBenefitProcessing();
    await testPioneerWaiting();
    
    console.log('\n🎉 Pruebas completadas');
    
    console.log('\n📋 DIAGNÓSTICO:');
    console.log('Si todos los endpoints funcionan pero el frontend no muestra datos:');
    console.log('1. Verificar la configuración de VITE_API_URL en el frontend');
    console.log('2. Verificar que el frontend esté usando las rutas correctas');
    console.log('3. Verificar la autenticación del token en el frontend');
    console.log('4. Verificar la consola del navegador para errores de red');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testDashboardMetrics,
  testAttentionNeeded,
  testBenefitProcessing,
  testPioneerWaiting
};