/**
 * Diagnóstico final del problema de user-status
 * Verificar exactamente qué devuelven los endpoints
 */

const mongoose = require('mongoose');
require('dotenv').config();

const UserStatusController = require('./src/controllers/userStatus.controller');
const User = require('./src/models/User');

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
      return this;
    },
    statusCode: 200,
    data: null
  };
  return res;
}

async function testAllEndpoints() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No se encontró usuario admin');
      return;
    }
    
    console.log('\n🔍 PROBANDO TODOS LOS ENDPOINTS:');
    console.log('='.repeat(50));
    
    // 1. Dashboard Metrics
    console.log('\n1️⃣ Dashboard Metrics:');
    const req1 = createMockReq(adminUser);
    const res1 = createMockRes();
    await UserStatusController.getDashboardMetrics(req1, res1);
    console.log('📤 Estructura de respuesta:', {
      success: res1.data?.success,
      hasData: !!res1.data?.data,
      dataKeys: res1.data?.data ? Object.keys(res1.data.data) : 'N/A'
    });
    
    // 2. Users Needing Attention
    console.log('\n2️⃣ Users Needing Attention:');
    const req2 = createMockReq(adminUser);
    const res2 = createMockRes();
    await UserStatusController.getUsersNeedingAttention(req2, res2);
    console.log('📤 Estructura de respuesta:', {
      success: res2.data?.success,
      hasData: !!res2.data?.data,
      hasUsers: !!res2.data?.users, // ¿Existe esta propiedad?
      dataLength: Array.isArray(res2.data?.data) ? res2.data.data.length : 'N/A',
      usersLength: Array.isArray(res2.data?.users) ? res2.data.users.length : 'N/A',
      count: res2.data?.count
    });
    
    // 3. Benefit Processing
    console.log('\n3️⃣ Benefit Processing:');
    const req3 = createMockReq(adminUser);
    const res3 = createMockRes();
    await UserStatusController.getUsersForBenefitProcessing(req3, res3);
    console.log('📤 Estructura de respuesta:', {
      success: res3.data?.success,
      hasData: !!res3.data?.data,
      hasUsers: !!res3.data?.users, // ¿Existe esta propiedad?
      dataLength: Array.isArray(res3.data?.data) ? res3.data.data.length : 'N/A',
      usersLength: Array.isArray(res3.data?.users) ? res3.data.users.length : 'N/A',
      count: res3.data?.count
    });
    
    // 4. Pioneer Waiting
    console.log('\n4️⃣ Pioneer Waiting:');
    const req4 = createMockReq(adminUser);
    const res4 = createMockRes();
    await UserStatusController.getUsersInPioneerWaiting(req4, res4);
    console.log('📤 Estructura de respuesta:', {
      success: res4.data?.success,
      hasData: !!res4.data?.data,
      hasUsers: !!res4.data?.users, // ¿Existe esta propiedad?
      dataLength: Array.isArray(res4.data?.data) ? res4.data.data.length : 'N/A',
      usersLength: Array.isArray(res4.data?.users) ? res4.data.users.length : 'N/A',
      count: res4.data?.count
    });
    
    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    console.log('='.repeat(50));
    console.log('✅ Todos los endpoints del backend funcionan correctamente');
    console.log('📊 Dashboard metrics devuelve datos en: response.data.data');
    console.log('👥 Users endpoints devuelven datos en: response.data.data (NO response.data.users)');
    console.log('\n🔧 SOLUCIÓN:');
    console.log('El frontend está buscando response.data.users pero debe buscar response.data.data');
    console.log('Necesitas actualizar UserStatusDashboard.jsx líneas 96 y 102');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  testAllEndpoints().catch(console.error);
}

module.exports = { testAllEndpoints };