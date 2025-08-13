const mongoose = require('mongoose');
const Package = require('./src/models/Package.model');
require('dotenv').config();

// Script para corregir los porcentajes de comisión de referidos al 10% según documentación oficial
async function fixCommissionPercentages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Conectado a MongoDB Atlas');
    
    // Obtener todos los paquetes
    const packages = await Package.find({});
    console.log(`📦 Encontrados ${packages.length} paquetes`);
    
    let updatedCount = 0;
    
    for (const pkg of packages) {
      console.log(`\n📋 Procesando paquete: ${pkg.name}`);
      console.log('Características actuales:', pkg.features);
      
      // Actualizar características con comisión del 10%
      let updatedFeatures = [];
      let hasCommissionFeature = false;
      
      // Procesar cada característica
      for (const feature of pkg.features) {
        let featureText = '';
        let featureObj = {
          included: true
        };
        
        // Si la característica es un objeto con índices numéricos, reconstruir el texto
        if (typeof feature === 'object' && feature !== null) {
          if (feature.toObject) {
            const rawFeature = feature.toObject();
            const keys = Object.keys(rawFeature).filter(key => !isNaN(key) && key !== 'included' && key !== '_id');
            if (keys.length > 0) {
              keys.sort((a, b) => parseInt(a) - parseInt(b));
              featureText = keys.map(key => rawFeature[key]).join('');
            } else {
              featureText = rawFeature.name || rawFeature.description || String(feature);
            }
            featureObj.included = rawFeature.included !== false;
          } else {
            const keys = Object.keys(feature).filter(key => !isNaN(key) && key !== 'included' && key !== '_id');
            if (keys.length > 0) {
              keys.sort((a, b) => parseInt(a) - parseInt(b));
              featureText = keys.map(key => feature[key]).join('');
            } else {
              featureText = feature.name || feature.description || String(feature);
            }
            featureObj.included = feature.included !== false;
          }
        } else {
          featureText = String(feature);
        }
        
        // Verificar si es una característica de comisión y corregirla
        if (featureText.toLowerCase().includes('comisión') && featureText.toLowerCase().includes('referid')) {
          updatedFeatures.push({
            name: 'Comisión de referidos 10%',
            description: 'Comisión del 10% sobre el cashback de referidos directos',
            included: true
          });
          hasCommissionFeature = true;
          console.log(`  ✓ Corregida: "${featureText}" → "Comisión de referidos 10%"`);
        } else {
          updatedFeatures.push({
            name: featureText,
            description: featureText,
            included: featureObj.included
          });
        }
      }
      
      // Si no tenía característica de comisión, agregarla
      if (!hasCommissionFeature) {
        updatedFeatures.push({
          name: 'Comisión de referidos 10%',
          description: 'Comisión del 10% sobre el cashback de referidos directos',
          included: true
        });
        console.log(`  ✓ Agregada: "Comisión de referidos 10%"`);
      }
      
      // Actualizar el paquete
      await Package.updateOne(
        { _id: pkg._id },
        { $set: { features: updatedFeatures } }
      );
      
      updatedCount++;
      console.log(`  ✅ Paquete "${pkg.name}" actualizado`);
    }
    
    console.log(`\n🎉 ¡Proceso completado!`);
    console.log(`📊 Total de paquetes actualizados: ${updatedCount}`);
    console.log(`✅ Todas las comisiones de referidos ahora están al 10% según documentación oficial`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB Atlas');
  }
}

// Ejecutar el script
fixCommissionPercentages();