const mongoose = require('mongoose');
const SpecialCode = require('./src/models/SpecialCode.model');
const User = require('./src/models/User');

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Conectado a MongoDB');
    
    console.log('\n🔍 VERIFICANDO CÓDIGOS EXISTENTES');
    console.log('=' .repeat(50));
    
    // 1. Buscar códigos existentes
    const existingCodes = await SpecialCode.find().lean();
    console.log(`📊 Códigos encontrados: ${existingCodes.length}`);
    
    if (existingCodes.length > 0) {
      existingCodes.forEach((code, i) => {
        console.log(`${i+1}. Code: ${code.code}, Type: ${code.type}, Active: ${code.isActive}, UserId: ${code.userId || 'MISSING'}`);
      });
    }
    
    // 2. Buscar un usuario admin para asignar como assignedBy
    const adminUser = await User.findOne({ 
      $or: [
        { role: 'admin' },
        { isAdmin: true },
        { email: { $regex: /admin/i } }
      ]
    });
    
    if (!adminUser) {
      console.log('❌ No se encontró usuario administrador');
      process.exit(1);
    }
    
    console.log(`✅ Usuario admin encontrado: ${adminUser.email} (${adminUser._id})`);
    
    console.log('\n🔧 ACTUALIZANDO CÓDIGOS EXISTENTES');
    console.log('=' .repeat(50));
    
    // 3. Actualizar códigos existentes con campos faltantes
    for (const code of existingCodes) {
      const updateData = {};
      
      // Asignar campos faltantes
      if (!code.userId) {
        updateData.userId = adminUser._id;
      }
      
      if (!code.referralCode) {
        updateData.referralCode = code.code; // Usar el mismo código como referralCode
      }
      
      if (!code.assignedBy) {
        updateData.assignedBy = adminUser._id;
      }
      
      if (code.isActive === undefined || code.isActive === null) {
        updateData.isActive = true;
      }
      
      if (!code.activatedAt) {
        updateData.activatedAt = new Date();
      }
      
      // Actualizar el código
      if (Object.keys(updateData).length > 0) {
        try {
          await SpecialCode.updateOne({ _id: code._id }, updateData);
          console.log(`✅ Actualizado código ${code.code} con:`, Object.keys(updateData));
        } catch (error) {
          console.log(`❌ Error actualizando ${code.code}:`, error.message);
        }
      } else {
        console.log(`ℹ️ Código ${code.code} ya tiene todos los campos`);
      }
    }
    
    // 4. Si no hay códigos, crear los básicos
    if (existingCodes.length === 0) {
      console.log('\n🆕 CREANDO CÓDIGOS BÁSICOS');
      console.log('=' .repeat(50));
      
      const newCodes = [
        {
          type: 'LIDER',
          code: 'LDR001',
          userId: adminUser._id,
          referralCode: 'LDR001',
          assignedBy: adminUser._id,
          isActive: true,
          activatedAt: new Date(),
          notes: 'Código de líder creado automáticamente'
        },
        {
          type: 'PADRE',
          code: 'PDR001',
          userId: adminUser._id,
          referralCode: 'PDR001',
          assignedBy: adminUser._id,
          isActive: true,
          activatedAt: new Date(),
          notes: 'Código de padre creado automáticamente'
        }
      ];
      
      try {
        await SpecialCode.insertMany(newCodes);
        console.log('✅ Creados 2 códigos básicos');
      } catch (error) {
        console.log('❌ Error creando códigos:', error.message);
      }
    }
    
    console.log('\n📊 RESUMEN FINAL');
    console.log('=' .repeat(50));
    
    // 5. Verificación final
    const finalCodes = await SpecialCode.find({ isActive: true }).populate('userId', 'email').populate('assignedBy', 'email');
    
    console.log(`📈 Códigos activos: ${finalCodes.length}`);
    
    finalCodes.forEach((code, i) => {
      console.log(`${i+1}. ${code.type}: ${code.code}`);
      console.log(`   Usuario: ${code.userId?.email || 'N/A'}`);
      console.log(`   Asignado por: ${code.assignedBy?.email || 'N/A'}`);
      console.log(`   Código referido: ${code.referralCode}`);
      console.log(`   Activo: ${code.isActive}`);
      console.log('');
    });
    
    if (finalCodes.length > 0) {
      console.log('🎉 ¡CÓDIGOS ESPECIALES LISTOS! Deberían aparecer en /admin/special-codes');
    } else {
      console.log('⚠️ No hay códigos activos después de la migración');
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  });

// Manejo de señales para cierre limpio
process.on('SIGINT', () => {
  console.log('\n🛑 Proceso interrumpido');
  mongoose.connection.close();
  process.exit(0);
});