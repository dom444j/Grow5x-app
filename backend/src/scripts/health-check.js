#!/usr/bin/env node

/**
 * SCRIPT DE VERIFICACIÓN DE SALUD
 * Verifica que la aplicación esté funcionando correctamente
 * Especialmente útil después de deploys para asegurar que las sesiones funcionen
 */

const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '../../.env.production') });

const http = require('http');
const https = require('https');
const fs = require('fs');

class HealthChecker {
  constructor() {
    this.config = {
      timeout: 10000,
      retries: 3,
      retryDelay: 2000
    };
    
    this.checks = [
      { name: 'API Health', endpoint: '/api/health', critical: true },
      { name: 'Package System', endpoint: '/api/packages', critical: true },
      { name: 'Database Connection', endpoint: '/api/health', critical: true },
      { name: 'Server Status', endpoint: '/health', critical: false }
    ];
  }

  /**
   * Ejecuta todas las verificaciones
   */
  async runHealthChecks() {
    console.log('🏥 GROW5X - VERIFICACIÓN DE SALUD');
    console.log('==================================\n');

    const baseUrl = this.getBaseUrl();
    console.log(`🌐 URL Base: ${baseUrl}\n`);

    const results = [];
    let criticalFailures = 0;

    for (const check of this.checks) {
      console.log(`🔍 Verificando: ${check.name}`);
      
      const result = await this.performCheck(baseUrl + check.endpoint, check.name);
      results.push({ ...check, ...result });
      
      if (check.critical && !result.success) {
        criticalFailures++;
      }
      
      // Pequeña pausa entre verificaciones
      await this.sleep(500);
    }

    // Mostrar resumen
    this.displayResults(results);

    // Verificaciones adicionales
    await this.checkEnvironmentVariables();
    await this.checkFilePermissions();
    await this.checkDiskSpace();
    await this.checkMemoryUsage();

    // Resultado final
    if (criticalFailures > 0) {
      console.log(`\n❌ VERIFICACIÓN FALLIDA: ${criticalFailures} problemas críticos`);
      process.exit(1);
    } else {
      console.log('\n✅ VERIFICACIÓN EXITOSA: Aplicación funcionando correctamente');
      process.exit(0);
    }
  }

  /**
   * Obtiene la URL base de la aplicación
   */
  getBaseUrl() {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || 'localhost';
    const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
    
    return `${protocol}://${host}:${port}`;
  }

