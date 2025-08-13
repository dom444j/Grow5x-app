const mongoose = require('mongoose');
const Package = require('./models/Package.model');
require('dotenv').config();

// Función para detectar y convertir strings que contienen objetos JSON
function parseStringifiedFeature(featureString) {
  try {
    // Si es un string que contiene un objeto JSON con índices numéricos
    if (typeof featureString === 'string' && 
        featureString.includes("'0':") && 
        featureString.includes("'1':")) {
      
      console.log('    🔍 Detectado string JSON con índices numéricos');
      
      // Intentar parsear el string como JSON
      // Primero, reemplazar comillas simples por dobles para JSON válido
      let jsonString = featureString
        .replace(/'/g, '"')
        .replace(/new ObjectId\([^)]+\)/g, '"ObjectId"')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      
      try {
        const parsed = JSON.parse(jsonString);
        
        if (typeof parsed === 'object' && parsed !== null) {
          // Extraer caracteres por índices numéricos
          const numericKeys = Object.keys(parsed)
            .filter(key => !isNaN(key))
            .sort((a, b) => parseInt(a) - parseInt(b));
          
          if (numericKeys.length > 0) {
            const reconstructed = numericKeys.map(key => parsed[key]).join('');
            console.log(`    ✅ Reconstruido: "${reconstructed}"`);
            return reconstructed;
          }
        }
      } catch (parseError) {
        console.log('    ❌ Error parseando JSON, intentando extracción manual');
        
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
            console.log(`    ✅ Extracción manual: "${reconstructed}"`);
            return reconstructed;
          }
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

async function fixStringifiedFeatures() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Buscar todos los paquetes usando .lean() para obtener datos sin transformar
    const packages = await Package.find({}).lean();
    console.log(`Encontrados ${packages.length} paquetes`);

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
        console.log(`\n  🔄 Actualizando paquete ${pkg.name}...`);
        
        // Actualizar el paquete con las características corregidas
        await Package.findByIdAndUpdate(
          pkg._id,
          { features: newFeatures },
          { new: true }
        );
        updatedCount++;
        console.log(`  ✅ Paquete ${pkg.name} actualizado exitosamente`);
        
        // Mostrar las características finales
        console.log(`  📋 Características finales:`);
        newFeatures.forEach((feature, index) => {
          console.log(`    ${index + 1}. "${feature}"`);
        });
      } else {
        console.log(`  ✓ Paquete ${pkg.name}: no necesita actualización`);
      }
    }

    console.log(`\n🎉 Proceso completado: ${updatedCount} paquetes actualizados`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

// Ejecutar el script
fixStringifiedFeatures();