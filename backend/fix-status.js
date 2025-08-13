const mongoose = require('mongoose');
const Package = require('./src/models/Package.model');

async function fixPackageStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const result = await Package.updateMany({}, { $set: { status: 'active' } });
    console.log(`✅ Status actualizado a 'active' para ${result.modifiedCount} paquetes`);
    
    const packages = await Package.find({}, 'name category status');
    console.log('\n=== PAQUETES ACTUALIZADOS ===');
    packages.forEach(p => {
      console.log(`- ${p.name}: category='${p.category}', status='${p.status}'`);
    });
    
    await mongoose.disconnect();
    console.log('\n🎉 Status corregido exitosamente!');
  } catch (error) {
    console.error('Error:', error.message);
    await mongoose.disconnect();
  }
}

fixPackageStatus();