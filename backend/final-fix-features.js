const mongoose = require('mongoose');
require('dotenv').config();

async function finalFixFeatures() {
  try {
    console.log('🔧 CORRECCIÓN FINAL DE CARACTERÍSTICAS...');
    
    // Conectar a MongoDB y esperar
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Obtener la colección directamente
    const db = mongoose.connection.db;
    const packagesCollection = db.collection('packages');
    
    // Buscar todos los paquetes
    const packages = await packagesCollection.find({}).toArray();
    console.log(`📦 Encontrados ${packages.length} paquetes`);
    
    // Definir características correctas para cada paquete
    const correctFeatures = {
      'Licencia Standard': [
        'Acceso premium a la plataforma',
        'Soporte 24/7',
        'Dashboard profesional',
        'Retiros instantáneos',
        'Comisión de referidos 15%',
        'Duración 90 días'
      ],
      'Licencia Basic': [
        'Acceso completo a la plataforma',
        'Soporte prioritario',
        'Dashboard avanzado',
        'Retiros cada 12 horas',
        'Comisión de referidos 12%',
        'Duración 60 días'
      ],
      'Licencia Premium': [
        'Acceso VIP a la plataforma',
        'Soporte dedicado',
        'Dashboard ejecutivo',
        'Retiros prioritarios',
        'Comisión de referidos 18%',
        'Duración 120 días'
      ],
      'Licencia Platinum': [
        'Acceso platinum a la plataforma',
        'Soporte VIP 24/7',
        'Dashboard premium',
        'Retiros ilimitados',
        'Comisión de referidos 22%',
        'Duración 180 días'
      ],
      'Licencia Diamond': [
        'Acceso diamond exclusivo',
        'Soporte personal dedicado',
        'Dashboard ejecutivo premium',
        'Retiros prioritarios sin límite',
        'Comisión de referidos 25%',
        'Duración 365 días'
      ],
      'Licencia Starter': [
        'Acceso básico a la plataforma',
        'Soporte por email',
        'Dashboard básico',
        'Retiros cada 24 horas',
        'Comisión de referidos 10%',
        'Duración 45 días'
      ],
      'Licencia Gold': [
        'Acceso exclusivo a la plataforma',
        'Soporte personal',
        'Dashboard personalizado',
        'Retiros sin límites',
        'Comisión de referidos 20%',
        'Duración 150 días'
      ]
    };
    
    let updatedCount = 0;
    
    for (const pkg of packages) {
      const packageName = pkg.name;
      const newFeatures = correctFeatures[packageName];
      
      if (newFeatures) {
        console.log(`\n🔄 Actualizando ${packageName}...`);
        
        const result = await packagesCollection.updateOne(
          { _id: pkg._id },
          { $set: { features: newFeatures } }
        );
        
        if (result.modifiedCount > 0) {
          updatedCount++;
          console.log(`✅ ${packageName} actualizado`);
          newFeatures.forEach((feature, index) => {
            console.log(`  ${index + 1}. ${feature}`);
          });
        }
      } else {
        console.log(`⚠️ No se encontraron características para: ${packageName}`);
      }
    }
    
    console.log(`\n🎉 Proceso completado: ${updatedCount} paquetes actualizados`);
    
    // Verificar resultados
    console.log('\n🔍 Verificando resultados...');
    const updatedPackages = await packagesCollection.find({}).toArray();
    
    for (const pkg of updatedPackages) {
      console.log(`\n📋 ${pkg.name}:`);
      if (pkg.features && pkg.features.length > 0) {
        pkg.features.forEach((feature, index) => {
          console.log(`  ${index + 1}. "${feature}" (${typeof feature})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Ejecutar la corrección
finalFixFeatures();