const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
<<<<<<< HEAD
const crypto = require('crypto');
const { generateReferralCode } = require('../utils/helpers');

const userSchema = new mongoose.Schema({
=======
const { v4: uuidv4 } = require('uuid');
const { DecimalCalc } = require('../utils/decimal');

const userSchema = new mongoose.Schema({
  // Basic Information
  userId: {
    type: String,
    unique: true,
    default: () => `USR_${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`
  },
>>>>>>> clean-reset
  email: {
    type: String,
    required: true,
    unique: true,
<<<<<<< HEAD
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
=======
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
>>>>>>> clean-reset
    type: String,
    required: true,
    trim: true
  },
<<<<<<< HEAD
  country: {
=======
  lastName: {
>>>>>>> clean-reset
    type: String,
    required: true,
    trim: true
  },
<<<<<<< HEAD
  // Campos adicionales de perfil para formularios
=======
>>>>>>> clean-reset
  phone: {
    type: String,
    trim: true
  },
<<<<<<< HEAD
  dateOfBirth: {
    type: Date
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  occupation: {
    type: String,
    trim: true
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  profileImage: {
    type: String, // URL de la imagen
    default: ''
  },
  telegram: {
    username: String,
    chatId: String,
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationCode: String,
    verificationExpires: Date
  },
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    token: String,
    expires: Date
  },
  referralCode: {
    type: String,
    unique: true,
    default: () => generateReferralCode()
=======
  country: {
    type: String,
    trim: true
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  // Special Parent Status (separate from role)
  specialParentStatus: {
    type: String,
    enum: ['none', 'special_parent'],
    default: 'none'
  },
  specialParentCode: {
    type: String,
    sparse: true,
    unique: true
  },
  specialParentAssignedAt: {
    type: Date
  },
  specialParentAssignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Telegram Integration
  telegramChatId: {
    type: String,
    sparse: true
  },
  telegramUsername: {
    type: String,
    sparse: true
  },
  telegramVerified: {
    type: Boolean,
    default: false
  },
  telegramVerifiedAt: {
    type: Date
  },
  
  // User Settings
  defaultWithdrawalAddress: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        // BEP20 address validation (42 chars, starts with 0x)
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid BEP20 address format'
    }
  },
  network: {
    type: String,
    default: 'BEP20',
    enum: ['BEP20']
  },
  
  // Referral System
  referralCode: {
    type: String,
    unique: true,
    default: () => `REF_${Math.random().toString(36).substring(2, 10).toUpperCase()}`
>>>>>>> clean-reset
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
<<<<<<< HEAD
  referrals: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'pioneer'],
      default: 'pending'
    },
    commission: {
      type: Number,
      default: 0
    }
  }],
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'suspended', 'deleted'],
    default: 'pending'
  },
  isPioneer: {
    type: Boolean,
    default: false
  },
  // Campos para sincronización con UserStatus
  package_status: {
    type: String,
    enum: ['none', 'active', 'paused', 'expired', 'cancelled'],
    default: 'none'
  },
  current_package: {
    type: String,
    enum: ['starter', 'basic', 'standard', 'premium', 'gold', 'platinum', 'diamond', ''],
    default: ''
  },
  usingRealCapital: {
    type: Boolean,
    default: false
  },
  // Campos para usuarios especiales (líder/padre)
  isSpecialUser: {
    type: Boolean,
    default: false
  },
  specialUserType: {
    type: String,
    enum: ['', 'leader', 'parent'],
    default: ''
  },
  specialCodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpecialCode',
    default: null
  },
  // Nivel de usuario para sistema de comisiones
  userLevel: {
    type: String,
    enum: ['MEMBER', 'LEADER', 'FATHER'],
    default: 'MEMBER'
  },
  pioneerDetails: {
    level: {
      type: String,
      enum: ['basic', 'premium', 'elite', ''],
      default: ''
    },
    activatedAt: Date,
    expiresAt: Date,
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    }
  },
  balance: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  // Campos de saldos detallados
  balances: {
    available: {
      type: Number,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    },
    frozen: {
      type: Number,
      default: 0
    },
    investment: {
      type: Number,
      default: 0
    },
    commission: {
      type: Number,
      default: 0
    },
    bonus: {
      type: Number,
      default: 0
    },
    referral: {
      type: Number,
      default: 0
    },
    withdrawal: {
      pending: {
        type: Number,
        default: 0
      },
      processing: {
        type: Number,
        default: 0
      },
      completed: {
        type: Number,
        default: 0
      },
      failed: {
        type: Number,
        default: 0
      }
    }
  },
  // Débitos por retiros
  withdrawalDebits: {
    totalRequested: {
      type: Number,
      default: 0
    },
    totalProcessed: {
      type: Number,
      default: 0
    },
    totalCompleted: {
      type: Number,
      default: 0
    },
    totalFailed: {
      type: Number,
      default: 0
    },
    totalFees: {
      type: Number,
      default: 0
    },
    pendingAmount: {
      type: Number,
      default: 0
    },
    lastWithdrawalDate: Date,
    dailyWithdrawn: {
      amount: {
        type: Number,
        default: 0
      },
      date: Date
    },
    monthlyWithdrawn: {
      amount: {
        type: Number,
        default: 0
      },
      month: Number,
      year: Number
    }
  },
  // Campos de inversión
  investments: {
    totalInvested: {
      type: Number,
      default: 0
    },
    activeInvestments: {
      type: Number,
      default: 0
    },
    completedInvestments: {
      type: Number,
      default: 0
    },
    totalReturns: {
      type: Number,
      default: 0
    },
    expectedReturns: {
      type: Number,
      default: 0
    },
    lastInvestmentDate: Date,
    portfolioValue: {
      type: Number,
      default: 0
    },
    averageROI: {
      type: Number,
      default: 0
    }
  },
  // Campos de actividad y estado
  activity: {
    lastActiveDate: Date,
    loginCount: {
      type: Number,
      default: 0
    },
    transactionCount: {
      type: Number,
      default: 0
    },
    referralCount: {
      type: Number,
      default: 0
    },
    investmentCount: {
      type: Number,
      default: 0
    }
  },
  // Flags administrativos
  adminFlags: {
    needsAttention: {
      type: Boolean,
      default: false
    },
    attentionReason: String,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    flaggedAt: Date,
    notes: String,
    isBlacklisted: {
      type: Boolean,
      default: false
    },
    blacklistReason: String,
    requiresKYC: {
      type: Boolean,
      default: false
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'not_required'],
      default: 'not_required'
    },
    kycLevel: {
      type: Number,
      default: 0
    }
  },
  
  // Beneficios del usuario
  benefits: {
    // Beneficios personales por compras propias
    personalBenefits: {
      totalPackagesPurchased: {
        type: Number,
        default: 0
      },
      totalLicensesPurchased: {
        type: Number,
        default: 0
      },
      totalPersonalCommissions: {
        type: Number,
        default: 0
      },
      lastPurchaseDate: Date
    },
    
    // Beneficios por referidos directos (nivel 1)
    referralBenefits: {
      totalDirectReferrals: {
        type: Number,
        default: 0
      },
      activeDirectReferrals: {
        type: Number,
        default: 0
      },
      totalReferralCommissions: {
        type: Number,
        default: 0
      },
      // Comisiones por compras de referidos directos
      commissionsFromReferrals: {
        packages: {
          type: Number,
          default: 0
        },
        licenses: {
          type: Number,
          default: 0
        }
      },
      lastReferralCommissionDate: Date
    }
  },
  walletAddresses: [{
    network: String,
    address: String,
    isVerified: {
      type: Boolean,
      default: false
    },
    label: String
  }],
  preferences: {
    language: {
      type: String,
      enum: ['en', 'es'],
      default: 'es'
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'USDT'],
      default: 'USDT'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      telegram: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: false
      }
    },
    twoFactorAuth: {
      enabled: {
        type: Boolean,
        default: false
      },
      secret: String,
      backupCodes: [String]
    }
  },
  security: {
    withdrawalPin: {
      hash: String,
      enabled: {
        type: Boolean,
        default: false
      },
      hasPin: {
        type: Boolean,
        default: false
      },
      lastChanged: Date,
      failedAttempts: {
        type: Number,
        default: 0
      },
      lockedUntil: Date
    },
    withdrawalVerificationCode: {
      code: String,
      expiresAt: Date
    }
  },
  securityLog: [{
    action: String,
    ip: String,
    userAgent: String,
    location: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  sessions: [{
    token: String,
    ip: String,
    userAgent: String,
    location: String,
    lastActive: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date
  }],
  resetPassword: {
    token: String,
    expires: Date
  },
  lastLogin: Date,
  loginAttempts: { 
    type: Number, 
    default: 0 
  },
  lockUntil: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
// email y referralCode ya tienen índices únicos definidos en el esquema
userSchema.index({ referredBy: 1 });
userSchema.index({ 'verification.token': 1 });
userSchema.index({ 'resetPassword.token': 1 });
userSchema.index({ 'telegram.username': 1 });
userSchema.index({ isPioneer: 1 });
userSchema.index({ package_status: 1 });
userSchema.index({ current_package: 1 });
userSchema.index({ isSpecialUser: 1 });
userSchema.index({ specialUserType: 1 });
userSchema.index({ specialCodeId: 1 });
userSchema.index({ package_status: 1, current_package: 1 }); // Índice compuesto para consultas de beneficios

// Índices para los nuevos campos
userSchema.index({ 'adminFlags.needsAttention': 1 });
userSchema.index({ 'adminFlags.priority': 1 });
userSchema.index({ 'adminFlags.kycStatus': 1 });
userSchema.index({ 'adminFlags.isBlacklisted': 1 });
userSchema.index({ 'balances.available': 1 });
userSchema.index({ 'withdrawalDebits.pendingAmount': 1 });
userSchema.index({ 'investments.totalInvested': 1 });
userSchema.index({ 'investments.activeInvestments': 1 });
userSchema.index({ 'activity.lastActiveDate': 1 });
userSchema.index({ status: 1, 'adminFlags.needsAttention': 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'adminFlags.flaggedAt': 1 });
userSchema.index({ 'withdrawalDebits.lastWithdrawalDate': 1 });
userSchema.index({ 'investments.lastInvestmentDate': 1 });

// Virtual for account lock
=======
  referralLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  
  // Financial Information
  totalInvested: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  totalEarnings: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  availableBalance: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  totalWithdrawn: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  
  // Commission Tracking
  totalCommissions: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  availableCommissions: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: 0
  },
  
  // Security
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  
  // Verification
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  
  // Session Management
  tokenVersion: {
    type: Number,
    default: 0
  },
  
  // Metadata
  registrationIP: {
    type: String
  },
  lastIP: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.emailVerificationToken;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ userId: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ telegramChatId: 1 }, { sparse: true });
