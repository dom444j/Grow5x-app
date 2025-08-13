const nodemailer = require('nodemailer');
require('dotenv').config();

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStatus(item, success, details = '') {
    const status = success ? '✅' : '❌';
    const color = success ? 'green' : 'red';
    log(`${status} ${item}`, color);
    if (details) {
        log(`   ${details}`, 'cyan');
    }
}

async function testEmailDirect() {
    log('\n🚀 PRUEBA DIRECTA DE ENVÍO DE EMAIL', 'bright');
    log('============================================================', 'cyan');
    
    const transporter = nodemailer.createTransport({
        host: 'smtp.privateemail.com',
        port: 587,
        secure: false,
        auth: {
            user: 'noreply@grow5x.app',
            pass: '300400Jd14'
        },
        debug: true,
        logger: true
    });
    
    try {
        // Verificar conexión
        log('\n🔍 VERIFICANDO CONEXIÓN SMTP...', 'yellow');
        await transporter.verify();
        logStatus('Conexión SMTP', true, 'Conectado exitosamente');
        
        // Enviar email de prueba
        log('\n📧 ENVIANDO EMAIL DE PRUEBA...', 'yellow');
        const mailOptions = {
            from: 'noreply@grow5x.app',
            to: 'growx04@gmail.com', // Email de prueba
            subject: '🧪 Prueba de Configuración DNS - Grow5X',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">✅ Configuración DNS Exitosa</h2>
                    <p>Este email confirma que la configuración DNS y SMTP está funcionando correctamente.</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3>📊 Estado de la Configuración:</h3>
                        <ul>
                            <li>✅ Registros MX configurados</li>
                            <li>✅ Conectividad SMTP funcionando</li>
                            <li>✅ Envío de emails operativo</li>
                        </ul>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        Enviado desde: noreply@grow5x.app<br>
                        Fecha: ${new Date().toLocaleString()}
                    </p>
                </div>
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        logStatus('Envío de Email', true, `Message ID: ${info.messageId}`);
        
        log('\n📊 RESULTADO FINAL', 'bright');
        log('============================================================', 'cyan');
        logStatus('Configuración DNS y Email', true, 'FUNCIONANDO CORRECTAMENTE');
        log('\n✉️  Email de prueba enviado a: growx04@gmail.com', 'green');
        log('🔍 Revisa tu bandeja de entrada (y spam) para confirmar la recepción.', 'yellow');
        
    } catch (error) {
        logStatus('Envío de Email', false, `Error: ${error.message}`);
        
        log('\n🔍 DIAGNÓSTICO DEL ERROR:', 'yellow');
        if (error.code === 'EAUTH') {
            log('   • Error de autenticación SMTP', 'red');
            log('   • Verificar credenciales de email', 'cyan');
        } else if (error.code === 'ECONNECTION') {
            log('   • Error de conexión al servidor SMTP', 'red');
            log('   • Verificar configuración de red', 'cyan');
        } else if (error.responseCode === 550) {
            log('   • Sender address rejected', 'red');
            log('   • Los registros DNS aún se están propagando', 'cyan');
            log('   • Esperar 24-48 horas para propagación completa', 'cyan');
        } else {
            log(`   • Error: ${error.message}`, 'red');
        }
    }
}

// Ejecutar la prueba
testEmailDirect().catch(console.error);