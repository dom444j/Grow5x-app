#!/usr/bin/env node

/**
 * SCRIPT DE LIMPIEZA DE ARCHIVOS DE PRUEBA
 * Identifica y opcionalmente elimina archivos de prueba en la raíz del backend
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class TestFilesCleanup {
  constructor() {
    this.backendPath = path.join(__dirname, '../..');
    this.backupPath = path.join(this.backendPath, 'test-files-backup');
    
    // Archivos de prueba identificados
    this.testFiles = [
      'test-features-transform.js',
      'test-fixes-verification.js',
      'test-email-directo.js',
      'test-api-packages.js',
      'update-wallet-test-data.js',
      'test-admin-endpoint.js',
      'test-admin-db.js',
      'test-mongo-connection.js',
      'test-auth.js',
      'test-batch-processing.js',
      'test-endpoint-simple.js',
      'test_admin_login_direct.js',
      'test-telegram-query.js',
      'test-login-process.js',
      'test-admin-login.js',
      'test-user-status-endpoints.js',
      'test-admin-creation.js',
      'test-referrals-local.js',
      'test-pool-day17-cycle2.js',
      'test-support-email.js',
      'test-user-creation.js',
      'test-purchase-creation.js',
      'test-middleware-fix.js',
      'test-admin-wallet-stats.js',
      'test-packages-api-response.js',
      'test-wallet-stats.js',
      'test-namecheap-email.js',
      'test-create-benefit-transaction.js',
      'test-smoke-admin-login.js',
      'test-profile-curl.ps1',
      'test-transaction-metadata.js',
      'test-dashboard-queries.js',
      'test-profile-update.js'
    ];
    
    // Archivos que pueden ser útiles mantener
    this.keepFiles = [
      'update-features-direct.js', // Script de actualización útil
      'user-status-solution.js', // Script de solución útil
      'verify-admin-finance-panel.js', // Script de verificación útil
      'verify-production-config.js', // Script de verificación de producción
      'verificar-configuracion-completa.js', // Script de verificación completa
      'verify-dns-setup.js' // Script de verificación DNS
    ];
    
    // Archivos temporales o de desarrollo
    this.tempFiles = [
      'WALLETS-PRODUCCION-ATLAS.md' // Documentación temporal
    ];
  }

  /**
   * Ejecuta el proceso de limpieza
   */
  async run() {
    try {
      console.log('🧹 GROW5X - LIMPIEZA DE ARCHIVOS DE PRUEBA');
      console.log('==========================================\n');

      // Analizar archivos existentes
      const analysis = await this.analyzeFiles();
      this.displayAnalysis(analysis);

      // Preguntar al usuario qué hacer
      const action = await this.askUserAction();
      
      switch (action) {
        case 'backup':
          await this.backupAndClean(analysis);
          break;
        case 'delete':
          await this.deleteFiles(analysis);
          break;
        case 'keep':
          await this.organizeFiles(analysis);
          break;
        case 'cancel':
          console.log('❌ Operación cancelada');
          break;
      }

      console.log('\n✅ Limpieza completada');

    } catch (error) {
      console.error('❌ Error en limpieza:', error.message);
      process.exit(1);
    }
  }

  /**
   * Analiza archivos existentes
   */
  async analyzeFiles() {
    const analysis = {
      testFiles: { existing: [], missing: [] },
      keepFiles: { existing: [], missing: [] },
      tempFiles: { existing: [], missing: [] },
      totalSize: 0
    };

    // Analizar archivos de prueba
    for (const file of this.testFiles) {
      const filePath = path.join(this.backendPath, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        analysis.testFiles.existing.push({
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime
        });
        analysis.totalSize += stats.size;
      } else {
        analysis.testFiles.missing.push(file);
      }
    }

    // Analizar archivos a mantener
    for (const file of this.keepFiles) {
      const filePath = path.join(this.backendPath, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        analysis.keepFiles.existing.push({
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime
        });
      } else {
        analysis.keepFiles.missing.push(file);
      }
    }

    // Analizar archivos temporales
    for (const file of this.tempFiles) {
      const filePath = path.join(this.backendPath, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        analysis.tempFiles.existing.push({
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime
        });
        analysis.totalSize += stats.size;
      } else {
        analysis.tempFiles.missing.push(file);
      }
    }

    return analysis;
  }

  /**
   * Muestra análisis de archivos
   */
  displayAnalysis(analysis) {
    console.log('📊 ANÁLISIS DE ARCHIVOS');
    console.log('========================\n');

    console.log(`🧪 ARCHIVOS DE PRUEBA (${analysis.testFiles.existing.length} encontrados):`);
    if (analysis.testFiles.existing.length > 0) {
      analysis.testFiles.existing.forEach(file => {
        const sizeKB = (file.size / 1024).toFixed(2);
        const date = file.modified.toLocaleDateString();
        console.log(`   📄 ${file.name} (${sizeKB} KB, ${date})`);
      });
    } else {
      console.log('   ✅ No se encontraron archivos de prueba');
    }

    console.log(`\n📁 ARCHIVOS TEMPORALES (${analysis.tempFiles.existing.length} encontrados):`);
    if (analysis.tempFiles.existing.length > 0) {
      analysis.tempFiles.existing.forEach(file => {
        const sizeKB = (file.size / 1024).toFixed(2);
        const date = file.modified.toLocaleDateString();
        console.log(`   📄 ${file.name} (${sizeKB} KB, ${date})`);
      });
    } else {
      console.log('   ✅ No se encontraron archivos temporales');
    }

    console.log(`\n🔧 ARCHIVOS ÚTILES (${analysis.keepFiles.existing.length} encontrados):`);
    if (analysis.keepFiles.existing.length > 0) {
      analysis.keepFiles.existing.forEach(file => {
        const sizeKB = (file.size / 1024).toFixed(2);
        console.log(`   📄 ${file.name} (${sizeKB} KB) - MANTENER`);
      });
    }

    const totalSizeKB = (analysis.totalSize / 1024).toFixed(2);
    const totalFiles = analysis.testFiles.existing.length + analysis.tempFiles.existing.length;
    console.log(`\n📊 RESUMEN:`);
    console.log(`   🗑️  Archivos a limpiar: ${totalFiles}`);
    console.log(`   💾 Espacio a liberar: ${totalSizeKB} KB`);
    console.log(`   🔧 Archivos útiles: ${analysis.keepFiles.existing.length}`);
  }

  /**
   * Pregunta al usuario qué acción tomar
   */
  async askUserAction() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n🤔 ¿Qué deseas hacer?');
    console.log('1. backup  - Hacer backup y eliminar archivos de prueba');
    console.log('2. delete  - Eliminar archivos de prueba directamente');
    console.log('3. keep    - Organizar archivos en carpetas');
    console.log('4. cancel  - Cancelar operación');

    return new Promise((resolve) => {
      rl.question('\nSelecciona una opción (backup/delete/keep/cancel): ', (answer) => {
        rl.close();
        const validOptions = ['backup', 'delete', 'keep', 'cancel'];
        if (validOptions.includes(answer.toLowerCase())) {
          resolve(answer.toLowerCase());
        } else {
          resolve('cancel');
        }
      });
    });
  }

  /**
   * Hace backup y elimina archivos
   */
  async backupAndClean(analysis) {
    console.log('\n💾 Creando backup y limpiando archivos...');
    
    // Crear directorio de backup
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.backupPath, `cleanup-${timestamp}`);
    fs.mkdirSync(backupDir);

    let backedUp = 0;
    let deleted = 0;

    // Backup y eliminar archivos de prueba
    for (const file of analysis.testFiles.existing) {
      try {
        const backupFile = path.join(backupDir, file.name);
        fs.copyFileSync(file.path, backupFile);
        fs.unlinkSync(file.path);
        backedUp++;
        deleted++;
        console.log(`   ✅ ${file.name} - backup creado y archivo eliminado`);
      } catch (error) {
        console.log(`   ❌ ${file.name} - error: ${error.message}`);
      }
    }

    // Backup y eliminar archivos temporales
    for (const file of analysis.tempFiles.existing) {
      try {
        const backupFile = path.join(backupDir, file.name);
        fs.copyFileSync(file.path, backupFile);
        fs.unlinkSync(file.path);
        backedUp++;
        deleted++;
        console.log(`   ✅ ${file.name} - backup creado y archivo eliminado`);
      } catch (error) {
        console.log(`   ❌ ${file.name} - error: ${error.message}`);
      }
    }

    console.log(`\n📊 Backup completado:`);
    console.log(`   💾 Archivos respaldados: ${backedUp}`);
    console.log(`   🗑️  Archivos eliminados: ${deleted}`);
    console.log(`   📁 Backup ubicado en: ${backupDir}`);
  }

  /**
   * Elimina archivos directamente
   */
  async deleteFiles(analysis) {
    console.log('\n🗑️  Eliminando archivos de prueba...');
    
    let deleted = 0;

    // Eliminar archivos de prueba
    for (const file of analysis.testFiles.existing) {
      try {
        fs.unlinkSync(file.path);
        deleted++;
        console.log(`   ✅ ${file.name} - eliminado`);
      } catch (error) {
        console.log(`   ❌ ${file.name} - error: ${error.message}`);
      }
    }

    // Eliminar archivos temporales
    for (const file of analysis.tempFiles.existing) {
      try {
        fs.unlinkSync(file.path);
        deleted++;
        console.log(`   ✅ ${file.name} - eliminado`);
      } catch (error) {
        console.log(`   ❌ ${file.name} - error: ${error.message}`);
      }
    }

    console.log(`\n📊 Eliminación completada:`);
    console.log(`   🗑️  Archivos eliminados: ${deleted}`);
  }

  /**
   * Organiza archivos en carpetas
   */
  async organizeFiles(analysis) {
    console.log('\n📁 Organizando archivos en carpetas...');
    
    // Crear carpetas de organización
    const testDir = path.join(this.backendPath, 'archived-tests');
    const tempDir = path.join(this.backendPath, 'temp-files');
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    let moved = 0;

    // Mover archivos de prueba
    for (const file of analysis.testFiles.existing) {
      try {
        const newPath = path.join(testDir, file.name);
        fs.renameSync(file.path, newPath);
        moved++;
        console.log(`   ✅ ${file.name} - movido a archived-tests/`);
      } catch (error) {
        console.log(`   ❌ ${file.name} - error: ${error.message}`);
      }
    }

    // Mover archivos temporales
    for (const file of analysis.tempFiles.existing) {
      try {
        const newPath = path.join(tempDir, file.name);
        fs.renameSync(file.path, newPath);
        moved++;
        console.log(`   ✅ ${file.name} - movido a temp-files/`);
      } catch (error) {
        console.log(`   ❌ ${file.name} - error: ${error.message}`);
      }
    }

    console.log(`\n📊 Organización completada:`);
    console.log(`   📁 Archivos movidos: ${moved}`);
    console.log(`   📂 Carpetas creadas: archived-tests/, temp-files/`);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const cleanup = new TestFilesCleanup();
  cleanup.run().catch(console.error);
}

module.exports = TestFilesCleanup;