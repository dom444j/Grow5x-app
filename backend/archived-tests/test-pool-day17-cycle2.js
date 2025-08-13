/**
 * Test Pool 5% - Día 17 (Ciclo 2)
 * Simula el segundo ciclo para la misma purchaseId
 * Verifica que se cree 1 pool_bonus con cycleNumber:2
 * Verifica idempotencia (2ª corrida no crea extras)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Commission = require('./src/models/Commission.model');
const Purchase = require('./src/models/Purchase.model');
const User = require('./src/models/User');
const OptimizedCalculationService = require('./src/services/OptimizedCalculationService');

class PoolDay17Test {
  constructor() {
    this.testPurchaseId = new mongoose.Types.ObjectId();
    this.adminId = null;
    this.userBId = null;
  }

  async setup() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Conectado a MongoDB');
      
      // Buscar admin
      const admin = await User.findOne({ role: 'admin' });
      if (!admin) {
        throw new Error('No se encontró usuario admin');
      }
      this.adminId = admin._id;
      console.log('✅ Admin encontrado:', admin.email);
      
      // Crear usuario B de prueba
      const userB = await User.create({
        email: `userb-pool-test-${Date.now()}@test.com`,
        password: 'hashedpassword',
        firstName: 'Usuario',
        lastName: 'B Pool Test',
        fullName: 'Usuario B Pool Test',
        country: 'ES',
        isEmailVerified: true,
        status: 'active'
      });
      this.userBId = userB._id;
      console.log('✅ Usuario B creado:', userB.email);
      
      // Crear purchase de prueba (ya completó primer ciclo)
      await Purchase.create({
        _id: this.testPurchaseId,
        userId: this.userBId,
        packageId: new mongoose.Types.ObjectId(),
        productId: new mongoose.Types.ObjectId(),
        amount: 100,
        paymentMethod: 'wallet',
        status: 'completed',
        firstCycleCompleted: true, // Ya completó el primer ciclo
        createdAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000) // Hace 17 días
      });
      console.log('✅ Purchase creada con firstCycleCompleted: true');
      
    } catch (error) {
      console.error('❌ Error en setup:', error.message);
      throw error;
    }
  }

  async testPoolDay17Cycle2() {
    console.log('\n🧪 Test: Pool 5% Día 17 - Ciclo 2');
    
    try {
      // Limpiar comisiones previas de prueba
      await Commission.deleteMany({ 
        purchaseId: this.testPurchaseId,
        commissionType: 'pool_bonus'
      });
      
      // Simular día 17 (inicio del ciclo 2)
      const result = await OptimizedCalculationService.processPoolBonuses({
        purchaseId: this.testPurchaseId,
        cycleNumber: 2,
        adminId: this.adminId,
        userId: this.userBId,
        baseAmount: 100
      });
      
      console.log('✅ Resultado procesamiento pool:', result);
      
      // Pequeño delay para asegurar que la escritura se complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verificar que se creó exactamente 1 pool_bonus
      console.log('🔍 Buscando con criterios:', {
        purchaseId: this.testPurchaseId,
        commissionType: 'pool_bonus',
        'metadata.cycleNumber': 2
      });
      
      const poolCommissions = await Commission.find({
        purchaseId: this.testPurchaseId,
        commissionType: 'pool_bonus',
        'metadata.cycleNumber': 2
      });
      
      console.log(`📊 Pool bonuses encontrados: ${poolCommissions.length}`);
      
      // Debug: buscar sin filtro de cycleNumber
      const allPoolCommissions = await Commission.find({
        purchaseId: this.testPurchaseId,
        commissionType: 'pool_bonus'
      });
      
      console.log(`📊 Pool bonuses sin filtro cycleNumber: ${allPoolCommissions.length}`);
      if (allPoolCommissions.length > 0) {
        console.log('📊 Primer pool bonus encontrado:', {
          id: allPoolCommissions[0]._id,
          cycleNumber: allPoolCommissions[0].metadata?.cycleNumber,
          metadata: allPoolCommissions[0].metadata
        });
      }
      
      if (poolCommissions.length !== 1) {
        throw new Error(`Se esperaba 1 pool_bonus, se encontraron ${poolCommissions.length}`);
      }
      
      const poolBonus = poolCommissions[0];
   console.log('📊 Pool bonus details:', {
          adminId: poolBonus.userId.toString(),
          fromUserId: poolBonus.fromUserId.toString(),
          purchaseId: poolBonus.purchaseId,
          cycleNumber: poolBonus.metadata.cycleNumber,
          amount: poolBonus.amount
        });
      
      // Verificar estructura esperada
      if (poolBonus.userId.toString() !== this.adminId.toString()) {
        throw new Error('AdminId no coincide');
      }
      if (poolBonus.fromUserId.toString() !== this.userBId.toString()) {
        throw new Error('FromUserId no coincide');
      }
      if (poolBonus.metadata.cycleNumber !== 2) {
          throw new Error('CycleNumber no es 2');
        }
      
      console.log('✅ Test Pool Día 17 - Ciclo 2: EXITOSO');
      return true;
      
    } catch (error) {
      console.error('❌ Error en test pool día 17:', error.message);
      return false;
    }
  }

  async testIdempotencia() {
    console.log('\n🧪 Test: Idempotencia Pool Día 17');
    
    try {
      // Contar comisiones antes de la segunda corrida
        const beforeCount = await Commission.countDocuments({
          purchaseId: this.testPurchaseId,
          commissionType: 'pool_bonus',
          'metadata.cycleNumber': 2
        });
      
      console.log(`📊 Pool bonuses antes de 2ª corrida: ${beforeCount}`);
      
      // Pequeño delay antes de la segunda corrida
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Ejecutar segunda vez (debe ser idempotente)
      const result2 = await OptimizedCalculationService.processPoolBonuses({
        purchaseId: this.testPurchaseId,
        cycleNumber: 2,
        adminId: this.adminId,
        userId: this.userBId,
        baseAmount: 100
      });
      
      // Contar comisiones después de la segunda corrida
        const afterCount = await Commission.countDocuments({
          purchaseId: this.testPurchaseId,
          commissionType: 'pool_bonus',
          'metadata.cycleNumber': 2
        });
      
      console.log(`📊 Pool bonuses después de 2ª corrida: ${afterCount}`);
      
      if (beforeCount !== afterCount) {
        throw new Error(`Idempotencia fallida: ${beforeCount} → ${afterCount}`);
      }
      
      console.log('✅ Test Idempotencia: EXITOSO (no se crearon duplicados)');
      return true;
      
    } catch (error) {
      console.error('❌ Error en test idempotencia:', error.message);
      return false;
    }
  }

  async cleanup() {
    try {
      // Limpiar datos de prueba
      await Commission.deleteMany({ 
        purchaseId: this.testPurchaseId 
      });
      await Purchase.deleteMany({ 
        _id: this.testPurchaseId
      });
      await User.deleteMany({ 
        _id: this.userBId 
      });
      
      console.log('✅ Cleanup completado');
    } catch (error) {
      console.error('❌ Error en cleanup:', error.message);
    }
  }

  async runAllTests() {
    console.log('🚀 Iniciando Tests Pool Día 17 - Ciclo 2\n');
    
    let allPassed = true;
    
    try {
      await this.setup();
      
      const test1 = await this.testPoolDay17Cycle2();
      const test2 = await this.testIdempotencia();
      
      allPassed = test1 && test2;
      
      console.log('\n📋 RESUMEN:');
      console.log(`Pool Día 17 Ciclo 2: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Idempotencia: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`\n🎯 RESULTADO FINAL: ${allPassed ? '✅ TODOS LOS TESTS EXITOSOS' : '❌ ALGUNOS TESTS FALLARON'}`);
      
    } catch (error) {
      console.error('❌ Error general:', error.message);
      allPassed = false;
    } finally {
      await this.cleanup();
      await mongoose.disconnect();
    }
    
    process.exit(allPassed ? 0 : 1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const test = new PoolDay17Test();
  test.runAllTests();
}

module.exports = PoolDay17Test;