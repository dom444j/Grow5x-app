const axios = require('axios');
require('dotenv').config();

/**
 * Script de diagnóstico para el problema de user-status
 * Sigue el plan de 3 pasos propuesto:
 * 1. Verificar que el backend devuelve datos para endpoints de user-status
 * 2. Verificar que el frontend usa las rutas correctas
 * 3. Implementar fallback si es necesario
 */

const API_BASE = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@grow5x.com';
const ADMIN_PASSWORD = 'Admin2024!';

let adminToken = null;

async function loginAdmin() {
  try {
    console.log('🔐 Iniciando sesión como administrador...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      identifier: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      userType: 'admin'
    });
    
    if (response.data.success && response.data.data && response.data.data.tokens) {
      adminToken = response.data.data.tokens.accessToken;
      console.log('✅ Login exitoso');
      console.log('👤 Usuario:', response.data.data.user.email);
      console.log('👑 Rol:', response.data.data.user.role);
      return true;
    } else {
      console.log('❌ Login falló:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error en login:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testUserStatusEndpoints() {
  if (!adminToken) {
    console.log('❌ No hay token de administrador');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  const endpoints = [
    '/user-status/admin/dashboard-metrics',
    '/user-status/admin/attention-needed',
    '/user-status/admin/benefit-processing',
    '/user-status/admin/pioneer-waiting'
  ];

  console.log('\n🔍 PASO 1: Verificando endpoints de user-status...');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Probando: ${endpoint}`);
      const response = await axios.get(`${API_BASE}${endpoint}`, { headers });
      
      if (response.data.success) {
        console.log('✅ Endpoint funciona');
        console.log('📊 Datos recibidos:', {
          hasData: !!response.data.data,
          dataType: typeof response.data.data,
          dataLength: Array.isArray(response.data.data) ? response.data.data.length : 'N/A'
        });
        
        // Mostrar muestra de datos si existen
        if (response.data.data) {
          if (Array.isArray(response.data.data)) {
            console.log(`📋 Total de elementos: ${response.data.data.length}`);
            if (response.data.data.length > 0) {
              console.log('📄 Primer elemento:', JSON.stringify(response.data.data[0], null, 2));
            }
          } else {
            console.log('📄 Datos:', JSON.stringify(response.data.data, null, 2));
          }
        } else {
          console.log('⚠️  Endpoint devuelve datos vacíos');
        }
      } else {
        console.log('❌ Endpoint devuelve error:', response.data.message);
      }
    } catch (error) {
      console.log('❌ Error en endpoint:', error.response?.status, error.response?.data?.message || error.message);
    }
  }
}

async function testFallbackEndpoint() {
  if (!adminToken) {
    console.log('❌ No hay token de administrador');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  console.log('\n🔍 PASO 3: Verificando endpoint de fallback (/api/admin/users)...');
  
  try {
    const response = await axios.get(`${API_BASE}/admin/users`, { headers });
    
    if (response.data.success) {
      console.log('✅ Endpoint de fallback funciona');
      console.log('📊 Usuarios encontrados:', response.data.data?.users?.length || 0);
      
      if (response.data.data?.users?.length > 0) {
        console.log('📄 Primer usuario:', JSON.stringify(response.data.data.users[0], null, 2));
      }
    } else {
      console.log('❌ Endpoint de fallback falló:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Error en endpoint de fallback:', error.response?.status, error.response?.data?.message || error.message);
  }
}

async function checkDatabaseDirectly() {
  console.log('\n🔍 Verificando base de datos directamente...');
  
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    const UserStatus = require('./src/models/UserStatus.model');
    const User = require('./src/models/User');
    
    const totalUsers = await User.countDocuments();
    const totalUserStatus = await UserStatus.countDocuments();
    
    console.log('📊 Estadísticas de base de datos:');
    console.log(`👥 Total usuarios: ${totalUsers}`);
    console.log(`📋 Total UserStatus: ${totalUserStatus}`);
    
    // Verificar usuarios sin UserStatus
    const usersWithoutStatus = await User.find({
      _id: { $nin: await UserStatus.distinct('user') }
    }).limit(5);
    
    console.log(`⚠️  Usuarios sin UserStatus: ${usersWithoutStatus.length}`);
    if (usersWithoutStatus.length > 0) {
      console.log('📄 Ejemplos:', usersWithoutStatus.map(u => ({ id: u._id, email: u.email })));
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.log('❌ Error verificando base de datos:', error.message);
  }
}

async function main() {
  console.log('🚀 Iniciando diagnóstico de user-status...');
  console.log('🌐 API Base:', API_BASE);
  
  // Paso 1: Login y verificar endpoints
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    console.log('❌ No se pudo hacer login. Abortando diagnóstico.');
    return;
  }
  
  // Paso 2: Probar endpoints de user-status
  await testUserStatusEndpoints();
  
  // Paso 3: Probar endpoint de fallback
  await testFallbackEndpoint();
  
  // Paso 4: Verificar base de datos
  await checkDatabaseDirectly();
  
  console.log('\n✅ Diagnóstico completado');
  console.log('\n📋 RESUMEN:');
  console.log('1. Si los endpoints de user-status devuelven datos vacíos, el problema está en el backend');
  console.log('2. Si los endpoints funcionan pero el frontend no muestra datos, el problema está en el frontend');
  console.log('3. Si hay usuarios sin UserStatus, ejecutar el script de creación masiva');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { loginAdmin, testUserStatusEndpoints, testFallbackEndpoint };