userSchema.index({ specialParentStatus: 1 });
userSchema.index({ specialParentCode: 1 }, { sparse: true });
userSchema.index({ createdAt: 1 });

// Virtual for account lock status
>>>>>>> clean-reset
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

<<<<<<< HEAD
// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Set wasNew flag for post-save middleware
  this.wasNew = this.isNew;
  console.log(`[REFERRAL] Pre-save hook: user ${this.email}, isNew: ${this.isNew}, wasNew: ${this.wasNew}`);
  
=======
// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
>>>>>>> clean-reset
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

<<<<<<< HEAD
// Post-save middleware to create Referral record when user is registered with referredBy
userSchema.post('save', async function(doc, next) {
  console.log(`[REFERRAL] Post-save hook triggered for user: ${doc.email}, wasNew: ${doc.wasNew}, referredBy: ${doc.referredBy}`);
  
  // Create referral record for users with a referrer (new users or users without existing referral)
  if (doc.referredBy) {
    console.log(`[REFERRAL] Checking referral record for user: ${doc.email}`);
    
    try {
      const Referral = require('./Referral.model');
      
      // Check if referral record already exists
      const existingReferral = await Referral.findOne({ 
        referrer: doc.referredBy, 
        referred: doc._id 
      });
      
      if (!existingReferral) {
        console.log(`[REFERRAL] Creating referral record for user: ${doc.email}`);
        
        // Find the referrer to get their referral code
        const referrer = await this.constructor.findById(doc.referredBy);
        console.log(`[REFERRAL] Referrer found:`, referrer ? `${referrer.email} (${referrer.referralCode})` : 'Not found');
        
        if (referrer && referrer.referralCode) {
          // Create the referral record
          const newReferral = await Referral.create({
            referrer: doc.referredBy,
            referred: doc._id,
            referralCode: referrer.referralCode,
            level: 1,
            status: 'pending',
            source: 'registration',
            commissionRate: 0.10 // 10% commission rate
          });
          
          console.log(`[REFERRAL] Successfully created referral record: ${referrer.referralCode} -> ${doc.email}`, newReferral._id);
        } else {
          console.log(`[REFERRAL] Referrer not found or no referral code for: ${doc.referredBy}`);
        }
      } else {
        console.log(`[REFERRAL] Referral record already exists for: ${doc.email}`);
      }
    } catch (error) {
      console.error('[REFERRAL] Error creating referral record:', error);
      // Don't throw error to avoid breaking user registration
    }
  } else {
    console.log(`[REFERRAL] Skipping referral creation - no referredBy field for: ${doc.email}`);
  }
  
  if (next) next();
});

=======
>>>>>>> clean-reset
// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

<<<<<<< HEAD
const User = mongoose.model('User', userSchema);

module.exports = User;
=======
// Method to invalidate all user tokens
userSchema.methods.invalidateTokens = function() {
  this.tokenVersion += 1;
  return this.save();
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by referral code
userSchema.statics.findByReferralCode = function(code) {
  return this.findOne({ referralCode: code.toUpperCase() });
};

// Method to update user balance
userSchema.methods.updateBalance = function(currency, amount, reason = 'balance_update') {
  if (currency === 'USDT') {
    // Convert Decimal128 to number for calculation
    const currentBalance = parseFloat(this.availableBalance.toString()) || 0;
    const newBalance = DecimalCalc.max(0, DecimalCalc.add(currentBalance, amount)); // Ensure balance doesn't go negative
    
    this.availableBalance = mongoose.Types.Decimal128.fromString(newBalance.toString());
    
    return this.save();
  }
  
  throw new Error(`Unsupported currency: ${currency}`);
};

module.exports = mongoose.model('User', userSchema);
>>>>>>> clean-reset
