/**
 * CI/CD Gate Script
 * Ejecuta smoke tests y verifica que las comisiones directas funcionen correctamente
 * Falla el deploy si no se encuentra la comisión direct_referral por purchaseId
 */

require('dotenv').config();
const { spawn } = require('child_process');
const logger = require('./src/utils/logger');
const mongoose = require('mongoose');
const Commission = require('./src/models/Commission.model');

class CICDGate {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 segundos
  }

  async runSmokeTest() {
    return new Promise((resolve, reject) => {
      logger.info('🚀 Ejecutando smoke test E2E...');
      
      const smokeTest = spawn('node', ['smoke-test-e2e-optimized.js'], {
        stdio: 'pipe',
        env: { ...process.env, TEST_E2E: 'true' }
      });

      let output = '';
      let errorOutput = '';

      smokeTest.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text);
      });

      smokeTest.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error(text);
      });

      smokeTest.on('close', (code) => {
        if (code === 0) {
          logger.info('✅ Smoke test completado exitosamente');
          resolve({ success: true, output, code });
        } else {
          logger.error(`❌ Smoke test falló con código: ${code}`);
          reject({ success: false, output, errorOutput, code });
        }
      });

      smokeTest.on('error', (error) => {
        logger.error('❌ Error ejecutando smoke test:', error);
        reject({ success: false, error: error.message });
      });
    });
  }

  async verifyDirectReferralCommissions() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('🔍 Verificando comisiones directas en la base de datos...');

      // Buscar comisiones directas recientes (últimas 24 horas)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const directCommissions = await Commission.find({
        commissionType: 'direct_referral',
        createdAt: { $gte: yesterday },
        purchaseId: { $exists: true, $ne: null }
      }).limit(10);

      if (directCommissions.length === 0) {
        logger.warn('⚠️ No se encontraron comisiones directas recientes con purchaseId');
        return { success: false, reason: 'No direct commissions found' };
      }

      logger.info(`✅ Encontradas ${directCommissions.length} comisiones directas con purchaseId`);
      
      // Verificar que todas tengan purchaseId en la raíz
      const commissionsWithoutPurchaseId = directCommissions.filter(c => !c.purchaseId);
      if (commissionsWithoutPurchaseId.length > 0) {
        logger.error(`❌ ${commissionsWithoutPurchaseId.length} comisiones sin purchaseId en raíz`);
        return { success: false, reason: 'Commissions missing purchaseId at root level' };
      }

      logger.info('✅ Todas las comisiones directas tienen purchaseId en la raíz');
      return { success: true, count: directCommissions.length };

    } catch (error) {
      logger.error('❌ Error verificando comisiones directas:', error);
      return { success: false, error: error.message };
    } finally {
      await mongoose.disconnect();
    }
  }

  async runWithRetries() {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`🔄 Intento ${attempt}/${this.maxRetries}`);
        
        // Ejecutar smoke test
        const smokeResult = await this.runSmokeTest();
        
        // Verificar que el output contenga éxito del 100%
        if (!smokeResult.output.includes('100%') && !smokeResult.output.includes('SUCCESS')) {
          throw new Error('Smoke test no alcanzó 100% de éxito');
        }

        // Verificar comisiones directas en la base de datos
        const dbResult = await this.verifyDirectReferralCommissions();
        if (!dbResult.success) {
          throw new Error(`Verificación de DB falló: ${dbResult.reason || dbResult.error}`);
        }

        logger.info('🎉 CI/CD Gate PASSED - Deploy puede continuar');
        return { success: true, attempt, smokeResult, dbResult };

      } catch (error) {
        logger.error(`❌ Intento ${attempt} falló:`, error.message);
        
        if (attempt < this.maxRetries) {
          logger.info(`⏳ Esperando ${this.retryDelay/1000}s antes del siguiente intento...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    logger.error('💥 CI/CD Gate FAILED - Deploy debe ser abortado');
    throw new Error(`Todos los intentos fallaron después de ${this.maxRetries} intentos`);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const gate = new CICDGate();
  
  gate.runWithRetries()
    .then((result) => {
      logger.info('✅ CI/CD Gate completado exitosamente:', result);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ CI/CD Gate falló:', error.message);
      process.exit(1);
    });
}

module.exports = CICDGate;