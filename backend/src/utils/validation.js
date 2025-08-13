const Joi = require('joi');

// User registration validation
const validateRegister = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().optional().allow(''),
    telegram: Joi.string().min(5).max(32).optional().allow(''),
    password: Joi.string().min(8).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({
        'any.only': 'Las contraseñas no coinciden'
      }),
    fullName: Joi.string().min(2).max(100).required(),
    country: Joi.string().min(2).max(50).required(),
    language: Joi.string().valid('en', 'es', 'pt').default('es'),
    referralCode: Joi.string().min(6).max(10).required(),
    estimatedAmount: Joi.number().min(0).max(1000000).optional().allow('', null),
    currency: Joi.string().valid('USD', 'EUR', 'USDT', 'BTC', 'ETH').default('USDT'),
    acceptedTerms: Joi.boolean().valid(true).required()
      .messages({
        'any.only': 'Debes aceptar los términos y condiciones'
      }),
    acceptedRisk: Joi.boolean().valid(true).required()
      .messages({
        'any.only': 'Debes aceptar los riesgos de inversión'
      })
  }).or('email', 'telegram')
    .messages({
      'object.missing': 'Se requiere email o telegram'
    });

  return schema.validate(data);
};

// User login validation
const validateLogin = (data) => {
  console.log('Validando datos de login:', data);
  const schema = Joi.object({
    identifier: Joi.string().required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().optional(),
    userType: Joi.string().valid('user', 'admin').optional()
  });

  const result = schema.validate(data);
  if (result.error) {
    console.log('Error de validación en login:', result.error);
  }
  return result;
};

// Email validation
const validateEmail = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required()
  });

  return schema.validate(data);
};

// Password reset validation
const validatePasswordReset = (data) => {
  const schema = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
      .messages({
        'any.only': 'Las contraseñas no coinciden'
      })
  });

  return schema.validate(data);
};

// Pre-registration validation
const validatePreregistration = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().optional().allow(''),
    telegram: Joi.string().min(5).max(32).optional().allow(''),
    fullName: Joi.string().min(2).max(100).required(),
    country: Joi.string().min(2).max(50).required(),
    estimatedAmount: Joi.number().min(0).max(1000000).required(),
    currency: Joi.string().valid('USD', 'EUR', 'USDT', 'BTC', 'ETH').default('USDT'),
    language: Joi.string().valid('en', 'es', 'pt').default('es'),
    referralCode: Joi.string().alphanum().min(6).max(12).optional().allow(''),
    acceptedTerms: Joi.boolean().valid(true).required(),
    acceptedRisk: Joi.boolean().valid(true).required(),
    source: Joi.string().valid('website', 'telegram', 'referral', 'social', 'other').default('website'),
    notes: Joi.string().max(500).optional().allow('')
  }).or('email', 'telegram')
    .messages({
      'object.missing': 'Se requiere email o telegram'
    });

  return schema.validate(data);
};

// Payment validation
const validatePayment = (data) => {
  const schema = Joi.object({
    planType: Joi.string().valid('basic', 'premium', 'elite').required(),
    paymentMethod: Joi.string().valid('usdt', 'btc', 'eth', 'usdt-bep20', 'usdt-trc20', 'bitcoin', 'bnb').default('usdt')
  });

  return schema.validate(data);
};

// Withdrawal validation
const validateWithdrawal = (data) => {
  const schema = Joi.object({
    amount: Joi.number().min(10).max(100000).required(),
    currency: Joi.string().valid('USDT', 'BTC', 'ETH').default('USDT'),
    walletAddress: Joi.string().min(26).max(62).required(),
    network: Joi.string().valid('BEP20').required(),
    password: Joi.string().required()
  });

  return schema.validate(data);
};

// Profile update validation
const validateProfileUpdate = (data) => {
  const schema = Joi.object({
    fullName: Joi.string().min(2).max(100).optional(),
    country: Joi.string().min(2).max(50).optional(),
    language: Joi.string().valid('en', 'es', 'pt').optional(),
    telegram: Joi.string().min(5).max(32).optional().allow(''),
    settings: Joi.object({
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        telegram: Joi.boolean().optional(),
        marketing: Joi.boolean().optional()
      }).optional(),
      privacy: Joi.object({
        showInLeaderboard: Joi.boolean().optional(),
        allowReferrals: Joi.boolean().optional()
      }).optional(),
      trading: Joi.object({
        riskLevel: Joi.string().valid('low', 'medium', 'high').optional(),
        autoReinvest: Joi.boolean().optional(),
        stopLoss: Joi.number().min(0).max(100).optional()
      }).optional()
    }).optional()
  });

  return schema.validate(data);
};

// Password change validation
const validatePasswordChange = (data) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
      .messages({
        'any.only': 'Las contraseñas no coinciden'
      })
  });

  return schema.validate(data);
};

// Contact form validation
const validateContact = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    subject: Joi.string().min(5).max(200).required(),
    message: Joi.string().min(10).max(2000).required(),
    category: Joi.string().valid('general', 'support', 'partnership', 'bug', 'feature').default('general')
  });

  return schema.validate(data);
};

// Admin user creation validation
const validateAdminUserCreation = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    fullName: Joi.string().min(2).max(100).required(),
    role: Joi.string().valid('admin', 'moderator', 'support').default('support'),
    permissions: Joi.array().items(
      Joi.string().valid(
        'users.read', 'users.write', 'users.delete',
        'transactions.read', 'transactions.write', 'transactions.verify',
        'preregistrations.read', 'preregistrations.write',
        'referrals.read', 'referrals.write',
        'admin.read', 'admin.write',
        'system.read', 'system.write'
      )
    ).optional()
  });

  return schema.validate(data);
};

