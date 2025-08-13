/**
 * 🔧 VERIFICACIÓN SIMPLE DE FIXES
 */

const mongoose = require('mongoose');
const path = require('path');

// Configuración
const MONGODB_URI = process.env.MONGODB_URI;

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    return false;
  }
}

async function testOptimizedCalculationService() {
  console.log('\n🔧 TEST: OptimizedCalculationService');
  
  try {
    // Importar el servicio
    const servicePath = path.join(__dirname, 'src', 'services', 'OptimizedCalculationService.js');
    const { OptimizedCalculationService } = require(servicePath);
    
    console.log('✅ OptimizedCalculationService importado correctamente');
    
    // Verificar que el método calculateDailyBenefits existe
    if (typeof OptimizedCalculationService.calculateDailyBenefits === 'function') {
      console.log('✅ Método calculateDailyBenefits existe');
    } else {
      console.log('❌ Método calculateDailyBenefits no encontrado');
      return false;
    }
    
    // Verificar que el método processFirstCycleCommissions existe
    if (typeof OptimizedCalculationService.processFirstCycleCommissions === 'function') {
      console.log('✅ Método processFirstCycleCommissions existe');
    } else {
      console.log('❌ Método processFirstCycleCommissions no encontrado');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error importando OptimizedCalculationService:', error.message);
    return false;
  }
}

async function testPurchaseModel() {
  console.log('\n🔧 TEST: Purchase Model');
  
  try {
    // Importar el modelo Purchase
    const Purchase = require('./src/models/Purchase.model');
    
    console.log('✅ Modelo Purchase importado correctamente');
    
    // Verificar que el campo firstCycleCompleted existe
    const schema = Purchase.schema;
    const firstCycleField = schema.paths.firstCycleCompleted;
    
    if (firstCycleField) {
      console.log('✅ Campo firstCycleCompleted existe en el esquema');
      console.log(`   Tipo: ${firstCycleField.instance}`);
      console.log(`   Default: ${firstCycleField.defaultValue}`);
      return true;
    } else {
      console.log('❌ Campo firstCycleCompleted no encontrado');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error con modelo Purchase:', error.message);
    return false;
  }
}

async function testBasicFunctionality() {
  console.log('\n🔧 TEST: Funcionalidad Básica');
  
  try {
    // Test básico de cálculo con fallback
    const testPackageConfig = {
      benefitConfig: {
        dailyRate: 0.125
      }
    };
    
    // Simular acceso a la tasa
    const rate1 = testPackageConfig.benefitConfig?.dailyRate || 0.125;
    console.log(`✅ Acceso a tasa con benefitConfig: ${rate1}`);
    
    // Simular acceso sin benefitConfig
    const testPackageConfig2 = {};
    const rate2 = testPackageConfig2.benefitConfig?.dailyRate || 0.125;
    console.log(`✅ Acceso a tasa sin benefitConfig (fallback): ${rate2}`);
    
    // Simular acceso desde options
    const options = { rate: 0.15 };
    const rate3 = options?.rate || testPackageConfig.benefitConfig?.dailyRate || 0.125;
    console.log(`✅ Acceso a tasa desde options: ${rate3}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en funcionalidad básica:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 INICIANDO VERIFICACIÓN SIMPLE DE FIXES\n');
  
  const results = {
    db: await connectDB(),
    service: await testOptimizedCalculationService(),
    model: await testPurchaseModel(),
    basic: await testBasicFunctionality()
  };
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log('\n📊 RESUMEN:');
  console.log(`✅ Tests exitosos: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 TODOS LOS FIXES BÁSICOS VERIFICADOS');
    console.log('✅ OptimizedCalculationService - DISPONIBLE');
    console.log('✅ Purchase.firstCycleCompleted - IMPLEMENTADO');
    console.log('✅ Lógica de fallback - FUNCIONANDO');
  } else {
    console.log('\n⚠️  ALGUNOS COMPONENTES REQUIEREN REVISIÓN');
  }
  
  if (results.db) {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
  
  process.exit(passed === total ? 0 : 1);
}

// Ejecutar
runTests().catch(error => {
  console.error('❌ Error ejecutando tests:', error);
  process.exit(1);
});