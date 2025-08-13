const nodemailer = require('nodemailer');
const logger = require('./logger');
const EmailLog = require('../models/EmailLog.model');

// Email templates
const emailTemplates = {
  passwordReset: {
    en: {
      subject: 'Reset Your Password - Grow5X',
      html: (name, token) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>We received a request to reset your password for your Grow5X account. To reset your password, please click the button below:</p>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/reset-password/${token}" class="button">Reset Password</a>
              </div>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
                ${process.env.FRONTEND_URL}/reset-password/${token}
              </p>
              <div class="warning">
                <p><strong>Important:</strong> This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, please ignore this email or contact our support team if you have concerns.</p>
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2025 Grow5X. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    es: {
      subject: 'Restablece tu Contraseña - Grow5X',
      html: (name, token) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Restablecimiento de Contraseña</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Solicitud de Restablecimiento de Contraseña</h1>
            </div>
            <div class="content">
              <h2>¡Hola ${name}!</h2>
              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Grow5X. Para restablecer tu contraseña, por favor haz clic en el botón de abajo:</p>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/reset-password/${token}" class="button">Restablecer Contraseña</a>
              </div>
              <p>Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:</p>
              <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
                ${process.env.FRONTEND_URL}/reset-password/${token}
              </p>
              <div class="warning">
                <p><strong>Importante:</strong> Este enlace expirará en 1 hora.</p>
                <p>Si no solicitaste un restablecimiento de contraseña, por favor ignora este correo o contacta a nuestro equipo de soporte si tienes alguna inquietud.</p>
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2025 Grow5X. Todos los derechos reservados.</p>
              <p>Este es un mensaje automatizado, por favor no respondas.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  },
  verification: {
    en: {
      subject: 'Verify Your Email - Grow5X',
      html: (name, token) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Grow5X!</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Thank you for registering with Grow5X. To complete your registration, please verify your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/verify-email/${token}" class="button">Verify Email Address</a>
              </div>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
                ${process.env.FRONTEND_URL}/verify-email/${token}
              </p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with Grow5X, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Grow5X. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    es: {
      subject: 'Verifica tu Email - Grow5X',
      html: (name, token) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verificación de Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Bienvenido a Grow5X!</h1>
            </div>
            <div class="content">
              <h2>¡Hola ${name}!</h2>
              <p>Gracias por registrarte en Grow5X. Para completar tu registro, por favor verifica tu dirección de email haciendo clic en el botón de abajo:</p>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/verify-email/${token}" class="button">Verificar Dirección de Email</a>
              </div>
              <p>Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:</p>
              <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
                ${process.env.FRONTEND_URL}/verify-email/${token}
              </p>
              <p><strong>Este enlace expirará en 24 horas.</strong></p>
              <p>Si no creaste una cuenta en Grow5X, por favor ignora este email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Grow5X. Todos los derechos reservados.</p>
              <p>Este es un mensaje automatizado, por favor no respondas.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  },
  ticketCreated: {
    en: {
      subject: 'Support Ticket Created - Grow5X',
      html: (name, ticket) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Support Ticket Created</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .ticket-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Support Ticket Created</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Your support ticket has been created successfully. Our team will review it and respond as soon as possible.</p>
              <div class="ticket-info">
                <h3>Ticket Details:</h3>
                <p><strong>Ticket ID:</strong> ${ticket._id}</p>
                <p><strong>Subject:</strong> ${ticket.subject}</p>
                <p><strong>Category:</strong> ${ticket.category}</p>
                <p><strong>Priority:</strong> ${ticket.priority}</p>
                <p><strong>Status:</strong> ${ticket.status}</p>
              </div>
              <p>You can track the progress of your ticket in your dashboard.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Grow5X. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    es: {
      subject: 'Ticket de Soporte Creado - Grow5X',
      html: (name, ticket) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ticket de Soporte Creado</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .ticket-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Ticket de Soporte Creado</h1>
            </div>
            <div class="content">
              <h2>¡Hola ${name}!</h2>
              <p>Tu ticket de soporte ha sido creado exitosamente. Nuestro equipo lo revisará y responderá lo antes posible.</p>
              <div class="ticket-info">
                <h3>Detalles del Ticket:</h3>
                <p><strong>ID del Ticket:</strong> ${ticket._id}</p>
                <p><strong>Asunto:</strong> ${ticket.subject}</p>
                <p><strong>Categoría:</strong> ${ticket.category}</p>
                <p><strong>Prioridad:</strong> ${ticket.priority}</p>
                <p><strong>Estado:</strong> ${ticket.status}</p>
              </div>
              <p>Puedes seguir el progreso de tu ticket en tu panel de usuario.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Grow5X. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  },
  welcome: {
    en: {
      subject: 'Welcome to Grow5X - Your Journey Begins!',
      html: (name) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Grow5X</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Grow5X!</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Congratulations! Your email has been verified and your Grow5X account is now active.</p>
              
              <div class="feature">
                <h3>🚀 What's Next?</h3>
                <ul>
                  <li>Complete your profile setup</li>
                  <li>Explore our Pioneer Plans for early access</li>
                  <li>Join our Telegram community</li>
                  <li>Start referring friends and earn commissions</li>
                </ul>
              </div>
              
              <div class="feature">
                <h3>💎 Pioneer Benefits</h3>
                <ul>
                  <li>Early access to trading features</li>
                  <li>Exclusive discounts and bonuses</li>
                  <li>Priority customer support</li>
                  <li>Special community access</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
              </div>
              
              <p>If you have any questions, our support team is here to help!</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 Grow5X. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
              </div>
          </div>
        </body>
        </html>
      `
    },
    es: {
      subject: '¡Bienvenido a Grow5X - Tu Viaje Comienza!',
      html: (name) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenido a Grow5X</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 ¡Bienvenido a Grow5X!</h1>
            </div>
            <div class="content">
              <h2>¡Hola ${name}!</h2>
              <p>¡Felicitaciones! Tu email ha sido verificado y tu cuenta de Grow5X está ahora activa.</p>
              
              <div class="feature">
                <h3>🚀 ¿Qué Sigue?</h3>
                <ul>
                  <li>Completa la configuración de tu perfil</li>
                  <li>Explora nuestros Planes Pionero para acceso temprano</li>
                  <li>Únete a nuestra comunidad de Telegram</li>
                  <li>Comienza a referir amigos y gana comisiones</li>
                </ul>
              </div>
              
              <div class="feature">
                <h3>💎 Beneficios Pionero</h3>
                <ul>
                  <li>Acceso temprano a funciones de trading</li>
                  <li>Descuentos y bonos exclusivos</li>
                  <li>Soporte al cliente prioritario</li>
                  <li>Acceso especial a la comunidad</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Ir al Panel</a>
              </div>
              
              <p>Si tienes alguna pregunta, ¡nuestro equipo de soporte está aquí para ayudar!</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 Grow5X. Todos los derechos reservados.</p>
                <p>Este es un mensaje automatizado, por favor no respondas.</p>
              </div>
          </div>
        </body>
        </html>
      `
    }
  },
  specialCodeWelcome: {
    es: {
      subject: '🎉 ¡Bienvenido a Grow5X - Código Especial Activado!',
      html: (name, codeType, referralCode) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenido a Grow5X - Código Especial</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 650px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 15px 15px 0 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .content { background: white; padding: 40px 30px; border-radius: 0 0 15px 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: bold; transition: transform 0.2s; }
            .button:hover { transform: translateY(-2px); }
            .feature { background: #f8f9ff; padding: 25px; margin: 20px 0; border-radius: 12px; border-left: 5px solid #667eea; }
            .special-badge { background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); color: #333; padding: 10px 20px; border-radius: 25px; display: inline-block; margin: 15px 0; font-weight: bold; box-shadow: 0 2px 10px rgba(255,215,0,0.3); }
            .commission-info { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; padding: 20px; }
            .highlight { color: #667eea; font-weight: bold; }
            .emoji { font-size: 1.2em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1><span class="emoji">🎉</span> ¡Bienvenido a Grow5X!</h1>
              <div class="special-badge">
                <span class="emoji">👑</span> Código ${codeType === 'leader' ? 'Líder' : 'Padre'} Especial
              </div>
            </div>
            <div class="content">
              <h2>¡Hola <span class="highlight">${name}</span>!</h2>
              <p>¡Felicitaciones! Has sido registrado con un <strong>código especial de ${codeType === 'leader' ? 'líder' : 'padre'}</strong> en Grow5X. Esto te otorga beneficios únicos y comisiones especiales.</p>
              
              <div class="feature">
                <h3><span class="emoji">🚀</span> Tu Código de Referido</h3>
                <p>Tu código único de referido es: <strong style="background: #e3f2fd; padding: 5px 10px; border-radius: 5px; color: #1976d2;">${referralCode}</strong></p>
                <p>Comparte este código con otros usuarios para ganar comisiones por sus inversiones.</p>
              </div>
              
              <div class="commission-info">
                <h3><span class="emoji">💰</span> Beneficios de tu Código Especial</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li><strong>Comisión del 10%</strong> por referidos directos (sobre cashback total al completar 100%)</li>
                  <li><strong>Comisión adicional del 5%</strong> sobre el monto de todas las licencias (al finalizar segundo ciclo - día 17, pago único por usuario)</li>
                  <li>Acceso a estadísticas detalladas de tus referidos</li>
                  <li>Soporte prioritario y asesoramiento personalizado</li>
                </ul>
              </div>
              
              <div class="feature">
                <h3><span class="emoji">📊</span> Próximos Pasos</h3>
                <ul>
                  <li>Completa la configuración de tu perfil</li>
                  <li>Explora las opciones de inversión disponibles</li>
                  <li>Comienza a compartir tu código de referido</li>
                  <li>Monitorea tus comisiones en el panel de control</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/dashboard" class="button">
                  <span class="emoji">🎯</span> Acceder al Panel de Control
                </a>
              </div>
              
              <div class="feature">
                <h3><span class="emoji">📞</span> Soporte Especializado</h3>
                <p>Como usuario con código especial, tienes acceso a nuestro soporte prioritario. Si tienes alguna pregunta sobre tus comisiones o necesitas ayuda, no dudes en contactarnos.</p>
              </div>
              
              <p style="text-align: center; color: #666; font-style: italic;">¡Gracias por ser parte de la comunidad Grow5X!</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Grow5X. Todos los derechos reservados.</p>
              <p>Este es un mensaje automatizado, por favor no respondas directamente.</p>
              <p style="margin-top: 10px; font-size: 12px;">Para soporte: <a href="mailto:support@grow5x.app" style="color: #667eea;">support@grow5x.app</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  },
  paymentConfirmation: {
    en: {
      subject: 'Payment Confirmed - Pioneer Plan Activated!',
      html: (name, transaction) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Confirmed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; }
            .transaction-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Payment Confirmed!</h1>
              <div class="success-badge">Pioneer Plan Activated</div>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Great news! Your payment has been confirmed and your Pioneer Plan is now active.</p>
              
              <div class="transaction-details">
                <h3>Transaction Details</h3>
                <div class="detail-row">
                  <span><strong>Plan:</strong></span>
                  <span>${transaction.pioneerPlan.name}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Amount:</strong></span>
                  <span>${transaction.amount} ${transaction.currency}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Transaction ID:</strong></span>
                  <span>${transaction.externalReference}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Status:</strong></span>
                  <span style="color: #10b981; font-weight: bold;">Confirmed</span>
                </div>
                <div class="detail-row">
                  <span><strong>Date:</strong></span>
                  <span>${new Date(transaction.processedAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <p><strong>Your Pioneer benefits are now active and include:</strong></p>
              <ul>
                <li>✅ Early access to all trading features</li>
                <li>✅ ${Math.round(transaction.pioneerPlan.benefits.discountRate * 100)}% discount on trading fees</li>
                <li>✅ Priority customer support</li>
                <li>✅ Exclusive community access</li>
                ${transaction.pioneerPlan.benefits.personalManager ? '<li>✅ Personal account manager</li>' : ''}
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/pioneer-dashboard" class="button">Access Pioneer Dashboard</a>
              </div>
              
              <p>Thank you for being a Pioneer! We're excited to have you on this journey.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Grow5X. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    es: {
      subject: 'Pago Confirmado - ¡Plan Pionero Activado!',
      html: (name, transaction) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pago Confirmado</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; }
            .transaction-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 ¡Pago Confirmado!</h1>
              <div class="success-badge">Plan Pionero Activado</div>
            </div>
            <div class="content">
              <h2>¡Hola ${name}!</h2>
              <p>¡Excelentes noticias! Tu pago ha sido confirmado y tu Plan Pionero está ahora activo.</p>
              
              <div class="transaction-details">
                <h3>Detalles de la Transacción</h3>
                <div class="detail-row">
                  <span><strong>Plan:</strong></span>
                  <span>${transaction.pioneerPlan.name}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Monto:</strong></span>
                  <span>${transaction.amount} ${transaction.currency}</span>
                </div>
                <div class="detail-row">
                  <span><strong>ID de Transacción:</strong></span>
                  <span>${transaction.externalReference}</span>
                </div>
                <div class="detail-row">
                  <span><strong>Estado:</strong></span>
                  <span style="color: #10b981; font-weight: bold;">Confirmado</span>
                </div>
                <div class="detail-row">
                  <span><strong>Fecha:</strong></span>
                  <span>${new Date(transaction.processedAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <p><strong>Tus beneficios Pionero están ahora activos e incluyen:</strong></p>
              <ul>
                <li>✅ Acceso temprano a todas las funciones de trading</li>
                <li>✅ ${Math.round(transaction.pioneerPlan.benefits.discountRate * 100)}% de descuento en comisiones de trading</li>
                <li>✅ Soporte al cliente prioritario</li>
                <li>✅ Acceso exclusivo a la comunidad</li>
                ${transaction.pioneerPlan.benefits.personalManager ? '<li>✅ Gerente de cuenta personal</li>' : ''}
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/pioneer-dashboard" class="button">Acceder al Panel Pionero</a>
              </div>
              
              <p>¡Gracias por ser un Pionero! Estamos emocionados de tenerte en este viaje.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Grow5X. Todos los derechos reservados.</p>
              <p>Este es un mensaje automatizado, por favor no respondas.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  },
  withdrawalVerification: {
    en: {
      subject: 'Withdrawal Verification Code',
      html: (name, code) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Withdrawal Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .verification-code { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #f59e0b; }
            .code { font-size: 32px; font-weight: bold; color: #f59e0b; letter-spacing: 8px; margin: 10px 0; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Withdrawal Verification</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>You have requested to withdraw funds from your Grow5X account. Please use the verification code below to complete your withdrawal:</p>
              
              <div class="verification-code">
                <h3>Your Verification Code</h3>
                <div class="code">${code}</div>
                <p><strong>This code expires in 10 minutes</strong></p>
              </div>
              
              <div class="warning">
                <p><strong>⚠️ Security Notice:</strong></p>
                <ul>
                  <li>Never share this code with anyone</li>
                  <li>Grow5X will never ask for this code via phone or email</li>
                  <li>If you didn't request this withdrawal, please contact support immediately</li>
                </ul>
              </div>
              
              <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Grow5X. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    es: {
      subject: 'Código de Verificación de Retiro',
      html: (name, code) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verificación de Retiro</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .verification-code { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #f59e0b; }
            .code { font-size: 32px; font-weight: bold; color: #f59e0b; letter-spacing: 8px; margin: 10px 0; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Verificación de Retiro</h1>
            </div>
            <div class="content">
              <h2>¡Hola ${name}!</h2>
              <p>Has solicitado retirar fondos de tu cuenta Grow5X. Por favor usa el código de verificación a continuación para completar tu retiro:</p>
              
              <div class="verification-code">
                <h3>Tu Código de Verificación</h3>
                <div class="code">${code}</div>
                <p><strong>Este código expira en 10 minutos</strong></p>
              </div>
              
              <div class="warning">
                <p><strong>⚠️ Aviso de Seguridad:</strong></p>
                <ul>
                  <li>Nunca compartas este código con nadie</li>
                  <li>Grow5X nunca te pedirá este código por teléfono o email</li>
                  <li>Si no solicitaste este retiro, por favor contacta a soporte inmediatamente</li>
                </ul>
              </div>
              
              <p>Si tienes alguna pregunta o inquietud, no dudes en contactar a nuestro equipo de soporte.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Grow5X. Todos los derechos reservados.</p>
              <p>Este es un mensaje automatizado, por favor no respondas.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  }
};

// Create transporter with specific configuration
const createTransporter = (emailType = 'default') => {
  let config = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  // Configuración específica según el tipo de email
  switch (emailType) {
    case 'welcome':
      if (process.env.WELCOME_EMAIL_USER && process.env.WELCOME_EMAIL_PASS) {
        config = {
          host: process.env.WELCOME_EMAIL_HOST || process.env.SMTP_HOST,
          port: process.env.WELCOME_EMAIL_PORT || process.env.SMTP_PORT || 587,
          secure: process.env.WELCOME_EMAIL_SECURE === 'true',
          auth: {
            user: process.env.WELCOME_EMAIL_USER,
            pass: process.env.WELCOME_EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        };
      }
      break;
    
    case 'recovery':
      if (process.env.RECOVERY_EMAIL_USER && process.env.RECOVERY_EMAIL_PASS) {
        config = {
          host: process.env.RECOVERY_EMAIL_HOST || process.env.SMTP_HOST,
          port: process.env.RECOVERY_EMAIL_PORT || process.env.SMTP_PORT || 587,
          secure: process.env.RECOVERY_EMAIL_SECURE === 'true',
          auth: {
            user: process.env.RECOVERY_EMAIL_USER,
            pass: process.env.RECOVERY_EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        };
      }
      break;
    
    case 'backup':
      if (process.env.BACKUP_EMAIL_USER && process.env.BACKUP_EMAIL_PASS) {
        config = {
          host: process.env.BACKUP_EMAIL_HOST || process.env.SMTP_HOST,
          port: process.env.BACKUP_EMAIL_PORT || process.env.SMTP_PORT || 587,
          secure: process.env.BACKUP_EMAIL_SECURE === 'true',
          auth: {
            user: process.env.BACKUP_EMAIL_USER,
            pass: process.env.BACKUP_EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        };
      }
      break;
  }

  return nodemailer.createTransport(config);
};

// Send email function with fallback support and logging
const sendEmail = async (to, subject, html, attachments = [], emailType = 'default', userId = null) => {
  const maxRetries = 3;
  let lastError;
  let emailLog;

  // Crear registro de email log
  try {
    emailLog = new EmailLog({
      recipient: to,
      userId: userId,
      emailType: emailType === 'default' ? 'system' : emailType,
      subject: subject,
      status: 'pending',
      provider: emailType,
      metadata: {
        priority: 'normal'
      }
    });
    await emailLog.save();
  } catch (logError) {
    logger.error('Failed to create email log:', logError);
  }

  // Intentar con el transportador específico
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let transporter;
      let fromEmail;

      if (attempt === 1) {
        // Primer intento: usar configuración específica
        transporter = createTransporter(emailType);
        switch (emailType) {
          case 'welcome':
            fromEmail = process.env.WELCOME_EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
            break;
          case 'recovery':
            fromEmail = process.env.RECOVERY_EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
            break;
          default:
            fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        }
      } else if (attempt === 2) {
        // Segundo intento: usar configuración de respaldo
        transporter = createTransporter('backup');
        fromEmail = process.env.BACKUP_EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
      } else {
        // Tercer intento: usar configuración por defecto
        transporter = createTransporter('default');
        fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
      }
      
      const mailOptions = {
        from: `"Grow5X" <${fromEmail}>`,
        to,
        subject,
        html,
        attachments
      };

      const result = await transporter.sendMail(mailOptions);
      
      // Actualizar log como exitoso
      if (emailLog) {
        try {
          await emailLog.markAsSent(result.messageId);
        } catch (logError) {
          logger.error('Failed to update email log as sent:', logError);
        }
      }
      
      logger.logEmailEvent('email_sent', to, {
        subject,
        messageId: result.messageId,
        attempt,
        emailType,
        success: true
      });
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Actualizar intentos en el log
      if (emailLog && attempt > 1) {
        try {
          await emailLog.incrementAttempts();
        } catch (logError) {
          logger.error('Failed to increment email log attempts:', logError);
        }
      }
      
      logger.logEmailEvent('email_attempt_failed', to, {
        subject,
        attempt,
        emailType,
        error: error.message,
        success: false
      });
      
      if (attempt === maxRetries) {
        // Marcar como fallido en el log
        if (emailLog) {
          try {
            await emailLog.markAsFailed(error);
          } catch (logError) {
            logger.error('Failed to update email log as failed:', logError);
          }
        }
        
        logger.logEmailEvent('email_failed', to, {
          subject,
          error: error.message,
          totalAttempts: maxRetries,
          success: false
        });
        throw error;
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
};

// Send verification email
const sendVerificationEmail = async (email, token, name, language = 'en', userId = null) => {
  const template = emailTemplates.verification[language] || emailTemplates.verification.en;
  const subject = template.subject;
  const html = template.html(name, token);
  
  return await sendEmail(email, subject, html, [], 'verification', userId);
};

// Send welcome email
const sendWelcomeEmail = async (email, name, language = 'en', userId = null) => {
  const template = emailTemplates.welcome[language] || emailTemplates.welcome.en;
  const subject = template.subject;
  const html = template.html(name);
  
  return await sendEmail(email, subject, html, [], 'welcome', userId);
};

// Send special code welcome email
const sendSpecialCodeWelcomeEmail = async (email, name, codeType, referralCode, language = 'es') => {
  const template = emailTemplates.specialCodeWelcome[language] || emailTemplates.specialCodeWelcome.es;
  const subject = template.subject;
  const html = template.html(name, codeType, referralCode);
  
  return await sendEmail(email, subject, html, [], 'welcome');
};

// Send password reset email
const sendPasswordResetEmail = async (email, token, name, language = 'en') => {
  const template = emailTemplates.passwordReset[language] || emailTemplates.passwordReset.en;
  const subject = template.subject;
  const html = template.html(name, token);
  
  return await sendEmail(email, subject, html, [], 'recovery');
};

// Send payment confirmation email
const sendPaymentConfirmationEmail = async (email, name, transaction, language = 'en') => {
  const template = emailTemplates.paymentConfirmation[language] || emailTemplates.paymentConfirmation.en;
  const subject = template.subject;
  const html = template.html(name, transaction);
  
  return await sendEmail(email, subject, html);
};

// Send payment failed email
const sendPaymentFailedEmail = async (email, name, transaction, reason, language = 'en') => {
  const subject = language === 'es' ? 'Problema con el Pago - Grow5X' : 'Payment Issue - Grow5X';
  
  const html = language === 'es' ? `
    <h2>Hola ${name},</h2>
    <p>Hemos detectado un problema con tu pago para el Plan Pionero.</p>
    <p><strong>Razón:</strong> ${reason}</p>
    <p><strong>ID de Transacción:</strong> ${transaction.externalReference}</p>
    <p>Por favor, contacta a nuestro soporte para resolver este problema.</p>
  ` : `
    <h2>Hello ${name},</h2>
    <p>We've detected an issue with your Pioneer Plan payment.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p><strong>Transaction ID:</strong> ${transaction.externalReference}</p>
    <p>Please contact our support team to resolve this issue.</p>
  `;
  
  return await sendEmail(email, subject, html);
};

// Duplicate function removed - using the template-based version above

// Send contact form email
const sendContactFormEmail = async (formData) => {
  const { name, email, subject, message, category } = formData;
  
  const adminEmail = process.env.ADMIN_EMAIL;
  const emailSubject = `[Grow5X Contact] ${category.toUpperCase()}: ${subject}`;
  
  const html = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Category:</strong> ${category}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Message:</strong></p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
      ${message.replace(/\n/g, '<br>')}
    </div>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
  `;
  
  return await sendEmail(adminEmail, emailSubject, html);
};

// Send withdrawal verification email
const sendWithdrawalVerificationEmail = async (email, name, code, language = 'en') => {
  const template = emailTemplates.withdrawalVerification[language] || emailTemplates.withdrawalVerification.en;
  const subject = template.subject;
  const html = template.html(name, code);
  
  return await sendEmail(email, subject, html, [], 'default');
};

// Send ticket created email
const sendTicketCreatedEmail = async (email, ticket, language = 'en') => {
  const template = emailTemplates.ticketCreated[language] || emailTemplates.ticketCreated.en;
  const subject = template.subject;
  const html = template.html('User', ticket);
  
  return await sendEmail(email, subject, html);
};

// Send ticket response email
const sendTicketResponseEmail = async (email, ticket, response, language = 'en') => {
  const subject = `New Response to Your Support Ticket - ${ticket.subject}`;
  const html = `
    <h2>New Response to Your Support Ticket</h2>
    <p>Hello,</p>
    <p>You have received a new response to your support ticket:</p>
    <p><strong>Ticket ID:</strong> ${ticket._id}</p>
    <p><strong>Subject:</strong> ${ticket.subject}</p>
    <p><strong>Response:</strong></p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
      ${response.message}
    </div>
    <p>You can view the full conversation in your dashboard.</p>
  `;
  
  return await sendEmail(email, subject, html);
};

// Send ticket resolved email
const sendTicketResolvedEmail = async (email, ticket, language = 'en') => {
  const subject = `Support Ticket Resolved - ${ticket.subject}`;
  const html = `
    <h2>Your Support Ticket Has Been Resolved</h2>
    <p>Hello,</p>
    <p>Your support ticket has been resolved:</p>
    <p><strong>Ticket ID:</strong> ${ticket._id}</p>
    <p><strong>Subject:</strong> ${ticket.subject}</p>
    <p><strong>Resolution:</strong></p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
      ${ticket.resolution || 'Ticket has been marked as resolved.'}
    </div>
    <p>If you need further assistance, please don't hesitate to create a new ticket.</p>
  `;
  
  return await sendEmail(email, subject, html);
};

// Send new ticket notification to admin
const sendNewTicketNotification = async (email, ticket, language = 'en') => {
  const subject = `New Support Ticket - ${ticket.subject}`;
  const html = `
    <h2>New Support Ticket Created</h2>
    <p>A new support ticket has been created:</p>
    <p><strong>Ticket ID:</strong> ${ticket._id}</p>
    <p><strong>Subject:</strong> ${ticket.subject}</p>
    <p><strong>Category:</strong> ${ticket.category}</p>
    <p><strong>Priority:</strong> ${ticket.priority}</p>
    <p><strong>User:</strong> ${ticket.userName || ticket.userEmail}</p>
    <p><strong>Description:</strong></p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
      ${ticket.description}
    </div>
    <p>Please review and respond to this ticket as soon as possible.</p>
  `;
  
  return await sendEmail(email, subject, html);
};

// Send new response notification to admin
const sendNewResponseNotification = async (email, ticket, response, language = 'en') => {
  const subject = `New Response - ${ticket.subject}`;
  const html = `
    <h2>New Response to Support Ticket</h2>
    <p>A new response has been added to ticket:</p>
    <p><strong>Ticket ID:</strong> ${ticket._id}</p>
    <p><strong>Subject:</strong> ${ticket.subject}</p>
    <p><strong>Response from:</strong> ${response.authorType === 'user' ? 'User' : 'Admin'}</p>
    <p><strong>Response:</strong></p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
      ${response.message}
    </div>
    <p>Please review and respond if necessary.</p>
  `;
  
  return await sendEmail(email, subject, html);
};

// Test email configuration
const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('Email configuration is valid');
    return true;
  } catch (error) {
    logger.error('Email configuration test failed:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendSpecialCodeWelcomeEmail,
  sendPasswordResetEmail,
  sendPaymentConfirmationEmail,
  sendPaymentFailedEmail,
  sendContactFormEmail,
  sendTicketCreatedEmail,
  sendTicketResponseEmail,
  sendTicketResolvedEmail,
  sendNewTicketNotification,
  sendNewResponseNotification,
  sendWithdrawalVerificationEmail,
  testEmailConfiguration
};