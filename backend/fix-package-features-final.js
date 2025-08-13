const mongoose = require('mongoose');
const Package = require('./models/Package.model');
require('dotenv').config();

// Función para convertir objetos con índices numéricos a strings
function convertFeatureObjectToString(feature) {
  if (typeof feature === 'string') {
    return feature;
  }
  
  if (feature && typeof feature === 'object') {
    // Si tiene una propiedad 'name', usarla
    if (feature.name && typeof feature.name === 'string') {
      return feature.name;
    }
    
    // Si es un objeto con índices numéricos, reconstruir el string
    const numericKeys = Object.keys(feature)
      .filter(key => !isNaN(key) && key !== 'included' && key !== '_id')
      .sort((a, b) => parseInt(a) - parseInt(b));
    
    if (numericKeys.length > 0) {
      return numericKeys.map(key => feature[key]).join('');
    }
    
    // Si no se puede convertir, devolver string vacío
    return '';
  }
  
  return String(feature);
}

async function fixPackageFeatures() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Buscar todos los paquetes
    const packages = await Package.find({});
    console.log(`Encontrados ${packages.length} paquetes`);

    let updatedCount = 0;

    for (const pkg of packages) {
      let needsUpdate = false;
      let newFeatures = [];

      if (pkg.features && Array.isArray(pkg.features)) {
        for (const feature of pkg.features) {
          const convertedFeature = convertFeatureObjectToString(feature);
          newFeatures.push(convertedFeature);
          
          // Verificar si la característica necesita actualización
          if (typeof feature === 'object' && feature !== null) {
            needsUpdate = true;
            console.log(`Paquete ${pkg.name}: Convirtiendo característica objeto a string:`);
            console.log('  Antes:', JSON.stringify(feature));
            console.log('  Después:', convertedFeature);
          }
        }
      }

      if (needsUpdate) {
        // Actualizar el paquete con las características corregidas
        await Package.findByIdAndUpdate(
          pkg._id,
          { features: newFeatures },
          { new: true }
        );
        updatedCount++;
        console.log(`✅ Paquete ${pkg.name} actualizado`);
      } else {
        console.log(`✓ Paquete ${pkg.name}: características ya son strings`);
      }
    }

    console.log(`\n🎉 Proceso completado: ${updatedCount} paquetes actualizados`);
    
    // Verificar que todas las características son ahora strings
    console.log('\n🔍 Verificando corrección...');
    const verifyPackages = await Package.find({});
    
    for (const pkg of verifyPackages) {
      if (pkg.features && Array.isArray(pkg.features)) {
        for (const feature of pkg.features) {
          if (typeof feature !== 'string') {
            console.log(`❌ ERROR: Paquete ${pkg.name} aún tiene características no-string:`, feature);
          }
        }
      }
    }
    
    console.log('✅ Verificación completada - todas las características son strings');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

// Ejecutar el script
fixPackageFeatures();