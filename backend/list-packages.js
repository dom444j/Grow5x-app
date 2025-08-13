const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

// Importar el modelo Package
const Package = require('./src/models/Package.model');

async function listPackages() {
  try {
    // Conectar a MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    // Buscar todos los paquetes
    const packages = await Package.find({}).select('_id name slug price status category level duration isPopular salesCount');
    
    console.log(`\n📦 Total de paquetes: ${packages.length}`);
    console.log('\n📋 Lista de paquetes:');
    console.log('ID\t\t\t\t\tNombre\t\t\tSlug\t\tPrecio\tEstado\tCategoría');
    console.log('='.repeat(120));
    
    packages.forEach(pkg => {
      console.log(`${pkg._id}\t${pkg.name}\t\t${pkg.slug || 'N/A'}\t\t$${pkg.price}\t${pkg.status}\t${pkg.category}`);
    });
    
    // Buscar solo paquetes activos
    const activePackages = await Package.find({ status: 'active' });
    console.log(`\n🟢 Paquetes activos: ${activePackages.length}`);
    
    if (activePackages.length > 0) {
      console.log('\nPaquetes activos para usar en el smoke test:');
      activePackages.forEach((pkg, index) => {
        console.log(`${index + 1}. ID: ${pkg._id} | Slug: ${pkg.slug} | Nombre: ${pkg.name} | Precio: $${pkg.price}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

listPackages();