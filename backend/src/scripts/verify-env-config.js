const fs = require('fs');
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
