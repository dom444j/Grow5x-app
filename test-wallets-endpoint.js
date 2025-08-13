const axios = require('axios');

async function testWalletsEndpoint() {
  try {
    console.log('🔍 Probando endpoint de wallets...');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODhiYjZlYzY3MDQzMmYxZTFmZTQ2NTQiLCJpYXQiOjE3NTQ2MzA2MjksImV4cCI6MTc1NTIzNTQyOX0.d6G3rlCk_cQv2m0bgvyqQSh_whblbl5sdOpBDv-aQyA';
    
    const response = await axios.get('http://localhost:3000/api/admin/wallets', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Respuesta exitosa:');
    console.log('Status:', response.status);
    console.log('Data structure:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.data) {
      console.log('\n📊 Análisis de datos:');
      console.log('- success:', response.data.success);
      console.log('- data type:', typeof response.data.data);
      console.log('- data keys:', Object.keys(response.data.data || {}));
      
      if (response.data.data.docs) {
        console.log('- docs length:', response.data.data.docs.length);
        console.log('- first wallet:', response.data.data.docs[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testWalletsEndpoint();