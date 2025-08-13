const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

(async () => {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
    console.log('✅ Conectado a MongoDB');

    const target = [
      'supporttickets',    // ticketId
      'users',            // user / userId
      'arbitragesimulations', // simulationId
      'transactions',     // userId (si aplica)
      'specialcodes',     // userId
      'withdrawalrequests', // userId
      'commissions',      // userId, fromUserId
      'purchases',        // userId
      'usersettings',     // userId
      'userwalletroles'   // userId
    ];

    for (const name of target) {
      try {
        const coll = mongoose.connection.collection(name);
        const idx = await coll.indexes();
        console.log(`\n📋 Revisando colección: ${name}`);
        console.log(`   Índices encontrados: ${idx.length}`);

        for (const i of idx) {
          const isSystem = i.name === '_id_';
          const touches = 
            i.name.includes('ticketId') ||
            i.name.includes('user') ||
            i.name.includes('userId') ||
            i.name.includes('simulationId') ||
            i.name.includes('fromUserId');

          if (!isSystem && touches) {
            console.log(`   🗑️  Eliminando índice duplicado: ${i.name}`);
            try {
              await coll.dropIndex(i.name);
              console.log(`   ✅ Índice ${i.name} eliminado`);
            } catch (e) {
              console.log(`   ⚠️  Error eliminando ${i.name}: ${e.message}`);
            }
          } else {
            console.log(`   ⏭️  Manteniendo índice: ${i.name}`);
          }
        }
      } catch (e) {
        console.log(`❌ Error procesando colección ${name}: ${e.message}`);
      }
    }

    console.log('\n✅ Limpieza de índices duplicados completada');
    console.log('🔄 Ahora ejecuta: pm2 restart growx5-backend');
    
  } catch (error) {
    console.error('❌ Error en la limpieza de índices:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();