const mongoose = require('mongoose');
const OptimizedCalculationService = require('./src/services/OptimizedCalculationService');
const logger = require('./src/utils/logger');

// Configurar conexión a la base de datos
require('dotenv').config();

async function testBatchProcessing() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a la base de datos');
    
    console.log('🧪 Iniciando prueba de procesamiento masivo...');
    
    // Ejecutar procesamiento masivo con logs detallados
    const result = await OptimizedCalculationService.processDailyBenefitsForAllUsers();
    
    console.log('✅ Procesamiento masivo completado:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error en procesamiento masivo:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de la base de datos');
    process.exit(0);
  }
}

testBatchProcessing();