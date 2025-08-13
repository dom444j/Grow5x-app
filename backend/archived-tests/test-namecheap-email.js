#!/usr/bin/env node

/**
 * Script para probar la configuración de Namecheap Private Email
 * Verifica que todos los correos corporativos funcionen correctamente
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Configuraciones de email a probar
const emailConfigs = [
  {
    name: 'SMTP Principal (noreply)',
    config: {
      host: process.env.SMTP_HOST || 'smtp.privateemail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'noreply@grow5x.app',
        pass: process.env.SMTP_PASS || '300400Jd14'
      }
    },
    from: process.env.SMTP_FROM || 'noreply@grow5x.app'
  },
  {
    name: 'Email de Bienvenida (welcome)',
    config: {
      host: process.env.WELCOME_EMAIL_HOST || 'smtp.privateemail.com',
      port: process.env.WELCOME_EMAIL_PORT || 587,
      secure: process.env.WELCOME_EMAIL_SECURE === 'true',
      auth: {
        user: process.env.WELCOME_EMAIL_USER || 'welcome@grow5x.app',
        pass: process.env.WELCOME_EMAIL_PASS || '300400Jd14'
      }
    },
    from: process.env.WELCOME_EMAIL_FROM || 'welcome@grow5x.app'
  },
  {
    name: 'Email de Recuperación (recovery)',
    config: {
      host: process.env.RECOVERY_EMAIL_HOST || 'smtp.privateemail.com',
      port: process.env.RECOVERY_EMAIL_PORT || 587,
      secure: process.env.RECOVERY_EMAIL_SECURE === 'true',
      auth: {
        user: process.env.RECOVERY_EMAIL_USER || 'recovery@grow5x.app',
        pass: process.env.RECOVERY_EMAIL_PASS || '300400Jd14'
      }
    },
    from: process.env.RECOVERY_EMAIL_FROM || 'recovery@grow5x.app'
  },
  {
    name: 'Email de Soporte (support)',
    config: {
      host: process.env.BACKUP_EMAIL_HOST || 'smtp.privateemail.com',
      port: process.env.BACKUP_EMAIL_PORT || 587,
      secure: process.env.BACKUP_EMAIL_SECURE === 'true',
      auth: {
        user: process.env.BACKUP_EMAIL_USER || 'support@grow5x.app',
        pass: process.env.BACKUP_EMAIL_PASS || '300400Jd14'
      }
    },
    from: process.env.BACKUP_EMAIL_FROM || 'support@grow5x.app'
  }
];

// Función para probar una configuración de email
async function testEmailConfig(emailConfig, testEmail) {
  try {
    console.log(`\n${colors.blue}🧪 Probando: ${emailConfig.name}${colors.reset}`);
    console.log(`   Host: ${emailConfig.config.host}:${emailConfig.config.port}`);
    console.log(`   Usuario: ${emailConfig.config.auth.user}`);
    console.log(`   Desde: ${emailConfig.from}`);
    
    // Crear transporter
    const transporter = nodemailer.createTransport(emailConfig.config);
    
    // Verificar conexión
    console.log(`   ${colors.yellow}⏳ Verificando conexión SMTP...${colors.reset}`);
    await transporter.verify();
    console.log(`   ${colors.green}✅ Conexión SMTP exitosa${colors.reset}`);
    
    // Enviar email de prueba
    if (testEmail) {
      console.log(`   ${colors.yellow}⏳ Enviando email de prueba a ${testEmail}...${colors.reset}`);
      
      const mailOptions = {
        from: `"Grow5X Test" <${emailConfig.from}>`,
        to: testEmail,
        subject: `Prueba de ${emailConfig.name} - ${new Date().toLocaleString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">🧪 Prueba de Configuración de Email</h2>
            <p><strong>Configuración:</strong> ${emailConfig.name}</p>
            <p><strong>Servidor SMTP:</strong> ${emailConfig.config.host}:${emailConfig.config.port}</p>
            <p><strong>Usuario:</strong> ${emailConfig.config.auth.user}</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
            <hr>
            <p style="color: #16a34a;">✅ Si recibes este email, la configuración está funcionando correctamente.</p>
            <p style="font-size: 12px; color: #6b7280;">Este es un email de prueba del sistema Grow5X.</p>
          </div>
        `
      };
      
      const result = await transporter.sendMail(mailOptions);
      console.log(`   ${colors.green}✅ Email enviado exitosamente${colors.reset}`);
      console.log(`   📧 Message ID: ${result.messageId}`);
    }
    
    return { success: true, config: emailConfig.name };
    
  } catch (error) {
    console.log(`   ${colors.red}❌ Error: ${error.message}${colors.reset}`);
    return { success: false, config: emailConfig.name, error: error.message };
  }
}

// Función principal
async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('='.repeat(60));
  console.log('🧪 PRUEBA DE CONFIGURACIÓN NAMECHEAP PRIVATE EMAIL');
  console.log('='.repeat(60));
  console.log(`${colors.reset}`);
  
  // Obtener email de prueba desde argumentos o usar uno por defecto
  const testEmail = process.argv[2] || 'test@example.com';
  
  if (testEmail === 'test@example.com') {
    console.log(`${colors.yellow}⚠️  No se proporcionó email de prueba. Uso: node test-namecheap-email.js tu@email.com${colors.reset}`);
    console.log(`${colors.yellow}   Solo se verificarán las conexiones SMTP, no se enviarán emails.${colors.reset}`);
  } else {
    console.log(`📧 Email de prueba: ${testEmail}`);
  }
  
  const results = [];
  
  // Probar cada configuración
  for (const emailConfig of emailConfigs) {
    const result = await testEmailConfig(emailConfig, testEmail !== 'test@example.com' ? testEmail : null);
    results.push(result);
  }
  
  // Mostrar resumen
  console.log(`\n${colors.bold}${colors.blue}`);
  console.log('='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));
  console.log(`${colors.reset}`);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`${colors.green}✅ Configuraciones exitosas: ${successful.length}/${results.length}${colors.reset}`);
  successful.forEach(r => {
    console.log(`   • ${r.config}`);
  });
  
  if (failed.length > 0) {
    console.log(`\n${colors.red}❌ Configuraciones fallidas: ${failed.length}/${results.length}${colors.reset}`);
    failed.forEach(r => {
      console.log(`   • ${r.config}: ${r.error}`);
    });
  }
  
  console.log(`\n${colors.bold}📋 INFORMACIÓN DE CONFIGURACIÓN:${colors.reset}`);
  console.log(`• Proveedor: Namecheap Private Email`);
  console.log(`• Servidor SMTP: smtp.privateemail.com:587`);
  console.log(`• Seguridad: STARTTLS`);
  console.log(`• Cuentas configuradas: 4 (noreply, welcome, recovery, support)`);
  console.log(`• Contraseña: 300400Jd14 (para todas las cuentas)`);
  
  if (successful.length === results.length) {
    console.log(`\n${colors.green}${colors.bold}🎉 ¡Todas las configuraciones están funcionando correctamente!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bold}⚠️  Algunas configuraciones tienen problemas. Revisa los errores arriba.${colors.reset}`);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}❌ Error fatal:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { testEmailConfig, emailConfigs };