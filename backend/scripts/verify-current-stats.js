const mongoose = require('mongoose');
const Package = require('../src/models/Package.model.js');
const Transaction = require('../src/models/Transaction.model.js');

async function verifyCurrentStats() {
  try {
    await mongoose.connect('mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority');
    
    console.log('=== VERIFICACIÓN ESTADO ACTUAL DE ESTADÍSTICAS ===\n');
    
    // Verificar paquetes
    const packages = await Package.find({}, 'name salesCount metadata.totalSales');
    console.log('Estado actual de paquetes en BD:');
    packages.forEach(pkg => {
      console.log(`- ${pkg.name}: salesCount=${pkg.salesCount}, totalSales=${pkg.metadata?.totalSales || 0}`);
    });
    
    // Verificar transacciones de compra
    const transactions = await Transaction.find({
      type: 'deposit',
      subtype: 'license_purchase',
      status: 'completed'
    });
    console.log(`\nTransacciones de compra completadas: ${transactions.length}`);
    
    // Calcular totales como lo hace el backend
    const totalSales = packages.reduce((sum, pkg) => sum + (pkg.salesCount || 0), 0);
    const totalRevenue = packages.reduce((sum, pkg) => sum + ((pkg.metadata?.totalSales || 0) * (pkg.salesCount || 0)), 0);
    
    console.log(`\n=== TOTALES CALCULADOS ===`);
    console.log(`Total Sales: ${totalSales}`);
    console.log(`Total Revenue: $${totalRevenue}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Verificación completada');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyCurrentStats();