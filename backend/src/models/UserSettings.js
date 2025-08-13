const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Configuraciones generales
  general: {
    language: {
      type: String,
      enum: ['es', 'en', 'pt', 'fr'],
      default: 'es'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    timezone: {
      type: String,
      default: 'America/Mexico_City'
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'MXN', 'BRL', 'ARS'],
      default: 'USD'
    },
    dateFormat: {
      type: String,
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      default: 'DD/MM/YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '24h'
    }
  },
  
  // Configuraciones de notificaciones
  notifications: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    marketingEmails: {
      type: Boolean,
      default: false
    },
    securityAlerts: {
      type: Boolean,
      default: true
    },
    transactionAlerts: {
      type: Boolean,
      default: true
    },
    referralNotifications: {
      type: Boolean,
      default: true
    },
    systemUpdates: {
      type: Boolean,
      default: true
    },
    newsAndUpdates: {
      type: Boolean,
      default: true
    },
    promotionalOffers: {
      type: Boolean,
      default: false
    }
  },
  
  // Configuraciones de privacidad
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'private', 'friends'],
      default: 'private'
    },
    showEmail: {
      type: Boolean,
      default: false
    },
    showPhone: {
      type: Boolean,
      default: false
    },
    showLastActivity: {
      type: Boolean,
      default: true
    },
    allowDataCollection: {
      type: Boolean,
      default: false
    },
    allowAnalytics: {
      type: Boolean,
      default: true
    },
    allowCookies: {
      type: Boolean,
      default: true
    },
    shareDataWithPartners: {
      type: Boolean,
      default: false
    },
    personalizedAds: {
      type: Boolean,
      default: false
    }
  },
  
  // Configuraciones de seguridad
  security: {
    sessionTimeout: {
      type: Number,
      default: 30, // minutos
      min: 5,
      max: 120
    },
    loginNotifications: {
      type: Boolean,
      default: true
    },
    deviceTracking: {
      type: Boolean,
      default: true
    },
    ipWhitelist: [{
      type: String
    }],
    autoLogout: {
      type: Boolean,
      default: true
    },
    requirePasswordForSensitiveActions: {
      type: Boolean,
      default: true
    },
    allowMultipleSessions: {
      type: Boolean,
      default: true
    },
    maxActiveSessions: {
      type: Number,
      default: 5,
      min: 1,
      max: 10
    }
  },
  
  // Configuraciones de trading/inversión
  trading: {
    defaultInvestmentAmount: {
      type: Number,
      default: 100,
      min: 1
    },
    riskTolerance: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    autoReinvest: {
      type: Boolean,
      default: false
    },
    stopLossPercentage: {
      type: Number,
      default: 10,
      min: 1,
      max: 50
    },
    takeProfitPercentage: {
      type: Number,
      default: 20,
      min: 5,
      max: 100
    },
    enableTradingAlerts: {
      type: Boolean,
      default: true
    }
  },
  
  // Configuraciones de dashboard
  dashboard: {
    defaultView: {
      type: String,
      enum: ['overview', 'portfolio', 'transactions', 'analytics'],
      default: 'overview'
    },
    showWelcomeMessage: {
      type: Boolean,
      default: true
    },
    compactMode: {
      type: Boolean,
      default: false
    },
    refreshInterval: {
      type: Number,
      default: 30, // segundos
      min: 10,
      max: 300
    },
    widgetOrder: [{
      type: String
    }],
    hiddenWidgets: [{
      type: String
    }]
  },
  
  // Configuraciones de comunicación
  communication: {
    preferredContactMethod: {
      type: String,
      enum: ['email', 'sms', 'push', 'in-app'],
      default: 'in-app'
    },
    supportLanguage: {
      type: String,
      enum: ['es', 'en', 'pt', 'fr'],
      default: 'es'
    },
    allowSupportCalls: {
      type: Boolean,
      default: true
    },
    businessHoursOnly: {
      type: Boolean,
      default: false
    }
  },
  
  // Configuraciones de API
  api: {
    enableApiAccess: {
      type: Boolean,
      default: false
    },
    rateLimitPerHour: {
      type: Number,
      default: 1000,
      min: 100,
      max: 10000
    },
    allowedIPs: [{
      type: String
    }],
    webhookUrl: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'URL de webhook debe ser válida'
      }
    }
  },
  
  // Metadatos
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
userSettingsSchema.index({ userId: 1 }, { unique: true });
userSettingsSchema.index({ updatedAt: -1 });
userSettingsSchema.index({ 'general.language': 1 });
userSettingsSchema.index({ 'general.theme': 1 });

