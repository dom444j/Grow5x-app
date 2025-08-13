const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'referral',
      'payment',
      'security',
      'notification',
      'general',
      'maintenance',
      'limits',
      'fees'
    ]
  },
  description: {
    type: String,
    required: true
  },
  dataType: {
    type: String,
    required: true,
    enum: ['string', 'number', 'boolean', 'object', 'array']
  },
  isPublic: {
    type: Boolean,
    default: false // Si es true, puede ser accedido por usuarios normales
  },
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    required: Boolean,
    options: [String] // Para valores enum
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  },
  history: [{
    value: mongoose.Schema.Types.Mixed,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]
}, {
  timestamps: true
});

// Índices
systemSettingSchema.index({ key: 1 });
systemSettingSchema.index({ category: 1 });
systemSettingSchema.index({ isPublic: 1 });
systemSettingSchema.index({ lastModified: -1 });

// Middleware para actualizar version y history
systemSettingSchema.pre('save', function(next) {
  if (this.isModified('value') && !this.isNew) {
    this.version += 1;
    this.lastModified = new Date();
    
    // Agregar al historial
    this.history.push({
      value: this.value,
      updatedBy: this.updatedBy,
      timestamp: new Date()
    });
    
    // Mantener solo los últimos 10 cambios
    if (this.history.length > 10) {
      this.history = this.history.slice(-10);
    }
  }
  next();
});

// Método estático para obtener configuración por clave
systemSettingSchema.statics.getSetting = async function(key, defaultValue = null) {
  try {
    const setting = await this.findOne({ key });
    return setting ? setting.value : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

// Método estático para actualizar configuración
systemSettingSchema.statics.updateSetting = async function(key, value, updatedBy, reason = '') {
  try {
    const setting = await this.findOneAndUpdate(
      { key },
      { 
        value, 
        updatedBy,
        lastModified: new Date(),
        $push: {
          history: {
            $each: [{ value, updatedBy, timestamp: new Date(), reason }],
            $slice: -10 // Mantener solo los últimos 10
          }
        },
        $inc: { version: 1 }
      },
      { new: true, upsert: false }
    );
    return setting;
  } catch (error) {
    throw error;
  }
};

// Método estático para obtener configuraciones por categoría
systemSettingSchema.statics.getSettingsByCategory = async function(category, includePrivate = false) {
  try {
    const query = { category };
    if (!includePrivate) {
      query.isPublic = true;
    }
    return await this.find(query).select('key value description dataType validation');
  } catch (error) {
    return [];
  }
};

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);

module.exports = SystemSetting;