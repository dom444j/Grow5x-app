const mongoose = require('mongoose');
const User = require('./src/models/User');
const SpecialCode = require('./src/models/SpecialCode.model');
require('dotenv').config();

async function checkSpecialUsers() {
  try {
    console.log('🔍 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    // Verificar usuarios PADRE y LIDER específicos
    const specialUsers = [
      {
        email: 'negociosmillonaris1973@gmail.com',
        expectedType: 'PADRE',
        name: 'PADRE'
      },
      {
        email: 'edgarpayares2005@gmail.com', 
        expectedType: 'LIDER',
        name: 'LIDER'
      }
    ];
    
    console.log('\n👥 Verificando usuarios especiales...');
    
    for (const userInfo of specialUsers) {
      console.log(`\n🔍 Verificando usuario ${userInfo.name}:`);
      
      const user = await User.findOne({ email: userInfo.email });
      
      if (user) {
        console.log(`✅ Usuario encontrado: ${user.fullName} (${user.email})`);
        console.log(`   - ID: ${user._id}`);
        console.log(`   - Status: ${user.status}`);
        console.log(`   - Rol: ${user.role}`);
        console.log(`   - Es usuario especial: ${user.isSpecialUser || false}`);
        console.log(`   - Tipo especial: ${user.specialUserType || 'No definido'}`);
        console.log(`   - Código de referido: ${user.referralCode || 'No definido'}`);
        
        // Verificar si tiene código especial asociado
        const specialCode = await SpecialCode.findOne({ userId: user._id });
        if (specialCode) {
          console.log(`   - Código especial: ${specialCode.type} - ${specialCode.code}`);
          console.log(`   - Estado del código: ${specialCode.isActive ? 'Activo' : 'Inactivo'}`);
        } else {
          console.log(`   - ❌ No tiene código especial asociado`);
        }
        
        // Verificar si necesita actualización
        let needsUpdate = false;
        const updates = {};
        
        if (!user.isSpecialUser) {
          needsUpdate = true;
          updates.isSpecialUser = true;
          console.log(`   - ⚠️ Necesita activar isSpecialUser`);
        }
        
        if (user.specialUserType !== userInfo.expectedType.toLowerCase()) {
          needsUpdate = true;
          updates.specialUserType = userInfo.expectedType.toLowerCase();
          console.log(`   - ⚠️ Necesita actualizar specialUserType a: ${userInfo.expectedType.toLowerCase()}`);
        }
        
        if (user.status !== 'active') {
          needsUpdate = true;
          updates.status = 'active';
          console.log(`   - ⚠️ Necesita activar status`);
        }
        
        if (needsUpdate) {
          console.log(`   - 🔄 Actualizando usuario...`);
          await User.findByIdAndUpdate(user._id, updates);
          console.log(`   - ✅ Usuario actualizado correctamente`);
        } else {
          console.log(`   - ✅ Usuario ya está configurado correctamente`);
        }
        
      } else {
        console.log(`❌ Usuario ${userInfo.name} no encontrado: ${userInfo.email}`);
      }
    }
    
    // Verificar códigos especiales existentes
    console.log('\n🎯 Verificando códigos especiales existentes...');
    const allSpecialCodes = await SpecialCode.find({}).populate('userId', 'email fullName');
    
    if (allSpecialCodes.length > 0) {
      console.log(`✅ Códigos especiales encontrados: ${allSpecialCodes.length}`);
      allSpecialCodes.forEach(code => {
        console.log(`   - ${code.type}: ${code.code} - Usuario: ${code.userId?.email || 'Sin usuario'} - Activo: ${code.isActive}`);
      });
    } else {
      console.log('❌ No se encontraron códigos especiales');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSpecialUsers();