const axios = require('axios');
require('dotenv').config();

// Test login de admin y luego endpoint de usuarios
async function testAdminFlow() {
  try {
    console.log('🔐 Haciendo login como administrador...');
    
    // 1. Login como admin
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'admin@grow5x.com',
      password: 'Admin2024!'
    });
    
    console.log('✅ Login exitoso');
    console.log('📋 Datos del usuario:', {
      email: loginResponse.data.data.user.email,
      role: loginResponse.data.data.user.role,
      fullName: loginResponse.data.data.user.fullName
    });
    
    const adminToken = loginResponse.data.data.tokens.accessToken;
    console.log('🎫 Token obtenido:', adminToken.substring(0, 50) + '...');
    
    // 2. Probar endpoint de usuarios con token de admin
    console.log('\n🔍 Probando endpoint /api/admin/users con token de admin...');
    
    const usersResponse = await axios.get('http://localhost:3000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        page: 1,
        limit: 10
      }
    });
    
    console.log('✅ Endpoint funcionando correctamente');
    console.log('📊 Status:', usersResponse.status);
    console.log('📊 Total usuarios:', usersResponse.data.data?.pagination?.totalUsers || 'N/A');
    
    if (usersResponse.data.data && usersResponse.data.data.users) {
      console.log(`👥 Usuarios encontrados: ${usersResponse.data.data.users.length}`);
      console.log('\n📋 Primeros 3 usuarios:');
      usersResponse.data.data.users.slice(0, 3).forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.fullName} (${user.email})`);
        console.log(`     - Rol: ${user.role || 'user'}`);
        console.log(`     - Status: ${user.status}`);
        console.log(`     - Paquete: ${user.packageInfo?.package || 'ninguno'}`);
      });
      
      console.log('\n📈 Estadísticas:');
      if (usersResponse.data.data.stats) {
        console.log(`  - Total usuarios: ${usersResponse.data.data.stats.totalUsers}`);
        console.log(`  - Usuarios con paquetes activos: ${usersResponse.data.data.stats.usersWithActivePackages}`);
        console.log(`  - Necesitan atención: ${usersResponse.data.data.stats.usersNeedingAttention}`);
        console.log(`  - Usuarios especiales: ${usersResponse.data.data.stats.specialUsers}`);
        console.log(`  - Usuarios pioneros: ${usersResponse.data.data.stats.pioneerUsers}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('📄 Status:', error.response.status);
      console.error('📄 Data:', error.response.data);
    }
  }
}

testAdminFlow();