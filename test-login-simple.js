const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔄 Probando login de administrador...');
    
    const loginData = {
      identifier: 'admin@grow5x.com',
      password: 'Admin2024!',
      userType: 'admin'
    };
    
    console.log('📤 Enviando petición a: http://80.78.25.79:5000/api/auth/login');
    console.log('📤 Datos:', { ...loginData, password: '***' });
    
    const response = await axios.post('http://80.78.25.79:5000/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Login exitoso!');
    console.log('📥 Status:', response.status);
    console.log('📥 Respuesta:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error en login:');
    
    if (error.response) {
      console.log('📥 Status:', error.response.status);
      console.log('📥 Respuesta:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('📥 Error de conexión:', error.message);
    } else {
      console.log('📥 Error:', error.message);
    }
  }
}

testLogin();