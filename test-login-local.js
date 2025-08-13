const axios = require('axios');

// Configuración
const API_BASE_URL = 'http://localhost:3000/api';

// Usuarios a probar
const usersToTest = [
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

async function testUserLogin(user) {
  try {
    console.log(`\n🔐 Probando login para ${user.name}: ${user.identifier}`);
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      identifier: user.identifier,
      password: user.password
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(`✅ ${user.name} - Login exitoso!`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Message: ${response.data.message}`);
    
    if (response.data.data && response.data.data.user) {
      console.log(`   Usuario: ${response.data.data.user.email}`);
      console.log(`   Rol: ${response.data.data.user.role}`);
      console.log(`   Estado: ${response.data.data.user.status}`);
    }
    
    return {
      success: true,
      user: user.name,
      status: response.status,
      message: response.data.message
    };
    
  } catch (error) {
    console.log(`❌ ${user.name} - Error en login:`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.message || 'Error desconocido'}`);
      
      return {
        success: false,
        user: user.name,
        status: error.response.status,
        message: error.response.data.message || 'Error desconocido'
      };
    } else {
      console.log(`   Error de conexión: ${error.message}`);
      
      return {
        success: false,
        user: user.name,
        status: 'CONNECTION_ERROR',
        message: error.message
      };
    }
  }
}

async function testAllUsers() {
  console.log('🚀 Iniciando pruebas de login local...');
  console.log(`📡 API Base URL: ${API_BASE_URL}`);
  
  const results = [];
  
  for (const user of usersToTest) {
    const result = await testUserLogin(user);
    results.push(result);
    
    // Pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 RESUMEN DE RESULTADOS:');
  console.log('=' .repeat(50));
  
  let successCount = 0;
  
  results.forEach(result => {
    const status = result.success ? '✅ ÉXITO' : '❌ FALLO';
    console.log(`${status} - ${result.user}: ${result.message}`);
    
    if (result.success) {
      successCount++;
    }
  });
  
  console.log('=' .repeat(50));
  console.log(`📈 Tasa de éxito: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
  
  if (successCount === results.length) {
    console.log('🎉 ¡Todos los usuarios pueden hacer login correctamente!');
  } else {
    console.log('⚠️  Algunos usuarios tienen problemas de autenticación.');
  }
}

// Ejecutar pruebas
testAllUsers().catch(error => {
  console.error('💥 Error fatal:', error.message);
  process.exit(1);
});