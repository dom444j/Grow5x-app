const mongoose = require('mongoose');
const Package = require('../src/models/Package.model.js');

async function fixPackageSalesCount() {
  try {
    await mongoose.connect('mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority');
    
    console.log('=== CORRIGIENDO SALESCOUNT DE PAQUETES ===\n');
    
    // Buscar todos los paquetes
    const allPackages = await Package.find({});
    
    // Filtrar los que tienen salesCount undefined, null o no existe
    const packagesWithoutSalesCount = allPackages.filter(pkg => 
      pkg.salesCount === undefined || pkg.salesCount === null || !pkg.hasOwnProperty('salesCount')
    );
    
    console.log(`Paquetes sin salesCount definido: ${packagesWithoutSalesCount.length}`);
    
    if (packagesWithoutSalesCount.length > 0) {
      // Actualizar todos los paquetes para que tengan salesCount: 0
      const result = await Package.updateMany(
        {},
        { $set: { salesCount: 0 } }
      );
      
      console.log(`✅ Actualizados ${result.modifiedCount} paquetes con salesCount: 0`);
    }
    
    // Verificar el estado final
    const finalPackages = await Package.find({}, 'name salesCount metadata.totalSales');
    console.log('\n=== ESTADO FINAL DE PAQUETES ===');
    finalPackages.forEach(pkg => {
      console.log(`- ${pkg.name}: salesCount=${pkg.salesCount}, totalSales=${pkg.metadata?.totalSales || 0}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Corrección completada');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPackageSalesCount();