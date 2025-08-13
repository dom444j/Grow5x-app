const mongoose = require('mongoose');
const Package = require('./src/models/Package.model');
require('dotenv').config();

// Función para actualizar solo las características
async function updatePackageFeatures() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');
    
    // Actualizar usando updateOne para evitar problemas de validación
    const updates = [
      {
        filter: { name: { $regex: /starter/i } },
        features: [
          'Acceso básico a la plataforma',
          'Soporte por email',
          'Dashboard básico',
          'Retiros cada 24 horas',
          'Comisión de referidos 10%',
          'Duración 45 días'
        ]
      },
      {
        filter: { name: { $regex: /basic/i } },
        features: [
          'Acceso completo a la plataforma',
          'Soporte prioritario',
          'Dashboard avanzado',
          'Retiros cada 12 horas',
          'Comisión de referidos 12%',
          'Duración 60 días'
        ]
      },
      {
        filter: { name: { $regex: /standard/i } },
        features: [
          'Acceso premium a la plataforma',
          'Soporte 24/7',
          'Dashboard profesional',
          'Retiros instantáneos',
          'Comisión de referidos 15%',
          'Duración 90 días'
        ]
      },
      {
        filter: { name: { $regex: /premium/i } },
        features: [
          'Acceso VIP a la plataforma',
          'Soporte dedicado',
          'Dashboard ejecutivo',
          'Retiros prioritarios',
          'Comisión de referidos 18%',
          'Duración 120 días'
        ]
      },
      {
        filter: { name: { $regex: /gold/i } },
        features: [
          'Acceso exclusivo a la plataforma',
          'Soporte personal',
          'Dashboard personalizado',
          'Retiros sin límites',
          'Comisión de referidos 20%',
          'Duración 150 días'
        ]
      }
    ];
    
    for (const update of updates) {
      const result = await Package.updateMany(
        update.filter,
        { $set: { features: update.features } }
      );
      
      console.log(`✓ Actualizados ${result.modifiedCount} paquetes que coinciden con:`, update.filter);
    }
    
    console.log('\n🎉 ¡Todas las características han sido actualizadas!');
    
    // Verificar los cambios
    const packages = await Package.find({}, 'name features');
    packages.forEach(pkg => {
      console.log(`\n${pkg.name}:`);
      pkg.features.forEach((feature, index) => {
        console.log(`  ${index + 1}. ${feature}`);
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updatePackageFeatures();