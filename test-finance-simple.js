const axios = require('axios');
const colors = require('colors');

// Configuración
const API_BASE_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@grow5x.com';
const ADMIN_PASSWORD = 'Admin2024!';

// Usuarios reales para pruebas
const testUsers = [
  {
    email: 'negociosmillonaris1973@gmail.com',
    password: 'Parent2024!',
    name: 'Usuario Padre',
    role: 'PADRE'
  },
  {
    email: 'edgarpayares2005@gmail.com', 
    password: 'Leader2024!',
    name: 'Usuario Líder',
    role: 'LIDER'
  },
  {
    email: 'clubnetwin@hotmail.com',
    password: 'Test2024!',
    name: 'Usuario Test',
    role: 'TEST'
  }
];

let adminToken = null;

// Función para hacer login como admin
async function loginAsAdmin() {
  try {
    console.log('🔐 Iniciando sesión como administrador...'.blue);
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      identifier: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data.success) {
      adminToken = response.data.data.tokens.accessToken;
      console.log('✅ Login exitoso como administrador'.green);
      return true;
    }
    return false;
  } catch (error) {
    console.log('❌ Error en login de administrador:'.red, error.response?.data?.message || error.message);
    return false;
  }
}

// Función para probar endpoints básicos de admin
async function testBasicAdminEndpoints() {
  console.log('\n📊 Probando endpoints básicos de administración...'.blue);
  
  const endpoints = [
    { name: 'Dashboard Stats', url: '/admin/stats/dashboard' },
    { name: 'Users List', url: '/admin/users?page=1&limit=5' },
    { name: 'Pending Withdrawals', url: '/admin/withdrawals/pending' },
    { name: 'Transactions', url: '/admin/transactions?limit=5' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint.url}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (response.data.success) {
        console.log(`✅ ${endpoint.name}: OK`.green);
        
        // Mostrar información relevante
        if (endpoint.name === 'Users List' && response.data.data?.users) {
          console.log(`   - Usuarios encontrados: ${response.data.data.users.length}`);
        }
        if (endpoint.name === 'Pending Withdrawals' && response.data.data) {
          const withdrawals = Array.isArray(response.data.data) ? response.data.data : response.data.data.withdrawals || [];
          console.log(`   - Retiros pendientes: ${withdrawals.length}`);
        }
        if (endpoint.name === 'Transactions' && response.data.data) {
          const transactions = Array.isArray(response.data.data) ? response.data.data : response.data.data.transactions || [];
          console.log(`   - Transacciones: ${transactions.length}`);
        }
      } else {
        console.log(`⚠️  ${endpoint.name}: Respuesta sin éxito`.yellow);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.response?.status || 'Error'} - ${error.response?.data?.message || error.message}`.red);
    }
  }
}

// Función para probar login de usuarios reales
async function testUserLogins() {
  console.log('\n👥 Probando login de usuarios reales...'.blue);
  
  const successfulUsers = [];
  
  for (const user of testUsers) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        identifier: user.email,
        password: user.password
      });
      
      if (response.data.success) {
        console.log(`✅ ${user.name} (${user.role}): Login exitoso`.green);
        successfulUsers.push({
          ...user,
          id: response.data.data.user._id,
          token: response.data.data.tokens.accessToken
        });
      }
    } catch (error) {
      console.log(`❌ ${user.name} (${user.role}): ${error.response?.data?.message || error.message}`.red);
    }
  }
  
  return successfulUsers;
}

// Función para probar creación de retiro
async function testWithdrawalCreation(user) {
  try {
    console.log(`\n🏦 Probando creación de retiro para ${user.name}...`.blue);
    
    const withdrawalData = {
      amount: 10,
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db44',
      network: 'BSC',
      priority: 'normal'
    };
    
    const response = await axios.post(`${API_BASE_URL}/withdrawals`, withdrawalData, {
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log(`✅ Retiro creado exitosamente para ${user.name}`.green);
      console.log(`   - ID: ${response.data.data.id || response.data.data._id}`);
      console.log(`   - Monto: $${withdrawalData.amount}`);
      return response.data.data;
    }
  } catch (error) {
    console.log(`❌ Error creando retiro para ${user.name}: ${error.response?.data?.message || error.message}`.red);
    return null;
  }
}

// Función principal
async function main() {
  console.log('🚀 PRUEBA SIMPLE DEL MÓDULO DE FINANZAS'.cyan);
  console.log('==========================================\n');
  
  try {
    // 1. Login como administrador
    const adminLoginSuccess = await loginAsAdmin();
    if (!adminLoginSuccess) {
      console.log('❌ No se pudo hacer login como administrador. Terminando pruebas.'.red);
      return;
    }
    
    // 2. Probar endpoints básicos
    await testBasicAdminEndpoints();
    
    // 3. Probar login de usuarios
    const successfulUsers = await testUserLogins();
    
    // 4. Probar creación de retiros con usuarios exitosos
    if (successfulUsers.length > 0) {
      console.log(`\n🎯 Probando creación de retiros con ${successfulUsers.length} usuarios...`.blue);
      
      for (const user of successfulUsers.slice(0, 2)) { // Solo los primeros 2 usuarios
        await testWithdrawalCreation(user);
      }
      
      // 5. Verificar retiros pendientes después de crear algunos
      console.log('\n🔄 Verificando retiros pendientes después de las pruebas...'.blue);
      await testBasicAdminEndpoints();
    }
    
    console.log('\n============================================'.cyan);
    console.log('✅ PRUEBAS COMPLETADAS'.green);
    console.log(`📊 Usuarios probados: ${testUsers.length}`);
    console.log(`✅ Usuarios exitosos: ${successfulUsers.length}`);
    console.log('🌐 Módulo disponible en: http://localhost:5173/admin/finance'.blue);
    
  } catch (error) {
    console.log('❌ Error general en las pruebas:'.red, error.message);
  }
}

// Ejecutar pruebas
main();