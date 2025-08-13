const axios = require('axios');
const jwt = require('jsonwebtoken');

// Generar token manualmente
const adminToken = jwt.sign(
  { userId: '688ae3670031bee7e1534808' },
  'your-super-secret-jwt-key-change-this-in-production',
  { expiresIn: '1h' }
);

console.log('🔑 Admin Token generado:', adminToken.substring(0, 20) + '...');

// Función para probar el endpoint
async function testSpecialCodesEndpoint() {
  try {
    console.log('\n🚀 Probando endpoint: GET /api/admin/special-codes');
    
    const response = await axios.get('http://localhost:3000/api/admin/special-codes', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('\n✅ RESPUESTA DEL ENDPOINT:');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers['content-type']);
    
    if (response.data) {
      console.log('\n📊 DATOS RECIBIDOS:');
      console.log('Success:', response.data.success);
      console.log('Message:', response.data.message);
      
      if (response.data.data) {
        console.log('\n📋 CÓDIGOS ESPECIALES:');
        console.log('Total códigos:', response.data.data.length);
        
        response.data.data.forEach((code, index) => {
          console.log(`\n--- Código ${index + 1} ---`);
          console.log('ID:', code._id);
          console.log('Tipo:', code.type);
          console.log('Usuario ID:', code.userId?._id || code.userId);
          console.log('Usuario Nombre:', code.userId?.fullName || 'N/A');
          console.log('Usuario Email:', code.userId?.email || 'N/A');
          console.log('Código de referido:', code.referralCode);
          console.log('Estado activo:', code.isActive);
          console.log('Fecha creación:', code.createdAt);
          console.log('Estadísticas:', {
            totalCommissionsEarned: code.statistics?.totalCommissionsEarned || 0,
            totalUsersAffected: code.statistics?.totalUsersAffected || 0
          });
          console.log('Historial comisiones:', code.commissionHistory?.length || 0);
        });
      } else {
        console.log('\n⚠️  No hay datos en response.data.data');
      }
      
      if (response.data.statistics) {
        console.log('\n📈 ESTADÍSTICAS GENERALES:');
        console.log(JSON.stringify(response.data.statistics, null, 2));
      }
    } else {
      console.log('\n⚠️  No hay datos en la respuesta');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR AL PROBAR ENDPOINT:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Message:', error.response?.data?.message || error.message);
    console.error('URL:', error.config?.url);
    console.error('Headers enviados:', error.config?.headers);
    
    if (error.response?.data) {
      console.error('\n📄 RESPUESTA DE ERROR:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Ejecutar la prueba
console.log('🧪 Iniciando prueba del endpoint de códigos especiales...');
testSpecialCodesEndpoint();