#!/usr/bin/env node

/**
 * SCRIPT DE CONFIGURACIÓN SEGURA DE VARIABLES DE ENTORNO
 * Blinda la configuración para evitar pérdida de sesiones durante deploys
 * Genera secrets seguros y valida configuración
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

class SecureEnvSetup {
  constructor() {
    this.backendPath = path.join(__dirname, '../..');
    this.envFiles = {
      development: path.join(this.backendPath, '.env'),
      production: path.join(this.backendPath, '.env.production'),
      staging: path.join(this.backendPath, '.env.staging')
    };
    this.backupPath = path.join(this.backendPath, 'env-backups');
  }

  /**
   * Ejecuta la configuración completa
   */
  async run() {
    try {
      console.log('🔒 GROW5X - CONFIGURACIÓN SEGURA DE ENTORNO');
      console.log('============================================\n');

      // Crear directorio de backups
      await this.createBackupDirectory();

      // Hacer backup de archivos existentes
      await this.backupExistingEnvFiles();

      // Validar configuración actual
      const validation = await this.validateCurrentConfig();
      this.displayValidationResults(validation);

      // Generar nuevos secrets si es necesario
      if (validation.needsNewSecrets) {
        const generateNew = await this.askUserConfirmation(
          '¿Deseas generar nuevos secrets seguros? (Esto invalidará sesiones activas)'
        );
        
        if (generateNew) {
          await this.generateSecureSecrets();
        }
      }

      // Aplicar configuración de producción segura
      await this.applySecureProductionConfig();

      // Crear script de deploy seguro
      await this.createSecureDeployScript();

      // Crear script de verificación
      await this.createVerificationScript();

      console.log('\n✅ Configuración segura completada');
      console.log('📁 Backups guardados en:', this.backupPath);
      console.log('🚀 Usa el script de deploy seguro para futuras actualizaciones');

    } catch (error) {
      console.error('❌ Error en configuración segura:', error.message);
      process.exit(1);
    }
  }

  /**
   * Crea directorio de backups
   */
  async createBackupDirectory() {
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
      console.log('📁 Directorio de backups creado');
    }
  }

  /**
   * Hace backup de archivos .env existentes
   */
  async backupExistingEnvFiles() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    for (const [env, filePath] of Object.entries(this.envFiles)) {
      if (fs.existsSync(filePath)) {
        const backupFile = path.join(this.backupPath, `.env.${env}.backup.${timestamp}`);
        fs.copyFileSync(filePath, backupFile);
        console.log(`💾 Backup creado: .env.${env}`);
      }
    }
  }

  /**
   * Valida configuración actual
   */
  async validateCurrentConfig() {
    const validation = {
      files: {},
      secrets: {},
      needsNewSecrets: false,
      criticalIssues: [],
      warnings: []
    };

    for (const [env, filePath] of Object.entries(this.envFiles)) {
      if (fs.existsSync(filePath)) {
        const config = this.parseEnvFile(filePath);
        validation.files[env] = {
          exists: true,
          config,
          issues: this.validateEnvConfig(config, env)
        };
      } else {
        validation.files[env] = { exists: false };
      }
    }

    // Verificar secrets críticos
    const prodConfig = validation.files.production?.config || {};
    
    if (!prodConfig.JWT_SECRET || prodConfig.JWT_SECRET.length < 32) {
      validation.criticalIssues.push('JWT_SECRET de producción inseguro o faltante');
      validation.needsNewSecrets = true;
    }

    if (!prodConfig.JWT_REFRESH_SECRET || prodConfig.JWT_REFRESH_SECRET.length < 32) {
      validation.criticalIssues.push('JWT_REFRESH_SECRET de producción inseguro o faltante');
      validation.needsNewSecrets = true;
    }

    if (!prodConfig.SESSION_SECRET || prodConfig.SESSION_SECRET.length < 32) {
      validation.criticalIssues.push('SESSION_SECRET de producción inseguro o faltante');
      validation.needsNewSecrets = true;
    }

    return validation;
  }

  /**
   * Parsea archivo .env
   */
  parseEnvFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const config = {};
    
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        config[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return config;
  }

  /**
   * Valida configuración de un entorno
   */
  validateEnvConfig(config, env) {
    const issues = [];
    const requiredVars = {
      development: ['PORT', 'NODE_ENV', 'MONGODB_URI', 'JWT_SECRET'],
      production: ['PORT', 'NODE_ENV', 'MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET'],
      staging: ['PORT', 'NODE_ENV', 'JWT_SECRET']
    };

    const required = requiredVars[env] || [];
    
    required.forEach(varName => {
      if (!config[varName]) {
        issues.push(`Variable requerida faltante: ${varName}`);
      }
    });

    // Validar longitud de secrets
    const secrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET'];
    secrets.forEach(secret => {
      if (config[secret] && config[secret].length < 32) {
        issues.push(`${secret} debe tener al menos 32 caracteres`);
      }
    });

    return issues;
  }

  /**
   * Muestra resultados de validación
   */
  displayValidationResults(validation) {
    console.log('📊 RESULTADOS DE VALIDACIÓN');
    console.log('============================\n');

    for (const [env, data] of Object.entries(validation.files)) {
      console.log(`📄 Entorno: ${env.toUpperCase()}`);
      if (data.exists) {
        console.log(`   ✅ Archivo existe`);
        if (data.issues.length === 0) {
          console.log(`   ✅ Sin problemas detectados`);
        } else {
          console.log(`   ⚠️  Problemas encontrados:`);
          data.issues.forEach(issue => console.log(`      - ${issue}`));
        }
      } else {
        console.log(`   ❌ Archivo no existe`);
      }
      console.log('');
    }

    if (validation.criticalIssues.length > 0) {
      console.log('🚨 PROBLEMAS CRÍTICOS:');
      validation.criticalIssues.forEach(issue => console.log(`   - ${issue}`));
      console.log('');
    }
  }

  /**
   * Genera secrets seguros
   */
  async generateSecureSecrets() {
    console.log('🔐 Generando secrets seguros...');
    
    const secrets = {
      JWT_SECRET: this.generateSecureSecret(64),
      JWT_REFRESH_SECRET: this.generateSecureSecret(64),
      SESSION_SECRET: this.generateSecureSecret(64),
      ENCRYPTION_KEY: this.generateSecureSecret(32),
      ENCRYPTION_IV: this.generateSecureSecret(16)
    };

    // Actualizar archivo de producción
    await this.updateEnvFile('production', secrets);
    
    // Crear archivo de secrets para referencia
    const secretsFile = path.join(this.backupPath, `secrets-${Date.now()}.json`);
    fs.writeFileSync(secretsFile, JSON.stringify(secrets, null, 2));
    
    console.log('✅ Secrets seguros generados');
    console.log('📄 Secrets guardados en:', secretsFile);
    console.log('⚠️  IMPORTANTE: Guarda estos secrets en un lugar seguro');
  }

  /**
   * Genera un secret seguro
   */
  generateSecureSecret(length) {
    return crypto.randomBytes(length).toString('hex').substring(0, length);
  }

  /**
   * Actualiza archivo .env
   */
  async updateEnvFile(env, updates) {
    const filePath = this.envFiles[env];
    let content = '';
    
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8');
    }

    // Actualizar o agregar variables
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;
      
      if (regex.test(content)) {
        content = content.replace(regex, newLine);
      } else {
        content += `\n${newLine}`;
      }
    }

    fs.writeFileSync(filePath, content);
  }

  /**
   * Aplica configuración de producción segura
   */
  async applySecureProductionConfig() {
    console.log('🔧 Aplicando configuración de producción segura...');
    
    const secureConfig = {
      // Configuración de seguridad
      'BCRYPT_ROUNDS': '12',
      'RATE_LIMIT_WINDOW_MS': '900000',
      'RATE_LIMIT_MAX_REQUESTS': '100',
      'RATE_LIMIT_LOGIN_MAX': '5',
      
      // Configuración de JWT
      'JWT_EXPIRES_IN': '15m',
      'JWT_REFRESH_EXPIRES_IN': '7d',
      
      // Configuración de logs
      'LOG_LEVEL': 'info',
      'LOG_FILE': '/var/log/grow5x/app.log',
      
      // Configuración de backup
      'BACKUP_DIR': '/var/backups/grow5x',
      'BACKUP_RETENTION_DAYS': '7'
    };

    await this.updateEnvFile('production', secureConfig);
    console.log('✅ Configuración de producción aplicada');
  }

  /**
   * Crea script de deploy seguro
   */
  async createSecureDeployScript() {
    const scriptContent = `#!/bin/bash

# GROW5X - SCRIPT DE DEPLOY SEGURO
# Preserva sesiones y configuración durante deploys

set -e

echo "🚀 GROW5X - Deploy Seguro"
echo "========================="

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecutar desde el directorio del backend"
    exit 1
fi

# Hacer backup de configuración actual
echo "💾 Creando backup de configuración..."
mkdir -p env-backups
cp .env .env.production env-backups/ 2>/dev/null || true

# Verificar variables críticas antes del deploy
echo "🔍 Verificando configuración..."
node src/scripts/verify-env-config.js

if [ $? -ne 0 ]; then
    echo "❌ Error en verificación de configuración"
    exit 1
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci --production

# Ejecutar migraciones si existen
if [ -f "src/scripts/migrate.js" ]; then
    echo "🔄 Ejecutando migraciones..."
    node src/scripts/migrate.js
fi

# Reiniciar aplicación con PM2
echo "🔄 Reiniciando aplicación..."
pm2 startOrReload ecosystem.config.js --env production

# Verificar que la aplicación está funcionando
echo "✅ Verificando aplicación..."
sleep 5
node src/scripts/health-check.js

if [ $? -eq 0 ]; then
    echo "✅ Deploy completado exitosamente"
else
    echo "❌ Error en verificación post-deploy"
    echo "🔄 Restaurando backup..."
    pm2 restart growx5-backend
    exit 1
fi

echo "🎉 Deploy seguro completado"
`;

    const scriptPath = path.join(this.backendPath, 'secure-deploy.sh');
    fs.writeFileSync(scriptPath, scriptContent);
    
    // Hacer el script ejecutable en sistemas Unix
    try {
      fs.chmodSync(scriptPath, '755');
    } catch (error) {
      // Ignorar en Windows
    }
    
    console.log('✅ Script de deploy seguro creado:', scriptPath);
  }

  /**
   * Crea script de verificación
   */
  async createVerificationScript() {
    const scriptContent = `const fs = require('fs');
const path = require('path');

/**
 * SCRIPT DE VERIFICACIÓN DE CONFIGURACIÓN
 * Valida que todas las variables críticas estén configuradas
 */

class EnvVerifier {
  constructor() {
    this.requiredVars = {
      production: [
        'NODE_ENV',
        'PORT',
        'MONGODB_URI',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'SESSION_SECRET',
        'FRONTEND_URL',
        'API_URL'
      ]
    };
  }

  verify() {
    console.log('🔍 Verificando configuración de entorno...');
    
    const env = process.env.NODE_ENV || 'development';
    const required = this.requiredVars[env] || this.requiredVars.production;
    
    const missing = [];
    const weak = [];
    
    required.forEach(varName => {
      const value = process.env[varName];
      
      if (!value) {
        missing.push(varName);
      } else if (this.isSecretVar(varName) && value.length < 32) {
        weak.push(varName);
      }
    });
    
    if (missing.length > 0) {
      console.error('❌ Variables faltantes:', missing.join(', '));
      process.exit(1);
    }
    
    if (weak.length > 0) {
      console.warn('⚠️  Variables débiles:', weak.join(', '));
      console.warn('   Considera generar secrets más seguros');
    }
    
    console.log('✅ Configuración válida');
    process.exit(0);
  }
  
  isSecretVar(varName) {
    return varName.includes('SECRET') || varName.includes('KEY');
  }
}

const verifier = new EnvVerifier();
verifier.verify();
`;

    const scriptPath = path.join(this.backendPath, 'src/scripts/verify-env-config.js');
    fs.writeFileSync(scriptPath, scriptContent);
    console.log('✅ Script de verificación creado');
  }

  /**
   * Pregunta confirmación al usuario
   */
  async askUserConfirmation(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`${question} (s/N): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 's' || answer.toLowerCase() === 'y');
      });
    });
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const setup = new SecureEnvSetup();
  setup.run().catch(console.error);
}

module.exports = SecureEnvSetup;