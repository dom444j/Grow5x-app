const { MongoClient } = require('mongodb');
require('dotenv').config();

// Función para detectar y corregir strings que contienen objetos JSON malformados
function fixMalformedFeature(featureString) {
  try {
    if (typeof featureString !== 'string') {
      return String(featureString);
    }
    
    // Detectar si es un string que contiene un objeto JSON con índices numéricos
    if (featureString.includes("'0':") || featureString.includes('"0":') || 
        featureString.includes("'1':") || featureString.includes('"1":')) {
      
      console.log('    🔍 Detectado string JSON malformado');
      console.log(`    📝 Contenido: ${featureString.substring(0, 200)}...`);
      
      // Método 1: Extraer usando regex para patrones con comillas simples
      let matches = featureString.match(/'(\d+)':\s*'([^']+)'/g);
      if (!matches) {
        // Método 2: Extraer usando regex para patrones con comillas dobles
        matches = featureString.match(/"(\d+)":\s*"([^"]+)"/g);
      }
      
      if (matches) {
        const charMap = {};
        matches.forEach(match => {
          let charMatch = match.match(/'(\d+)':\s*'([^']+)'/);
          if (!charMatch) {
            charMatch = match.match(/"(\d+)":\s*"([^"]+)"/);
          }
          if (charMatch) {
            const index = parseInt(charMatch[1]);
            const char = charMatch[2];
            charMap[index] = char;
          }
        });
        
        // Reconstruir el string en orden
        const indices = Object.keys(charMap).map(k => parseInt(k)).sort((a, b) => a - b);
        if (indices.length > 0) {
          const reconstructed = indices.map(i => charMap[i]).join('');
          if (reconstructed.trim()) {
            console.log(`    ✅ Reconstruido: "${reconstructed}"`);
            return reconstructed.trim();
          }
        }
      }
      
      // Método 3: Si el string parece ser un objeto JavaScript, intentar evaluarlo de forma segura
      if (featureString.startsWith('{') && featureString.endsWith('}')) {
        try {
          // Limpiar el string para hacerlo JSON válido
          let cleanJson = featureString
            .replace(/'/g, '"')
            .replace(/ObjectId\([^)]+\)/g, '"ObjectId"')
            .replace(/new\s+ObjectId\([^)]+\)/g, '"ObjectId"')
            .replace(/included:\s*true/g, '"included": true')
            .replace(/included:\s*false/g, '"included": false')
            .replace(/_id:\s*"ObjectId"/g, '"_id": "ObjectId"');
          
          const parsed = JSON.parse(cleanJson);
          
          // Extraer caracteres de las claves numéricas
          const numericKeys = Object.keys(parsed)
            .filter(k => !isNaN(parseInt(k)))
            .map(k => parseInt(k))
            .sort((a, b) => a - b);
          
          if (numericKeys.length > 0) {
            const reconstructed = numericKeys.map(k => parsed[k.toString()]).join('');
            if (reconstructed.trim()) {
              console.log(`    ✅ Reconstruido desde JSON: "${reconstructed}"`);
              return reconstructed.trim();
            }
          }
        } catch (parseError) {
          console.log(`    ⚠️ Error parseando como JSON: ${parseError.message}`);
        }
      }
      
      // Método 4: Buscar patrones de texto entre comillas
      const textMatches = featureString.match(/'([^']{3,})'/g) || featureString.match(/"([^"]{3,})"/g);
      if (textMatches && textMatches.length > 0) {
        // Tomar el texto más largo que no sea un número
        const longestText = textMatches
          .map(match => match.replace(/['"]]/g, ''))
          .filter(text => text.length > 3 && isNaN(text))
          .sort((a, b) => b.length - a.length)[0];
        
        if (longestText) {
          console.log(`    ✅ Extraído texto: "${longestText}"`);
          return longestText.trim();
        }
      }
      
      console.log(`    ❌ No se pudo reconstruir, devolviendo original`);
    }
    
    return featureString;
  } catch (error) {
    console.log(`    ❌ Error procesando: ${error.message}`);
    return featureString;
  }
}

async function fixMalformedFeaturesInMongoDB() {
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
          
          const originalFeature = feature;
          const cleanedFeature = fixMalformedFeature(feature);
          newFeatures.push(cleanedFeature);
          
          if (cleanedFeature !== originalFeature) {
            needsUpdate = true;
            console.log(`    ✅ Característica corregida`);
          } else {
            console.log(`    ✓ Característica sin cambios`);
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
fixMalformedFeaturesInMongoDB();