const fs = require('fs');
const path = require('path');

// Importar las plantillas directamente del archivo
const emailPath = path.join(__dirname, 'backend', 'src', 'utils', 'email.js');

if (!fs.existsSync(emailPath)) {
  console.log('❌ Archivo email.js no encontrado');
  process.exit(1);
}

// Leer y evaluar las plantillas
const emailContent = fs.readFileSync(emailPath, 'utf8');

// Extraer las plantillas usando regex
const templateMatch = emailContent.match(/const emailTemplates = ({[\s\S]*?});/);
if (!templateMatch) {
  console.log('❌ No se pudieron extraer las plantillas');
  process.exit(1);
}

// Evaluar las plantillas de forma segura
let emailTemplates;
try {
  // Crear un contexto seguro para evaluar las plantillas
  const templateCode = templateMatch[1];
  emailTemplates = eval(`(${templateCode})`);
} catch (error) {
  console.log('❌ Error al evaluar las plantillas:', error.message);
  process.exit(1);
}

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

function generarHTMLCompleto(titulo, contenido, asunto) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titulo}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            background: #007bff;
            color: white;
            padding: 15px;
            text-align: center;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .email-content {
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 5px;
            background: #fafafa;
        }
        .info {
            background: #e7f3ff;
            padding: 10px;
            border-left: 4px solid #007bff;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 ${titulo}</h1>
        </div>
        
        <div class="info">
            <strong>📬 Destinatario:</strong> clubnetwin@hotmail.com<br>
            <strong>📝 Asunto:</strong> ${asunto}
        </div>
        
        <div class="email-content">
            ${contenido}
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666;">
            <small>&copy; 2025 Grow5X. Todos los derechos reservados.</small>
        </div>
    </div>
</body>
</html>`;
}

async function generarPreviewsEmails() {
  log('\n🎨 GENERANDO PREVIEWS DE EMAILS PARA CLUBNETWIN@HOTMAIL.COM', 'bold');
  log('=' .repeat(70), 'cyan');
  
  const outputDir = path.join(__dirname, 'email-previews');
  
  // Crear directorio si no existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
    log('📁 Directorio email-previews creado', 'green');
  }
  
  const nombreUsuario = 'Usuario de Prueba';
  const emailDestino = 'clubnetwin@hotmail.com';
  
  try {
    // 1. Email de Verificación
    log('\n📧 1. Generando preview de verificación...', 'yellow');
    const verificationTemplate = emailTemplates.verification.es;
    const verificationHTML = verificationTemplate.html(nombreUsuario, 'ABC123TOKEN456');
    const verificationPreview = generarHTMLCompleto(
      'Email de Verificación',
      verificationHTML,
      verificationTemplate.subject
    );
    fs.writeFileSync(path.join(outputDir, '1-verificacion.html'), verificationPreview);
    log('✅ Preview de verificación generado', 'green');
    
    // 2. Email de Bienvenida
    log('\n📧 2. Generando preview de bienvenida...', 'yellow');
    const welcomeTemplate = emailTemplates.welcome.es;
    const welcomeHTML = welcomeTemplate.html(nombreUsuario);
    const welcomePreview = generarHTMLCompleto(
      'Email de Bienvenida',
      welcomeHTML,
      welcomeTemplate.subject
    );
    fs.writeFileSync(path.join(outputDir, '2-bienvenida.html'), welcomePreview);
    log('✅ Preview de bienvenida generado', 'green');
    
    // 3. Email de Recuperación de Contraseña
    log('\n📧 3. Generando preview de recuperación...', 'yellow');
    const passwordResetTemplate = emailTemplates.passwordReset.es;
    const passwordResetHTML = passwordResetTemplate.html(nombreUsuario, 'RESET789TOKEN123');
    const passwordResetPreview = generarHTMLCompleto(
      'Email de Recuperación de Contraseña',
      passwordResetHTML,
      passwordResetTemplate.subject
    );
    fs.writeFileSync(path.join(outputDir, '3-recuperacion-password.html'), passwordResetPreview);
    log('✅ Preview de recuperación generado', 'green');
    
    // 4. Email de Confirmación de Pago
    log('\n📧 4. Generando preview de confirmación de pago...', 'yellow');
    const paymentTemplate = emailTemplates.paymentConfirmation.es;
    const transaccionEjemplo = {
      id: 'TXN_123456789',
      amount: 99.99,
      currency: 'USD',
      externalReference: 'REF_987654321',
      processedAt: new Date(),
      pioneerPlan: {
        name: 'Plan Pionero Premium',
        benefits: {
          discountRate: 0.15,
          personalManager: true
        }
      }
    };
    const paymentHTML = paymentTemplate.html(nombreUsuario, transaccionEjemplo);
    const paymentPreview = generarHTMLCompleto(
      'Email de Confirmación de Pago',
      paymentHTML,
      paymentTemplate.subject
    );
    fs.writeFileSync(path.join(outputDir, '4-confirmacion-pago.html'), paymentPreview);
    log('✅ Preview de confirmación de pago generado', 'green');
    
    // 5. Email de Verificación de Retiro
    log('\n📧 5. Generando preview de verificación de retiro...', 'yellow');
    const withdrawalTemplate = emailTemplates.withdrawalVerification.es;
    const withdrawalHTML = withdrawalTemplate.html(nombreUsuario, 'WITHDRAW456789');
    const withdrawalPreview = generarHTMLCompleto(
      'Email de Verificación de Retiro',
      withdrawalHTML,
      withdrawalTemplate.subject
    );
    fs.writeFileSync(path.join(outputDir, '5-verificacion-retiro.html'), withdrawalPreview);
    log('✅ Preview de verificación de retiro generado', 'green');
    
    // 6. Email de Ticket Creado
    log('\n📧 6. Generando preview de ticket creado...', 'yellow');
    const ticketTemplate = emailTemplates.ticketCreated.es;
    const ticketEjemplo = {
      _id: 'TICKET_123456',
      subject: 'Consulta sobre mi cuenta',
      category: 'Soporte Técnico',
      priority: 'Media',
      description: 'Tengo una consulta sobre el funcionamiento de mi cuenta y los retiros.',
      createdAt: new Date()
    };
    const ticketHTML = ticketTemplate.html(nombreUsuario, ticketEjemplo);
    const ticketPreview = generarHTMLCompleto(
      'Email de Ticket Creado',
      ticketHTML,
      ticketTemplate.subject
    );
    fs.writeFileSync(path.join(outputDir, '6-ticket-creado.html'), ticketPreview);
    log('✅ Preview de ticket creado generado', 'green');
    
    // 7. Email de Bienvenida con Código Especial
    log('\n📧 7. Generando preview de bienvenida con código especial...', 'yellow');
    const specialCodeTemplate = emailTemplates.specialCodeWelcome.es;
    const specialCodeHTML = specialCodeTemplate.html(nombreUsuario, 'Código de Referido VIP', 'GROW5X_VIP_2025');
    const specialCodePreview = generarHTMLCompleto(
      'Email de Bienvenida con Código Especial',
      specialCodeHTML,
      specialCodeTemplate.subject
    );
    fs.writeFileSync(path.join(outputDir, '7-bienvenida-codigo-especial.html'), specialCodePreview);
    log('✅ Preview de bienvenida con código especial generado', 'green');
    
    // Generar índice
    log('\n📋 Generando índice de previews...', 'yellow');
    const indexHTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📧 Previews de Emails - Grow5X</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .email-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .email-card {
            background: rgba(255,255,255,0.2);
            padding: 20px;
            border-radius: 10px;
            text-decoration: none;
            color: white;
            transition: transform 0.3s ease;
        }
        .email-card:hover {
            transform: translateY(-5px);
            background: rgba(255,255,255,0.3);
        }
        .email-title {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .email-desc {
            opacity: 0.9;
            font-size: 0.9em;
        }
        .info-box {
            background: rgba(255,255,255,0.2);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 Previews de Emails - Grow5X</h1>
            <p>Plantillas de email generadas para clubnetwin@hotmail.com</p>
        </div>
        
        <div class="info-box">
            <strong>📬 Destinatario:</strong> clubnetwin@hotmail.com<br>
            <strong>🎨 Total de plantillas:</strong> 7 emails<br>
            <strong>🌐 Idioma:</strong> Español
        </div>
        
        <div class="email-list">
            <a href="1-verificacion.html" class="email-card">
                <div class="email-title">🔐 Verificación de Email</div>
                <div class="email-desc">Email para verificar la cuenta del usuario con token de activación</div>
            </a>
            
            <a href="2-bienvenida.html" class="email-card">
                <div class="email-title">👋 Bienvenida</div>
                <div class="email-desc">Email de bienvenida estándar para nuevos usuarios</div>
            </a>
            
            <a href="3-recuperacion-password.html" class="email-card">
                <div class="email-title">🔑 Recuperación de Contraseña</div>
                <div class="email-desc">Email para restablecer la contraseña con token de recuperación</div>
            </a>
            
            <a href="4-confirmacion-pago.html" class="email-card">
                <div class="email-title">💳 Confirmación de Pago</div>
                <div class="email-desc">Email de confirmación para pagos exitosos del Plan Pionero</div>
            </a>
            
            <a href="5-verificacion-retiro.html" class="email-card">
                <div class="email-title">💰 Verificación de Retiro</div>
                <div class="email-desc">Email para verificar solicitudes de retiro con código de seguridad</div>
            </a>
            
            <a href="6-ticket-creado.html" class="email-card">
                <div class="email-title">🎫 Ticket de Soporte</div>
                <div class="email-desc">Email de confirmación para tickets de soporte creados</div>
            </a>
            
            <a href="7-bienvenida-codigo-especial.html" class="email-card">
                <div class="email-title">🌟 Bienvenida VIP</div>
                <div class="email-desc">Email de bienvenida especial con código de referido VIP</div>
            </a>
        </div>
        
        <div style="text-align: center; margin-top: 30px; opacity: 0.8;">
            <small>&copy; 2025 Grow5X. Todos los derechos reservados.</small>
        </div>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHTML);
    log('✅ Índice generado', 'green');
    
    log('\n' + '=' .repeat(70), 'cyan');
    log('🎉 PREVIEWS GENERADOS EXITOSAMENTE', 'bold');
    log('\n📁 Ubicación: ' + outputDir, 'blue');
    log('🌐 Abre index.html para ver todos los previews', 'yellow');
    log('\n💡 Estos son los emails que se enviarían a clubnetwin@hotmail.com', 'cyan');
    
  } catch (error) {
    log(`\n❌ Error generando previews: ${error.message}`, 'red');
    console.error(error);
  }
}

// Ejecutar la generación de previews
generarPreviewsEmails().catch(console.error);