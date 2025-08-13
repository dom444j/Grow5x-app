require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('./src/models/Package.model');

async function debugFeaturesStructure() {
  try {
    console.log('Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado exitosamente');
    
    const packages = await Package.find({}).limit(2);
    
    for (const pkg of packages) {
      console.log(`\n=== ${pkg.name} ===`);
      console.log('Features array length:', pkg.features.length);
      
      pkg.features.forEach((feature, index) => {
        console.log(`\nFeature ${index + 1}:`);
        console.log('  Type:', typeof feature);
        console.log('  Value:', feature);
        console.log('  Keys:', Object.keys(feature));
        console.log('  Is Array:', Array.isArray(feature));
        
        if (typeof feature === 'object' && feature !== null) {
          console.log('  Object properties:');
          for (const [key, value] of Object.entries(feature)) {
            console.log(`    ${key}: ${value} (${typeof value})`);
          }
          
          // Probar la lógica de reconstrucción
          const numericKeys = Object.keys(feature).filter(key => !isNaN(key)).sort((a, b) => parseInt(a) - parseInt(b));
          console.log('  Numeric keys:', numericKeys);
          if (numericKeys.length > 0) {
            const reconstructed = numericKeys.map(key => feature[key]).join('');
            console.log('  Reconstructed text:', reconstructed);
          }
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugFeaturesStructure();