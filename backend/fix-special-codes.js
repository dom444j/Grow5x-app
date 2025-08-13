const mongoose = require('mongoose');
const User = require('./src/models/User');
const SpecialCode = require('./src/models/SpecialCode.model');
require('dotenv').config();

async function fixSpecialCodes() {
  try {
    console.log('🔍 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    // Obtener todos los códigos especiales
    const specialCodes = await SpecialCode.find({}).populate('userId', 'email fullName specialUserType');
    
    console.log(`\n🎯 Códigos especiales encontrados: ${specialCodes.length}`);
    
    for (const code of specialCodes) {
      console.log(`\n🔍 Procesando código: ${code.code}`);
      console.log(`   - Usuario: ${code.userId?.email}`);
      console.log(`   - Tipo actual: ${code.type}`);
      console.log(`   - Tipo de usuario: ${code.userId?.specialUserType}`);
      
      let needsUpdate = false;
      const updates = {};
      
      // Determinar el tipo correcto basado en el usuario
      if (code.userId) {
        let correctType = null;
        
        if (code.userId.specialUserType === 'parent' || code.userId.specialUserType === 'padre') {
          correctType = 'PADRE';
        } else if (code.userId.specialUserType === 'leader' || code.userId.specialUserType === 'lider') {
          correctType = 'LIDER';
        }
        
        // También verificar por email para estar seguros
        if (code.userId.email === 'negociosmillonaris1973@gmail.com') {
          correctType = 'PADRE';
        } else if (code.userId.email === 'edgarpayares2005@gmail.com') {
          correctType = 'LIDER';
        }
        
        if (correctType && code.type !== correctType) {
          needsUpdate = true;
          updates.type = correctType;
          console.log(`   - ⚠️ Necesita actualizar tipo a: ${correctType}`);
        }
        
        // Asegurar que el código esté activo
        if (!code.isActive) {
          needsUpdate = true;
          updates.isActive = true;
          console.log(`   - ⚠️ Necesita activar código`);
        }
        
        if (needsUpdate) {
          console.log(`   - 🔄 Actualizando código especial...`);
          await SpecialCode.findByIdAndUpdate(code._id, updates);
          console.log(`   - ✅ Código actualizado correctamente`);
        } else {
          console.log(`   - ✅ Código ya está configurado correctamente`);
        }
      } else {
        console.log(`   - ❌ Código sin usuario asociado`);
      }
    }
    
    // Verificar el estado final
    console.log('\n📊 Estado final de códigos especiales:');
    const finalCodes = await SpecialCode.find({}).populate('userId', 'email fullName');
    
    finalCodes.forEach(code => {
      console.log(`   - ${code.type}: ${code.code}`);
      console.log(`     Usuario: ${code.userId?.email || 'Sin usuario'}`);
      console.log(`     Activo: ${code.isActive}`);
      console.log(`     Referral Code: ${code.referralCode}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Corrección completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixSpecialCodes();