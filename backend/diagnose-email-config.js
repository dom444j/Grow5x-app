#!/usr/bin/env node

/**
 * Script de diagnóstico avanzado para configuración de email
 * Prueba diferentes configuraciones y proporciona información detallada
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const dns = require('dns').promises;

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Configuraciones a probar
const testConfigs = [
  {
    name: 'Namecheap Private Email (Puerto 587)',
    config: {
      host: 'smtp.privateemail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'support@grow5x.app',
        pass: '300400Jd14'
      },
      tls: {
        rejectUnauthorized: false
      }
    }
  },
  {
    name: 'Namecheap Private Email (Puerto 465)',
    config: {
      host: 'smtp.privateemail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'support@grow5x.app',
        pass: '300400Jd14'
      },
      tls: {
        rejectUnauthorized: false
      }
    }
  },
  {
    name: 'Namecheap Private Email (Puerto 25)',
    config: {
      host: 'smtp.privateemail.com',
      port: 25,
      secure: false,
      auth: {
        user: 'support@grow5x.app',
        pass: '300400Jd14'
      },
      tls: {
        rejectUnauthorized: false
      }
    }
  }
];

// Función para verificar DNS
async function checkDNS() {
  console.log(`\n${colors.cyan}🔍 VERIFICANDO CONFIGURACIÓN DNS${colors.reset}`);
  console.log('='.repeat(50));
  
  try {
    // Verificar registros MX
    console.log(`${colors.yellow}📧 Verificando registros MX para grow5x.app...${colors.reset}`);
    const mxRecords = await dns.resolveMx('grow5x.app');
    if (mxRecords && mxRecords.length > 0) {
      console.log(`${colors.green}✅ Registros MX encontrados:${colors.reset}`);
      mxRecords.forEach(record => {
        console.log(`   • ${record.exchange} (prioridad: ${record.priority})`);
      });
    } else {
      console.log(`${colors.red}❌ No se encontraron registros MX${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error verificando MX: ${error.message}${colors.reset}`);
  }
  
  try {
    // Verificar registros TXT (SPF)
    console.log(`\n${colors.yellow}🛡️  Verificando registros SPF...${colors.reset}`);
    const txtRecords = await dns.resolveTxt('grow5x.app');
    const spfRecord = txtRecords.find(record => 
      record.some(txt => txt.includes('v=spf1'))
    );
    if (spfRecord) {
      console.log(`${colors.green}✅ Registro SPF encontrado:${colors.reset}`);
      console.log(`   ${spfRecord.join('')}`);
    } else {
      console.log(`${colors.yellow}⚠️  No se encontró registro SPF${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error verificando SPF: ${error.message}${colors.reset}`);
  }
}

// Función para probar conectividad
async function testConnectivity() {
  console.log(`\n${colors.cyan}🌐 VERIFICANDO CONECTIVIDAD${colors.reset}`);
  console.log('='.repeat(50));
  
  const hosts = [
    'smtp.privateemail.com',
    'mail.privateemail.com',
    'smtp.namecheap.com'
  ];
  
  for (const host of hosts) {
    try {
      console.log(`${colors.yellow}🔌 Probando conectividad a ${host}...${colors.reset}`);
      const addresses = await dns.resolve4(host);
      console.log(`${colors.green}✅ ${host} resuelve a: ${addresses.join(', ')}${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ ${host}: ${error.message}${colors.reset}`);
    }
  }
}

// Función para probar configuración SMTP
async function testSMTPConfig(testConfig) {
  console.log(`\n${colors.blue}🧪 Probando: ${testConfig.name}${colors.reset}`);
  console.log(`   Host: ${testConfig.config.host}:${testConfig.config.port}`);
  console.log(`   Seguro: ${testConfig.config.secure}`);
  console.log(`   Usuario: ${testConfig.config.auth.user}`);
  
  try {
    const transporter = nodemailer.createTransport(testConfig.config);
    
    // Verificar conexión
    console.log(`   ${colors.yellow}⏳ Verificando conexión...${colors.reset}`);
    await transporter.verify();
    console.log(`   ${colors.green}✅ Conexión exitosa${colors.reset}`);
    
    return { success: true, config: testConfig.name };
    
  } catch (error) {
    console.log(`   ${colors.red}❌ Error: ${error.message}${colors.reset}`);
    
    // Análisis detallado del error
    if (error.code === 'EAUTH') {
      console.log(`   ${colors.yellow}💡 Problema de autenticación - verificar credenciales${colors.reset}`);
    } else if (error.code === 'ECONNECTION') {
      console.log(`   ${colors.yellow}💡 Problema de conexión - verificar host/puerto${colors.reset}`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`   ${colors.yellow}💡 Timeout - verificar firewall/conectividad${colors.reset}`);
    }
    
    return { success: false, config: testConfig.name, error: error.message };
  }
}

// Función para mostrar información del sistema
function showSystemInfo() {
  console.log(`\n${colors.cyan}💻 INFORMACIÓN DEL SISTEMA${colors.reset}`);
  console.log('='.repeat(50));
  console.log(`Node.js: ${process.version}`);
  console.log(`Plataforma: ${process.platform}`);
  console.log(`Arquitectura: ${process.arch}`);
  console.log(`Directorio: ${process.cwd()}`);
  
  // Variables de entorno relevantes
  console.log(`\n${colors.cyan}🔧 VARIABLES DE ENTORNO${colors.reset}`);
  console.log('='.repeat(50));
  const envVars = [
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER',
    'WELCOME_EMAIL_HOST', 'RECOVERY_EMAIL_HOST', 'BACKUP_EMAIL_HOST'
  ];
  
  envVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`${varName}: ${value}`);
    } else {
      console.log(`${varName}: ${colors.yellow}(no definida)${colors.reset}`);
    }
  });
}

// Función para mostrar recomendaciones
function showRecommendations() {
  console.log(`\n${colors.cyan}💡 RECOMENDACIONES${colors.reset}`);
  console.log('='.repeat(50));
  
  console.log(`${colors.yellow}1. Verificar cuentas en Namecheap:${colors.reset}`);
  console.log(`   • Acceder a: https://ap.www.namecheap.com/domains/dcp/privateemail/3638650/grow5x.app`);
  console.log(`   • Crear las 4 cuentas: noreply, welcome, recovery, support`);
  console.log(`   • Usar contraseña: 300400Jd14`);
  
  console.log(`\n${colors.yellow}2. Configurar DNS si es necesario:${colors.reset}`);
  console.log(`   • MX: mx1.privateemail.com, mx2.privateemail.com`);
  console.log(`   • SPF: v=spf1 include:spf.privateemail.com ~all`);
  
  console.log(`\n${colors.yellow}3. Probar después de configurar:${colors.reset}`);
  console.log(`   • node test-namecheap-email.js`);
  console.log(`   • node test-support-email.js tu@email.com`);
  
  console.log(`\n${colors.yellow}4. Si persisten problemas:${colors.reset}`);
  console.log(`   • Contactar soporte de Namecheap`);
  console.log(`   • Verificar que el dominio esté activo`);
  console.log(`   • Revisar configuración de firewall`);
}

// Función principal
async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('='.repeat(70));
  console.log('🔧 DIAGNÓSTICO AVANZADO DE CONFIGURACIÓN DE EMAIL');
  console.log('='.repeat(70));
  console.log(`${colors.reset}`);
  
  // Mostrar información del sistema
  showSystemInfo();
  
  // Verificar DNS
  await checkDNS();
  
  // Verificar conectividad
  await testConnectivity();
  
  // Probar configuraciones SMTP
  console.log(`\n${colors.cyan}📧 PROBANDO CONFIGURACIONES SMTP${colors.reset}`);
  console.log('='.repeat(50));
  
  const results = [];
  for (const config of testConfigs) {
    const result = await testSMTPConfig(config);
    results.push(result);
  }
  
  // Mostrar resumen
  console.log(`\n${colors.cyan}📊 RESUMEN DE PRUEBAS${colors.reset}`);
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`${colors.green}✅ Configuraciones exitosas: ${successful.length}/${results.length}${colors.reset}`);
  successful.forEach(r => console.log(`   • ${r.config}`));
  
  if (failed.length > 0) {
    console.log(`\n${colors.red}❌ Configuraciones fallidas: ${failed.length}/${results.length}${colors.reset}`);
    failed.forEach(r => console.log(`   • ${r.config}`));
  }
  
  // Mostrar recomendaciones
  showRecommendations();
  
  if (successful.length > 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 Al menos una configuración funciona. Revisa las recomendaciones arriba.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bold}⚠️  Ninguna configuración funciona. Sigue las recomendaciones arriba.${colors.reset}`);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}❌ Error fatal:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { main, testSMTPConfig, checkDNS };