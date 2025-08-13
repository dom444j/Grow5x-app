const Package = require('./src/models/Package.model');
require('dotenv').config();
require('./src/config/database');

async function debugControllerTransformation() {
  try {
    console.log('🔍 DEPURANDO TRANSFORMACIÓN DEL CONTROLADOR...');
    
    // Paso 1: Obtener datos directamente de la base de datos
    console.log('\n📊 PASO 1: Datos directos de la base de datos');
    const packages = await Package.find({ status: 'active' })
      .select('name description price status features images duration benefits limits isPopular')
      .sort({ price: 1 });
    
    console.log(`Encontrados ${packages.length} paquetes`);
    
    // Mostrar las características tal como vienen de la base de datos
    packages.forEach((pkg, index) => {
      console.log(`\n📦 ${pkg.name}:`);
      console.log(`  Tipo de features: ${typeof pkg.features}`);
      console.log(`  Es array: ${Array.isArray(pkg.features)}`);
      
      if (pkg.features && Array.isArray(pkg.features)) {
        pkg.features.forEach((feature, i) => {
          console.log(`  [${i + 1}] Tipo: ${typeof feature}, Valor: ${JSON.stringify(feature)}`);
        });
      }
    });
    
    // Paso 2: Aplicar la transformación del controlador paso a paso
    console.log('\n\n🔄 PASO 2: Aplicando transformación del controlador...');
    
    const formattedPackages = packages.map(pkg => {
      console.log(`\n🔧 Transformando: ${pkg.name}`);
      
      // Crear un slug basado en el nombre del paquete
      const slug = pkg.name.toLowerCase()
        .replace('licencia ', '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      console.log(`  Slug generado: ${slug}`);
      
      // Procesar características
      console.log(`  Procesando ${pkg.features?.length || 0} características...`);
      
      const processedFeatures = (pkg.features || []).map((feature, index) => {
        console.log(`    [${index + 1}] Original - Tipo: ${typeof feature}`);
        console.log(`    [${index + 1}] Original - Valor: ${JSON.stringify(feature)}`);
        
        // Asegurar que siempre devolvemos un string simple
        if (typeof feature === 'string') {
          console.log(`    [${index + 1}] ✓ Ya es string: "${feature}"`);
          return feature;
        }
        
        // Si es un objeto, intentar extraer el texto
        if (typeof feature === 'object' && feature !== null) {
          console.log(`    [${index + 1}] Es objeto, intentando extraer texto...`);
          
          // Si tiene una propiedad 'name', 'text' o 'description', usarla
          if (feature.name) {
            const result = String(feature.name);
            console.log(`    [${index + 1}] ✓ Extraído de .name: "${result}"`);
            return result;
          }
          if (feature.text) {
            const result = String(feature.text);
            console.log(`    [${index + 1}] ✓ Extraído de .text: "${result}"`);
            return result;
          }
          if (feature.description) {
            const result = String(feature.description);
            console.log(`    [${index + 1}] ✓ Extraído de .description: "${result}"`);
            return result;
          }
        }
        
        // Fallback: convertir a string
        const result = String(feature).trim() || 'Característica no especificada';
        console.log(`    [${index + 1}] ⚠️ Fallback a String(): "${result}"`);
        return result;
      }).filter(feature => feature && feature.trim());
      
      console.log(`  ✅ Características procesadas: ${processedFeatures.length}`);
      processedFeatures.forEach((feature, i) => {
        console.log(`    ${i + 1}. "${feature}"`);
      });
      
      return {
        id: slug,
        _id: pkg._id,
        name: pkg.name,
        description: pkg.description,
        slug: slug,
        price: pkg.price,
        duration: pkg.duration,
        weeks: Math.round(pkg.duration / 7 * 10) / 10,
        paymentType: 'Diario',
        features: processedFeatures,
        benefits: {
          firstWeekReturn: pkg.benefits?.firstWeekReturn || '12.5%',
          dailyReturn: pkg.benefits?.dailyReturn || '12.5%',
          totalReturn: pkg.benefits?.totalReturn || '500% max.',
          referralCommission: pkg.benefits?.referralCommission || '10%',
          withdrawalTime: pkg.benefits?.withdrawalTime || '24 horas',
        },
        images: pkg.images || [],
        limits: pkg.limits || {},
        isPopular: pkg.isPopular || false
      };
    });
    
    // Paso 3: Simular la respuesta JSON
    console.log('\n\n📤 PASO 3: Simulando respuesta JSON...');
    
    const jsonResponse = {
      success: true,
      data: formattedPackages
    };
    
    // Convertir a JSON y luego parsear para simular el proceso de serialización
    const serialized = JSON.stringify(jsonResponse);
    const deserialized = JSON.parse(serialized);
    
    console.log('\n🔍 RESULTADO FINAL:');
    deserialized.data.forEach((pkg, index) => {
      console.log(`\n📦 ${pkg.name}:`);
      if (pkg.features && pkg.features.length > 0) {
        pkg.features.forEach((feature, i) => {
          console.log(`  [${i + 1}] Tipo: ${typeof feature}`);
          console.log(`  [${i + 1}] Valor: ${JSON.stringify(feature)}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar el debug
debugControllerTransformation();