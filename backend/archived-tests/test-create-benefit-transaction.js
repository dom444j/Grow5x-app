const mongoose = require('mongoose');
const OptimizedCalculationService = require('./src/services/OptimizedCalculationService');
const Transaction = require('./src/models/Transaction.model');
const User = require('./src/models/User');

async function testCreateBenefitTransaction() {
  try {
    // Conectar a la base de datos
    await mongoose.connect('mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority'
    });
    console.log('✅ Conectado a la base de datos');

    // Buscar un usuario de prueba
    const testUser = await User.findOne({ email: { $regex: /test/i } }).lean();
    if (!testUser) {
      console.log('❌ No se encontró usuario de prueba');
      return;
    }
    
    console.log(`📋 Usuario de prueba: ${testUser.email} (${testUser._id})`);
    
    // Crear metadatos de prueba con purchaseId
    const testMetadata = {
      packageType: 'BASIC',
      cycleNumber: 1,
      dayInCycle: 1,
      benefitRate: 0.125,
      baseAmount: 100,
      purchaseId: '507f1f77bcf86cd799439011' // ObjectId de prueba
    };
    
    const testCalculationData = {
      isAutomated: true,
      calculatedAt: new Date(),
      calculationMethod: 'daily_benefit_12_5_percent',
      verificationHash: 'test_hash',
      isValidated: true,
      validatedAt: new Date()
    };
    
    console.log('🔧 Creando transacción de beneficio con metadatos...');
    console.log('Metadatos a guardar:', JSON.stringify(testMetadata, null, 2));
    
    // Crear transacción usando la función personalizada
    const transaction = await OptimizedCalculationService.createBenefitTransaction(
      testUser._id,
      12.5,
      testMetadata,
      testCalculationData
    );
    
    console.log(`✅ Transacción creada: ${transaction._id}`);
    
    // Recuperar la transacción para verificar metadatos
    const savedTransaction = await Transaction.findById(transaction._id).lean();
    
    console.log('\n=== VERIFICACIÓN DE METADATOS ===');
    console.log('Metadatos guardados:', JSON.stringify(savedTransaction.metadata, null, 2));
    console.log('CalculationData guardados:', JSON.stringify(savedTransaction.calculationData, null, 2));
    
    if (savedTransaction.metadata && savedTransaction.metadata.purchaseId) {
      console.log('✅ PurchaseId encontrado en metadatos:', savedTransaction.metadata.purchaseId);
    } else {
      console.log('❌ PurchaseId NO encontrado en metadatos');
    }
    
    // Limpiar - eliminar la transacción de prueba
    await Transaction.findByIdAndDelete(transaction._id);
    console.log('🧹 Transacción de prueba eliminada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de la base de datos');
  }
}

testCreateBenefitTransaction();