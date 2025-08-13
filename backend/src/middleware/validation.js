const Joi = require('joi');

// Preregistration validation schema
const preregistrationSchema = Joi.object({
  email: Joi.string().email().optional().allow(''),
  telegram: Joi.string().min(5).max(32).optional().allow(''),
  fullName: Joi.string().min(2).max(100).required(),
  country: Joi.string().min(2).max(100).required(),
  estimatedAmount: Joi.number().min(50).max(1000000).required(),
  currency: Joi.string().valid('USDT', 'USD', 'EUR', 'BTC', 'ETH').default('USDT'),
  referralCode: Joi.string().min(6).max(10).optional().allow(''),
  acceptedTerms: Joi.boolean().valid(true).required(),
  acceptedRisk: Joi.boolean().valid(true).required(),
  language: Joi.string().valid('es', 'en', 'pt').default('es'),
  source: Joi.string().valid('website', 'telegram', 'referral', 'social', 'other').default('website')
}).or('email', 'telegram'); // At least one of email or telegram is required

// User registration validation schema
const registrationSchema = Joi.object({
  email: Joi.string().email().optional().allow(''),
  telegram: Joi.string().min(5).max(32).optional().allow(''),
  password: Joi.string().min(8).max(128).required(),
  fullName: Joi.string().min(2).max(100).required(),
  country: Joi.string().min(2).max(100).required(),
  referralCode: Joi.string().min(6).max(10).required(),
  acceptedTerms: Joi.boolean().valid(true).required(),
  acceptedRisk: Joi.boolean().valid(true).required(),
  acceptedMarketing: Joi.boolean().default(false),
  language: Joi.string().valid('es', 'en', 'pt').default('es')
}).or('email', 'telegram');

// Login validation schema
const loginSchema = Joi.object({
  identifier: Joi.string().required(), // email or telegram
  password: Joi.string().required(),
  userType: Joi.string().valid('user', 'admin').optional()
});

// Password reset request schema
const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required()
});

// Password reset schema
const passwordResetSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(128).required()
});

// Email verification schema
const emailVerificationSchema = Joi.object({
  token: Joi.string().required()
});

// Profile update schema
const profileUpdateSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).optional(),
  country: Joi.string().min(2).max(100).optional(),
  language: Joi.string().valid('es', 'en', 'pt').optional(),
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
    }).optional()
  }).optional()
});

// Change password schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required()
});

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Specific validation middlewares
const validatePreregistration = validate(preregistrationSchema);
const validateRegistration = validate(registrationSchema);
const validateLogin = validate(loginSchema);
const validatePasswordResetRequest = validate(passwordResetRequestSchema);
const validatePasswordReset = validate(passwordResetSchema);
const validateEmailVerification = validate(emailVerificationSchema);
const validateProfileUpdate = validate(profileUpdateSchema);
const validateChangePassword = validate(changePasswordSchema);

// Custom validation functions
const validatePreregistrationData = (data) => {
  return preregistrationSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};

const validateRegistrationData = (data) => {
  return registrationSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
};

// Generic validation middleware for admin routes
const validateRequest = (validationRules) => {
  return (req, res, next) => {
    const errors = [];
    
    if (Array.isArray(validationRules)) {
      validationRules.forEach(rule => {
        const { field, type, required, min, max, enum: enumValues } = rule;
        const value = req.body[field];
        
        if (required && (value === undefined || value === null || value === '')) {
          errors.push({ field, message: `${field} is required` });
          return;
        }
        
        if (value !== undefined && value !== null && value !== '') {
          if (type === 'string' && typeof value !== 'string') {
            errors.push({ field, message: `${field} must be a string` });
          } else if (type === 'number' && typeof value !== 'number') {
            errors.push({ field, message: `${field} must be a number` });
          } else if (type === 'boolean' && typeof value !== 'boolean') {
            errors.push({ field, message: `${field} must be a boolean` });
          }
          
          if (min !== undefined && value < min) {
            errors.push({ field, message: `${field} must be at least ${min}` });
          }
          
          if (max !== undefined && value > max) {
            errors.push({ field, message: `${field} must be at most ${max}` });
          }
          
          if (enumValues && !enumValues.includes(value)) {
            errors.push({ field, message: `${field} must be one of: ${enumValues.join(', ')}` });
          }
        }
      });
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    next();
  };
};

module.exports = {
  // Middleware functions
  validatePreregistration,
  validateRegistration,
  validateLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateEmailVerification,
  validateProfileUpdate,
  validateChangePassword,
  validateRequest,
  
  // Validation functions
  validatePreregistrationData,
  validateRegistrationData,
  
  // Schemas (for direct use)
  preregistrationSchema,
  registrationSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  emailVerificationSchema,
  profileUpdateSchema,
  changePasswordSchema
};