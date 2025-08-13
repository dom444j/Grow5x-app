const axios = require('axios');

// Test de autenticación para rutas de admin
async function testAdminAuth() {
  try {
    // Test básico de conectividad
    console.log('Testing basic connectivity...');
    try {
      const response0 = await axios.get('http://localhost:3000/api');
      console.log('Basic connectivity OK:', response0.status);
    } catch (err) {
      console.log('Basic connectivity failed:', err.message);
    }
    
    console.log('\nTesting admin routes without authentication...');
    
    // Test sin autenticación
    try {
      const response1 = await axios.get('http://localhost:3000/api/admin/wallets');
      console.log('Success sin auth:', response1.status, response1.data);
    } catch (err) {
      console.log('Error sin auth:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        code: err.code
      });
    }
    
    // Test con token falso
    console.log('\nTesting with fake token...');
    try {
      const response2 = await axios.get('http://localhost:3000/api/admin/wallets', {
        headers: {
          'Authorization': 'Bearer fake-token'
        }
      });
      console.log('Success con token falso:', response2.status, response2.data);
    } catch (err) {
      console.log('Error con token falso:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        code: err.code
      });
    }
    
    console.log('\nTest completed');
    
  } catch (error) {
    console.error('Error general:', error.message);
  }
}

testAdminAuth();