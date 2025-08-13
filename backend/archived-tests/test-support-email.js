#!/usr/bin/env node

/**
 * Script para probar específicamente la cuenta support@grow5x.app
 * que debería estar configurada en Namecheap Private Email
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

async function testSupportEmail() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('='.repeat(60));
  console.log('🧪 PRUEBA DE CUENTA SUPPORT@GROW5X.APP');
  console.log('='.repeat(60));
  console.log(`${colors.reset}`);
  
  // Configuración específica para support@grow5x.app
  const config = {
    host: 'smtp.privateemail.com',
    port: 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: 'support@grow5x.app',
      pass: '300400Jd14'
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  
  console.log(`📧 Configuración:`);
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   Usuario: ${config.auth.user}`);
  console.log(`   Contraseña: ${config.auth.pass}`);
  console.log(`   Seguro: ${config.secure}`);
  
  try {
    // Crear transporter
    console.log(`\n${colors.yellow}⏳ Creando transporter...${colors.reset}`);
    const transporter = nodemailer.createTransport(config);
    
    // Verificar conexión
    console.log(`${colors.yellow}⏳ Verificando conexión SMTP...${colors.reset}`);
    await transporter.verify();
    console.log(`${colors.green}✅ Conexión SMTP exitosa${colors.reset}`);
    
    // Obtener email de destino
    const testEmail = process.argv[2] || 'juanortegaempresarial@hotmail.com';
    console.log(`\n${colors.yellow}⏳ Enviando email de prueba a ${testEmail}...${colors.reset}`);
    
    const mailOptions = {
      from: '"Grow5X Support" <support@grow5x.app>',
      to: testEmail,
      subject: `Prueba de Email Support - ${new Date().toLocaleString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">🚀 Grow5X</h1>
            <p style="color: #6b7280; margin: 5px 0;">Plataforma de Inversión</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">✅ Prueba de Email Exitosa</h2>
            <p>Este email confirma que la configuración de <strong>support@grow5x.app</strong> está funcionando correctamente.</p>
          </div>
          
          <div style="background: #fff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
            <h3 style="color: #374151; margin-top: 0;">📋 Detalles de la Prueba</h3>
            <ul style="color: #6b7280; line-height: 1.6;">
              <li><strong>Cuenta:</strong> support@grow5x.app</li>
              <li><strong>Servidor:</strong> smtp.privateemail.com:587</li>
              <li><strong>Proveedor:</strong> Namecheap Private Email</li>
              <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Tipo:</strong> Email de Soporte/Respaldo</li>
            </ul>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
              Este es un email de prueba del sistema Grow5X.<br>
              Si recibes este mensaje, la configuración de correos está funcionando correctamente.
            </p>
          </div>
        </div>
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`${colors.green}✅ Email enviado exitosamente${colors.reset}`);
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📬 Destinatario: ${testEmail}`);
    console.log(`📝 Asunto: ${mailOptions.subject}`);
    
    console.log(`\n${colors.green}${colors.bold}🎉 ¡La cuenta support@grow5x.app está funcionando correctamente!${colors.reset}`);
    console.log(`${colors.blue}💡 Puedes usar esta cuenta como respaldo para el sistema de emails.${colors.reset}`);
    
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    
    if (error.code === 'EAUTH') {
      console.log(`\n${colors.yellow}💡 Posibles soluciones:${colors.reset}`);
      console.log(`   • Verificar que la cuenta support@grow5x.app esté creada en Namecheap`);
      console.log(`   • Verificar que la contraseña sea correcta: 300400Jd14`);
      console.log(`   • Verificar que la cuenta esté habilitada para SMTP`);
    } else if (error.code === 'ECONNECTION') {
      console.log(`\n${colors.yellow}💡 Posibles soluciones:${colors.reset}`);
      console.log(`   • Verificar conexión a internet`);
      console.log(`   • Verificar que el servidor smtp.privateemail.com esté disponible`);
      console.log(`   • Verificar configuración de firewall`);
    }
    
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testSupportEmail().catch(error => {
    console.error(`${colors.red}❌ Error fatal:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { testSupportEmail };