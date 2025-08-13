#!/usr/bin/env node

/**
 * Prueba Simple de Envío de Emails
 * Verifica si los emails se pueden enviar correctamente después de la configuración DNS
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuraciones de email
const emailConfigs = [
    {
        name: 'NoReply',
        host: 'smtp.privateemail.com',
        port: 587,
        secure: false,
        user: 'noreply@grow5x.app',
        pass: '300400Jd14',
        from: 'noreply@grow5x.app'
    },
    {
        name: 'Welcome',
        host: 'smtp.privateemail.com',
        port: 587,
        secure: false,
        user: 'welcome@grow5x.app',
        pass: '300400Jd14',
        from: 'welcome@grow5x.app'
    },
    {
        name: 'Recovery',
        host: 'smtp.privateemail.com',
        port: 587,
        secure: false,
        user: 'recovery@grow5x.app',
        pass: '300400Jd14',
        from: 'recovery@grow5x.app'
    },
    {
        name: 'Support',
        host: 'smtp.privateemail.com',
        port: 587,
        secure: false,
        user: 'support@grow5x.app',
        pass: '300400Jd14',
        from: 'support@grow5x.app'
    }
];

// Email de destino para pruebas
const testEmail = 'test@example.com'; // Cambiar por un email real para pruebas

async function testEmailSending() {
    console.log('🚀 PRUEBA SIMPLE DE ENVÍO DE EMAILS');
    console.log('=====================================\n');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const config of emailConfigs) {
        console.log(`📧 Probando envío desde: ${config.name} (${config.from})`);
        
        try {
            // Crear transporter
            const transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.secure,
                auth: {
                    user: config.user,
                    pass: config.pass
                },
                tls: {
                    rejectUnauthorized: false
                }
            });
            
            // Verificar conexión
            await transporter.verify();
            console.log('   ✅ Conexión SMTP verificada');
            
            // Enviar email de prueba
            const mailOptions = {
                from: config.from,
                to: testEmail,
                subject: `Prueba de ${config.name} - ${new Date().toISOString()}`,
                text: `Este es un email de prueba enviado desde ${config.from} para verificar la configuración DNS.\n\nFecha: ${new Date().toLocaleString()}\n\nSi recibes este email, la configuración está funcionando correctamente.`,
                html: `
                    <h2>✅ Prueba de Email Exitosa</h2>
                    <p>Este es un email de prueba enviado desde <strong>${config.from}</strong></p>
                    <p>📅 <strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
                    <p>🎯 <strong>Propósito:</strong> Verificar configuración DNS</p>
                    <hr>
                    <p><em>Si recibes este email, la configuración está funcionando correctamente.</em></p>
                `
            };
            
            const info = await transporter.sendMail(mailOptions);
            console.log(`   ✅ Email enviado exitosamente`);
            console.log(`   📨 Message ID: ${info.messageId}`);
            successCount++;
            
        } catch (error) {
            console.log(`   ❌ Error al enviar email:`);
            console.log(`   📝 ${error.message}`);
            failCount++;
        }
        
        console.log('');
    }
    
    // Resumen final
    console.log('=====================================');
    console.log('📊 RESUMEN DE RESULTADOS');
    console.log('=====================================');
    console.log(`✅ Emails enviados exitosamente: ${successCount}/${emailConfigs.length}`);
    console.log(`❌ Emails fallidos: ${failCount}/${emailConfigs.length}`);
    console.log(`📈 Tasa de éxito: ${((successCount / emailConfigs.length) * 100).toFixed(1)}%`);
    
    if (successCount === emailConfigs.length) {
        console.log('\n🎉 ¡CONFIGURACIÓN COMPLETA!');
        console.log('✅ Todos los emails se enviaron correctamente');
        console.log('✅ La configuración DNS está funcionando');
        console.log('✅ El sistema de emails está listo para producción');
    } else if (successCount > 0) {
        console.log('\n⚠️  CONFIGURACIÓN PARCIAL');
        console.log('✅ Algunos emails funcionan');
        console.log('❌ Revisar configuración de las cuentas fallidas');
    } else {
        console.log('\n❌ CONFIGURACIÓN FALLIDA');
        console.log('❌ Ningún email se pudo enviar');
        console.log('🔧 Revisar configuración DNS y credenciales');
    }
    
    console.log('\n📚 Para más información:');
    console.log('   • Verificar DNS: node backend/verify-dns-setup.js');
    console.log('   • Diagnóstico: node backend/diagnose-email-config.js');
}

// Ejecutar si se llama directamente
if (require.main === module) {
    testEmailSending().catch(console.error);
}

module.exports = { testEmailSending };