// Transaction search validation
const validateTransactionSearch = (data) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled').optional(),
    type: Joi.string().valid('deposit', 'withdrawal', 'earnings', 'commission', 'pioneer_payment', 'refund', 'fee').optional(),
    currency: Joi.string().valid('USDT', 'BTC', 'ETH', 'USD', 'EUR').optional(),
    userId: Joi.string().hex().length(24).optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    minAmount: Joi.number().min(0).optional(),
    maxAmount: Joi.number().min(0).optional(),
    search: Joi.string().max(100).optional()
  });

  return schema.validate(data);
};

// User search validation
const validateUserSearch = (data) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('pending', 'active', 'suspended', 'banned').optional(),
    isPioneer: Joi.boolean().optional(),
    country: Joi.string().min(2).max(50).optional(),
    language: Joi.string().valid('en', 'es', 'pt').optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    search: Joi.string().max(100).optional()
  });

  return schema.validate(data);
};

// Referral code validation
const validateReferralCode = (data) => {
  const schema = Joi.object({
    code: Joi.string().alphanum().min(6).max(12).required()
  });

  return schema.validate(data);
};

// Investment plan validation
const validateInvestmentPlan = (data) => {
  const schema = Joi.object({
    amount: Joi.number().min(100).max(100000).required(),
    currency: Joi.string().valid('USDT', 'BTC', 'ETH').default('USDT'),
    planType: Joi.string().valid('conservative', 'moderate', 'aggressive').required(),
    duration: Joi.number().integer().min(30).max(365).required(),
    autoReinvest: Joi.boolean().default(false),
    stopLoss: Joi.number().min(0).max(50).optional()
  });

  return schema.validate(data);
};

// Notification preferences validation
const validateNotificationPreferences = (data) => {
  const schema = Joi.object({
    email: Joi.object({
      enabled: Joi.boolean().default(true),
      frequency: Joi.string().valid('immediate', 'daily', 'weekly').default('immediate'),
      types: Joi.array().items(
        Joi.string().valid(
          'security', 'transactions', 'earnings', 'referrals', 
          'system', 'marketing', 'promotions'
        )
      ).default(['security', 'transactions'])
    }).optional(),
    telegram: Joi.object({
      enabled: Joi.boolean().default(false),
      frequency: Joi.string().valid('immediate', 'daily', 'weekly').default('immediate'),
      types: Joi.array().items(
        Joi.string().valid(
          'security', 'transactions', 'earnings', 'referrals', 
          'system', 'marketing', 'promotions'
        )
      ).default(['security', 'transactions'])
    }).optional(),
    push: Joi.object({
      enabled: Joi.boolean().default(true),
      types: Joi.array().items(
        Joi.string().valid(
          'security', 'transactions', 'earnings', 'referrals', 'system'
        )
      ).default(['security', 'transactions'])
    }).optional()
  });

  return schema.validate(data);
};

// Joi schemas for middleware validation - ACTUALIZADO
const registerSchema = Joi.object({
  email: Joi.string().email().optional().allow(''),
  telegram: Joi.string().min(5).max(32).optional().allow(''),
  password: Joi.string().min(8).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    .messages({
      'any.only': 'Las contraseñas no coinciden'
    }),
  fullName: Joi.string().min(2).max(100).required(),
  country: Joi.string().min(2).max(50).required(),
  language: Joi.string().valid('en', 'es', 'pt').default('es'),
  referralCode: Joi.string().min(6).max(10).required(),
  estimatedAmount: Joi.number().min(0).max(1000000).optional().allow('', null),
  currency: Joi.string().valid('USD', 'EUR', 'USDT', 'BTC', 'ETH').default('USDT'),
  acceptedTerms: Joi.boolean().valid(true).required()
    .messages({
      'any.only': 'Debes aceptar los términos y condiciones'
    }),
  acceptedRisk: Joi.boolean().valid(true).required()
    .messages({
      'any.only': 'Debes aceptar los riesgos de inversión'
    })
}).or('email', 'telegram')
  .messages({
    'object.missing': 'Se requiere email o telegram'
  });

const loginSchema = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().required(),
  rememberMe: Joi.boolean().optional(),
  userType: Joi.string().valid('user', 'admin').optional()
});

const paymentSchema = Joi.object({
  planType: Joi.string().valid('basic', 'premium', 'elite').required(),
  paymentMethod: Joi.string().valid('usdt', 'btc', 'eth', 'usdt-bep20', 'usdt-trc20', 'bitcoin', 'bnb').default('usdt')
});

const withdrawalSchema = Joi.object({
  amount: Joi.number().min(10).max(100000).required(),
  currency: Joi.string().valid('USDT', 'BTC', 'ETH').default('USDT'),
  walletAddress: Joi.string().min(26).max(62).required(),
  network: Joi.string().valid('BEP20').required(),
  password: Joi.string().required()
});

module.exports = {
  validateRegister,
  validateLogin,
  validateEmail,
  validatePasswordReset,
  validatePreregistration,
  validatePayment,
  validateWithdrawal,
  validateProfileUpdate,
  validatePasswordChange,
  validateContact,
  validateAdminUserCreation,
  validateTransactionSearch,
  validateUserSearch,
  validateReferralCode,
  validateInvestmentPlan,
  validateNotificationPreferences,
  registerSchema,
  loginSchema,
  paymentSchema,
  withdrawalSchema
};