// Middleware pre-save
userSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.version += 1;
  next();
});

// Métodos de instancia
userSettingsSchema.methods.updateLastAccessed = function() {
  this.lastAccessedAt = new Date();
  return this.save();
};

userSettingsSchema.methods.resetToDefaults = function(category = 'all') {
  const defaults = {
    general: {
      language: 'es',
      theme: 'system',
      timezone: 'America/Mexico_City',
      currency: 'USD',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h'
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      marketingEmails: false,
      securityAlerts: true,
      transactionAlerts: true,
      referralNotifications: true,
      systemUpdates: true,
      newsAndUpdates: true,
      promotionalOffers: false
    },
    privacy: {
      profileVisibility: 'private',
      showEmail: false,
      showPhone: false,
      showLastActivity: true,
      allowDataCollection: false,
      allowAnalytics: true,
      allowCookies: true,
      shareDataWithPartners: false,
      personalizedAds: false
    },
    security: {
      sessionTimeout: 30,
      loginNotifications: true,
      deviceTracking: true,
      ipWhitelist: [],
      autoLogout: true,
      requirePasswordForSensitiveActions: true,
      allowMultipleSessions: true,
      maxActiveSessions: 5
    },
    trading: {
      defaultInvestmentAmount: 100,
      riskTolerance: 'medium',
      autoReinvest: false,
      stopLossPercentage: 10,
      takeProfitPercentage: 20,
      enableTradingAlerts: true
    },
    dashboard: {
      defaultView: 'overview',
      showWelcomeMessage: true,
      compactMode: false,
      refreshInterval: 30,
      widgetOrder: [],
      hiddenWidgets: []
    },
    communication: {
      preferredContactMethod: 'in-app',
      supportLanguage: 'es',
      allowSupportCalls: true,
      businessHoursOnly: false
    },
    api: {
      enableApiAccess: false,
      rateLimitPerHour: 1000,
      allowedIPs: [],
      webhookUrl: ''
    }
  };
  
  if (category === 'all') {
    Object.keys(defaults).forEach(key => {
      this[key] = defaults[key];
    });
  } else if (defaults[category]) {
    this[category] = defaults[category];
  }
  
  return this;
};

// Métodos estáticos
userSettingsSchema.statics.getDefaultSettings = function() {
  return {
    general: {
      language: 'es',
      theme: 'system',
      timezone: 'America/Mexico_City',
      currency: 'USD',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h'
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      marketingEmails: false,
      securityAlerts: true,
      transactionAlerts: true,
      referralNotifications: true,
      systemUpdates: true,
      newsAndUpdates: true,
      promotionalOffers: false
    },
    privacy: {
      profileVisibility: 'private',
      showEmail: false,
      showPhone: false,
      showLastActivity: true,
      allowDataCollection: false,
      allowAnalytics: true,
      allowCookies: true,
      shareDataWithPartners: false,
      personalizedAds: false
    },
    security: {
      sessionTimeout: 30,
      loginNotifications: true,
      deviceTracking: true,
      ipWhitelist: [],
      autoLogout: true,
      requirePasswordForSensitiveActions: true,
      allowMultipleSessions: true,
      maxActiveSessions: 5
    },
    trading: {
      defaultInvestmentAmount: 100,
      riskTolerance: 'medium',
      autoReinvest: false,
      stopLossPercentage: 10,
      takeProfitPercentage: 20,
      enableTradingAlerts: true
    },
    dashboard: {
      defaultView: 'overview',
      showWelcomeMessage: true,
      compactMode: false,
      refreshInterval: 30,
      widgetOrder: [],
      hiddenWidgets: []
    },
    communication: {
      preferredContactMethod: 'in-app',
      supportLanguage: 'es',
      allowSupportCalls: true,
      businessHoursOnly: false
    },
    api: {
      enableApiAccess: false,
      rateLimitPerHour: 1000,
      allowedIPs: [],
      webhookUrl: ''
    }
  };
};

userSettingsSchema.statics.createDefaultForUser = async function(userId) {
  const defaultSettings = this.getDefaultSettings();
  const settings = new this({
    userId,
    ...defaultSettings
  });
  return await settings.save();
};

// Virtual para obtener configuraciones completas
userSettingsSchema.virtual('fullSettings').get(function() {
  return {
    general: this.general,
    notifications: this.notifications,
    privacy: this.privacy,
    security: this.security,
    trading: this.trading,
    dashboard: this.dashboard,
    communication: this.communication,
    api: this.api
  };
});

// Configurar toJSON para incluir virtuals
userSettingsSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('UserSettings', userSettingsSchema);