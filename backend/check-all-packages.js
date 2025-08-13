const Package = require('./src/models/Package.model');
const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllPackages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB Atlas');
    
    // Obtener todos los paquetes
    const allPackages = await Package.find({});
    console.log(`\nTotal de paquetes en la base de datos: ${allPackages.length}`);
    
    // Mostrar información de cada paquete
    allPackages.forEach((pkg, index) => {
      console.log(`\n--- Paquete ${index + 1} ---`);
      console.log('ID:', pkg._id);
      console.log('Nombre:', pkg.name);
      console.log('Precio:', pkg.price);
      console.log('Estado:', pkg.status);
      console.log('Duración:', pkg.duration, 'días');
      console.log('Popular:', pkg.isPopular || false);
      console.log('Número de características:', pkg.features ? pkg.features.length : 0);
      
      if (pkg.features && pkg.features.length > 0) {
        console.log('Características:');
        pkg.features.forEach((feature, fIndex) => {
          if (typeof feature === 'object' && feature !== null) {
            // Reconstruir el texto de las características
            const numericKeys = Object.keys(feature)
              .filter(k => !isNaN(parseInt(k)) && k !== 'included' && k !== '_id')
              .map(k => parseInt(k))
              .sort((a, b) => a - b);
            
            if (numericKeys.length > 0) {
              const reconstructed = numericKeys.map(k => feature[k.toString()]).join('');
              console.log(`  ${fIndex + 1}. ${reconstructed}`);
            }
          } else {
            console.log(`  ${fIndex + 1}. ${feature}`);
          }
        });
      }
      
      console.log('Beneficios:', pkg.benefits ? 'Sí' : 'No');
      if (pkg.benefits) {
        console.log('  - Retorno primera semana:', pkg.benefits.firstWeekReturn);
        console.log('  - Retorno diario:', pkg.benefits.dailyReturn);
        console.log('  - Retorno total:', pkg.benefits.totalReturn);
      }
    });
    
    // Verificar paquetes activos
    const activePackages = await Package.find({ status: 'active' });
    console.log(`\n=== RESUMEN ===`);
    console.log(`Total de paquetes: ${allPackages.length}`);
    console.log(`Paquetes activos: ${activePackages.length}`);
    console.log(`Paquetes inactivos: ${allPackages.length - activePackages.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAllPackages();