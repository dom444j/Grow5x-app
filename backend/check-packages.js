const mongoose = require('mongoose');
const Package = require('./src/models/Package.model');

async function fixPackageCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const packages = [
      { slug: 'starter', category: 'starter' },
      { slug: 'basic', category: 'basic' },
      { slug: 'standard', category: 'standard' },
      { slug: 'premium', category: 'premium' },
      { slug: 'gold', category: 'gold' },
      { slug: 'platinum', category: 'platinum' },
      { slug: 'diamond', category: 'diamond' }
    ];
    
    console.log('=== CORRIGIENDO CATEGORÍAS DE PAQUETES ===');
    
    for (const pkg of packages) {
      const result = await Package.updateOne(
        { slug: pkg.slug },
        { $set: { category: pkg.category } }
      );
      console.log(`✅ ${pkg.slug}: ${result.modifiedCount} documento(s) actualizado(s)`);
    }
    
    // Verificar resultados
    console.log('\n=== VERIFICACIÓN ===');
    const allPackages = await Package.find({}, 'name category slug status');
    allPackages.forEach(p => {
      console.log(`- ${p.name}: category='${p.category}', slug='${p.slug}', status='${p.status}'`);
    });
    
    await mongoose.disconnect();
    console.log('\n🎉 Categorías corregidas exitosamente!');
  } catch (error) {
    console.error('Error:', error.message);
    await mongoose.disconnect();
  }
}

fixPackageCategories();