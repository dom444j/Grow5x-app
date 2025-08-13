// Exportar todos los modelos principales
const User = require('./User');
const Package = require('./Package.model');
const Purchase = require('./Purchase.model');
const Commission = require('./Commission.model');
const Referral = require('./Referral.model');
const Transaction = require('./Transaction.model');
const Payment = require('./Payment');
const Wallet = require('./Wallet.model');
const UserBenefit = require('./UserBenefit.model');
const UserStatus = require('./UserStatus');
const UserSettings = require('./UserSettings');
const Preregistration = require('./Preregistration.model');
const SpecialCode = require('./SpecialCode.model');
const SystemSetting = require('./SystemSetting.model');
const SystemMetric = require('./SystemMetric.model');
const AdminLog = require('./AdminLog.model');
const EmailLog = require('./EmailLog.model');
const Notification = require('./Notification.model');
const Support = require('./Support.model');
const Ticket = require('./Ticket');
const TicketResponse = require('./TicketResponse');
const Document = require('./Document');
const DocumentModel = require('./Document.model');
const News = require('./News.model');
const Portfolio = require('./Portfolio.model');
const Product = require('./Product.model');
const Investment = require('./Investment.model');
const DailyReport = require('./DailyReport');
const AutomationLog = require('./AutomationLog');
const ArbitrageSimulation = require('./ArbitrageSimulation');
const WithdrawalRequest = require('./WithdrawalRequest');
const WalletRole = require('./WalletRole.model');
const UserWalletRole = require('./UserWalletRole.model');

module.exports = {
  // Modelos de usuario
  User,
  UserStatus,
  UserSettings,
  UserBenefit,
  UserWalletRole,
  
  // Modelos de paquetes y compras
  Package,
  Purchase,
  Product,
  Investment,
  
  // Modelos de comisiones y referidos
  Commission,
  Referral,
  
  // Modelos de transacciones y pagos
  Transaction,
  Payment,
  Wallet,
  WalletRole,
  WithdrawalRequest,
  
  // Modelos de sistema
  SystemSetting,
  SystemMetric,
  DailyReport,
  AutomationLog,
  
  // Modelos de administración
  AdminLog,
  EmailLog,
  
  // Modelos de comunicación
  Notification,
  Support,
  Ticket,
  TicketResponse,
  News,
  
  // Modelos de documentos
  Document,
  DocumentModel,
  
  // Modelos de registro
  Preregistration,
  SpecialCode,
  
  // Modelos de portfolio
  Portfolio,
  
  // Modelos de simulación
  ArbitrageSimulation
};