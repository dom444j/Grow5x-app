const axios = require('axios');

// Configuración
const API_URL = 'http://localhost:3000/api';
const ADMIN_CREDENTIALS = {
  identifier: 'admin@grow5x.com',
  password: 'Admin2024!',
  userType: 'admin'
};

async function testCompleteFlow() {
  try {
    console.log('🔍 PROBANDO FLUJO COMPLETO DEL DASHBOARD');
    console.log('=====================================\n');

    // 1. Login para obtener token válido
    console.log('🔐 Paso 1: Haciendo login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, ADMIN_CREDENTIALS);
    
    if (!loginResponse.data.success) {
      throw new Error('Login falló: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.data?.tokens?.accessToken || loginResponse.data.token;
    console.log('✅ Login exitoso');
    console.log('📝 Respuesta completa:', JSON.stringify(loginResponse.data, null, 2));
    
    if (!token) {
      throw new Error('No se pudo obtener el token de acceso');
    }
    
    console.log('📝 Token obtenido:', token.substring(0, 50) + '...');
    
    // 2. Probar API del dashboard
    console.log('\n📊 Paso 2: Probando API del dashboard...');
    const dashboardResponse = await axios.get(`${API_URL}/admin/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Respuesta del dashboard recibida');
    console.log('📊 Status:', dashboardResponse.status);
    
    const data = dashboardResponse.data;
    console.log('\n📊 ESTRUCTURA COMPLETA DE LA RESPUESTA:');
    console.log('=======================================');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n📈 ESTADÍSTICAS DEL DASHBOARD:');
      console.log('==============================');
      
      // Usuarios
      if (data.users) {
        console.log('👥 Usuarios:');
        console.log('- total:', data.users.total);
        console.log('- requieren atención:', data.users.requireAttention);
      }
      
      // Transacciones
      if (data.transactions) {
        console.log('\n💰 Transacciones:');
        console.log('- total:', data.transactions.total);
        console.log('- volumen:', data.transactions.volume, 'USD');
      }
      
      // Billeteras
      if (data.wallets) {
        console.log('\n👛 Billeteras:');
        console.log('- total:', data.wallets.total);
        console.log('- activas:', data.wallets.active);
      }
      
      // Verificaciones
      if (data.verifications) {
        console.log('\n✅ Verificaciones:');
        console.log('- total:', data.verifications.total);
        console.log('- premium:', data.verifications.premium);
      }
      
      // Paquetes
      if (data.packages) {
        console.log('\n📦 Paquetes:');
        console.log('- total:', data.packages.total);
        console.log('- pendientes:', data.packages.pending);
      }
      
      // Salud del sistema
      if (data.systemHealth) {
        console.log('\n🏥 Salud del Sistema:');
        console.log('- estado:', data.systemHealth.status);
        console.log('- uptime:', data.systemHealth.uptime);
      }
      
      console.log('\n🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!');
      
    } else {
      console.log('❌ Error en respuesta del dashboard:', data.message);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.code) {
      console.error('Error Code:', error.code);
    }
  }
}

// Ejecutar test
testCompleteFlow().catch(console.error);