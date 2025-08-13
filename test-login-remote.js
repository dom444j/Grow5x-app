const axios = require('axios');

// Configuración de la API remota
const API_BASE_URL = 'http://80.78.25.79:5000/api';

// Usuarios de prueba
const testUsers = [
  {
    name: 'PADRE',
    identifier: 'negociosmillonaris1973@gmail.com',
    password: 'Parent2024!'
  },
  {
    name: 'LIDER',
    identifier: 'edgarpayares2005@gmail.com',
    password: 'Leader2024!'
  },
  {
    name: 'ADMIN',
    identifier: 'admin@grow5x.com',
    password: 'Admin2024!'
  }
];

async function testLogin(user) {
  try {
    console.log(`🔐 Probando login para ${user.name}: ${user.identifier}`);
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      identifier: user.identifier,
      password: user.password
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ ${user.name} - Login exitoso!`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Message: ${response.data.message}`);
    console.log(`   Usuario: ${response.data.user?.email || 'N/A'}`);
    console.log(`   Rol: ${response.data.user?.role || 'N/A'}`);
    console.log(`   Estado: ${response.data.user?.status || 'N/A'}`);
    
    return { success: true, user: user.name, message: response.data.message };
    
  } catch (error) {
    console.log(`❌ ${user.name} - Error en login:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.message || error.response.data?.error || 'Error desconocido'}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`   Error: No se puede conectar al servidor remoto`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`   Error: Timeout de conexión`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    
    return { success: false, user: user.name, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de login remoto...');
  console.log(`📡 API Base URL: ${API_BASE_URL}`);
  console.log('');
  
  const results = [];
  
  for (const user of testUsers) {
    const result = await testLogin(user);
    results.push(result);
    console.log(''); // Línea en blanco entre pruebas
  }
  
  // Resumen de resultados
  console.log('📊 RESUMEN DE RESULTADOS:');
  console.log('==================================================');
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ÉXITO - ${result.user}: ${result.message}`);
    } else {
      console.log(`❌ FALLO - ${result.user}: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  const successRate = Math.round((successCount / totalCount) * 100);
  
  console.log('==================================================');
  console.log(`📈 Tasa de éxito: ${successCount}/${totalCount} (${successRate}%)`);
  
  if (successRate === 100) {
    console.log('🎉 ¡Todos los usuarios pueden hacer login correctamente!');
  } else if (successRate > 0) {
    console.log('⚠️  Algunos usuarios tienen problemas de autenticación.');
  } else {
    console.log('❌ Ningún usuario puede hacer login. Revisar configuración del servidor.');
  }
}

// Ejecutar las pruebas
runTests().catch(console.error);