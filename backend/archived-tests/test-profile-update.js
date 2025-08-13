const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

async function testProfileUpdate() {
  try {
    console.log('🔍 Buscando usuarios para probar...');
    
    // Buscar un usuario de prueba
    const user = await User.findOne({ role: 'user' }).limit(1);
    
    if (!user) {
      console.log('❌ No se encontró ningún usuario para probar');
      return;
    }
    
    console.log('👤 Usuario encontrado:', {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      country: user.country,
      telegram: user.telegram
    });
    
    // Datos de prueba para actualizar
    const updateData = {
      fullName: 'Nombre Actualizado Test',
      country: 'Colombia',
      telegram: 'test_telegram_updated',
      preferences: {
        notifications: {
          email: true,
          telegram: false,
          marketing: true
        }
      }
    };
    
    console.log('🔄 Actualizando perfil con datos:', updateData);
    
    // Intentar actualizar el perfil
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        ...updateData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password -sessions -securityLog -resetPassword');
    
    if (updatedUser) {
      console.log('✅ Perfil actualizado exitosamente:', {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        country: updatedUser.country,
        telegram: updatedUser.telegram,
        preferences: updatedUser.preferences
      });
    } else {
      console.log('❌ No se pudo actualizar el perfil');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    console.error('Stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

// Ejecutar la prueba
testProfileUpdate();