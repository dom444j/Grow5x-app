const axios = require('axios');

// Credenciales que funcionaban antes
const credentials = [
  {
    name: 'PADRE',
    identifier: 'negociosmillonaris1973@gmail.com',
    password: 'Parent2024!',
    userType: 'user'
  },
  {
    name: 'LIDER',
    identifier: 'edgarpayares2005@gmail.com',
    password: 'Leader2024!',
    userType: 'user'
  },
  {
    name: 'ADMIN',
    identifier: 'admin@grow5x.com',
    password: 'Admin2024!',
    userType: 'admin'
  },
  {
    name: 'TEST',
    identifier: 'clubnetwin@hotmail.com',
    password: 'Test2024!',
    userType: 'user'
  }
];

async function testAllCredentials() {
  console.log('=== PROBANDO TODAS LAS CREDENCIALES ===\n');
  
  let successCount = 0;
  let totalCount = credentials.length;
  
  for (const cred of credentials) {
    try {
      console.log(`🔍 Probando ${cred.name} (${cred.identifier})...`);
      
      const response = await axios.post('http://127.0.0.1:5000/api/auth/login', {
        identifier: cred.identifier,
        password: cred.password,
        userType: cred.userType
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.data.success) {
        console.log(`✅ ${cred.name}: Login exitoso`);
        console.log(`   - Usuario: ${response.data.data.user.fullName || response.data.data.user.email}`);
        console.log(`   - Rol: ${response.data.data.user.role}`);
        console.log(`   - Status: ${response.data.data.user.status}`);
        successCount++;
      } else {
        console.log(`❌ ${cred.name}: ${response.data.message}`);
      }
      
    } catch (error) {
      console.log(`❌ ${cred.name}: Error de conexión`);
      
      if (error.response) {
        console.log(`   - Status: ${error.response.status}`);
        console.log(`   - Mensaje: ${error.response.data.message || 'Sin mensaje'}`);
      } else {
        console.log(`   - Error: ${error.message}`);
      }
    }
    
    console.log(''); // Línea en blanco
  }
  
  console.log('=== RESUMEN ===');
  console.log(`📊 Tasa de éxito: ${Math.round((successCount/totalCount)*100)}% (${successCount}/${totalCount})`);
  
  if (successCount === totalCount) {
    console.log('🎉 Todos los usuarios funcionando correctamente');
  } else if (successCount > 0) {
    console.log('⚠️  Algunos usuarios tienen problemas');
  } else {
    console.log('🚨 Ningún usuario puede hacer login');
  }
}

// Ejecutar prueba
testAllCredentials().catch(console.error);