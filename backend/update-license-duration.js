const mongoose = require('mongoose');
const Package = require('./models/Package.model');
const License = require('./models/License.model');
require('dotenv').config();

// Función para conectar a MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB Atlas');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

// Función principal para actualizar duración de licencias
async function updateLicenseDuration() {
  try {
    await connectDB();
    
    console.log('🔄 Iniciando actualización de duración de licencias...');
    console.log('📋 Cambios a realizar:');
    console.log('   • Duración total: 45 días → 180 días');
    console.log('   • Días máximos por ciclo: 9 días → 45 días (5 ciclos)');
    console.log('');
    
    // 1. Actualizar modelo Package - cambiar duración por defecto
    console.log('📦 Actualizando paquetes...');
    const packagesResult = await Package.updateMany(
      { duration: 45 }, // Buscar paquetes con duración de 45 días
      { $set: { duration: 180 } } // Cambiar a 180 días
    );
    console.log(`   ✅ Paquetes actualizados: ${packagesResult.modifiedCount}`);
    
    // 2. Actualizar modelo License - cambiar duración por defecto
    console.log('🎫 Actualizando licencias...');
    const licensesResult = await License.updateMany(
      { duration: 45 }, // Buscar licencias con duración de 45 días
      { $set: { duration: 180 } } // Cambiar a 180 días
    );
    console.log(`   ✅ Licencias actualizadas: ${licensesResult.modifiedCount}`);
    
    // 3. Verificar los cambios
    console.log('\n🔍 Verificando cambios...');
    
    const updatedPackages = await Package.find({ duration: 180 }).select('name duration');
    console.log('📦 Paquetes con duración de 180 días:');
    updatedPackages.forEach(pkg => {
      console.log(`   • ${pkg.name}: ${pkg.duration} días`);
    });
    
    const updatedLicenses = await License.find({ duration: 180 }).select('level duration');
    console.log('\n🎫 Licencias con duración de 180 días:');
    updatedLicenses.forEach(license => {
      console.log(`   • ${license.level}: ${license.duration} días`);
    });
    
    console.log('\n📋 Resumen de cambios aplicados:');
    console.log('   ✅ Duración total actualizada: 180 días (6 meses)');
    console.log('   ✅ Esto permite 5 ciclos completos de 45 días máximo cada uno');
    console.log('   ✅ Sistema optimizado según documentación oficial');
    
    console.log('\n🎉 Actualización completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
}

// Ejecutar el script
updateLicenseDuration();