// Exportar todos los middleware principales
const auth = require('./auth');
const authMiddleware = require('./auth.middleware');
const adminAuth = require('./adminAuth');
const validation = require('./validation');
const validationMiddleware = require('./validation.middleware');
const benefitsValidation = require('./benefitsValidation');
const referralValidation = require('./referralValidation');
const ensureUserStatus = require('./ensureUserStatus');
const specialUserMiddleware = require('./specialUser.middleware');
const walletAuthMiddleware = require('./walletAuth.middleware');

module.exports = {
  // Middleware de autenticación
  auth,
  authMiddleware,
  adminAuth,
  
  // Middleware de validación
  validation,
  validationMiddleware,
  benefitsValidation,
  referralValidation,
  
  // Middleware de estado de usuario
  ensureUserStatus,
  specialUserMiddleware,
  
  // Middleware de wallet
  walletAuthMiddleware,
  
  // Exportaciones específicas para compatibilidad
  authenticateToken: authMiddleware.authenticateToken,
  authenticateAdmin: adminAuth.authenticateAdmin,
  validateRequest: validation.validateRequest,
  validatePreregistration: validation.validatePreregistration,
  validateRegistration: validation.validateRegistration,
  validateLogin: validation.validateLogin,
  validatePasswordResetRequest: validation.validatePasswordResetRequest,
  validatePasswordReset: validation.validatePasswordReset,
  validateEmailVerification: validation.validateEmailVerification,
  validateProfileUpdate: validation.validateProfileUpdate,
  validateChangePassword: validation.validateChangePassword
};