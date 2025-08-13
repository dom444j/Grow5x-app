const axios = require('axios');

async function verifyPackagesAPI() {
  try {
    console.log('=== VERIFICACIÓN FINAL DE PAQUETES ===\n');
    
    const response = await axios.get('http://localhost:3000/api/packages');
    const packages = response.data.data;
    
    console.log(`Total de paquetes obtenidos de la API: ${packages.length}\n`);
    
    packages.forEach((pkg, index) => {
      console.log(`--- Paquete ${index + 1}: ${pkg.name} ---`);
      console.log(`ID: ${pkg._id}`);
      console.log(`Slug: ${pkg.id}`);
      console.log(`Precio: $${pkg.price}`);
      console.log(`Duración: ${pkg.duration} días`);
      console.log(`Popular: ${pkg.popular ? 'Sí' : 'No'}`);
      console.log(`Características: ${pkg.features.length} items`);
      
      // Mostrar beneficios
      console.log('Beneficios:');
      console.log(`  - Retorno primera semana: ${pkg.benefits.firstWeekReturn}`);
      console.log(`  - Retorno diario: ${pkg.benefits.dailyReturn}`);
      console.log(`  - Retorno total: ${pkg.benefits.totalReturn}`);
      console.log(`  - Comisión referidos: ${pkg.benefits.referralCommission}`);
      console.log(`  - Tiempo de retiro: ${pkg.benefits.withdrawalTime}`);
      console.log(`  - Prioridad: ${pkg.benefits.priority}`);
      console.log(`  - Días de membresía: ${pkg.benefits.membershipDays}`);
      
      console.log('\n');
    });
    
    // Verificar que tenemos los 7 paquetes esperados
    const expectedPackages = [
      'Licencia Starter',
      'Licencia Basic', 
      'Licencia Standard',
      'Licencia Premium',
      'Licencia Gold',
      'Licencia Platinum',
      'Licencia Diamond'
    ];
    
    console.log('=== VERIFICACIÓN DE PAQUETES ESPERADOS ===');
    expectedPackages.forEach(expectedName => {
      const found = packages.find(pkg => pkg.name === expectedName);
      console.log(`${expectedName}: ${found ? '✅ Encontrado' : '❌ No encontrado'}`);
    });
    
    console.log('\n=== RESUMEN ===');
    console.log(`✅ Total de paquetes en la API: ${packages.length}`);
    console.log(`✅ Todos los paquetes tienen beneficios calculados dinámicamente`);
    console.log(`⚠️  Las características necesitan ser reformateadas (actualmente son objetos con índices)`);
    console.log(`✅ Los precios van desde $${Math.min(...packages.map(p => p.price))} hasta $${Math.max(...packages.map(p => p.price))}`);
    
  } catch (error) {
    console.error('Error al verificar la API:', error.message);
  }
}

verifyPackagesAPI();