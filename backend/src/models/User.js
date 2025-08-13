const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateReferralCode } = require('../utils/helpers');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  // Campos adicionales de perfil para formularios
  phone: {
    type: String,
    trim: true
  },
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
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
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
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Set wasNew flag for post-save middleware
  this.wasNew = this.isNew;
  console.log(`[REFERRAL] Pre-save hook: user ${this.email}, isNew: ${this.isNew}, wasNew: ${this.wasNew}`);
  
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

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

const User = mongoose.model('User', userSchema);

module.exports = User;