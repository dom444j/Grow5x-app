#!/usr/bin/env node

/**
 * Script para probar la configuración de correo de GrowX5
 * Uso: node test-email.js [email_destino]
 */

const axios = require('axios');
const readline = require('readline');

// Configuración
const API_BASE = process.env.API_URL || 'http://localhost:5000';
const TEST_ENDPOINT = `${API_BASE}/api/auth/test-email`;

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'bold');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testEmailConfiguration(email) {
  try {
    logHeader('🧪 PRUEBA DE CONFIGURACIÓN DE CORREO - GROWX5');
    
    logInfo(`Servidor: ${API_BASE}`);
    logInfo(`Endpoint: ${TEST_ENDPOINT}`);
    logInfo(`Email destino: ${email}`);
    
    console.log('\n⏳ Enviando correo de prueba...');
    
    const response = await axios.post(TEST_ENDPOINT, {
      email: email
    }, {
      timeout: 30000, // 30 segundos
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      logSuccess('Correo de prueba enviado exitosamente!');
      
      console.log('\n📧 Detalles del envío:');
      console.log(`   • Destinatario: ${response.data.details.recipient}`);
      console.log(`   • Timestamp: ${response.data.details.timestamp}`);
      console.log(`   • Servidor SMTP: ${response.data.details.smtpServer}`);
      console.log(`   • Puerto: ${response.data.details.port}`);
      
      console.log('\n🔍 Qué verificar ahora:');
      console.log('   1. Revisa la bandeja de entrada del email destino');
      console.log('   2. Si no aparece, revisa la carpeta de spam');
      console.log('   3. Verifica que los registros DNS estén propagados');
      console.log('   4. Si el correo llega, ¡la configuración está lista!');
      
    } else {
      logError('Error en la respuesta del servidor');
      console.log('Respuesta:', response.data);
    }
    
  } catch (error) {
    logError('Error enviando correo de prueba');
    
    if (error.response) {
      console.log('\n📋 Detalles del error:');
      console.log(`   • Status: ${error.response.status}`);
      console.log(`   • Message: ${error.response.data.message || 'Sin mensaje'}`);
      
      if (error.response.data.error) {
        console.log(`   • Error: ${error.response.data.error}`);
      }
      
      // Sugerencias basadas en el error
      if (error.response.status === 500) {
        logWarning('Posibles causas:');
        console.log('   • Credenciales SMTP incorrectas');
        console.log('   • Servidor SMTP no accesible');
        console.log('   • Registros DNS no configurados');
        console.log('   • Puerto 587 bloqueado');
      }
      
    } else if (error.request) {
      logError('No se pudo conectar al servidor');
      console.log('   • Verifica que el backend esté ejecutándose');
      console.log(`   • URL: ${API_BASE}`);
      
    } else {
      logError(`Error: ${error.message}`);
    }
  }
}

async function promptForEmail() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('📧 Ingresa el email de destino para la prueba: ', (email) => {
      rl.close();
      resolve(email.trim());
    });
  });
}

async function main() {
  try {
    // Obtener email del argumento o preguntar
    let email = process.argv[2];
    
    if (!email) {
      email = await promptForEmail();
    }
    
    // Validar email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logError('Email inválido');
      process.exit(1);
    }
    
    await testEmailConfiguration(email);
    
  } catch (error) {
    logError(`Error inesperado: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { testEmailConfiguration };