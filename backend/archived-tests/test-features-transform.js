const Package = require('./src/models/Package.model');
const mongoose = require('mongoose');
require('dotenv').config();

async function testFeaturesTransform() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');
    
    // Obtener un paquete
    const pkg = await Package.findOne({ status: 'active' });
    console.log('\nPaquete encontrado:', pkg.name);
    console.log('Número de features:', pkg.features.length);
    
    // Procesar cada feature individualmente
    const transformedFeatures = [];
    
    for (let i = 0; i < pkg.features.length; i++) {
      const feature = pkg.features[i];
      console.log(`\n--- Feature ${i + 1} ---`);
      console.log('Tipo:', typeof feature);
      console.log('Es objeto:', typeof feature === 'object');
      
      if (typeof feature === 'object' && feature !== null) {
        console.log('Claves del objeto:', Object.keys(feature));
        
        // Filtrar claves numéricas
        const numericKeys = Object.keys(feature)
          .filter(k => !isNaN(parseInt(k)) && k !== 'included' && k !== '_id')
          .map(k => parseInt(k))
          .sort((a, b) => a - b);
        
        console.log('Claves numéricas ordenadas:', numericKeys);
        
        if (numericKeys.length > 0) {
          const reconstructed = numericKeys.map(k => feature[k.toString()]).join('');
          console.log('Texto reconstruido:', reconstructed);
          transformedFeatures.push(reconstructed);
        } else {
          transformedFeatures.push(String(feature));
        }
      } else {
        console.log('No es objeto, usando como string:', feature);
        transformedFeatures.push(String(feature));
      }
    }
    
    console.log('\n=== RESULTADO FINAL ===');
    console.log('Features transformadas:');
    transformedFeatures.forEach((feature, index) => {
      console.log(`${index + 1}. ${feature}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testFeaturesTransform();