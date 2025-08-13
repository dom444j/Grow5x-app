require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testDashboardEndpoint() {
  try {
    console.log('🔄 Probando endpoint del dashboard...');
    
    // Generar token de admin con ID real
    const token = jwt.sign(
      { userId: '688ae3670031bee7e1534808', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('🔑 Token generado');
    
    // Primero probar un endpoint simple para verificar conectividad
    console.log('🔄 Probando endpoint simple /api/admin/users...');
    try {
      const simpleResponse = await axios.get('http://localhost:3000/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Endpoint /api/admin/users funciona');
    } catch (error) {
      console.log('❌ Error en /api/admin/users:', error.response?.status, error.response?.data);
    }
    
    // Ahora probar el endpoint del dashboard
    console.log('🔄 Probando endpoint del dashboard...');
    const response = await axios.get('http://localhost:3000/api/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Respuesta del endpoint:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Data structure:', Object.keys(response.data.data || {}));
    
    if (response.data.data) {
      console.log('\n📊 Datos del dashboard:');
      console.log('Users:', JSON.stringify(response.data.data.users, null, 2));
      console.log('UserStatus:', JSON.stringify(response.data.data.userStatus, null, 2));
      console.log('Transactions:', JSON.stringify(response.data.data.transactions, null, 2));
      console.log('Wallets:', JSON.stringify(response.data.data.wallets, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testDashboardEndpoint();