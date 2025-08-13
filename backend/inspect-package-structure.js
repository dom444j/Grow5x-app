const Package = require('./src/models/Package.model');
const mongoose = require('mongoose');
require('dotenv').config();

async function inspectPackageStructure() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB Atlas');
    
    // Obtener un paquete específico para inspeccionar su estructura
    const pkg = await Package.findOne({ name: 'Licencia Standard' });
    
    if (!pkg) {
      console.log('No se encontró el paquete Licencia Standard');
      return;
    }
    
    console.log('\n=== ESTRUCTURA COMPLETA DEL PAQUETE ===');
    console.log('Nombre:', pkg.name);
    console.log('Precio:', pkg.price);
    console.log('Estado:', pkg.status);
    
    console.log('\n--- CARACTERÍSTICAS (features) ---');
    console.log('Tipo de features:', typeof pkg.features);
    console.log('Es array:', Array.isArray(pkg.features));
    console.log('Longitud:', pkg.features ? pkg.features.length : 'undefined');
    
    if (pkg.features) {
      console.log('\nContenido completo de features:');
      console.log(JSON.stringify(pkg.features, null, 2));
      
      console.log('\nAnálisis de cada feature:');
      pkg.features.forEach((feature, index) => {
        console.log(`\nFeature ${index + 1}:`);
        console.log('  Tipo:', typeof feature);
        console.log('  Valor:', feature);
        
        if (typeof feature === 'object' && feature !== null) {
          console.log('  Claves:', Object.keys(feature));
          console.log('  Valores:', Object.values(feature));
        }
      });
    }
    
    console.log('\n--- BENEFICIOS (benefits) ---');
    console.log('Tipo de benefits:', typeof pkg.benefits);
    console.log('Benefits existe:', !!pkg.benefits);
    
    if (pkg.benefits) {
      console.log('Contenido de benefits:');
      console.log(JSON.stringify(pkg.benefits, null, 2));
    } else {
      console.log('Benefits es null/undefined');
    }
    
    console.log('\n--- OTROS CAMPOS ---');
    console.log('Duration:', pkg.duration);
    console.log('isPopular:', pkg.isPopular);
    console.log('images:', pkg.images);
    console.log('description:', pkg.description);
    
    console.log('\n--- DOCUMENTO COMPLETO ---');
    console.log(JSON.stringify(pkg.toObject(), null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

inspectPackageStructure();