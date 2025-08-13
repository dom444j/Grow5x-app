const path = require('path');
const fs = require('fs');

// Importar las funciones de email
const emailPath = path.join(__dirname, 'backend', 'src', 'utils', 'email.js');

if (!fs.existsSync(emailPath)) {
  console.log('❌ Archivo email.js no encontrado');
  process.exit(1);
}

const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPaymentConfirmationEmail,
  sendWithdrawalVerificationEmail,
  sendTicketCreatedEmail,
  sendSpecialCodeWelcomeEmail
} = require('./backend/src/utils/email.js');

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

async function enviarEmailsPrueba() {
  const emailDestino = 'clubnetwin@hotmail.com';
  const nombreUsuario = 'Usuario de Prueba';
  
  log('\n🚀 INICIANDO ENVÍO DE EMAILS DE PRUEBA A: ' + emailDestino, 'bold');
  log('=' .repeat(60), 'cyan');
  
  try {
    // 1. Email de Verificación
    log('\n📧 1. Enviando email de verificación...', 'yellow');
    try {
      await sendVerificationEmail(
        emailDestino, 
        'ABC123TOKEN456', 
        nombreUsuario, 
        'es'
      );
      log('✅ Email de verificación enviado correctamente', 'green');
    } catch (error) {
      log(`❌ Error enviando verificación: ${error.message}`, 'red');
    }
    
    // Esperar 2 segundos entre emails
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Email de Bienvenida
    log('\n📧 2. Enviando email de bienvenida...', 'yellow');
    try {
      await sendWelcomeEmail(
        emailDestino, 
        nombreUsuario, 
        'es'
      );
      log('✅ Email de bienvenida enviado correctamente', 'green');
    } catch (error) {
      log(`❌ Error enviando bienvenida: ${error.message}`, 'red');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Email de Recuperación de Contraseña
    log('\n📧 3. Enviando email de recuperación de contraseña...', 'yellow');
    try {
      await sendPasswordResetEmail(
        emailDestino, 
        'RESET789TOKEN123', 
        nombreUsuario, 
        'es'
      );
      log('✅ Email de recuperación enviado correctamente', 'green');
    } catch (error) {
      log(`❌ Error enviando recuperación: ${error.message}`, 'red');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. Email de Confirmación de Pago
    log('\n📧 4. Enviando email de confirmación de pago...', 'yellow');
    try {
      const transaccionEjemplo = {
        id: 'TXN_123456789',
        amount: 99.99,
        currency: 'USD',
        date: new Date().toLocaleDateString('es-ES'),
        plan: 'Plan Pionero',
        externalReference: 'REF_987654321'
      };
      
      await sendPaymentConfirmationEmail(
        emailDestino, 
        nombreUsuario, 
        transaccionEjemplo, 
        'es'
      );
      log('✅ Email de confirmación de pago enviado correctamente', 'green');
    } catch (error) {
      log(`❌ Error enviando confirmación de pago: ${error.message}`, 'red');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Email de Verificación de Retiro
    log('\n📧 5. Enviando email de verificación de retiro...', 'yellow');
    try {
      await sendWithdrawalVerificationEmail(
        emailDestino, 
        nombreUsuario, 
        'WITHDRAW456789', 
        'es'
      );
      log('✅ Email de verificación de retiro enviado correctamente', 'green');
    } catch (error) {
      log(`❌ Error enviando verificación de retiro: ${error.message}`, 'red');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 6. Email de Ticket Creado
    log('\n📧 6. Enviando email de ticket creado...', 'yellow');
    try {
      const ticketEjemplo = {
        _id: 'TICKET_123456',
        subject: 'Consulta sobre mi cuenta',
        category: 'Soporte Técnico',
        priority: 'Media',
        description: 'Tengo una consulta sobre el funcionamiento de mi cuenta y los retiros.',
        createdAt: new Date()
      };
      
      await sendTicketCreatedEmail(
        emailDestino, 
        ticketEjemplo, 
        'es'
      );
      log('✅ Email de ticket creado enviado correctamente', 'green');
    } catch (error) {
      log(`❌ Error enviando ticket creado: ${error.message}`, 'red');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 7. Email de Bienvenida con Código Especial
    log('\n📧 7. Enviando email de bienvenida con código especial...', 'yellow');
    try {
      await sendSpecialCodeWelcomeEmail(
        emailDestino, 
        nombreUsuario, 
        'Código de Referido VIP', 
        'GROW5X_VIP_2024', 
        'es'
      );
      log('✅ Email de bienvenida con código especial enviado correctamente', 'green');
    } catch (error) {
      log(`❌ Error enviando bienvenida con código: ${error.message}`, 'red');
    }
    
    log('\n' + '=' .repeat(60), 'cyan');
    log('🎉 PROCESO DE ENVÍO COMPLETADO', 'bold');
    log('\n📬 Revisa la bandeja de entrada de: ' + emailDestino, 'blue');
    log('📬 También revisa la carpeta de SPAM/Correo no deseado', 'yellow');
    log('\n💡 Los emails pueden tardar unos minutos en llegar', 'cyan');
    
  } catch (error) {
    log(`\n❌ Error general en el proceso: ${error.message}`, 'red');
    console.error(error);
  }
}

// Ejecutar el envío de emails
enviarEmailsPrueba().catch(console.error);