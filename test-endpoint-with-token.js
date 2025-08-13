const axios = require('axios');

const API_BASE_URL = 'http://80.78.25.79:5000/api';

async function testEndpointWithAuth() {
  try {
    console.log('🔐 Iniciando login de administrador...');
    
    // 1. Login de administrador
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      identifier: 'admin@grow5x.com',
      password: 'Admin123!'
    });
    
    const tokens = loginResponse.data.data.tokens;
    const accessToken = tokens.accessToken;
    
    console.log('✅ Login exitoso');
    console.log('🔑 Token obtenido:', accessToken.substring(0, 50) + '...');
    
    // 2. Probar endpoint con token
    console.log('\n📡 Probando endpoint /user-status/admin/attention-needed...');
    
    const endpointResponse = await axios.get(`${API_BASE_URL}/user-status/admin/attention-needed`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Endpoint funciona correctamente!');
    console.log('📊 Status:', endpointResponse.status);
    console.log('📋 Datos recibidos:', JSON.stringify(endpointResponse.data, null, 2));
    
    return {
      success: true,
      data: endpointResponse.data
    };
    
  } catch (error) {
    console.error('❌ Error completo:', JSON.stringify(error.response?.data, null, 2));
    console.error('❌ Error message:', error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

testEndpointWithAuth().then(result => {
  console.log('\n==================================================');
  if (result.success) {
    console.log('🎉 PRUEBA EXITOSA - El backend funciona correctamente');
    console.log('📈 Usuarios que necesitan atención:', result.data?.users?.length || 0);
  } else {
    console.log('💥 PRUEBA FALLIDA');
    console.log('🔍 Error:', result.error);
  }
});