const mongoose = require('mongoose');
const Package = require('./models/Package.model');
require('dotenv').config();

async function debugPackageFeatures() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Buscar todos los paquetes
    const packages = await Package.find({}).lean(); // usar .lean() para obtener objetos planos
    console.log(`Encontrados ${packages.length} paquetes`);

    for (const pkg of packages) {
      console.log(`\n📦 Paquete: ${pkg.name}`);
      console.log('ID:', pkg._id);
      
      if (pkg.features && Array.isArray(pkg.features)) {
        console.log(`Número de características: ${pkg.features.length}`);
        
        pkg.features.forEach((feature, index) => {
          console.log(`\n  Característica ${index + 1}:`);
          console.log(`    Tipo: ${typeof feature}`);
          console.log(`    Valor completo:`, JSON.stringify(feature, null, 4));
          
          if (typeof feature === 'object' && feature !== null) {
            console.log(`    Claves del objeto:`, Object.keys(feature));
            console.log(`    Es array:`, Array.isArray(feature));
            
            // Verificar si tiene índices numéricos
            const numericKeys = Object.keys(feature).filter(key => !isNaN(key));
            if (numericKeys.length > 0) {
              console.log(`    ⚠️  PROBLEMA DETECTADO: Tiene índices numéricos:`, numericKeys);
              console.log(`    Contenido por índices:`);
              numericKeys.sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
                console.log(`      [${key}]: "${feature[key]}"`);
              });
              
              // Reconstruir el string
              const reconstructed = numericKeys
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(key => feature[key])
                .join('');
              console.log(`    String reconstruido: "${reconstructed}"`);
            }
          } else {
            console.log(`    ✅ Es string: "${feature}"`);
          }
        });
      } else {
        console.log('  ❌ No tiene características o no es un array');
      }
    }
    
    // Buscar específicamente paquetes con características problemáticas
    console.log('\n🔍 Buscando características problemáticas...');
    const problematicPackages = await Package.aggregate([
      {
        $match: {
          'features': { $exists: true, $ne: [] }
        }
      },
      {
        $project: {
          name: 1,
          features: 1,
          hasObjectFeatures: {
            $anyElementTrue: {
              $map: {
                input: '$features',
                as: 'feature',
                in: { $ne: [{ $type: '$$feature' }, 'string'] }
              }
            }
          }
        }
      },
      {
        $match: {
          hasObjectFeatures: true
        }
      }
    ]);
    
    if (problematicPackages.length > 0) {
      console.log(`\n❌ Encontrados ${problematicPackages.length} paquetes con características no-string:`);
      problematicPackages.forEach(pkg => {
        console.log(`  - ${pkg.name}`);
        pkg.features.forEach((feature, index) => {
          if (typeof feature !== 'string') {
            console.log(`    Característica ${index + 1}:`, JSON.stringify(feature));
          }
        });
      });
    } else {
      console.log('\n✅ No se encontraron paquetes con características problemáticas');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

// Ejecutar el script
debugPackageFeatures();