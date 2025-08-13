const { MongoClient } = require('mongodb');
require('dotenv').config();

// Función para detectar y convertir strings que contienen objetos JSON
function parseStringifiedFeature(featureString) {
  try {
    // Si es un string que contiene un objeto JSON con índices numéricos
    if (typeof featureString === 'string' && 
        featureString.includes("'0':") && 
        featureString.includes("'1':")) {
      
      console.log('    🔍 Detectado string JSON con índices numéricos');
      
      // Extracción manual usando regex
      const matches = featureString.match(/'\d+':\s*'([^']+)'/g);
      if (matches) {
        const chars = [];
        matches.forEach(match => {
          const charMatch = match.match(/'\d+':\s*'([^']+)'/);
          if (charMatch && charMatch[1]) {
            chars.push(charMatch[1]);
          }
        });
        
        if (chars.length > 0) {
          const reconstructed = chars.join('');
          console.log(`    ✅ Reconstruido: "${reconstructed}"`);
          return reconstructed;
        }
      }
    }
    
    // Si no es un string JSON problemático, devolver tal como está
    return featureString;
  } catch (error) {
    console.log(`    ❌ Error procesando: ${error.message}`);
    return featureString;
  }
}

async function fixFeaturesDirectMongoDB() {
  let client;
  
  try {
    console.log('🔗 Conectando directamente a MongoDB...');
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db();
    const packagesCollection = db.collection('packages');

    // Buscar todos los paquetes
    const packages = await packagesCollection.find({}).toArray();
    console.log(`📦 Encontrados ${packages.length} paquetes`);

    let updatedCount = 0;

    for (const pkg of packages) {
      console.log(`\n📦 Procesando: ${pkg.name}`);
      let needsUpdate = false;
      let newFeatures = [];

      if (pkg.features && Array.isArray(pkg.features)) {
        console.log(`  Características encontradas: ${pkg.features.length}`);
        
        for (let i = 0; i < pkg.features.length; i++) {
          const feature = pkg.features[i];
          console.log(`\n  [${i + 1}] Procesando característica:`);
          console.log(`    Tipo: ${typeof feature}`);
          console.log(`    Longitud: ${typeof feature === 'string' ? feature.length : 'N/A'}`);
          
          if (typeof feature === 'string') {
            // Mostrar una muestra del contenido
            const sample = feature.length > 100 ? feature.substring(0, 100) + '...' : feature;
            console.log(`    Muestra: ${sample}`);
            
            const cleanedFeature = parseStringifiedFeature(feature);
            newFeatures.push(cleanedFeature);
            
            if (cleanedFeature !== feature) {
              needsUpdate = true;
              console.log(`    ✅ Característica corregida`);
            } else {
              console.log(`    ✓ Característica ya limpia`);
            }
          } else {
            // Si no es string, convertir a string
            const stringFeature = String(feature);
            newFeatures.push(stringFeature);
            if (stringFeature !== feature) {
              needsUpdate = true;
              console.log(`    ✅ Convertido a string: "${stringFeature}"`);
            }
          }
        }
      } else {
        console.log('  ❌ Sin características válidas');
      }

      if (needsUpdate) {
        console.log(`\n  🔄 Actualizando paquete ${pkg.name} directamente en MongoDB...`);
        
        // Actualizar directamente en MongoDB
        const result = await packagesCollection.updateOne(
          { _id: pkg._id },
          { $set: { features: newFeatures } }
        );
        
        if (result.modifiedCount > 0) {
          updatedCount++;
          console.log(`  ✅ Paquete ${pkg.name} actualizado exitosamente`);
          
          // Mostrar las características finales
          console.log(`  📋 Características finales:`);
          newFeatures.forEach((feature, index) => {
            console.log(`    ${index + 1}. "${feature}"`);
          });
        } else {
          console.log(`  ❌ Error actualizando paquete ${pkg.name}`);
        }
      } else {
        console.log(`  ✓ Paquete ${pkg.name}: no necesita actualización`);
      }
    }

    console.log(`\n🎉 Proceso completado: ${updatedCount} paquetes actualizados`);
    
    // Verificar los resultados
    console.log('\n🔍 Verificando resultados...');
    const updatedPackages = await packagesCollection.find({}).toArray();
    
    for (const pkg of updatedPackages) {
      console.log(`\n📋 ${pkg.name}:`);
      if (pkg.features && pkg.features.length > 0) {
        pkg.features.forEach((feature, index) => {
          console.log(`  ${index + 1}. "${feature}" (${typeof feature})`);
        });
      } else {
        console.log('  Sin características');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Desconectado de MongoDB');
    }
  }
}

// Ejecutar el script
fixFeaturesDirectMongoDB();