  /**
   * Realiza una verificación HTTP
   */
  async performCheck(url, checkName) {
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const result = await this.makeRequest(url);
        
        if (result.statusCode >= 200 && result.statusCode < 300) {
          console.log(`   ✅ ${checkName}: OK (${result.statusCode})`);
          return {
            success: true,
            statusCode: result.statusCode,
            responseTime: result.responseTime,
            attempt
          };
        } else {
          console.log(`   ⚠️  ${checkName}: Status ${result.statusCode}`);
        }
      } catch (error) {
        console.log(`   ❌ ${checkName}: ${error.message} (Intento ${attempt}/${this.config.retries})`);
        
        if (attempt < this.config.retries) {
          await this.sleep(this.config.retryDelay);
        }
      }
    }
    
    return {
      success: false,
      error: 'Falló después de todos los intentos',
      attempts: this.config.retries
    };
  }

  /**
   * Hace una petición HTTP
   */
  makeRequest(url) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: this.config.timeout,
        headers: {
          'User-Agent': 'GROW5X-HealthChecker/1.0'
        }
      };

      const req = client.request(options, (res) => {
        const responseTime = Date.now() - startTime;
        
        // Consumir la respuesta para liberar memoria
        res.on('data', () => {});
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            responseTime,
            headers: res.headers
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout después de ${this.config.timeout}ms`));
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  /**
   * Verifica variables de entorno críticas
   */
  async checkEnvironmentVariables() {
    console.log('\n🔧 Verificando variables de entorno...');
    
    const criticalVars = [
      'NODE_ENV',
      'PORT',
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ];
    
    const missing = [];
    const weak = [];
    
    criticalVars.forEach(varName => {
      const value = process.env[varName];
      
      if (!value) {
        missing.push(varName);
      } else if (this.isSecretVar(varName) && value.length < 32) {
        weak.push(varName);
      }
    });
    
    if (missing.length > 0) {
      console.log(`   ❌ Variables faltantes: ${missing.join(', ')}`);
    } else {
      console.log('   ✅ Variables críticas presentes');
    }
    
    if (weak.length > 0) {
      console.log(`   ⚠️  Variables débiles: ${weak.join(', ')}`);
    }
  }

  /**
   * Verifica permisos de archivos
   */
  async checkFilePermissions() {
    console.log('\n📁 Verificando permisos de archivos...');
    
    const criticalFiles = [
      '.env',
      '.env.production',
      'src/config/database.js',
      'logs'
    ];
    
    let issues = 0;
    
    for (const file of criticalFiles) {
      try {
        const filePath = path.resolve(file);
        
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          
          // Verificar que archivos .env no sean legibles por otros
          if (file.startsWith('.env') && process.platform !== 'win32') {
            const mode = stats.mode & parseInt('777', 8);
            if (mode & parseInt('044', 8)) {
              console.log(`   ⚠️  ${file}: Permisos demasiado permisivos`);
              issues++;
            }
          }
          
          console.log(`   ✅ ${file}: OK`);
        } else {
          console.log(`   ⚠️  ${file}: No existe`);
        }
      } catch (error) {
        console.log(`   ❌ ${file}: Error - ${error.message}`);
        issues++;
      }
    }
    
    if (issues === 0) {
      console.log('   ✅ Permisos de archivos correctos');
    }
  }

  /**
   * Verifica espacio en disco
   */
  async checkDiskSpace() {
    console.log('\n💾 Verificando espacio en disco...');
    
    try {
      const stats = fs.statSync('.');
      console.log('   ✅ Directorio accesible');
      
      // En sistemas Unix, podríamos usar statvfs, pero por simplicidad
      // solo verificamos que podemos escribir
      const testFile = path.join('.', '.health-check-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      console.log('   ✅ Escritura en disco funcional');
    } catch (error) {
      console.log(`   ❌ Problema con disco: ${error.message}`);
    }
  }

  /**
   * Verifica uso de memoria
   */
  async checkMemoryUsage() {
    console.log('\n🧠 Verificando uso de memoria...');
    
    const usage = process.memoryUsage();
    const formatBytes = (bytes) => {
      return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    };
    
    console.log(`   📊 RSS: ${formatBytes(usage.rss)}`);
    console.log(`   📊 Heap Used: ${formatBytes(usage.heapUsed)}`);
    console.log(`   📊 Heap Total: ${formatBytes(usage.heapTotal)}`);
    
    // Advertir si el uso de memoria es muy alto
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 500) {
      console.log('   ⚠️  Uso de memoria alto');
    } else {
      console.log('   ✅ Uso de memoria normal');
    }
  }

  /**
   * Muestra resultados de las verificaciones
   */
  displayResults(results) {
    console.log('\n📊 RESUMEN DE VERIFICACIONES');
    console.log('============================');
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const critical = result.critical ? '[CRÍTICO]' : '[OPCIONAL]';
      const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
      
      console.log(`${status} ${result.name} ${critical}${time}`);
      
      if (!result.success && result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
  }

  /**
   * Verifica si una variable es un secret
   */
  isSecretVar(varName) {
    return varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD');
  }

  /**
   * Pausa la ejecución
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const checker = new HealthChecker();
  checker.runHealthChecks().catch(error => {
    console.error('❌ Error en verificación de salud:', error.message);
    process.exit(1);
  });
}

module.exports = HealthChecker;