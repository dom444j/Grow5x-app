const mongoose = require('mongoose');
const Package = require('./src/models/Package.model');
require('dotenv').config();

// Traducciones correctas en español
const translations = {
  'packages.starter.feature1': 'Acceso básico a la plataforma',
  'packages.starter.feature2': 'Soporte por email',
  'packages.starter.feature3': 'Dashboard básico',
  'packages.starter.feature4': 'Retiros cada 24 horas',
  'packages.starter.feature5': 'Comisión de referidos 10%',
  'packages.starter.feature6': 'Duración 45 días',
  
  'packages.basic.feature1': 'Acceso completo a la plataforma',
  'packages.basic.feature2': 'Soporte prioritario',
  'packages.basic.feature3': 'Dashboard avanzado',
  'packages.basic.feature4': 'Retiros cada 12 horas',
  'packages.basic.feature5': 'Comisión de referidos 12%',
  'packages.basic.feature6': 'Duración 45 días',
  
  'packages.standard.feature1': 'Acceso premium a la plataforma',
  'packages.standard.feature2': 'Soporte 24/7',
  'packages.standard.feature3': 'Dashboard profesional',
  'packages.standard.feature4': 'Retiros instantáneos',
  'packages.standard.feature5': 'Comisión de referidos 15%',
  'packages.standard.feature6': 'Duración 45 días',
  
  'packages.premium.feature1': 'Acceso VIP a la plataforma',
  'packages.premium.feature2': 'Soporte dedicado',
  'packages.premium.feature3': 'Dashboard ejecutivo',
  'packages.premium.feature4': 'Retiros prioritarios',
  'packages.premium.feature5': 'Comisión de referidos 18%',
  'packages.premium.feature6': 'Duración 45 días',
  
  'packages.gold.feature1': 'Acceso exclusivo a la plataforma',
  'packages.gold.feature2': 'Soporte personal',
  'packages.gold.feature3': 'Dashboard personalizado',
  'packages.gold.feature4': 'Retiros sin límites',
  'packages.gold.feature5': 'Comisión de referidos 20%',
  'packages.gold.feature6': 'Duración 45 días',
  
  'packages.platinum.feature1': 'Acceso platinum a la plataforma',
  'packages.platinum.feature2': 'Soporte VIP',
  'packages.platinum.feature3': 'Dashboard avanzado plus',
  'packages.platinum.feature4': 'Retiros express',
  'packages.platinum.feature5': 'Comisión de referidos 22%',
  'packages.platinum.feature6': 'Duración 45 días',
  
  'packages.diamond.feature1': 'Acceso diamond a la plataforma',
  'packages.diamond.feature2': 'Soporte exclusivo',
  'packages.diamond.feature3': 'Dashboard diamond',
  'packages.diamond.feature4': 'Retiros VIP',
  'packages.diamond.feature5': 'Comisión de referidos 25%',
  'packages.diamond.feature6': 'Duración 45 días'
};

async function fixPackageFeatures() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');
    
    const packages = await Package.find({});
    console.log(`Encontrados ${packages.length} paquetes`);
    
    for (const pkg of packages) {
      console.log(`\nProcesando paquete: ${pkg.name}`);
      
      // Traducir las características
      const translatedFeatures = pkg.features.map(feature => {
        if (translations[feature]) {
          console.log(`  Traduciendo: ${feature} -> ${translations[feature]}`);
          return translations[feature];
        }
        console.log(`  Manteniendo: ${feature}`);
        return feature;
      });
      
      // Actualizar el paquete
      await Package.findByIdAndUpdate(pkg._id, {
        features: translatedFeatures
      });
      
      console.log(`  ✓ Paquete ${pkg.name} actualizado`);
    }
    
    console.log('\n✅ Todas las características han sido traducidas correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPackageFeatures();