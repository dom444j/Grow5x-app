const axios = require('axios');

// Simular una llamada desde el frontend
async function testFrontendBackendConnection() {
  try {
    console.log('🧪 Probando conexión Frontend -> Backend');
    console.log('URL Base:', 'http://localhost:3000');
    console.log('Endpoint:', '/api/admin/special-codes');
    
    // Probar sin autenticación primero
    console.log('\n1️⃣ Probando sin autenticación...');
    try {
      const response = await axios.get('http://localhost:3000/api/admin/special-codes');
      console.log('✅ Respuesta sin auth:', response.status);
    } catch (error) {
      console.log('❌ Error sin auth:', error.response?.status, error.response?.data?.message);
    }
    
    // Probar con token inválido
    console.log('\n2️⃣ Probando con token inválido...');
    try {
      const response = await axios.get('http://localhost:3000/api/admin/special-codes', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      console.log('✅ Respuesta con token inválido:', response.status);
    } catch (error) {
      console.log('❌ Error con token inválido:', error.response?.status, error.response?.data?.message);
    }
    
    // Probar con token válido
    console.log('\n3️⃣ Probando con token válido...');
    const jwt = require('jsonwebtoken');
    const validToken = jwt.sign(
      { userId: '688ae3670031bee7e1534808' },
      'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: '1h' }
    );
    
    try {
      const response = await axios.get('http://localhost:3000/api/admin/special-codes', {
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Respuesta con token válido:', response.status);
      console.log('📊 Datos recibidos:', {
        success: response.data.success,
        dataLength: response.data.data?.length || 0,
        firstCode: response.data.data?.[0]?.type || 'N/A'
      });
    } catch (error) {
      console.log('❌ Error con token válido:', error.response?.status, error.response?.data?.message);
    }
    
    // Probar CORS
    console.log('\n4️⃣ Probando headers CORS...');
    try {
      const response = await axios.options('http://localhost:3000/api/admin/special-codes');
      console.log('✅ CORS OPTIONS:', response.status);
      console.log('📋 Headers CORS:', {
        'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
        'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
        'Access-Control-Allow-Headers': response.headers['access-control-allow-headers']
      });
    } catch (error) {
      console.log('❌ Error CORS:', error.response?.status, error.message);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

testFrontendBackendConnection();