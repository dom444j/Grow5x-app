// Exportar todos los controladores principales
const adminController = require('./admin.controller');
const authController = require('./auth.controller');
const userController = require('./user.controller');
const paymentController = require('./payment.controller');
const purchasesController = require('./purchases.controller');
const commissionsController = require('./commissions.controller');
const reportsController = require('./reports.controller');
const supportController = require('./support.controller');
const notificationsController = require('./notifications.controller');
const walletController = require('./wallet.controller');
const transactionController = require('./transaction.controller');
const systemController = require('./system.controller');
const settingsController = require('./settings.controller');
const portfolioController = require('./portfolio.controller');
const newsController = require('./news.controller');
const downloadsController = require('./downloads.controller');
const documentController = require('./document.controller');
const automationController = require('./automation.controller');
const arbitrageController = require('./arbitrage.controller');
const aiController = require('./ai.controller');
const preregistrationController = require('./preregistration.controller');
const specialCodesController = require('./specialCodes.controller');
const systemSettingsController = require('./systemSettings.controller');
const userStatusController = require('./userStatus.controller');
const withdrawalPinController = require('./withdrawalPin.controller');
const optimizedBenefitsController = require('./optimizedBenefits.controller');
const adminPackageController = require('./adminPackage.controller');

// Controladores de admin refactorizados
const adminControllers = require('./admin');

module.exports = {
  // Controladores principales
  adminController,
  authController,
  userController,
  paymentController,
  purchasesController,
  commissionsController,
  reportsController,
  supportController,
  notificationsController,
  walletController,
  transactionController,
  systemController,
  settingsController,
  portfolioController,
  newsController,
  downloadsController,
  documentController,
  automationController,
  arbitrageController,
  aiController,
  preregistrationController,
  specialCodesController,
  systemSettingsController,
  userStatusController,
  withdrawalPinController,
  optimizedBenefitsController,
  adminPackageController,
  
  // Controladores de admin refactorizados
  ...adminControllers
};