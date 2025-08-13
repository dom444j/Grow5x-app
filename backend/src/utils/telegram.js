const TelegramBot = require('node-telegram-bot-api');
const logger = require('./logger');

// Initialize bot
let bot = null;

if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
  logger.info('Telegram bot initialized');
} else {
  logger.warn('Telegram bot token not provided, bot features will be disabled');
}

// Message templates
const messageTemplates = {
  welcome: {
    en: (name) => `🎉 Welcome to Grow5X, ${name}!

Your account has been successfully verified. You're now part of our exclusive community!

🚀 What's next?
• Explore Pioneer Plans for early access
• Start referring friends and earn commissions
• Join our community discussions

Ready to grow your investments? Let's get started! 💎`,
    es: (name) => `🎉 ¡Bienvenido a Grow5X, ${name}!

Tu cuenta ha sido verificada exitosamente. ¡Ahora eres parte de nuestra comunidad exclusiva!

🚀 ¿Qué sigue?
• Explora los Planes Pionero para acceso temprano
• Comienza a referir amigos y gana comisiones
• Únete a nuestras discusiones comunitarias

¿Listo para hacer crecer tus inversiones? ¡Comencemos! 💎`
  },
  pioneerActivated: {
    en: (name, plan, expiresAt) => `🎊 Congratulations ${name}!

Your ${plan.name} has been activated! 🚀

✅ Benefits now active:
• Early access to all features
• ${Math.round(plan.benefits.discountRate * 100)}% discount on fees
• Priority support
• Exclusive community access
${plan.benefits.personalManager ? '• Personal account manager' : ''}

📅 Valid until: ${expiresAt.toDateString()}

Welcome to the Pioneer community! 💎`,
    es: (name, plan, expiresAt) => `🎊 ¡Felicitaciones ${name}!

¡Tu ${plan.name} ha sido activado! 🚀

✅ Beneficios ahora activos:
• Acceso temprano a todas las funciones
• ${Math.round(plan.benefits.discountRate * 100)}% de descuento en comisiones
• Soporte prioritario
• Acceso exclusivo a la comunidad
${plan.benefits.personalManager ? '• Gerente de cuenta personal' : ''}

📅 Válido hasta: ${expiresAt.toLocaleDateString()}

¡Bienvenido a la comunidad Pionero! 💎`
  },
  paymentReceived: {
    en: (amount, currency, reference) => `💰 Payment Received!

We've received your payment of ${amount} ${currency}.

🔍 Transaction ID: ${reference}
⏳ Status: Processing

Your Pioneer plan will be activated once the payment is confirmed. This usually takes a few minutes.

Thank you for your trust! 🙏`,
    es: (amount, currency, reference) => `💰 ¡Pago Recibido!

Hemos recibido tu pago de ${amount} ${currency}.

🔍 ID de Transacción: ${reference}
⏳ Estado: Procesando

Tu plan Pionero será activado una vez que el pago sea confirmado. Esto usualmente toma unos minutos.

¡Gracias por tu confianza! 🙏`
  },
  referralEarned: {
    en: (amount, currency, referredName) => `🎉 Referral Commission Earned!

You've earned ${amount} ${currency} from referring ${referredName}!

💰 Commission has been added to your account
🔄 Keep referring to earn more

Great job building the Grow5X community! 👏`,
    es: (amount, currency, referredName) => `🎉 ¡Comisión de Referido Ganada!

¡Has ganado ${amount} ${currency} por referir a ${referredName}!

💰 La comisión ha sido agregada a tu cuenta
🔄 Sigue refiriendo para ganar más

¡Excelente trabajo construyendo la comunidad Grow5X! 👏`
  },
  securityAlert: {
    en: (event, details) => `🚨 Security Alert

We detected a security event on your account:

📋 Event: ${event}
🕐 Time: ${new Date().toLocaleString()}
📍 Details: ${details}

If this wasn't you, please contact support immediately.

Stay safe! 🔒`,
    es: (event, details) => `🚨 Alerta de Seguridad

Detectamos un evento de seguridad en tu cuenta:

📋 Evento: ${event}
🕐 Hora: ${new Date().toLocaleString()}
📍 Detalles: ${details}

Si no fuiste tú, por favor contacta a soporte inmediatamente.

¡Mantente seguro! 🔒`
  },
  systemMaintenance: {
    en: (startTime, duration) => `🔧 Scheduled Maintenance

We'll be performing system maintenance:

📅 Start: ${startTime}
⏱️ Duration: ${duration}

During this time, some features may be temporarily unavailable. We apologize for any inconvenience.

Thank you for your patience! 🙏`,
    es: (startTime, duration) => `🔧 Mantenimiento Programado

Estaremos realizando mantenimiento del sistema:

📅 Inicio: ${startTime}
⏱️ Duración: ${duration}

Durante este tiempo, algunas funciones pueden estar temporalmente no disponibles. Nos disculpamos por cualquier inconveniente.

¡Gracias por tu paciencia! 🙏`
  }
};

