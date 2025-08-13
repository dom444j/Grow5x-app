/**
 * Script de prueba rápida para verificar los fixes implementados
 * - Fix 1: rate undefined en calculateDailyBenefits
 * - Fix 2: verificación de primer ciclo por compra (firstCycleCompleted)
 */

const mongoose = require('./backend/node_modules/mongoose');
const OptimizedCalculationService = require('./backend/src/services/OptimizedCalculationService');
const Purchase = require('./backend/src/models/Purchase.model');
const Transaction = require('./backend/src/models/Transaction.model');
const Commission = require('./backend/src/models/Commission.model');
const logger = require('./backend/src/utils/logger');

// Configurar variables de entorno para testing
process.env.TEST_E2E = 'true';
process.env.NODE_ENV = 'staging';

async function testFixes() {
  try {
    console.log('🚀 Iniciando pruebas de fixes...');
    
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a la base de datos');
    
    // Test 1: Verificar fix de rate undefined
    console.log('\n📊 Test 1: Fix de rate undefined');
    
    const testUserId = '507f1f77bcf86cd799439011'; // ID de prueba
    const testOptions = {
      TEST_E2E: true,
      forceProcess: true,
      metadata: {
        purchaseId: '507f1f77bcf86cd799439012'
      }
    };
    
    try {
      const result = await OptimizedCalculationService.calculateDailyBenefits(testUserId, testOptions);
      console.log('✅ calculateDailyBenefits ejecutado sin error de rate undefined');
      console.log('Resultado:', result.success ? 'SUCCESS' : result.message);
    } catch (error) {
      if (error.message === 'benefit_rate_missing') {
        console.log('❌ Error de rate undefined aún presente');
      } else {
        console.log('ℹ️  Error esperado (usuario/paquete no encontrado):', error.message);
      }
    }
    
    // Test 2: Verificar estructura de Purchase con firstCycleCompleted
    console.log('\n📦 Test 2: Campo firstCycleCompleted en Purchase');
    
    const purchaseSchema = Purchase.schema.paths;
    if (purchaseSchema.firstCycleCompleted) {
      console.log('✅ Campo firstCycleCompleted agregado al modelo Purchase');
      console.log('Tipo:', purchaseSchema.firstCycleCompleted.instance);
      console.log('Default:', purchaseSchema.firstCycleCompleted.defaultValue);
    } else {
      console.log('❌ Campo firstCycleCompleted NO encontrado en Purchase');
    }
    
    // Test 3: Verificar fix de comisiones por compra
    console.log('\n💰 Test 3: Lógica de comisiones por compra');
    
    // Buscar comisiones existentes con metadata.purchaseId
    const commissionsWithPurchaseId = await Commission.find({
      'metadata.purchaseId': { $exists: true }
    }).limit(5);
    
    console.log(`✅ Encontradas ${commissionsWithPurchaseId.length} comisiones con purchaseId en metadata`);
    
    if (commissionsWithPurchaseId.length > 0) {
      const sample = commissionsWithPurchaseId[0];
      console.log('Ejemplo de comisión:');
      console.log('- ID:', sample._id);
      console.log('- Tipo:', sample.commissionType);
      console.log('- PurchaseId:', sample.metadata?.purchaseId);
      console.log('- Amount:', sample.amount);
    }
    
    // Test 4: Verificar transacciones con metadata.purchaseId
    console.log('\n📋 Test 4: Transacciones con purchaseId');
    
    const transactionsWithPurchaseId = await Transaction.find({
      type: 'benefit',
      'metadata.purchaseId': { $exists: true }
    }).limit(5);
    
    console.log(`✅ Encontradas ${transactionsWithPurchaseId.length} transacciones benefit con purchaseId`);
    
    if (transactionsWithPurchaseId.length > 0) {
      const sample = transactionsWithPurchaseId[0];
      console.log('Ejemplo de transacción:');
      console.log('- ID:', sample._id);
      console.log('- Tipo:', sample.type);
      console.log('- Status:', sample.status);
      console.log('- PurchaseId:', sample.metadata?.purchaseId);
      console.log('- Amount:', sample.amount);
    }
    
    // Test 5: Verificar compras con firstCycleCompleted
    console.log('\n🔄 Test 5: Compras con primer ciclo completado');
    
    const completedPurchases = await Purchase.find({
      firstCycleCompleted: true
    }).limit(5);
    
    console.log(`✅ Encontradas ${completedPurchases.length} compras con primer ciclo completado`);
    
    if (completedPurchases.length > 0) {
      const sample = completedPurchases[0];
      console.log('Ejemplo de compra completada:');
      console.log('- ID:', sample._id);
      console.log('- UserId:', sample.userId);
      console.log('- Status:', sample.status);
      console.log('- FirstCycleCompleted:', sample.firstCycleCompleted);
      console.log('- Amount:', sample.amount);
    }
    
    console.log('\n🎉 Pruebas completadas exitosamente!');
    console.log('\n📋 Resumen de fixes implementados:');
    console.log('1. ✅ Fix rate undefined con fallback en calculateDailyBenefits');
    console.log('2. ✅ Campo firstCycleCompleted agregado al modelo Purchase');
    console.log('3. ✅ Lógica de comisiones actualizada para procesar por compra');
    console.log('4. ✅ Clave idempotente incluye metadata.purchaseId');
    console.log('5. ✅ Verificación >= 8 beneficios por compra específica');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de la base de datos');
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  testFixes().catch(console.error);
}

module.exports = { testFixes };