const mongoose = require('mongoose');
const Package = require('./models/Package.model');
require('dotenv').config();

async function testPackagesApiResponse() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Simular exactamente lo que hace el controlador de paquetes
    const packages = await Package.find({ status: 'active' })
      .select('name description price features benefits duration isPopular salesCount images')
      .lean();

    console.log(`\n📦 Encontrados ${packages.length} paquetes activos`);

    packages.forEach((pkg, pkgIndex) => {
      console.log(`\n=== PAQUETE ${pkgIndex + 1}: ${pkg.name} ===`);
      console.log('ID:', pkg._id);
      
      if (pkg.features && Array.isArray(pkg.features)) {
        console.log(`\nCaracterísticas (${pkg.features.length} total):`);
        
        pkg.features.forEach((feature, index) => {
          console.log(`\n  [${index + 1}] Tipo: ${typeof feature}`);
          
          if (typeof feature === 'string') {
            console.log(`      Valor: "${feature}"`);
          } else if (typeof feature === 'object' && feature !== null) {
            console.log(`      ⚠️  OBJETO DETECTADO:`);
            console.log(`      JSON completo:`, JSON.stringify(feature, null, 6));
            
            // Verificar si tiene índices numéricos
            const keys = Object.keys(feature);
            const numericKeys = keys.filter(key => !isNaN(key));
            
            if (numericKeys.length > 0) {
              console.log(`      🔴 PROBLEMA: Tiene ${numericKeys.length} índices numéricos`);
              console.log(`      Índices:`, numericKeys.sort((a, b) => parseInt(a) - parseInt(b)));
              
              // Mostrar contenido por índice
              numericKeys.sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
                console.log(`        [${key}] = "${feature[key]}"`);
              });
              
              // Reconstruir string
              const reconstructed = numericKeys
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(key => feature[key])
                .join('');
              console.log(`      String reconstruido: "${reconstructed}"`);
            }
            
            // Verificar otras propiedades
            const otherKeys = keys.filter(key => isNaN(key));
            if (otherKeys.length > 0) {
              console.log(`      Otras propiedades:`, otherKeys);
              otherKeys.forEach(key => {
                console.log(`        ${key}: ${JSON.stringify(feature[key])}`);
              });
            }
          } else {
            console.log(`      Valor (${typeof feature}):`, feature);
          }
        });
      } else {
        console.log('\n❌ Sin características o no es array');
      }
    });

    // Simular la transformación que hace el controlador
    console.log('\n\n🔄 SIMULANDO TRANSFORMACIÓN DEL CONTROLADOR...');
    
    const transformedPackages = packages.map(pkg => ({
      ...pkg,
      features: (pkg.features || []).map(feature => {
        // Si ya es string, devolverlo
        if (typeof feature === 'string') {
          return feature;
        }
        
        // Si es un objeto, intentar extraer el texto
        if (typeof feature === 'object' && feature !== null) {
          // Si tiene una propiedad 'name', 'text' o 'description', usarla
          if (feature.name) return String(feature.name);
          if (feature.text) return String(feature.text);
          if (feature.description) return String(feature.description);
          
          // Si es un objeto con claves numéricas, reconstruir el string
          const numericKeys = Object.keys(feature)
            .filter(k => !isNaN(parseInt(k)) && k !== 'included' && k !== '_id')
            .map(k => parseInt(k))
            .sort((a, b) => a - b);
          
          if (numericKeys.length > 0) {
            const reconstructed = numericKeys.map(k => feature[k.toString()]).join('');
            if (reconstructed.trim()) {
              return reconstructed.trim();
            }
          }
          
          // Intentar extraer valores de string del objeto
          const stringValues = Object.values(feature)
            .filter(v => typeof v === 'string' && v.trim() && v !== 'true' && v !== 'false')
            .join(' ');
          
          if (stringValues.trim()) {
            return stringValues.trim();
          }
        }
        
        // Fallback: convertir a string
        return String(feature).trim() || 'Característica no especificada';
      }).filter(feature => feature && feature.trim())
    }));

    console.log('\n📤 RESULTADO FINAL QUE SE ENVÍA AL FRONTEND:');
    transformedPackages.forEach((pkg, index) => {
      console.log(`\n${index + 1}. ${pkg.name}:`);
      pkg.features.forEach((feature, fIndex) => {
        console.log(`   ${fIndex + 1}. "${feature}" (${typeof feature})`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

// Ejecutar el script
testPackagesApiResponse();