// Send message to user
const sendMessage = async (chatId, message, options = {}) => {
  if (!bot) {
    logger.warn('Telegram bot not initialized, cannot send message');
    return null;
  }

  try {
    const result = await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...options
    });

    logger.logTelegramEvent('message_sent', {
      chatId,
      messageId: result.message_id,
      success: true
    });

    return result;
  } catch (error) {
    logger.logTelegramEvent('message_failed', {
      chatId,
      error: error.message,
      success: false
    });
    throw error;
  }
};

// Send message with inline keyboard
const sendMessageWithKeyboard = async (chatId, message, keyboard) => {
  return await sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
};

// Send welcome message
const sendWelcomeMessage = async (chatId, name, language = 'en') => {
  const template = messageTemplates.welcome[language] || messageTemplates.welcome.en;
  const message = template(name);
  
  const keyboard = [
    [
      { text: '🚀 Explore Pioneer Plans', url: `${process.env.FRONTEND_URL}/pioneer-plans` },
      { text: '👥 Refer Friends', url: `${process.env.FRONTEND_URL}/referrals` }
    ],
    [
      { text: '📊 Dashboard', url: `${process.env.FRONTEND_URL}/dashboard` }
    ]
  ];
  
  return await sendMessageWithKeyboard(chatId, message, keyboard);
};

// Send pioneer activation message
const sendPioneerActivationMessage = async (chatId, name, plan, expiresAt, language = 'en') => {
  const template = messageTemplates.pioneerActivated[language] || messageTemplates.pioneerActivated.en;
  const message = template(name, plan, expiresAt);
  
  const keyboard = [
    [
      { text: '💎 Pioneer Dashboard', url: `${process.env.FRONTEND_URL}/pioneer-dashboard` }
    ],
    [
      { text: '👥 Invite Friends', url: `${process.env.FRONTEND_URL}/referrals` },
      { text: '💬 Community', url: process.env.TELEGRAM_COMMUNITY_LINK || '#' }
    ]
  ];
  
  return await sendMessageWithKeyboard(chatId, message, keyboard);
};

// Send payment received notification
const sendPaymentReceivedMessage = async (chatId, amount, currency, reference, language = 'en') => {
  const template = messageTemplates.paymentReceived[language] || messageTemplates.paymentReceived.en;
  const message = template(amount, currency, reference);
  
  return await sendMessage(chatId, message);
};

// Send referral commission notification
const sendReferralCommissionMessage = async (chatId, amount, currency, referredName, language = 'en') => {
  const template = messageTemplates.referralEarned[language] || messageTemplates.referralEarned.en;
  const message = template(amount, currency, referredName);
  
  const keyboard = [
    [
      { text: '💰 View Earnings', url: `${process.env.FRONTEND_URL}/dashboard` },
      { text: '👥 Refer More', url: `${process.env.FRONTEND_URL}/referrals` }
    ]
  ];
  
  return await sendMessageWithKeyboard(chatId, message, keyboard);
};

// Send security alert
const sendSecurityAlert = async (chatId, event, details, language = 'en') => {
  const template = messageTemplates.securityAlert[language] || messageTemplates.securityAlert.en;
  const message = template(event, details);
  
  const keyboard = [
    [
      { text: '🔒 Security Settings', url: `${process.env.FRONTEND_URL}/security` },
      { text: '📞 Contact Support', url: `${process.env.FRONTEND_URL}/support` }
    ]
  ];
  
  return await sendMessageWithKeyboard(chatId, message, keyboard);
};

// Send system maintenance notification
const sendMaintenanceNotification = async (chatId, startTime, duration, language = 'en') => {
  const template = messageTemplates.systemMaintenance[language] || messageTemplates.systemMaintenance.en;
  const message = template(startTime, duration);
  
  return await sendMessage(chatId, message);
};

// Broadcast message to multiple users
const broadcastMessage = async (chatIds, message, options = {}) => {
  if (!bot) {
    logger.warn('Telegram bot not initialized, cannot broadcast message');
    return { success: 0, failed: 0, errors: [] };
  }

  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const chatId of chatIds) {
    try {
      await sendMessage(chatId, message, options);
      results.success++;
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.failed++;
      results.errors.push({
        chatId,
        error: error.message
      });
    }
  }

  logger.logTelegramEvent('broadcast_completed', {
    totalUsers: chatIds.length,
    successful: results.success,
    failed: results.failed
  });

  return results;
};

