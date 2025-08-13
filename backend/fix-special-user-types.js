const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelo de usuario
const User = require('./src/models/User');

async function fixSpecialUserTypes() {
  try {
    console.log('🔗 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    const targetUsers = [
      { 
        email: 'negociosmillonaris1973@gmail.com', 
        code: 'PADRE',
        correctType: 'parent'
      },
      { 
        email: 'edgarpayares2005@gmail.com', 
        code: 'LIDER',
        correctType: 'leader'
      }
    ];

    for (const targetUser of targetUsers) {
      console.log(`\n🔧 Corrigiendo usuario ${targetUser.code}: ${targetUser.email}`);
      
      const user = await User.findOne({ email: targetUser.email });
      
      if (!user) {
        console.log(`❌ Usuario ${targetUser.code} NO encontrado`);
        continue;
      }

      console.log(`📋 Estado actual del usuario ${targetUser.code}:`);
      console.log(`   - isSpecialUser: ${user.isSpecialUser}`);
      console.log(`   - specialUserType: '${user.specialUserType}'`);
      console.log(`   - userLevel: ${user.userLevel}`);
      
      // Actualizar campos de usuario especial
      const updateData = {
        isSpecialUser: true,
        specialUserType: targetUser.correctType,
        userLevel: targetUser.correctType === 'parent' ? 'FATHER' : 'LEADER',
        updatedAt: new Date()
      };
      
      console.log(`🔄 Actualizando con:`);
      console.log(`   - isSpecialUser: ${updateData.isSpecialUser}`);
      console.log(`   - specialUserType: '${updateData.specialUserType}'`);
      console.log(`   - userLevel: ${updateData.userLevel}`);
      
      const result = await User.findByIdAndUpdate(
        user._id,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (result) {
        console.log(`✅ Usuario ${targetUser.code} actualizado correctamente`);
        console.log(`📋 Estado final:`);
        console.log(`   - isSpecialUser: ${result.isSpecialUser}`);
        console.log(`   - specialUserType: '${result.specialUserType}'`);
        console.log(`   - userLevel: ${result.userLevel}`);
      } else {
        console.log(`❌ Error actualizando usuario ${targetUser.code}`);
      }
    }

    console.log('\n🎉 Proceso de corrección completado');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.name === 'ValidationError') {
      console.error('Detalles de validación:', error.errors);
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB Atlas');
  }
}

fixSpecialUserTypes();