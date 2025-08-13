const mongoose = require('mongoose');
require('dotenv').config();

// Conectar directamente a MongoDB sin usar el modelo
async function checkCurrentFeatures() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');
    
    // Usar la colección directamente para ver la estructura real
    const db = mongoose.connection.db;
    const packages = await db.collection('packages').find({}).toArray();
    
    console.log(`Encontrados ${packages.length} paquetes`);
    
    packages.forEach((pkg, index) => {
      console.log(`\n=== PAQUETE ${index + 1} ===`);
      console.log('Nombre:', pkg.name);
      console.log('Características (tipo):', typeof pkg.features);
      console.log('Características (estructura):');
      console.log(JSON.stringify(pkg.features, null, 2));
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCurrentFeatures();