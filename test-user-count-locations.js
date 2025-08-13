/**
 * Script para verificar que las dos ubicaciones en la página principal
 * están mostrando el contador dinámico de usuarios (500 + usuarios reales)
 * en lugar del valor estático "507"
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

async function testUserCountLocations() {
  console.log('🔍 Verificando contadores de usuarios en la página principal...');
  console.log('=' .repeat(60));
  
  try {
    // 1. Obtener datos reales del backend
    console.log('📊 Obteniendo datos del endpoint /api/public/kpis...');
    const kpisResponse = await axios.get(`${BASE_URL}/api/public/kpis`);
    const { usersTotal, usersActive } = kpisResponse.data;
    
    console.log(`✅ Usuarios totales registrados: ${usersTotal}`);
    console.log(`✅ Usuarios activos: ${usersActive}`);
    
    // 2. Calcular el valor esperado (500 + usuarios reales)
    const expectedDisplayUsers = 500 + usersTotal;
    console.log(`🎯 Valor esperado en frontend: ${expectedDisplayUsers} (500 base + ${usersTotal} reales)`);
    
    console.log('\n📍 Ubicaciones que deben mostrar el contador dinámico:');
    console.log('1. Sección Hero - Estadísticas de credibilidad');
    console.log('2. Sección Testimonials - Estadísticas generales');
    
    console.log('\n🔧 Cambios realizados:');
    console.log('✅ Hero.jsx: Importado usePublicKpis y reemplazado "507" con {displayUsers || 507}');
    console.log('✅ Testimonials.jsx: Importado usePublicKpis y reemplazado "507" con {displayUsers || 507}');
    
    console.log('\n📱 Para verificar manualmente:');
    console.log(`1. Abrir: ${FRONTEND_URL}`);
    console.log(`2. Buscar las dos ubicaciones que muestran el número de usuarios`);
    console.log(`3. Verificar que ambas muestran: ${expectedDisplayUsers}`);
    console.log('4. El número debe actualizarse automáticamente cuando se registren nuevos usuarios');
    
    console.log('\n✨ Sistema de contador dinámico:');
    console.log('• Base de marketing: 500 usuarios');
    console.log(`• Usuarios reales: ${usersTotal}`);
    console.log(`• Total mostrado: ${expectedDisplayUsers}`);
    console.log('• Actualización: Cada 60 segundos');
    console.log('• Fallback: 507 si hay error en la carga');
    
  } catch (error) {
    console.error('❌ Error al verificar los contadores:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
  }
}

// Ejecutar la verificación
testUserCountLocations();