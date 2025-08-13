const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:3000/api';

async function testNotificationsAPI() {
  try {
    console.log('🧪 PROBANDO API DE NOTIFICACIONES');
    console.log('=' .repeat(50));

    // Paso 1: Login con usuario activo
    console.log('\n1️⃣ Intentando login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      identifier: 'juanortegaempresarial@hotmail.com',
      password: 'Test123@', // Asumiendo esta contraseña
      userType: 'user'
    });

    if (loginResponse.data.success) {
      console.log('✅ Login exitoso');
      const token = loginResponse.data.data.token;
      
      // Paso 2: Probar endpoint de notificaciones
      console.log('\n2️⃣ Probando endpoint de notificaciones...');
      const notificationsResponse = await axios.get(`${API_BASE_URL}/user/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (notificationsResponse.data.success) {
        console.log('✅ Endpoint de notificaciones funciona');
        const data = notificationsResponse.data.data;
        console.log(`📧 Total de notificaciones: ${data.total}`);
        console.log(`🔔 No leídas: ${data.unread}`);
        console.log(`📄 Página: ${data.page}/${data.totalPages}`);
        
        if (data.notifications.length > 0) {
          console.log('\n📋 NOTIFICACIONES:');
          data.notifications.forEach((notif, index) => {
            console.log(`${index + 1}. ${notif.title}`);
            console.log(`   📝 ${notif.message}`);
            console.log(`   🏷️ ${notif.type} | 📊 ${notif.priority}`);
            console.log(`   👁️ ${notif.isRead ? 'Leída' : 'No leída'}`);
            console.log('');
          });
        } else {
          console.log('📭 No hay notificaciones para este usuario');
        }
      } else {
        console.log('❌ Error en endpoint de notificaciones:', notificationsResponse.data.message);
      }

    } else {
      console.log('❌ Login falló:', loginResponse.data.message);
      
      // Intentar con otro usuario
      console.log('\n🔄 Intentando con otro usuario...');
      const loginResponse2 = await axios.post(`${API_BASE_URL}/auth/login`, {
        identifier: 'lider@grow5x.com',
        password: 'Test123@',
        userType: 'user'
      });
      
      if (loginResponse2.data.success) {
        console.log('✅ Login exitoso con segundo usuario');
        const token = loginResponse2.data.data.token;
        
        const notificationsResponse = await axios.get(`${API_BASE_URL}/user/notifications`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('📧 Respuesta de notificaciones:', notificationsResponse.data);
      }
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 SUGERENCIA: Verificar credenciales de usuario');
      console.log('   - Email: juanortegaempresarial@hotmail.com');
      console.log('   - Password: Puede que no sea Test123@');
    }
  }
}

if (require.main === module) {
  testNotificationsAPI().catch(console.error);
}

module.exports = { testNotificationsAPI };