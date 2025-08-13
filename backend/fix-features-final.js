const mongoose = require('mongoose');
require('dotenv').config();

// Script para corregir las características de los paquetes
async function fixPackageFeatures() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');
    
    // Usar la colección directamente para evitar problemas de validación del modelo
    const db = mongoose.connection.db;
    const packagesCollection = db.collection('packages');
    
    // Definir las características correctas para cada tipo de paquete
    const packageFeatures = {
      'starter': [
        'Acceso básico a la plataforma',
        'Soporte por email',
        'Dashboard básico',
        'Retiros cada 24 horas',
        'Comisión de referidos 10%',
        'Duración 45 días'
      ],
      'basic': [
        'Acceso completo a la plataforma',
        'Soporte prioritario',
        'Dashboard avanzado',
        'Retiros cada 12 horas',
        'Comisión de referidos 12%',
        'Duración 60 días'
      ],
      'standard': [
        'Acceso premium a la plataforma',
        'Soporte 24/7',
        'Dashboard profesional',
        'Retiros instantáneos',
        'Comisión de referidos 15%',
        'Duración 90 días'
      ],
      'premium': [
        'Acceso VIP a la plataforma',
        'Soporte dedicado',
        'Dashboard ejecutivo',
        'Retiros prioritarios',
        'Comisión de referidos 18%',
        'Duración 120 días'
      ],
      'gold': [
        'Acceso exclusivo a la plataforma',
        'Soporte personal',
        'Dashboard personalizado',
        'Retiros sin límites',
        'Comisión de referidos 20%',
        'Duración 150 días'
      ],
      'platinum': [
        'Acceso platinum a la plataforma',
        'Soporte VIP 24/7',
        'Dashboard premium',
        'Retiros ilimitados',
        'Comisión de referidos 22%',
        'Duración 180 días'
      ],
      'diamond': [
        'Acceso diamond exclusivo',
        'Soporte personal dedicado',
        'Dashboard ejecutivo premium',
        'Retiros prioritarios sin límite',
        'Comisión de referidos 25%',
        'Duración 365 días'
      ]
    };
    
    // Obtener todos los paquetes
    const packages = await packagesCollection.find({}).toArray();
    console.log(`Encontrados ${packages.length} paquetes`);
    
    for (const pkg of packages) {
      console.log(`\nProcesando: ${pkg.name}`);
      
      // Determinar el tipo de paquete basado en el nombre
      let packageType = null;
      const name = pkg.name.toLowerCase();
      
      if (name.includes('starter')) packageType = 'starter';
      else if (name.includes('basic')) packageType = 'basic';
      else if (name.includes('standard')) packageType = 'standard';
      else if (name.includes('premium')) packageType = 'premium';
      else if (name.includes('gold')) packageType = 'gold';
      else if (name.includes('platinum')) packageType = 'platinum';
      else if (name.includes('diamond')) packageType = 'diamond';
      
      if (packageType && packageFeatures[packageType]) {
        // Actualizar directamente en la colección
        const result = await packagesCollection.updateOne(
          { _id: pkg._id },
          { $set: { features: packageFeatures[packageType] } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`  ✓ ${pkg.name} actualizado con ${packageFeatures[packageType].length} características`);
        } else {
          console.log(`  - ${pkg.name} no necesitaba actualización`);
        }
      } else {
        console.log(`  ⚠ ${pkg.name} - tipo no reconocido, saltando`);
      }
    }
    
    console.log('\n🎉 ¡Proceso completado!');
    
    // Verificar los cambios
    console.log('\n=== VERIFICACIÓN DE CAMBIOS ===');
    const updatedPackages = await packagesCollection.find({}, { projection: { name: 1, features: 1 } }).toArray();
    
    updatedPackages.forEach(pkg => {
      console.log(`\n${pkg.name}:`);
      if (Array.isArray(pkg.features) && pkg.features.length > 0) {
        pkg.features.forEach((feature, index) => {
          console.log(`  ${index + 1}. ${feature}`);
        });
      } else {
        console.log('  Sin características definidas');
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPackageFeatures();