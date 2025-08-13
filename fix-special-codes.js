const mongoose = require('mongoose');
const SpecialCode = require('./src/models/SpecialCode.model');

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Conectado a MongoDB');
    
    console.log('\n🔍 DIAGNÓSTICO INICIAL');
    console.log('=' .repeat(50));
    
    // 1. Ver estado actual
    const totalDocs = await SpecialCode.countDocuments();
    console.log(`📊 Total documentos en specialcodes: ${totalDocs}`);
    
    if (totalDocs > 0) {
      // Mostrar algunos ejemplos
      const samples = await SpecialCode.find().limit(3).lean();
      console.log('\n📋 Ejemplos actuales:');
      samples.forEach((doc, i) => {
        console.log(`${i+1}. Code: ${doc.code}, Type: ${doc.type || 'UNDEFINED'}, CodeType: ${doc.codeType || 'UNDEFINED'}`);
      });
      
      // Contar por type y codeType
      const byType = await SpecialCode.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);
      const byCodeType = await SpecialCode.aggregate([
        { $group: { _id: '$codeType', count: { $sum: 1 } } }
      ]);
      
      console.log('\n📈 Distribución por type:', byType);
      console.log('📈 Distribución por codeType:', byCodeType);
    }
    
    console.log('\n🔧 INICIANDO MIGRACIÓN');
    console.log('=' .repeat(50));
    
    // 2. Migrar codeType -> type para documentos que no tienen type
    const migrateResult = await SpecialCode.updateMany(
      { type: { $exists: false }, codeType: { $exists: true } },
      [
        { $set: { type: '$codeType' } },
        { $unset: 'codeType' }
      ]
    );
    console.log(`✅ Migrados ${migrateResult.modifiedCount} documentos de codeType -> type`);
    
    // 3. Normalizar valores antiguos
    const normalizeLeader = await SpecialCode.updateMany(
      { type: 'LEADER' },
      { $set: { type: 'LIDER' } }
    );
    console.log(`✅ Normalizados ${normalizeLeader.modifiedCount} documentos LEADER -> LIDER`);
    
    const normalizeFather = await SpecialCode.updateMany(
      { type: 'FATHER' },
      { $set: { type: 'PADRE' } }
    );
    console.log(`✅ Normalizados ${normalizeFather.modifiedCount} documentos FATHER -> PADRE`);
    
    // 4. Limpiar campos codeType restantes
    const cleanupResult = await SpecialCode.updateMany(
      { codeType: { $exists: true } },
      { $unset: { codeType: 1 } }
    );
    console.log(`✅ Limpiados ${cleanupResult.modifiedCount} campos codeType restantes`);
    
    // 5. Verificar si tenemos códigos válidos
    const validCodes = await SpecialCode.countDocuments({
      type: { $in: ['LIDER', 'PADRE'] },
      status: 'active'
    });
    
    console.log(`\n📊 Códigos válidos después de migración: ${validCodes}`);
    
    // 6. Crear ejemplos si no hay códigos válidos
    if (validCodes === 0) {
      console.log('\n🆕 Creando códigos de ejemplo...');
      
      const exampleCodes = [
        {
          code: 'LDR001',
          type: 'LIDER',
          status: 'active',
          description: 'Código de líder de ejemplo',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          code: 'PDR001',
          type: 'PADRE',
          status: 'active',
          description: 'Código de padre de ejemplo',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      try {
        await SpecialCode.insertMany(exampleCodes);
        console.log('✅ Creados 2 códigos de ejemplo');
      } catch (error) {
        if (error.code === 11000) {
          console.log('⚠️ Los códigos de ejemplo ya existen');
        } else {
          console.log('❌ Error creando ejemplos:', error.message);
        }
      }
    }
    
    // 7. Crear índices importantes
    try {
      await SpecialCode.collection.createIndex({ type: 1, status: 1 });
      await SpecialCode.collection.createIndex({ code: 1 }, { unique: true });
      console.log('✅ Índices creados/verificados');
    } catch (error) {
      console.log('⚠️ Índices ya existen o error:', error.message);
    }
    
    console.log('\n📊 RESUMEN FINAL');
    console.log('=' .repeat(50));
    
    // 8. Resumen final
    const finalStats = await SpecialCode.aggregate([
      {
        $group: {
          _id: { type: '$type', status: '$status' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.type': 1, '_id.status': 1 } }
    ]);
    
    console.log('📈 Distribución final:');
    finalStats.forEach(stat => {
      console.log(`   ${stat._id.type || 'SIN_TYPE'} (${stat._id.status || 'SIN_STATUS'}): ${stat.count}`);
    });
    
    const totalFinal = await SpecialCode.countDocuments();
    const activeLider = await SpecialCode.countDocuments({ type: 'LIDER', status: 'active' });
    const activePadre = await SpecialCode.countDocuments({ type: 'PADRE', status: 'active' });
    
    console.log(`\n🎯 RESULTADO:`);
    console.log(`   Total códigos: ${totalFinal}`);
    console.log(`   Líderes activos: ${activeLider}`);
    console.log(`   Padres activos: ${activePadre}`);
    
    if (activeLider > 0 || activePadre > 0) {
      console.log('\n🎉 ¡MIGRACIÓN EXITOSA! Los códigos especiales deberían aparecer en /admin/special-codes');
    } else {
      console.log('\n⚠️ No hay códigos activos. Verifica la creación manual o el modelo.');
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