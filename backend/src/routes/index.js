// Exportar todas las rutas principales
const adminRoutes = require('./admin.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const usersRoutes = require('./users.routes');
const paymentRoutes = require('./payment.routes');
const purchasesRoutes = require('./purchases.routes');
const commissionsRoutes = require('./commissions.routes');
const reportsRoutes = require('./reports.routes');
const supportRoutes = require('./support.routes');
const notificationsRoutes = require('./notifications.routes');
const walletRoutes = require('./wallet.routes');
const systemRoutes = require('./system.routes');
const settingsRoutes = require('./settings.routes');
const portfolioRoutes = require('./portfolio.routes');
const newsRoutes = require('./news.routes');
const downloadsRoutes = require('./downloads.routes');
const documentRoutes = require('./document.routes');
const automationRoutes = require('./automation.routes');
const arbitrageRoutes = require('./arbitrage.routes');
const preregistrationRoutes = require('./preregistration.routes');
const specialCodesRoutes = require('./specialCodes.routes');
const systemSettingsRoutes = require('./systemSettings.routes');
const userStatusRoutes = require('./userStatus.routes');
const withdrawalPinRoutes = require('./withdrawalPin.routes');
const optimizedBenefitsRoutes = require('./optimizedBenefits.routes');
const packageRoutes = require('./package.routes');
const licenseRoutes = require('./license.routes');
const referralRoutes = require('./referral.routes');
const financeRoutes = require('./finance.routes');
const emailRoutes = require('./email.routes');
const publicRoutes = require('./public.routes');

// Rutas especiales
const supportJs = require('./support.js');
const stagingJs = require('./staging.js');

module.exports = {
  // Rutas principales
  adminRoutes,
  authRoutes,
  userRoutes,
  usersRoutes,
  paymentRoutes,
  purchasesRoutes,
  commissionsRoutes,
  reportsRoutes,
  supportRoutes,
  notificationsRoutes,
  walletRoutes,
  systemRoutes,
  settingsRoutes,
  portfolioRoutes,
  newsRoutes,
  downloadsRoutes,
  documentRoutes,
  automationRoutes,
  arbitrageRoutes,
  preregistrationRoutes,
  specialCodesRoutes,
  systemSettingsRoutes,
  userStatusRoutes,
  withdrawalPinRoutes,
  optimizedBenefitsRoutes,
  packageRoutes,
  licenseRoutes,
  referralRoutes,
  financeRoutes,
  emailRoutes,
  publicRoutes,
  
  // Rutas especiales
  supportJs,
  stagingJs
};