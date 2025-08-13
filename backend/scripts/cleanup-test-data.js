const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction.model');
const User = require('../src/models/User');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const cleanupTestData = async () => {
  try {
    console.log('🧹 Iniciando limpieza de datos de prueba...');
    
    // Eliminar transacciones de prueba (las que tienen description que contiene "Prueba")
    const deletedTransactions = await Transaction.deleteMany({
      description: { $regex: /Prueba|Test|test/i }
    });
    
    console.log(`✅ Eliminadas ${deletedTransactions.deletedCount} transacciones de prueba`);
    
    // Eliminar usuario de prueba si existe
    const deletedUser = await User.deleteOne({
      email: 'test@example.com'
    });
    
    if (deletedUser.deletedCount > 0) {
      console.log('✅ Usuario de prueba eliminado');
    }
    
    // Mostrar estadísticas actuales
    const remainingTransactions = await Transaction.countDocuments();
    const totalUsers = await User.countDocuments();
    
    console.log('\n📊 Estado actual del sistema:');
    console.log(`- Transacciones restantes: ${remainingTransactions}`);
    console.log(`- Usuarios totales: ${totalUsers}`);
    
    console.log('\n✨ Limpieza completada. El sistema está listo para datos reales.');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

cleanupTestData();