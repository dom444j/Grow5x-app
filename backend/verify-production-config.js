/**
 * Verificador de Configuración de Producción
 * Asegura que TEST_E2E=true solo viva en staging
 * En prod: verificación de email obligatoria y RL normal
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

class ProductionConfigVerifier {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.environment = process.env.NODE_ENV || 'development';
  }

  checkEnvironmentVariables() {
    console.log('🔍 Verificando variables de entorno...');
    
    // Verificar TEST_E2E en producción
    if (this.environment === 'production' && process.env.TEST_E2E === 'true') {
      this.issues.push('❌ CRITICAL: TEST_E2E=true está activo en producción');
    }
    
    // Verificar EMAIL_VERIFICATION en producción
    if (this.environment === 'production' && process.env.DISABLE_EMAIL_VERIFICATION === 'true') {
      this.issues.push('❌ CRITICAL: Verificación de email deshabilitada en producción');
    }
    
    // Verificar RATE_LIMITING en producción
    if (this.environment === 'production' && process.env.DISABLE_RATE_LIMITING === 'true') {
      this.issues.push('❌ CRITICAL: Rate limiting deshabilitado en producción');
    }
    
    // Verificar JWT_SECRET
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      this.issues.push('❌ CRITICAL: JWT_SECRET débil o faltante');
    }
    
    // Verificar MONGODB_URI
    if (!process.env.MONGODB_URI) {
      this.issues.push('❌ CRITICAL: MONGODB_URI faltante');
    }
    
    // Verificaciones específicas por entorno
    if (this.environment === 'production') {
      this.checkProductionSpecific();
    } else if (this.environment === 'staging') {
      this.checkStagingSpecific();
    }
    
    console.log('✅ Verificación de variables completada');
  }

  checkProductionSpecific() {
    console.log('🏭 Verificando configuración específica de producción...');
    
    // En producción debe estar todo securizado
    const requiredProdVars = [
      'FRONTEND_URL',
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_CHAT_ID'
    ];
    
    requiredProdVars.forEach(varName => {
      if (!process.env[varName]) {
        this.warnings.push(`⚠️ Variable recomendada faltante: ${varName}`);
      }
    });
    
    // Verificar que no hay configuraciones de desarrollo
    if (process.env.DEBUG === 'true') {
      this.warnings.push('⚠️ DEBUG=true activo en producción');
    }
    
    if (process.env.CORS_ORIGIN === '*') {
      this.issues.push('❌ CRITICAL: CORS abierto a todos los orígenes');
    }
  }

  checkStagingSpecific() {
    console.log('🧪 Verificando configuración específica de staging...');
    
    // En staging puede tener TEST_E2E=true
    if (process.env.TEST_E2E !== 'true') {
      this.warnings.push('⚠️ TEST_E2E no está activo en staging (recomendado para pruebas)');
    }
    
    // Verificar que tiene configuraciones de prueba
    if (!process.env.TEST_DATABASE_URI && !process.env.MONGODB_URI) {
      this.warnings.push('⚠️ No hay base de datos de prueba configurada');
    }
  }

  checkConfigFiles() {
    console.log('📁 Verificando archivos de configuración...');
    
    const configFiles = [
      '.env.production',
      '.env.staging',
      '.env.example'
    ];
    
    configFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} existe`);
        this.validateConfigFile(filePath, file);
      } else {
        this.warnings.push(`⚠️ Archivo de configuración faltante: ${file}`);
      }
    });
  }

  validateConfigFile(filePath, fileName) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Verificar que .env.production no tenga TEST_E2E=true
      if (fileName === '.env.production' && content.includes('TEST_E2E=true')) {
        this.issues.push(`❌ CRITICAL: ${fileName} contiene TEST_E2E=true`);
      }
      
      // Verificar que no hay secretos expuestos
      if (content.includes('password123') || content.includes('secret123')) {
        this.issues.push(`❌ CRITICAL: ${fileName} contiene credenciales de ejemplo`);
      }
      
      // Verificar variables críticas
      const criticalVars = ['JWT_SECRET', 'MONGODB_URI'];
      criticalVars.forEach(varName => {
        if (!content.includes(varName)) {
          this.warnings.push(`⚠️ ${fileName} no define ${varName}`);
        }
      });
      
    } catch (error) {
      this.warnings.push(`⚠️ Error leyendo ${fileName}: ${error.message}`);
    }
  }

  checkSecurityMiddleware() {
    console.log('🔒 Verificando middleware de seguridad...');
    
    try {
      // Verificar que el middleware de autenticación existe
      const authMiddlewarePath = path.join(__dirname, 'src', 'middleware', 'auth.js');
      if (!fs.existsSync(authMiddlewarePath)) {
        this.issues.push('❌ CRITICAL: Middleware de autenticación faltante');
      }
      
      // Verificar configuración de seguridad
      const securityConfigPath = path.join(__dirname, 'src', 'config', 'security.js');
      if (!fs.existsSync(securityConfigPath)) {
        this.warnings.push('⚠️ Configuración de seguridad faltante');
      }
      
    } catch (error) {
      this.warnings.push(`⚠️ Error verificando middleware: ${error.message}`);
    }
  }

  generateRecommendations() {
    console.log('\n💡 Generando recomendaciones...');
    
    const recommendations = [];
    
    if (this.environment === 'production') {
      recommendations.push('🏭 Configuración de Producción:');
      recommendations.push('  - Asegurar TEST_E2E=false');
      recommendations.push('  - Habilitar verificación de email');
      recommendations.push('  - Activar rate limiting');
      recommendations.push('  - Configurar HTTPS');
      recommendations.push('  - Configurar alertas de monitoreo');
    }
    
    if (this.environment === 'staging') {
      recommendations.push('🧪 Configuración de Staging:');
      recommendations.push('  - TEST_E2E=true para pruebas E2E');
      recommendations.push('  - Base de datos separada de producción');
      recommendations.push('  - Logs detallados habilitados');
      recommendations.push('  - Endpoints de staging disponibles');
    }
    
    recommendations.push('🔒 Seguridad General:');
    recommendations.push('  - JWT_SECRET fuerte (>32 caracteres)');
    recommendations.push('  - Variables sensibles en .env');
    recommendations.push('  - CORS configurado correctamente');
    recommendations.push('  - Rate limiting activo');
    
    return recommendations;
  }

  async runVerification() {
    console.log('🚀 VERIFICADOR DE CONFIGURACIÓN DE PRODUCCIÓN\n');
    console.log(`Entorno actual: ${this.environment}\n`);
    
    try {
      this.checkEnvironmentVariables();
      this.checkConfigFiles();
      this.checkSecurityMiddleware();
      
      const recommendations = this.generateRecommendations();
      
      console.log('\n📋 RESULTADOS DE VERIFICACIÓN:');
      console.log('=' .repeat(60));
      
      if (this.issues.length > 0) {
        console.log('\n❌ PROBLEMAS CRÍTICOS:');
        this.issues.forEach(issue => console.log(issue));
      }
      
      if (this.warnings.length > 0) {
        console.log('\n⚠️ ADVERTENCIAS:');
        this.warnings.forEach(warning => console.log(warning));
      }
      
      if (this.issues.length === 0 && this.warnings.length === 0) {
        console.log('\n✅ CONFIGURACIÓN CORRECTA');
        console.log('✅ No se encontraron problemas');
      }
      
      console.log('\n💡 RECOMENDACIONES:');
      recommendations.forEach(rec => console.log(rec));
      
      console.log('\n' + '=' .repeat(60));
      
      const hasIssues = this.issues.length > 0;
      
      if (hasIssues) {
        console.log('\n🚫 ❌ VERIFICACIÓN FALLIDA');
        console.log('❌ Corregir problemas críticos antes de deploy');
      } else {
        console.log('\n🎯 ✅ VERIFICACIÓN EXITOSA');
        console.log('✅ Configuración lista para producción');
      }
      
      return !hasIssues;
      
    } catch (error) {
      console.error('❌ Error durante verificación:', error.message);
      return false;
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const verifier = new ProductionConfigVerifier();
  verifier.runVerification().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = ProductionConfigVerifier;