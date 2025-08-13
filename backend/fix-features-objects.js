const { MongoClient } = require('mongodb');

// URI de conexión a MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5';

// Función para convertir objeto con índices numéricos a string
function objectToString(obj) {
  if (typeof obj === 'string') {
    return obj; // Ya es string, no necesita conversión
  }
  
  if (typeof obj !== 'object' || obj === null) {
    return String(obj); // Convertir a string si no es objeto
  }
  
  // Obtener las claves numéricas y ordenarlas
  const numericKeys = Object.keys(obj)
    .filter(key => !isNaN(key) && key !== 'included' && key !== '_id')
    .map(key => parseInt(key))
    .sort((a, b) => a - b);
  
  // Reconstruir el string
  let result = '';
  for (const key of numericKeys) {
    result += obj[key.toString()];
  }
  
  return result;
}

async function fixFeatureObjects() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔌 Conectando a MongoDB Atlas...');
    await client.connect();
    console.log('✅ Conectado exitosamente');
    
    const db = client.db('growx5');
    const packagesCollection = db.collection('packages');
    
    // Obtener todos los paquetes
    const packages = await packagesCollection.find({}).toArray();
    console.log(`\n📦 Encontrados ${packages.length} paquetes`);
    
    let totalFixed = 0;
    
    for (const pkg of packages) {
      console.log(`\n🔧 Procesando: ${pkg.name}`);
      
      if (pkg.features && Array.isArray(pkg.features)) {
        const fixedFeatures = [];
        let needsUpdate = false;
        
        for (let i = 0; i < pkg.features.length; i++) {
          const feature = pkg.features[i];
          
          if (typeof feature === 'object' && feature !== null) {
            const fixedFeature = objectToString(feature);
            fixedFeatures.push(fixedFeature);
            needsUpdate = true;
            console.log(`  ✓ Característica ${i + 1}: "${fixedFeature}"`);
          } else {
            fixedFeatures.push(feature);
            console.log(`  - Característica ${i + 1}: "${feature}" (ya era string)`);
          }
        }
        
        if (needsUpdate) {
          // Actualizar el paquete en la base de datos
          const result = await packagesCollection.updateOne(
            { _id: pkg._id },
            { $set: { features: fixedFeatures } }
          );
          
          if (result.modifiedCount > 0) {
            console.log(`  ✅ ${pkg.name} actualizado exitosamente`);
            totalFixed++;
          } else {
            console.log(`  ⚠️ ${pkg.name} no se pudo actualizar`);
          }
        } else {
          console.log(`  ✓ ${pkg.name} no necesitaba corrección`);
        }
      } else {
        console.log(`  ⚠️ ${pkg.name} no tiene características válidas`);
      }
    }
    
    console.log(`\n🎉 Proceso completado. ${totalFixed} paquetes corregidos.`);
    
    // Verificar los resultados
    console.log('\n🔍 Verificando resultados...');
    const updatedPackages = await packagesCollection.find({}).toArray();
    
    updatedPackages.forEach((pkg, index) => {
      console.log(`\n${index + 1}. ${pkg.name}:`);
      if (pkg.features && pkg.features.length > 0) {
        pkg.features.forEach((feature, i) => {
          console.log(`   ${i + 1}. ${feature}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Conexión cerrada.');
  }
}

// Ejecutar
fixFeatureObjects();