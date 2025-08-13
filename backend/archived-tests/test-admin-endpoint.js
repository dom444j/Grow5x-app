const axios = require('axios');
require('dotenv').config();

async function testAdminEndpoint() {
  try {
    console.log('🔄 Probando endpoint /admin/users...');
    
    const response = await axios.get('http://localhost:3000/api/admin/users', {
      params: {
        page: 1,
        limit: 10
      },
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODhiYjZlYzY3MDQzMmYxZTFmZTQ2NTQiLCJpYXQiOjE3NTQ2MzA2MjksImV4cCI6MTc1NTIzNTQyOX0.d6G3rlCk_cQv2m0bgvyqQSh_whblbl5sdOpBDv-aQyA',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Respuesta exitosa del endpoint');
    console.log('📊 Status:', response.status);
    console.log('📋 Datos recibidos:');
    console.log('- Success:', response.data.success);
    console.log('- Usuarios encontrados:', response.data.data?.users?.length || 0);
    console.log('- Total usuarios:', response.data.data?.pagination?.totalUsers || 0);
    
    if (response.data.data?.users?.length > 0) {
      console.log('👥 Primeros usuarios:');
      response.data.data.users.slice(0, 3).forEach((user, i) => {
        console.log(`${i+1}. ${user.fullName || 'Sin nombre'} (${user.email}) - ${user.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error en el endpoint:', error.response?.status, error.response?.statusText);
    console.error('📋 Mensaje:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('📄 Datos de error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAdminEndpoint();