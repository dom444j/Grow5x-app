require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('./src/models/Package.model');

// Función para limpiar características malformadas
function cleanFeature(feature) {
  if (typeof feature !== 'string') {
    return feature;
  }
  
  // Si es un string JSON con índices numéricos, extraer el texto
  if (feature.startsWith('{"0":') || feature.startsWith('{\"0\":')) {
    try {
      const parsed = JSON.parse(feature);
      // Reconstruir el texto desde los índices
      const chars = Object.keys(parsed)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(key => parsed[key]);
      return chars.join('');
    } catch (e) {
      console.log('Error parsing JSON feature:', feature);
      return feature;
    }
  }
  
  return feature;
}

async function fixFeaturesInAtlas() {
  try {
    console.log('Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB Atlas exitosamente');
    
    console.log('Obteniendo todos los paquetes...');
    const packages = await Package.find({});
    console.log(`Encontrados ${packages.length} paquetes`);
    
    let updatedCount = 0;
    
    for (const pkg of packages) {
      console.log(`\nProcesando paquete: ${pkg.name}`);
      console.log('Características actuales:', pkg.features);
      
      let needsUpdate = false;
      const cleanedFeatures = pkg.features.map(feature => {
        const cleaned = cleanFeature(feature);
        if (cleaned !== feature) {
          needsUpdate = true;
          console.log(`  Limpiando: "${feature}" -> "${cleaned}"`);
        }
        return cleaned;
      });
      
      if (needsUpdate) {
        await Package.findByIdAndUpdate(pkg._id, {
          features: cleanedFeatures
        });
        updatedCount++;
        console.log(`  ✓ Paquete actualizado`);
      } else {
        console.log(`  ✓ Paquete ya está limpio`);
      }
    }
    
    console.log(`\n=== RESUMEN ===`);
    console.log(`Total de paquetes procesados: ${packages.length}`);
    console.log(`Paquetes actualizados: ${updatedCount}`);
    
    // Verificar los resultados
    console.log('\n=== VERIFICACIÓN FINAL ===');
    const updatedPackages = await Package.find({});
    for (const pkg of updatedPackages) {
      console.log(`${pkg.name}: ${JSON.stringify(pkg.features)}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB Atlas');
  }
}

fixFeaturesInAtlas();