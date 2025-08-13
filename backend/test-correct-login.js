const axios = require('axios');
require('dotenv').config();

async function testCorrectLogin() {
  try {
    console.log('🧪 PROBANDO LOGIN CON USUARIO CORRECTO');
    console.log('==================================================');

    const loginData = {
      identifier: 'negociosmillonaris1973@gmail.com',
      password: 'Parent2024!',
      userType: 'user'
    };

    console.log('\n1️⃣ Datos de login:');
    console.log(`   📧 Email: ${loginData.identifier}`);
    console.log(`   🔑 Password: ${loginData.password}`);
    console.log(`   👤 User Type: ${loginData.userType}`);

    console.log('\n2️⃣ Enviando solicitud de login...');
    
    const response = await axios.post('http://localhost:3000/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('\n✅ LOGIN EXITOSO!');
    console.log('📊 Respuesta del servidor:');
    console.log(`   🎯 Status: ${response.status}`);
    console.log(`   👤 Usuario: ${response.data.user?.email || 'No disponible'}`);
    console.log(`   🎭 Rol: ${response.data.user?.role || 'No disponible'}`);
    console.log(`   🔑 Token: ${response.data.token ? 'Recibido' : 'No recibido'}`);
    console.log(`   📊 Estado: ${response.data.user?.status || 'No disponible'}`);
    
    if (response.data.token) {
      console.log('\n3️⃣ Probando endpoint de notificaciones...');
      
      const notificationsResponse = await axios.get('http://localhost:3000/api/user/notifications', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ NOTIFICACIONES OBTENIDAS:');
      console.log(`   📊 Status: ${notificationsResponse.status}`);
      console.log(`   📨 Total: ${notificationsResponse.data.total || 0}`);
      console.log(`   🔔 No leídas: ${notificationsResponse.data.unread || 0}`);
      console.log(`   📄 Página: ${notificationsResponse.data.page || 1}`);
      
      if (notificationsResponse.data.notifications && notificationsResponse.data.notifications.length > 0) {
        console.log('\n📋 Primeras notificaciones:');
        notificationsResponse.data.notifications.slice(0, 3).forEach((notif, index) => {
          console.log(`   ${index + 1}. ${notif.title} - ${notif.type} (${notif.isRead ? 'Leída' : 'No leída'})`);
        });
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:');
    
    if (error.response) {
      console.error(`   🎯 Status: ${error.response.status}`);
      console.error(`   📝 Mensaje: ${error.response.data?.message || 'Sin mensaje'}`);
      console.error(`   📊 Data:`, error.response.data);
    } else if (error.request) {
      console.error('   🌐 Error de conexión - No se recibió respuesta del servidor');
      console.error('   🔍 Verificar que el backend esté ejecutándose en puerto 3000');
    } else {
      console.error(`   ⚠️ Error: ${error.message}`);
    }
  }
}

testCorrectLogin();