const axios = require('axios');

async function testPackagesAPI() {
  try {
    console.log('🔍 Haciendo petición a la API de paquetes...');
    
    const response = await axios.get('http://localhost:3000/api/packages', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Respuesta recibida');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    
    if (response.data.success && response.data.data) {
      const packages = response.data.data;
      console.log(`\n📦 Encontrados ${packages.length} paquetes en la respuesta`);
      
      packages.forEach((pkg, index) => {
        console.log(`\n=== PAQUETE ${index + 1}: ${pkg.name} ===`);
        console.log('ID:', pkg.id || pkg._id);
        
        if (pkg.features && Array.isArray(pkg.features)) {
          console.log(`\nCaracterísticas (${pkg.features.length} total):`);
          
          pkg.features.forEach((feature, fIndex) => {
            console.log(`\n  [${fIndex + 1}] Tipo: ${typeof feature}`);
            
            if (typeof feature === 'string') {
              console.log(`      Valor: "${feature}"`);
            } else if (typeof feature === 'object' && feature !== null) {
              console.log(`      🔴 OBJETO DETECTADO EN LA API:`);
              console.log(`      JSON:`, JSON.stringify(feature, null, 4));
              
              // Verificar índices numéricos
              const keys = Object.keys(feature);
              const numericKeys = keys.filter(key => !isNaN(key));
              
              if (numericKeys.length > 0) {
                console.log(`      ⚠️  PROBLEMA: ${numericKeys.length} índices numéricos`);
                console.log(`      Índices:`, numericKeys.sort((a, b) => parseInt(a) - parseInt(b)));
                
                numericKeys.sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
                  console.log(`        [${key}] = "${feature[key]}"`);
                });
                
                const reconstructed = numericKeys
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map(key => feature[key])
                  .join('');
                console.log(`      String reconstruido: "${reconstructed}"`);
              }
            } else {
              console.log(`      Valor (${typeof feature}):`, feature);
            }
          });
        } else {
          console.log('\n❌ Sin características válidas');
        }
      });
    } else {
      console.log('❌ Respuesta no válida:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error en la petición:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Ejecutar el test
testPackagesAPI();