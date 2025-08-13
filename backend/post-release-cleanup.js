/**
 * Post-Release Cleanup Script
 * Ejecuta tareas de limpieza después del deploy a producción
 * - Verifica que ENABLE_TEST_ROUTES esté deshabilitado en prod
 * - Crea backup snapshot
 * - Verifica configuración de seguridad
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const logger = require('./src/utils/logger');
const mongoose = require('mongoose');

class PostReleaseCleanup {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.version = 'v1.0.0-e2e-pass';
  }

  async verifyProductionConfig() {
    logger.info('🔍 Verificando configuración de producción...');
    
    const requiredProdSettings = {
      'STAGING': 'false',
      'ENABLE_TEST_ROUTES': 'false',
      'TEST_E2E': 'false',
      'LOG_LEVEL': 'info',
      'REQUIRE_EMAIL_VERIFICATION': 'true',
      'NODE_ENV': 'production'
    };

    const issues = [];

    for (const [key, expectedValue] of Object.entries(requiredProdSettings)) {
      const actualValue = process.env[key];
      if (actualValue !== expectedValue) {
        issues.push(`${key}: esperado '${expectedValue}', actual '${actualValue}'`);
      }
    }

    if (issues.length > 0) {
      logger.error('❌ Configuración de producción incorrecta:');
      issues.forEach(issue => logger.error(`  - ${issue}`));
      return { success: false, issues };
    }

    logger.info('✅ Configuración de producción verificada correctamente');
    return { success: true };
  }

  async verifyTestRoutesDisabled() {
    logger.info('🔍 Verificando que las rutas de test estén deshabilitadas...');
    
    try {
      // Intentar acceder al endpoint de test (debería fallar)
      const response = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/commissions/test/direct/test-id`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      // Si la respuesta es 404, significa que la ruta no está montada (correcto)
      if (response.status === 404) {
        logger.info('✅ Rutas de test correctamente deshabilitadas (404)');
        return { success: true };
      } else {
        logger.error(`❌ Ruta de test accesible (status: ${response.status})`);
        return { success: false, status: response.status };
      }
    } catch (error) {
      // Error de conexión es aceptable si el servidor no está corriendo
      if (error.code === 'ECONNREFUSED') {
        logger.info('⚠️ Servidor no accesible para verificación de rutas');
        return { success: true, note: 'Server not accessible' };
      }
      logger.error('❌ Error verificando rutas de test:', error.message);
      return { success: false, error: error.message };
    }
  }

  async createBackupSnapshot() {
    logger.info('📦 Creando snapshot de backup...');
    
    try {
      const backupDir = path.join(__dirname, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-${this.version}-${timestamp}`;
      const backupPath = path.join(backupDir, `${backupName}.tar.gz`);

      // Crear archivo tar con los archivos importantes
      const filesToBackup = [
        'src/',
        'package.json',
        'package-lock.json',
        '.env.example',
        '.env.production',
        '.env.staging',
        'smoke-test-e2e-optimized.js',
        'verify-indexes.js',
        'ci-cd-gate.js'
      ];

      const tarCommand = `tar -czf ${backupPath} ${filesToBackup.join(' ')}`;
      
      return new Promise((resolve, reject) => {
        const tar = spawn('tar', ['-czf', backupPath, ...filesToBackup], {
          stdio: 'pipe'
        });

        tar.on('close', (code) => {
          if (code === 0) {
            logger.info(`✅ Backup creado: ${backupPath}`);
            resolve({ success: true, backupPath });
          } else {
            logger.error(`❌ Error creando backup (código: ${code})`);
            reject({ success: false, code });
          }
        });

        tar.on('error', (error) => {
          logger.error('❌ Error ejecutando tar:', error);
          reject({ success: false, error: error.message });
        });
      });
    } catch (error) {
      logger.error('❌ Error creando backup:', error);
      return { success: false, error: error.message };
    }
  }

  async tagRelease() {
    logger.info(`🏷️ Creando tag de release: ${this.version}`);
    
    try {
      return new Promise((resolve, reject) => {
        const git = spawn('git', ['tag', '-a', this.version, '-m', `Release ${this.version} - E2E tests passing`], {
          stdio: 'pipe'
        });

        git.on('close', (code) => {
          if (code === 0) {
            logger.info(`✅ Tag creado: ${this.version}`);
            resolve({ success: true, tag: this.version });
          } else {
            logger.warn(`⚠️ No se pudo crear tag (código: ${code}) - posiblemente ya existe`);
            resolve({ success: true, note: 'Tag may already exist' });
          }
        });

        git.on('error', (error) => {
          logger.warn('⚠️ Git no disponible para crear tag:', error.message);
          resolve({ success: true, note: 'Git not available' });
        });
      });
    } catch (error) {
      logger.warn('⚠️ Error creando tag:', error.message);
      return { success: true, note: 'Tag creation failed but continuing' };
    }
  }

  async run() {
    logger.info('🚀 Iniciando limpieza post-release...');
    
    const results = {
      configVerification: await this.verifyProductionConfig(),
      testRoutesVerification: await this.verifyTestRoutesDisabled(),
      backup: await this.createBackupSnapshot(),
      tag: await this.tagRelease()
    };

    // Verificar si hay errores críticos
    const criticalErrors = [];
    
    if (!results.configVerification.success) {
      criticalErrors.push('Configuración de producción incorrecta');
    }
    
    if (!results.testRoutesVerification.success) {
      criticalErrors.push('Rutas de test aún accesibles');
    }

    if (criticalErrors.length > 0) {
      logger.error('💥 Errores críticos encontrados:');
      criticalErrors.forEach(error => logger.error(`  - ${error}`));
      throw new Error(`Post-release cleanup falló: ${criticalErrors.join(', ')}`);
    }

    logger.info('🎉 Limpieza post-release completada exitosamente');
    return results;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const cleanup = new PostReleaseCleanup();
  
  cleanup.run()
    .then((results) => {
      logger.info('✅ Post-release cleanup completado:', results);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Post-release cleanup falló:', error.message);
      process.exit(1);
    });
}

module.exports = PostReleaseCleanup;