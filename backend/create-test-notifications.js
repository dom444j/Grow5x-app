const mongoose = require('mongoose');
const Notification = require('./src/models/Notification.model');
const User = require('./src/models/User');
require('dotenv').config();

async function createTestNotifications() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar un usuario de prueba
    const testUser = await User.findOne({ role: 'user' }).limit(1);
    
    if (!testUser) {
      console.log('❌ No se encontró ningún usuario de prueba');
      return;
    }

    console.log(`📧 Creando notificaciones para usuario: ${testUser.email}`);

    // Crear notificaciones de prueba
    const notifications = [
      {
        recipient: testUser._id,
        title: 'Bienvenido a Grow5X',
        message: 'Tu cuenta ha sido creada exitosamente. ¡Comienza a explorar nuestros paquetes!',
        type: 'info',
        priority: 'medium',
        isRead: false,
        status: 'sent'
      },
      {
        recipient: testUser._id,
        title: 'Nueva actualización disponible',
        message: 'Hemos añadido nuevas funcionalidades a la plataforma. Revisa las novedades.',
        type: 'system_alert',
        priority: 'low',
        isRead: false,
        status: 'sent'
      },
      {
        recipient: testUser._id,
        title: 'Comisión procesada',
        message: 'Tu comisión de referido ha sido procesada exitosamente.',
        type: 'success',
        priority: 'high',
        isRead: true,
        status: 'sent'
      },
      {
        recipient: testUser._id,
        title: 'Recordatorio de seguridad',
        message: 'Recuerda mantener tu contraseña segura y no compartirla con nadie.',
        type: 'security_alert',
        priority: 'medium',
        isRead: false,
        status: 'sent'
      }
    ];

    // Eliminar notificaciones existentes del usuario
    await Notification.deleteMany({ recipient: testUser._id });
    console.log('🗑️ Notificaciones anteriores eliminadas');

    // Insertar nuevas notificaciones
    const createdNotifications = await Notification.insertMany(notifications);
    console.log(`✅ ${createdNotifications.length} notificaciones creadas`);

    // Mostrar resumen
    const totalNotifications = await Notification.countDocuments({ recipient: testUser._id });
    const unreadNotifications = await Notification.countDocuments({ 
      recipient: testUser._id, 
      isRead: false 
    });

    console.log('\n📊 RESUMEN:');
    console.log(`👤 Usuario: ${testUser.email}`);
    console.log(`📧 Total de notificaciones: ${totalNotifications}`);
    console.log(`🔔 Notificaciones no leídas: ${unreadNotifications}`);
    console.log(`✅ Notificaciones leídas: ${totalNotifications - unreadNotifications}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

if (require.main === module) {
  createTestNotifications().catch(console.error);
}

module.exports = { createTestNotifications };