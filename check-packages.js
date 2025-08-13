const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

// Importar el modelo Package
const Package = require('./backend/src/models/Package.model');

async function checkPackages() {
  try {
    // Conectar a MongoDB Atlas
    console.log('Conectando a MongoDB Atlas...');
    console.log('URI:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    // Buscar todos los paquetes
    console.log('\n📦 Buscando paquetes en la base de datos...');
    const allPackages = await Package.find({});
    console.log(`Total de paquetes encontrados: ${allPackages.length}`);
    
    if (allPackages.length > 0) {
      console.log('\n📋 Lista de todos los paquetes:');
      allPackages.forEach((pkg, index) => {
        console.log(`${index + 1}. ${pkg.name}`);
        console.log(`   - ID: ${pkg._id}`);
        console.log(`   - Slug: ${pkg.slug}`);
        console.log(`   - Precio: $${pkg.price}`);
        console.log(`   - Estado: ${pkg.status}`);
        console.log(`   - Categoría: ${pkg.category}`);
        console.log(`   - Duración: ${pkg.duration} días`);
        console.log(`   - Popular: ${pkg.isPopular}`);
        console.log(`   - Ventas: ${pkg.salesCount}`);
        console.log('   ---');
      });
    }
    
    // Buscar solo paquetes activos
    console.log('\n🟢 Buscando paquetes activos...');
    const activePackages = await Package.find({ status: 'active' });
    console.log(`Paquetes activos encontrados: ${activePackages.length}`);
    
    if (activePackages.length > 0) {
      console.log('\n📋 Lista de paquetes activos:');
      activePackages.forEach((pkg, index) => {
        console.log(`${index + 1}. ${pkg.name} - $${pkg.price} (${pkg.slug})`);
      });
    } else {
      console.log('❌ No se encontraron paquetes activos');
      console.log('\n💡 Creando paquetes de ejemplo...');
      
      const samplePackages = [
        {
          name: 'Licencia Starter',
          slug: 'starter',
          description: 'Paquete inicial para comenzar con el arbitraje',
          price: 50,
          category: 'starter',
          level: 1,
          duration: 180,
          status: 'active',
          features: [
            { name: 'Herramienta autónoma de arbitraje con agentes IA', included: true },
            { name: 'Cashback 100% primera semana (8 días)', included: true },
            { name: '12.5% diario después de 24 horas cumplidas', included: true }
          ],
          benefits: [
            'Procesamiento de pagos en 24 horas',
            'Total retorno: 500% (incluye cashback)'
          ]
        },
        {
          name: 'Licencia Basic',
          slug: 'basic',
          description: 'Paquete básico con mejores beneficios',
          price: 100,
          category: 'basic',
          level: 2,
          duration: 180,
          status: 'active',
          features: [
            { name: 'Herramienta autónoma de arbitraje con agentes IA', included: true },
            { name: 'Cashback 100% primera semana (8 días)', included: true },
            { name: '12.5% diario después de 24 horas cumplidas', included: true }
          ],
          benefits: [
            'Procesamiento de pagos en 12 horas',
            'Total retorno: 500% (incluye cashback)'
          ]
        },
        {
          name: 'Licencia Standard',
          slug: 'standard',
          description: 'Paquete estándar más popular',
          price: 250,
          category: 'standard',
          level: 3,
          duration: 45,
          status: 'active',
          isPopular: true,
          features: [
            { name: 'Herramienta autónoma de arbitraje con agentes IA', included: true },
            { name: 'Cashback 100% primera semana (8 días)', included: true },
            { name: '12.5% diario después de 24 horas cumplidas', included: true }
          ],
          benefits: [
            'Procesamiento de pagos en 6 horas',
            'Total retorno: 500% (incluye cashback)'
          ]
        }
      ];
      
      for (const packageData of samplePackages) {
        const newPackage = new Package(packageData);
        await newPackage.save();
        console.log(`✅ Creado: ${packageData.name}`);
      }
      
      console.log('\n🎉 Paquetes de ejemplo creados exitosamente!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

checkPackages();