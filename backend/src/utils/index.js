// Exportar todas las utilidades principales
const benefitsCalculator = require('./benefitsCalculator');
const email = require('./email');
const helpers = require('./helpers');
const logger = require('./logger');
const telegram = require('./telegram');
const validation = require('./validation');
const walletValidator = require('./walletValidator');

module.exports = {
  // Utilidades de cálculo
  benefitsCalculator,
  
  // Utilidades de comunicación
  email,
  telegram,
  
  // Utilidades generales
  helpers,
  logger,
  
  // Utilidades de validación
  validation,
  walletValidator,
  
  // Exportaciones específicas para compatibilidad
  calculateBenefits: benefitsCalculator.calculateBenefits,
  sendEmail: email.sendEmail,
  sendTelegram: telegram.sendMessage,
  validateWallet: walletValidator.validateWallet,
  log: logger
};