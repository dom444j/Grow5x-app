const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60));
}

function logSection(title) {
  console.log('\n' + '-'.repeat(40));
  log(title, 'cyan');
  console.log('-'.repeat(40));
}

async function verificarEmailCompleto() {
  logHeader('VERIFICACIÓN COMPLETA DEL SISTEMA DE EMAILS - GROW5X');
  
  const emailPath = path.join(__dirname, 'backend', 'src', 'utils', 'email.js');
  
  if (!fs.existsSync(emailPath)) {
    log('❌ Archivo email.js no encontrado', 'red');
    return;
  }
  
  log('✅ Archivo email.js encontrado', 'green');
  
  try {
    // Leer el contenido del archivo
    const emailContent = fs.readFileSync(emailPath, 'utf8');
    
    logSection('1. PLANTILLAS DE EMAIL DISPONIBLES');
    
    // Verificar plantillas definidas
    const templateTypes = [
      'passwordReset',
      'verification', 
      'welcome',
      'specialCodeWelcome',
      'paymentConfirmation',
      'withdrawalVerification',
      'ticketCreated'
    ];
    
    const foundTemplates = [];
    const missingTemplates = [];
    
    templateTypes.forEach(type => {
      if (emailContent.includes(`${type}:`)) {
        foundTemplates.push(type);
        log(`✅ ${type}`, 'green');
        
        // Verificar idiomas disponibles
        const hasEnglish = emailContent.includes(`${type}: {\n    en:`) || emailContent.includes(`${type}: {\n      en:`);
        const hasSpanish = emailContent.includes(`es:`) && emailContent.includes(type);
        
        if (hasEnglish && hasSpanish) {
          log(`   📝 Idiomas: Inglés ✅ | Español ✅`, 'blue');
        } else if (hasEnglish) {
          log(`   📝 Idiomas: Inglés ✅ | Español ❌`, 'yellow');
        } else if (hasSpanish) {
          log(`   📝 Idiomas: Inglés ❌ | Español ✅`, 'yellow');
        } else {
          log(`   📝 Idiomas: No detectados`, 'red');
        }
      } else {
        missingTemplates.push(type);
        log(`❌ ${type}`, 'red');
      }
    });
    
    logSection('2. FUNCIONES DE ENVÍO DISPONIBLES');
    
    const sendFunctions = [
      'sendVerificationEmail',
      'sendWelcomeEmail', 
      'sendSpecialCodeWelcomeEmail',
      'sendPasswordResetEmail',
      'sendPaymentConfirmationEmail',
      'sendPaymentFailedEmail',
      'sendWithdrawalVerificationEmail',
      'sendTicketCreatedEmail',
      'sendTicketResponseEmail',
      'sendTicketResolvedEmail',
      'sendNewTicketNotification',
      'sendNewResponseNotification',
      'sendContactFormEmail'
    ];
    
    const foundFunctions = [];
    const missingFunctions = [];
    
    sendFunctions.forEach(func => {
      if (emailContent.includes(`const ${func} =`) || emailContent.includes(`${func}:`)) {
        foundFunctions.push(func);
        log(`✅ ${func}`, 'green');
      } else {
        missingFunctions.push(func);
        log(`❌ ${func}`, 'red');
      }
    });
    
    logSection('3. CONFIGURACIÓN SMTP');
    
    // Verificar configuraciones SMTP
    const smtpConfigs = [
      'createTransporter',
      'SMTP_HOST',
      'SMTP_PORT', 
      'SMTP_USER',
      'SMTP_PASS',
      'WELCOME_EMAIL_USER',
      'RECOVERY_EMAIL_USER',
      'BACKUP_EMAIL_USER'
    ];
    
    smtpConfigs.forEach(config => {
      if (emailContent.includes(config)) {
        log(`✅ ${config}`, 'green');
      } else {
        log(`❌ ${config}`, 'red');
      }
    });
    
    logSection('4. CARACTERÍSTICAS AVANZADAS');
    
    const advancedFeatures = [
      { name: 'Sistema de reintentos', pattern: 'maxRetries' },
      { name: 'Logging de emails', pattern: 'EmailLog' },
      { name: 'Múltiples transportadores', pattern: 'emailType' },
      { name: 'Configuración de respaldo', pattern: 'backup' },
      { name: 'Verificación de configuración', pattern: 'testEmailConfiguration' },
      { name: 'Soporte de adjuntos', pattern: 'attachments' },
      { name: 'Configuración TLS', pattern: 'rejectUnauthorized' }
    ];
    
    advancedFeatures.forEach(feature => {
      if (emailContent.includes(feature.pattern)) {
        log(`✅ ${feature.name}`, 'green');
      } else {
        log(`❌ ${feature.name}`, 'red');
      }
    });
    
    logSection('5. RESUMEN ESTADÍSTICO');
    
    const totalTemplates = templateTypes.length;
    const foundTemplatesCount = foundTemplates.length;
    const templateCoverage = ((foundTemplatesCount / totalTemplates) * 100).toFixed(1);
    
    const totalFunctions = sendFunctions.length;
    const foundFunctionsCount = foundFunctions.length;
    const functionCoverage = ((foundFunctionsCount / totalFunctions) * 100).toFixed(1);
    
    log(`📊 Plantillas implementadas: ${foundTemplatesCount}/${totalTemplates} (${templateCoverage}%)`, 
        templateCoverage >= 80 ? 'green' : templateCoverage >= 60 ? 'yellow' : 'red');
    
    log(`📊 Funciones implementadas: ${foundFunctionsCount}/${totalFunctions} (${functionCoverage}%)`, 
        functionCoverage >= 80 ? 'green' : functionCoverage >= 60 ? 'yellow' : 'red');
    
    // Verificar estructura del archivo
    const fileSize = fs.statSync(emailPath).size;
    const lineCount = emailContent.split('\n').length;
    
    log(`📄 Tamaño del archivo: ${(fileSize / 1024).toFixed(2)} KB`, 'blue');
    log(`📄 Líneas de código: ${lineCount}`, 'blue');
    
    logSection('6. PLANTILLAS FALTANTES');
    
    if (missingTemplates.length > 0) {
      log('Las siguientes plantillas no están implementadas:', 'yellow');
      missingTemplates.forEach(template => {
        log(`  • ${template}`, 'red');
      });
    } else {
      log('✅ Todas las plantillas están implementadas', 'green');
    }
    
    logSection('7. FUNCIONES FALTANTES');
    
    if (missingFunctions.length > 0) {
      log('Las siguientes funciones no están implementadas:', 'yellow');
      missingFunctions.forEach(func => {
        log(`  • ${func}`, 'red');
      });
    } else {
      log('✅ Todas las funciones están implementadas', 'green');
    }
    
    logSection('8. VERIFICACIÓN DE EXPORTACIONES');
    
    // Verificar que las funciones estén exportadas
    const moduleExports = emailContent.match(/module\.exports\s*=\s*{([^}]+)}/s);
    if (moduleExports) {
      const exports = moduleExports[1];
      foundFunctions.forEach(func => {
        if (exports.includes(func)) {
          log(`✅ ${func} exportada`, 'green');
        } else {
          log(`❌ ${func} no exportada`, 'red');
        }
      });
    } else {
      log('❌ No se encontró la sección module.exports', 'red');
    }
    
    logHeader('VERIFICACIÓN COMPLETADA');
    
    // Estado general
    const templateCoverageNum = parseFloat(templateCoverage);
    const functionCoverageNum = parseFloat(functionCoverage);
    const overallScore = (templateCoverageNum + functionCoverageNum) / 2;
    
    if (overallScore >= 90) {
      log('🎉 EXCELENTE: El sistema de emails está muy bien implementado', 'green');
    } else if (overallScore >= 70) {
      log('👍 BUENO: El sistema de emails está bien implementado con algunas mejoras posibles', 'yellow');
    } else if (overallScore >= 50) {
      log('⚠️  REGULAR: El sistema de emails necesita mejoras importantes', 'yellow');
    } else {
      log('❌ CRÍTICO: El sistema de emails necesita trabajo significativo', 'red');
    }
    
    log(`\n📈 Puntuación general: ${overallScore.toFixed(1)}%`, 
        overallScore >= 80 ? 'green' : overallScore >= 60 ? 'yellow' : 'red');
    
  } catch (error) {
    log(`❌ Error al verificar el archivo: ${error.message}`, 'red');
  }
}

// Ejecutar verificación
verificarEmailCompleto().catch(console.error);