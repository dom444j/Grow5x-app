const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB Atlas');
    return checkSpecialCodes();
  })
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });

async function checkSpecialCodes() {
  try {
    // Importar los modelos necesarios
    const User = require('./src/models/User');
    const SpecialCode = require('./src/models/SpecialCode.model');
    
    // Buscar todos los códigos especiales
    const specialCodes = await SpecialCode.find({})
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });
    
    console.log('\n=== CÓDIGOS ESPECIALES EN LA BASE DE DATOS ===');
    console.log(`Total de códigos encontrados: ${specialCodes.length}`);
    
    if (specialCodes.length === 0) {
      console.log('\n⚠️  No se encontraron códigos especiales en la base de datos');
      return;
    }
    
    specialCodes.forEach((code, index) => {
      console.log(`\n--- Código ${index + 1} ---`);
      console.log(`ID: ${code._id}`);
      console.log(`Tipo: ${code.type}`);
      console.log(`Usuario: ${code.userId?.fullName || 'N/A'} (${code.userId?.email || 'N/A'})`);
      console.log(`Código de referido: ${code.referralCode}`);
      console.log(`Estado: ${code.isActive ? 'Activo' : 'Inactivo'}`);
      console.log(`Fecha de creación: ${code.createdAt}`);
      console.log(`Comisiones totales: $${code.statistics?.totalCommissionsEarned || 0}`);
      console.log(`Usuarios afectados: ${code.statistics?.totalUsersAffected || 0}`);
      console.log(`Historial de comisiones: ${code.commissionHistory?.length || 0} registros`);
      
      if (code.commissionHistory && code.commissionHistory.length > 0) {
        console.log('  Últimas comisiones:');
        code.commissionHistory.slice(-3).forEach((commission, i) => {
          console.log(`    ${i + 1}. $${commission.amount} - ${commission.commissionType} - ${commission.status}`);
        });
      }
    });
    
    // Verificar estadísticas generales
    const stats = await SpecialCode.getStatistics();
    if (stats && stats.length > 0) {
      console.log('\n=== ESTADÍSTICAS GENERALES ===');
      const stat = stats[0];
      console.log(`Total de códigos activos: ${stat.totalCodes}`);
      console.log(`Total de comisiones: $${stat.totalCommissions}`);
      console.log(`Total de usuarios afectados: ${stat.totalUsersAffected}`);
      console.log(`Comisiones de LÍDER: $${stat.leaderCommissions}`);
      console.log(`Comisiones de PADRE: $${stat.parentCommissions}`);
    }
    
  } catch (error) {
    console.error('❌ Error al verificar códigos especiales:', error.message);
    throw error;
  }
}