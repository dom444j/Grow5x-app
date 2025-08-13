const nodemailer = require('nodemailer');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

// Configuración de las cuentas de email reales de Namecheap Private Email
const emailAccounts = {
  noreply: {
    name: 'noreply@grow5x.app',
    user: process.env.SMTP_USER || 'noreply@grow5x.app',
    pass: process.env.SMTP_PASS || '300400Jd14',
    description: 'Notificaciones automáticas del sistema'
  },
  welcome: {
    name: 'welcome@grow5x.app',
    user: process.env.WELCOME_EMAIL_USER || 'welcome@grow5x.app',
    pass: process.env.WELCOME_EMAIL_PASS || '300400Jd14',
    description: 'Emails de bienvenida a nuevos usuarios'
  },
  recovery: {
    name: 'recovery@grow5x.app',
    user: process.env.RECOVERY_EMAIL_USER || 'recovery@grow5x.app',
    pass: process.env.RECOVERY_EMAIL_PASS || '300400Jd14',
    description: 'Recuperación de contraseñas'
  },
  support: {
    name: 'support@grow5x.app',
    user: 'support@grow5x.app',
    pass: '300400Jd14',
    description: 'Soporte técnico y atención al cliente'
  }
};

// Configuración SMTP para Namecheap Private Email
const smtpConfig = {
  host: 'smtp.privateemail.com',
  port: 587,
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: '', // Se configurará dinámicamente
    pass: '' // Se configurará dinámicamente
  },
  tls: {
    rejectUnauthorized: false
  }
};

// Función para crear transporter con cuenta específica
function createTransporter(accountKey) {
  const account = emailAccounts[accountKey];
  if (!account) {
    throw new Error(`Cuenta de email '${accountKey}' no encontrada`);
  }

  const config = {
    ...smtpConfig,
    auth: {
      user: account.user,
      pass: account.pass
    }
  };

  return nodemailer.createTransport(config);
}

// Función para enviar email de prueba
async function sendTestEmail(accountKey, recipientEmail) {
  try {
    const account = emailAccounts[accountKey];
    const transporter = createTransporter(accountKey);

    const mailOptions = {
      from: `"Grow5X ${account.description}" <${account.user}>`,
      to: recipientEmail,
      subject: `✅ Prueba de Email desde ${account.name} - © 2025 Grow5X`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Prueba de Email - Grow5X</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }
            .success { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .email-details { background: #fff; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Prueba de Email Exitosa</h1>
              <p>Sistema de Email Grow5X - Namecheap Private Email</p>
            </div>
            <div class="content">
              <div class="success">
                <h3>✅ Email enviado correctamente</h3>
                <p>Este email de prueba confirma que la configuración SMTP está funcionando perfectamente.</p>
              </div>
              
              <div class="email-details">
                <h3>📧 Detalles de la Cuenta</h3>
                <ul>
                  <li><strong>Cuenta:</strong> ${account.name}</li>
                  <li><strong>Descripción:</strong> ${account.description}</li>
                  <li><strong>Servidor SMTP:</strong> smtp.privateemail.com</li>
                  <li><strong>Puerto:</strong> 587 (STARTTLS)</li>
                  <li><strong>Fecha de envío:</strong> ${new Date().toLocaleString('es-ES')}</li>
                </ul>
              </div>

              <div class="info-box">
                <h3>🏢 Cuentas de Email Configuradas</h3>
                <ul>
                  <li><strong>noreply@grow5x.app</strong> - Notificaciones automáticas</li>
                  <li><strong>welcome@grow5x.app</strong> - Emails de bienvenida</li>
                  <li><strong>recovery@grow5x.app</strong> - Recuperación de contraseñas</li>
                  <li><strong>support@grow5x.app</strong> - Soporte técnico</li>
                </ul>
              </div>

              <p>Este email fue enviado como parte de las pruebas del sistema de notificaciones de Grow5X.</p>
              <p>Si recibes este mensaje, significa que la configuración de email está funcionando correctamente.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Grow5X. Todos los derechos reservados.</p>
              <p>Plataforma tecnológica para gestión automatizada de inversiones.</p>
              <p style="margin-top: 10px; font-size: 12px;">Para soporte: <a href="mailto:support@grow5x.app" style="color: #667eea;">support@grow5x.app</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log(`\n📧 Enviando email desde ${account.name}...`);
    console.log(`   📍 Destinatario: ${recipientEmail}`);
    console.log(`   📝 Descripción: ${account.description}`);
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`   ✅ Email enviado exitosamente`);
    console.log(`   🆔 Message ID: ${result.messageId}`);
    
    return { success: true, messageId: result.messageId, account: account.name };
    
  } catch (error) {
    console.log(`   ❌ Error al enviar email desde ${emailAccounts[accountKey]?.name || accountKey}:`);
    console.log(`   🔍 Error: ${error.message}`);
    
    return { success: false, error: error.message, account: emailAccounts[accountKey]?.name || accountKey };
  }
}

// Función principal para probar todas las cuentas
async function testAllEmailAccounts() {
  const recipientEmail = 'clubnetwin@hotmail.com';
  
  console.log('🎯 PRUEBA DE CUENTAS DE EMAIL NAMECHEAP PRIVATE EMAIL');
  console.log('='.repeat(60));
  console.log(`📬 Destinatario: ${recipientEmail}`);
  console.log(`🏢 Proveedor: Namecheap Private Email`);
  console.log(`🌐 Servidor SMTP: smtp.privateemail.com`);
  console.log('='.repeat(60));

  const results = [];
  const accountKeys = Object.keys(emailAccounts);

  for (const accountKey of accountKeys) {
    const result = await sendTestEmail(accountKey, recipientEmail);
    results.push(result);
    
    // Pausa entre envíos para evitar límites de rate
    if (accountKey !== accountKeys[accountKeys.length - 1]) {
      console.log('   ⏳ Esperando 2 segundos antes del siguiente envío...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Resumen de resultados
  console.log('\n📊 RESUMEN DE RESULTADOS');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Emails enviados exitosamente: ${successful.length}/${results.length}`);
  console.log(`❌ Emails fallidos: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎉 Cuentas funcionando correctamente:');
    successful.forEach(result => {
      console.log(`   ✅ ${result.account}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n⚠️ Cuentas con problemas:');
    failed.forEach(result => {
      console.log(`   ❌ ${result.account}: ${result.error}`);
    });
  }
  
  console.log('\n='.repeat(60));
  
  if (successful.length === results.length) {
    console.log('🎊 ¡TODAS LAS CUENTAS DE EMAIL ESTÁN FUNCIONANDO PERFECTAMENTE!');
    console.log('📧 Revisa tu bandeja de entrada en clubnetwin@hotmail.com');
  } else {
    console.log('⚠️ Algunas cuentas necesitan revisión. Verifica la configuración DNS.');
  }
  
  console.log('\n💡 Nota: Si los emails no llegan, verifica:');
  console.log('   1. Configuración de registros MX en deSEC');
  console.log('   2. Registro SPF configurado');
  console.log('   3. Registro DKIM desde Namecheap');
  console.log('   4. Carpeta de spam/correo no deseado');
}

// Ejecutar las pruebas
if (require.main === module) {
  testAllEmailAccounts().catch(console.error);
}

module.exports = {
  testAllEmailAccounts,
  sendTestEmail,
  emailAccounts
};