// Get user info from Telegram
const getUserInfo = async (chatId) => {
  if (!bot) {
    logger.warn('Telegram bot not initialized, cannot get user info');
    return null;
  }

  try {
    const chat = await bot.getChat(chatId);
    return {
      id: chat.id,
      username: chat.username,
      firstName: chat.first_name,
      lastName: chat.last_name,
      type: chat.type
    };
  } catch (error) {
    logger.error('Failed to get Telegram user info:', error);
    return null;
  }
};

// Validate Telegram username
const validateTelegramUsername = (username) => {
  // Remove @ if present
  const cleanUsername = username.replace('@', '');
  
  // Telegram username rules:
  // - 5-32 characters
  // - Can contain a-z, 0-9, and underscores
  // - Must start with a letter
  // - Must end with a letter or number
  const telegramRegex = /^[a-zA-Z][a-zA-Z0-9_]{3,30}[a-zA-Z0-9]$/;
  
  return telegramRegex.test(cleanUsername);
};

// Convert username to chat ID (requires bot interaction)
const getChatIdFromUsername = async (username) => {
  if (!bot) {
    logger.warn('Telegram bot not initialized, cannot get chat ID');
    return null;
  }

  try {
    // This requires the user to have started a conversation with the bot
    const chat = await bot.getChat(`@${username.replace('@', '')}`);
    return chat.id;
  } catch (error) {
    logger.error('Failed to get chat ID from username:', error);
    return null;
  }
};

// Send photo with caption
const sendPhoto = async (chatId, photo, caption = '', options = {}) => {
  if (!bot) {
    logger.warn('Telegram bot not initialized, cannot send photo');
    return null;
  }

  try {
    const result = await bot.sendPhoto(chatId, photo, {
      caption,
      parse_mode: 'Markdown',
      ...options
    });

    logger.logTelegramEvent('photo_sent', {
      chatId,
      messageId: result.message_id,
      success: true
    });

    return result;
  } catch (error) {
    logger.logTelegramEvent('photo_failed', {
      chatId,
      error: error.message,
      success: false
    });
    throw error;
  }
};

// Send document
const sendDocument = async (chatId, document, caption = '', options = {}) => {
  if (!bot) {
    logger.warn('Telegram bot not initialized, cannot send document');
    return null;
  }

  try {
    const result = await bot.sendDocument(chatId, document, {
      caption,
      parse_mode: 'Markdown',
      ...options
    });

    logger.logTelegramEvent('document_sent', {
      chatId,
      messageId: result.message_id,
      success: true
    });

    return result;
  } catch (error) {
    logger.logTelegramEvent('document_failed', {
      chatId,
      error: error.message,
      success: false
    });
    throw error;
  }
};

// Test bot connection
const testBotConnection = async () => {
  if (!bot) {
    logger.warn('Telegram bot not initialized');
    return false;
  }

  try {
    const me = await bot.getMe();
    logger.info('Telegram bot connection successful', {
      botId: me.id,
      botUsername: me.username,
      botName: me.first_name
    });
    return true;
  } catch (error) {
    logger.error('Telegram bot connection failed:', error);
    return false;
  }
};

// Notify user (generic function)
const notifyTelegram = async (chatId, message, options = {}) => {
  return await sendMessage(chatId, message, options);
};

// Set webhook (for production)
const setWebhook = async (webhookUrl) => {
  if (!bot) {
    logger.warn('Telegram bot not initialized, cannot set webhook');
    return false;
  }

  try {
    await bot.setWebHook(webhookUrl);
    logger.info('Telegram webhook set successfully', { webhookUrl });
    return true;
  } catch (error) {
    logger.error('Failed to set Telegram webhook:', error);
    return false;
  }
};

// Remove webhook
const removeWebhook = async () => {
  if (!bot) {
    logger.warn('Telegram bot not initialized, cannot remove webhook');
    return false;
  }

  try {
    await bot.deleteWebHook();
    logger.info('Telegram webhook removed successfully');
    return true;
  } catch (error) {
    logger.error('Failed to remove Telegram webhook:', error);
    return false;
  }
};

module.exports = {
  bot,
  sendMessage,
  sendMessageWithKeyboard,
  sendWelcomeMessage,
  sendPioneerActivationMessage,
  sendPaymentReceivedMessage,
  sendReferralCommissionMessage,
  sendSecurityAlert,
  sendMaintenanceNotification,
  broadcastMessage,
  getUserInfo,
  validateTelegramUsername,
  getChatIdFromUsername,
  sendPhoto,
  sendDocument,
  testBotConnection,
  notifyTelegram,
  setWebhook,
  removeWebhook
};