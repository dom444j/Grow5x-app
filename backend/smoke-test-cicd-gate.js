/**
 * Smoke Test Optimizado - Gate CI/CD
 * Verifica los componentes críticos antes del deploy staging → prod
 * 
 * Falla si:
 * - Falta direct_referral por compra
 * - Falta pool_bonus día 17
 * - Aparecen duplicados
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Commission = require('./src/models/Commission.model');
const Purchase = require('./src/models/Purchase.model');
const User = require('./src/models/User.model');
const OptimizedCalculationService = require('./src/services/OptimizedCalculationService');

class SmokeTestCICDGate {
  constructor() {
    this.testData = {
      userA: null,
      userB: null,
      admin: null,
      purchaseId: null
    };
    this.results = {
      directReferralTest: false,
      poolBonusDay17Test: false,
      duplicatePreventionTest: false,
      idempotencyTest: false
    };
  }

  async setup() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Conectado a MongoDB');
      
      // Buscar admin
      this.testData.admin = await User.findOne({ role: 'admin' });
      if (!this.testData.admin) {
        throw new Error('❌ CRITICAL: No admin user found');
      }
      
      // Crear usuarios de prueba
      const timestamp = Date.now();
      
      this.testData.userA = await User.create({
        email: `usera-cicd-${timestamp}@test.com`,
        password: 'hashedpassword',
        firstName: 'Usuario',
        lastName: 'A CICD',
        isEmailVerified: true,
        status: 'active'
      });
      
      this.testData.userB = await User.create({
        email: `userb-cicd-${timestamp}@test.com`,
        password: 'hashedpassword',
        firstName: 'Usuario',
        lastName: 'B CICD',
        referredBy: this.testData.userA._id,
        isEmailVerified: true,
        status: 'active'
      });
      
      console.log('✅ Usuarios de prueba creados');
      
    } catch (error) {
      console.error('❌ Error en setup:', error.message);
      throw error;
    }
  }

  async testDirectReferralCommission() {
    console.log('\n🧪 Test 1: Direct Referral Commission');
    
    try {
      // Crear purchase para userB (referido)
      const purchase = await Purchase.create({
        userId: this.testData.userB._id,
        packageId: new mongoose.Types.ObjectId(),
        amount: 100,
        status: 'completed'
      });
      
      this.testData.purchaseId = purchase._id.toString();
      
      // Procesar comisión de referido directo
      await OptimizedCalculationService.processFirstCycleCommissions({
        purchaseId: this.testData.purchaseId,
        userId: this.testData.userB._id,
        referredBy: this.testData.userA._id,
        amount: 100
      });
      
      // Verificar que se creó la comisión direct_referral
      const directReferral = await Commission.findOne({
        type: 'direct_referral',
        'metadata.purchaseId': this.testData.purchaseId,
        userId: this.testData.userA._id,
        fromUserId: this.testData.userB._id
      });
      
      if (!directReferral) {
        throw new Error('❌ GATE FAIL: Falta direct_referral por compra');
      }
      
      console.log('✅ Direct referral commission creada correctamente');
      this.results.directReferralTest = true;
      
    } catch (error) {
      console.error('❌ Test direct referral falló:', error.message);
      this.results.directReferralTest = false;
    }
  }

  async testPoolBonusDay17() {
    console.log('\n🧪 Test 2: Pool Bonus Día 17');
    
    try {
      // Marcar purchase como primer ciclo completado
      await Purchase.findByIdAndUpdate(this.testData.purchaseId, {
        firstCycleCompleted: true
      });
      
      // Procesar pool bonus del día 17 (ciclo 2)
      await OptimizedCalculationService.processPoolBonuses({
        purchaseId: this.testData.purchaseId,
        cycleNumber: 2,
        adminId: this.testData.admin._id,
        userId: this.testData.userB._id,
        baseAmount: 100
      });
      
      // Verificar que se creó el pool_bonus
      const poolBonus = await Commission.findOne({
        type: 'pool_bonus',
        'metadata.purchaseId': this.testData.purchaseId,
        'metadata.cycleNumber': 2,
        adminId: this.testData.admin._id,
        userId: this.testData.userB._id
      });
      
      if (!poolBonus) {
        throw new Error('❌ GATE FAIL: Falta pool_bonus día 17');
      }
      
      console.log('✅ Pool bonus día 17 creado correctamente');
      this.results.poolBonusDay17Test = true;
      
    } catch (error) {
      console.error('❌ Test pool bonus día 17 falló:', error.message);
      this.results.poolBonusDay17Test = false;
    }
  }

  async testDuplicatePrevention() {
    console.log('\n🧪 Test 3: Prevención de Duplicados');
    
    try {
      // Contar comisiones antes
      const beforeCount = await Commission.countDocuments({
        'metadata.purchaseId': this.testData.purchaseId
      });
      
      // Intentar procesar las mismas comisiones otra vez
      await OptimizedCalculationService.processFirstCycleCommissions({
        purchaseId: this.testData.purchaseId,
        userId: this.testData.userB._id,
        referredBy: this.testData.userA._id,
        amount: 100
      });
      
      await OptimizedCalculationService.processPoolBonuses({
        purchaseId: this.testData.purchaseId,
        cycleNumber: 2,
        adminId: this.testData.admin._id,
        userId: this.testData.userB._id,
        baseAmount: 100
      });
      
      // Contar comisiones después
      const afterCount = await Commission.countDocuments({
        'metadata.purchaseId': this.testData.purchaseId
      });
      
      if (afterCount > beforeCount) {
        throw new Error('❌ GATE FAIL: Aparecen duplicados');
      }
      
      console.log('✅ Prevención de duplicados funciona correctamente');
      this.results.duplicatePreventionTest = true;
      
    } catch (error) {
      console.error('❌ Test prevención duplicados falló:', error.message);
      this.results.duplicatePreventionTest = false;
    }
  }

  async testIdempotency() {
    console.log('\n🧪 Test 4: Idempotencia General');
    
    try {
      // Ejecutar múltiples veces la misma operación
      const operations = [];
      for (let i = 0; i < 3; i++) {
        operations.push(
          OptimizedCalculationService.processFirstCycleCommissions({
            purchaseId: this.testData.purchaseId,
            userId: this.testData.userB._id,
            referredBy: this.testData.userA._id,
            amount: 100
          })
        );
      }
      
      await Promise.all(operations);
      
      // Verificar que no se crearon duplicados
      const commissions = await Commission.find({
        'metadata.purchaseId': this.testData.purchaseId
      });
      
      const directReferrals = commissions.filter(c => c.type === 'direct_referral');
      const poolBonuses = commissions.filter(c => c.type === 'pool_bonus');
      
      if (directReferrals.length > 1) {
        throw new Error(`❌ GATE FAIL: Múltiples direct_referrals (${directReferrals.length})`);
      }
      
      if (poolBonuses.length > 1) {
        throw new Error(`❌ GATE FAIL: Múltiples pool_bonuses (${poolBonuses.length})`);
      }
      
      console.log('✅ Idempotencia verificada correctamente');
      this.results.idempotencyTest = true;
      
    } catch (error) {
      console.error('❌ Test idempotencia falló:', error.message);
      this.results.idempotencyTest = false;
    }
  }

  async cleanup() {
    try {
      if (this.testData.purchaseId) {
        await Commission.deleteMany({ 
          'metadata.purchaseId': this.testData.purchaseId 
        });
        await Purchase.deleteMany({ 
          _id: this.testData.purchaseId 
        });
      }
      
      if (this.testData.userA) {
        await User.deleteMany({ _id: this.testData.userA._id });
      }
      
      if (this.testData.userB) {
        await User.deleteMany({ _id: this.testData.userB._id });
      }
      
      console.log('✅ Cleanup completado');
    } catch (error) {
      console.error('❌ Error en cleanup:', error.message);
    }
  }

  async runGateTests() {
    console.log('🚀 SMOKE TEST CI/CD GATE - INICIANDO\n');
    console.log('Verificando componentes críticos para deploy staging → prod\n');
    
    let gatePass = true;
    
    try {
      await this.setup();
      
      await this.testDirectReferralCommission();
      await this.testPoolBonusDay17();
      await this.testDuplicatePrevention();
      await this.testIdempotency();
      
      // Evaluar resultados
      const allTests = Object.values(this.results);
      const passedTests = allTests.filter(result => result === true).length;
      const totalTests = allTests.length;
      
      gatePass = passedTests === totalTests;
      
      console.log('\n📋 RESULTADOS CI/CD GATE:');
      console.log('=' .repeat(50));
      console.log(`Direct Referral: ${this.results.directReferralTest ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Pool Bonus Día 17: ${this.results.poolBonusDay17Test ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Prevención Duplicados: ${this.results.duplicatePreventionTest ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Idempotencia: ${this.results.idempotencyTest ? '✅ PASS' : '❌ FAIL'}`);
      console.log('=' .repeat(50));
      console.log(`Tests: ${passedTests}/${totalTests}`);
      
      if (gatePass) {
        console.log('\n🎯 ✅ CI/CD GATE: APROBADO');
        console.log('✅ Sistema listo para deploy a producción');
      } else {
        console.log('\n🚫 ❌ CI/CD GATE: RECHAZADO');
        console.log('❌ Deploy a producción BLOQUEADO');
        console.log('❌ Corregir errores antes de continuar');
      }
      
    } catch (error) {
      console.error('❌ Error crítico en gate:', error.message);
      gatePass = false;
    } finally {
      await this.cleanup();
      await mongoose.disconnect();
    }
    
    process.exit(gatePass ? 0 : 1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const gate = new SmokeTestCICDGate();
  gate.runGateTests();
}

module.exports = SmokeTestCICDGate;