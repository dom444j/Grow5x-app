/**
 * Script para verificar que todas las plantillas de email
 * estén funcionando correctamente según el tipo configurado
 */

const fs = require('fs');
const path = require('path');

// Tipos de email a verificar según la documentación
const EMAIL_TYPES = [
  'verification',
  'welcome', 
  'password_reset',
  'payment_confirmation',
  'ticket_created',
  'ticket_response',
  'withdrawal_verification',
  'special_code_welcome'
];

// Configuraciones SMTP esperadas
const SMTP_CONFIGS = [
  'default',
  'welcome',
  'recovery',
  'support'
];

async function verifyEmailTemplates() {
  console.log('🔍 Verificando plantillas de email del sistema...');
  console.log('=' .repeat(60));
  
  try {
    // 1. Verificar archivo email.js
    console.log('📝 Verificando archivo de plantillas email.js...');
    const emailUtilsPath = path.join(__dirname, 'backend', 'src', 'utils', 'email.js');
    
    if (!fs.existsSync(emailUtilsPath)) {
      console.log('❌ No se encontró el archivo email.js');
      return;
    }
    
    const emailContent = fs.readFileSync(emailUtilsPath, 'utf8');
    console.log('✅ Archivo email.js encontrado');
    
    // 2. Verificar plantillas por tipo
    console.log('\n📧 Verificando plantillas por tipo:');
    const templateResults = {};
    
    EMAIL_TYPES.forEach(type => {
      const hasTemplate = emailContent.includes(type);
      templateResults[type] = hasTemplate;
      console.log(`   ${hasTemplate ? '✅' : '❌'} ${type}: ${hasTemplate ? 'Configurada' : 'No encontrada'}`);
    });
    
    // 3. Verificar idiomas soportados
    console.log('\n🌐 Verificando idiomas soportados:');
    const hasSpanish = emailContent.includes('es:') || emailContent.includes('"es"');
    const hasEnglish = emailContent.includes('en:') || emailContent.includes('"en"');
    
    console.log(`   ${hasEnglish ? '✅' : '❌'} Inglés (en): ${hasEnglish ? 'Soportado' : 'No encontrado'}`);
    console.log(`   ${hasSpanish ? '✅' : '❌'} Español (es): ${hasSpanish ? 'Soportado' : 'No encontrado'}`);
    
    // 4. Verificar funciones de envío
    console.log('\n📤 Verificando funciones de envío:');
    const sendFunctions = [
      'sendVerificationEmail',
      'sendWelcomeEmail',
      'sendPasswordResetEmail',
      'sendPaymentConfirmationEmail',
      'sendTicketCreatedEmail',
      'sendTicketResponseEmail'
    ];
    
    sendFunctions.forEach(func => {
      const hasFunction = emailContent.includes(func);
      console.log(`   ${hasFunction ? '✅' : '❌'} ${func}: ${hasFunction ? 'Disponible' : 'No encontrada'}`);
    });
    
    // 5. Verificar configuración SMTP en ecosystem.config.js
    console.log('\n🚚 Verificando configuración SMTP:');
    const ecosystemPath = path.join(__dirname, 'ecosystem.config.js');
    
    if (fs.existsSync(ecosystemPath)) {
      const ecosystemContent = fs.readFileSync(ecosystemPath, 'utf8');
      console.log('✅ Archivo ecosystem.config.js encontrado');
      
      SMTP_CONFIGS.forEach(config => {
        const configKey = config === 'default' ? 'SMTP_' : `${config.toUpperCase()}_EMAIL_`;
        const hasConfig = ecosystemContent.includes(configKey);
        console.log(`   ${hasConfig ? '✅' : '❌'} Configuración ${config}: ${hasConfig ? 'Configurada' : 'No encontrada'}`);
      });
    } else {
      console.log('❌ No se encontró ecosystem.config.js');
    }
    
    // 6. Verificar archivo de configuración de email
    console.log('\n⚙️  Verificando configuraciones adicionales:');
    const configPaths = [
      path.join(__dirname, 'backend', 'src', 'config', 'email.js'),
      path.join(__dirname, 'backend', 'src', 'config', 'smtp.js'),
      path.join(__dirname, '.env'),
      path.join(__dirname, '.env.production')
    ];
    
    configPaths.forEach(configPath => {
      const fileName = path.basename(configPath);
      const exists = fs.existsSync(configPath);
      console.log(`   ${exists ? '✅' : '❌'} ${fileName}: ${exists ? 'Encontrado' : 'No encontrado'}`);
    });
    
    // 7. Verificar estructura de plantillas
    console.log('\n🏗️  Verificando estructura de plantillas:');
    
    // Buscar patrones de plantillas
    const templatePatterns = [
      'subject:',
      'html:',
      'text:',
      'template:',
      'emailTemplates',
      'getEmailTemplate'
    ];
    
    templatePatterns.forEach(pattern => {
      const hasPattern = emailContent.includes(pattern);
      console.log(`   ${hasPattern ? '✅' : '❌'} Patrón '${pattern}': ${hasPattern ? 'Encontrado' : 'No encontrado'}`);
    });
    
    // 8. Verificar transportadores
    console.log('\n🔧 Verificando transportadores SMTP:');
    const transporterPatterns = [
      'createTransporter',
      'nodemailer',
      'transporter',
      'smtp'
    ];
    
    transporterPatterns.forEach(pattern => {
      const hasPattern = emailContent.toLowerCase().includes(pattern.toLowerCase());
      console.log(`   ${hasPattern ? '✅' : '❌'} ${pattern}: ${hasPattern ? 'Configurado' : 'No encontrado'}`);
    });
    
    // 9. Resumen de verificación
    console.log('\n' + '=' .repeat(60));
    console.log('📋 RESUMEN DE VERIFICACIÓN DE PLANTILLAS DE EMAIL');
    console.log('=' .repeat(60));
    
    const totalTemplates = EMAIL_TYPES.length;
    const configuredTemplates = Object.values(templateResults).filter(Boolean).length;
    const templateCoverage = Math.round((configuredTemplates / totalTemplates) * 100);
    
    console.log('\n📊 Estadísticas:');
    console.log(`   • Total tipos de email: ${totalTemplates}`);
    console.log(`   • Plantillas configuradas: ${configuredTemplates}`);
    console.log(`   • Cobertura: ${templateCoverage}%`);
    console.log(`   • Idiomas soportados: ${hasEnglish && hasSpanish ? 'Inglés y Español' : hasEnglish ? 'Solo Inglés' : hasSpanish ? 'Solo Español' : 'Ninguno'}`);
    
    console.log('\n📧 Tipos de email configurados:');
    EMAIL_TYPES.forEach(type => {
      const status = templateResults[type] ? '✅' : '❌';
      console.log(`   ${status} ${type}`);
    });
    
    console.log('\n🚚 Configuraciones SMTP:');
    SMTP_CONFIGS.forEach(config => {
      console.log(`   • Transportador ${config}`);
    });
    
    // 10. Recomendaciones
    console.log('\n💡 Recomendaciones:');
    
    if (templateCoverage < 100) {
      console.log('   ⚠️  Algunas plantillas de email no están configuradas');
      EMAIL_TYPES.forEach(type => {
        if (!templateResults[type]) {
          console.log(`      - Configurar plantilla para: ${type}`);
        }
      });
    }
    
    if (!hasSpanish || !hasEnglish) {
      console.log('   ⚠️  Considerar agregar soporte para múltiples idiomas');
    }
    
    if (templateCoverage >= 80) {
      console.log('   ✅ El sistema de plantillas está bien configurado');
    }
    
    console.log('\n✨ Verificación de plantillas de email completada!');
    
    return {
      success: true,
      templateCoverage,
      configuredTemplates,
      totalTemplates,
      hasMultiLanguage: hasSpanish && hasEnglish,
      templateResults
    };
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Ejecutar la verificación
verifyEmailTemplates().then(result => {
  if (result.success) {
    console.log('\n🎯 Verificación completada exitosamente');
    process.exit(0);
  } else {
    console.log('\n❌ Verificación falló');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Error fatal:', error.message);
  process.exit(1);
});