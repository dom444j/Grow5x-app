const mongoose = require('mongoose');

const systemMetricSchema = new mongoose.Schema({
  // Identificador único de la métrica
  metricId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Tipo de métrica
  type: {
    type: String,
    enum: [
      'user_count',
      'active_users',
      'new_registrations',
      'total_investments',
      'active_investments',
      'total_volume',
      'daily_volume',
      'total_withdrawals',
      'pending_withdrawals',
      'total_deposits',
      'platform_balance',
      'liquidity_pool',
      'referral_commissions',
      'system_revenue',
      'kyc_pending',
      'kyc_approved',
      'conversion_rate',
      'retention_rate',
      'churn_rate',
      'avg_investment_size',
      'roi_performance',
      'system_health',
      'api_calls',
      'error_rate',
      'response_time'
    ],
    required: true
  },
  
  // Categoría de la métrica
  category: {
    type: String,
    enum: ['users', 'investments', 'financial', 'system', 'performance', 'security'],
    required: true
  },
  
  // Valor de la métrica
  value: {
    type: mongoose.Schema.Types.Mixed, // Puede ser Number, String, Object
    required: true
  },
  
  // Valor anterior (para comparaciones)
  previousValue: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Cambio porcentual
  changePercent: {
    type: Number
  },
  
  // Tendencia
  trend: {
    type: String,
    enum: ['up', 'down', 'stable', 'unknown'],
    default: 'unknown'
  },
  
  // Período de tiempo
  period: {
    type: String,
    enum: ['real_time', 'hourly', 'daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  
  // Fecha específica para métricas periódicas
  date: {
    type: Date,
    required: true
  },
  
  // Rango de fechas para métricas calculadas
  dateRange: {
    start: Date,
    end: Date
  },
  
  // Metadatos adicionales
  metadata: {
    unit: String, // 'USD', 'users', 'percentage', etc.
    description: String,
    source: String, // De dónde viene la métrica
    calculationMethod: String,
    filters: mongoose.Schema.Types.Mixed, // Filtros aplicados
    breakdown: mongoose.Schema.Types.Mixed // Desglose por categorías
  },
  
  // Estado de la métrica
  status: {
    type: String,
    enum: ['active', 'deprecated', 'error', 'calculating'],
    default: 'active'
  },
  
  // Alertas y umbrales
  alerts: {
    enabled: {
      type: Boolean,
      default: false
    },
    thresholds: {
      critical: {
        min: Number,
        max: Number
      },
      warning: {
        min: Number,
        max: Number
      },
      target: Number
    },
    lastAlert: Date,
    alertCount: {
      type: Number,
      default: 0
    }
  },
  
  // Configuración de actualización
  updateConfig: {
    autoUpdate: {
      type: Boolean,
      default: true
    },
    updateFrequency: {
      type: String,
      enum: ['real_time', '5min', '15min', '30min', '1hour', '6hour', '12hour', '24hour'],
      default: '1hour'
    },
    lastUpdate: Date,
    nextUpdate: Date
  },
  
  // Historial de valores (últimos 30 registros)
  history: [{
    value: mongoose.Schema.Types.Mixed,
    date: {
      type: Date,
      default: Date.now
    },
    changeFromPrevious: Number
  }],
  
  // Información de cálculo
  calculation: {
    formula: String,
    dependencies: [String], // IDs de otras métricas necesarias
    lastCalculated: Date,
    calculationTime: Number, // Tiempo en ms
    errors: [{
      message: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Visibilidad y permisos
  visibility: {
    public: {
      type: Boolean,
      default: false
    },
    roles: [{
      type: String,
      enum: ['admin', 'manager', 'analyst', 'viewer']
    }],
    dashboard: {
      type: Boolean,
      default: true
    },
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    }
  }
}, {
  timestamps: true
});

// Índices
systemMetricSchema.index({ metricId: 1 }, { unique: true });
systemMetricSchema.index({ type: 1, period: 1, date: -1 });
systemMetricSchema.index({ category: 1, date: -1 });
systemMetricSchema.index({ status: 1 });
systemMetricSchema.index({ 'updateConfig.nextUpdate': 1 });
systemMetricSchema.index({ 'alerts.enabled': 1, 'alerts.lastAlert': 1 });
systemMetricSchema.index({ 'visibility.dashboard': 1, 'visibility.priority': -1 });

// Índices compuestos
systemMetricSchema.index({ type: 1, date: -1 });
systemMetricSchema.index({ category: 1, period: 1, date: -1 });
systemMetricSchema.index({ status: 1, 'updateConfig.autoUpdate': 1 });

// Virtual para obtener el cambio desde el valor anterior
systemMetricSchema.virtual('change').get(function() {
  if (this.previousValue && typeof this.value === 'number' && typeof this.previousValue === 'number') {
    return this.value - this.previousValue;
  }
  return null;
});

// Virtual para verificar si está en alerta
systemMetricSchema.virtual('isInAlert').get(function() {
  if (!this.alerts.enabled || typeof this.value !== 'number') return false;
  
  const { critical, warning } = this.alerts.thresholds;
  
  if (critical) {
    if ((critical.min && this.value < critical.min) || (critical.max && this.value > critical.max)) {
      return 'critical';
    }
  }
  
  if (warning) {
    if ((warning.min && this.value < warning.min) || (warning.max && this.value > warning.max)) {
      return 'warning';
    }
  }
  
  return false;
});

// Virtual para verificar si necesita actualización
systemMetricSchema.virtual('needsUpdate').get(function() {
  if (!this.updateConfig.autoUpdate) return false;
  return this.updateConfig.nextUpdate && new Date() > this.updateConfig.nextUpdate;
});

// Middleware para calcular tendencia y cambio porcentual
systemMetricSchema.pre('save', function(next) {
  // Calcular cambio porcentual
  if (this.previousValue && typeof this.value === 'number' && typeof this.previousValue === 'number') {
    if (this.previousValue !== 0) {
      this.changePercent = ((this.value - this.previousValue) / Math.abs(this.previousValue)) * 100;
    }
    
    // Determinar tendencia
    if (this.value > this.previousValue) {
      this.trend = 'up';
    } else if (this.value < this.previousValue) {
      this.trend = 'down';
    } else {
      this.trend = 'stable';
    }
  }
  
  // Actualizar historial
  if (this.isModified('value')) {
    const historyEntry = {
      value: this.value,
      date: new Date(),
      changeFromPrevious: this.change
    };
    
    this.history.push(historyEntry);
    
    // Mantener solo los últimos 30 registros
    if (this.history.length > 30) {
      this.history = this.history.slice(-30);
    }
  }
  
  // Calcular próxima actualización
  if (this.updateConfig.autoUpdate && this.isModified('updateConfig.updateFrequency')) {
    this.updateConfig.nextUpdate = this.calculateNextUpdate();
  }
  
  next();
});

// Método para calcular próxima actualización
systemMetricSchema.methods.calculateNextUpdate = function() {
  const now = new Date();
  const frequency = this.updateConfig.updateFrequency;
  
  switch (frequency) {
    case 'real_time':
      return new Date(now.getTime() + 1000); // 1 segundo
    case '5min':
      return new Date(now.getTime() + 5 * 60 * 1000);
    case '15min':
      return new Date(now.getTime() + 15 * 60 * 1000);
    case '30min':
      return new Date(now.getTime() + 30 * 60 * 1000);
    case '1hour':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case '6hour':
      return new Date(now.getTime() + 6 * 60 * 60 * 1000);
    case '12hour':
      return new Date(now.getTime() + 12 * 60 * 60 * 1000);
    case '24hour':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 60 * 60 * 1000); // 1 hora por defecto
  }
};

// Método para actualizar valor
systemMetricSchema.methods.updateValue = function(newValue, metadata = {}) {
  this.previousValue = this.value;
  this.value = newValue;
  this.updateConfig.lastUpdate = new Date();
  this.updateConfig.nextUpdate = this.calculateNextUpdate();
  
  // Actualizar metadata si se proporciona
  if (Object.keys(metadata).length > 0) {
    this.metadata = { ...this.metadata, ...metadata };
  }
  
  return this.save();
};

// Método para verificar alertas
systemMetricSchema.methods.checkAlerts = function() {
  const alertLevel = this.isInAlert;
  
  if (alertLevel) {
    this.alerts.lastAlert = new Date();
    this.alerts.alertCount += 1;
    return alertLevel;
  }
  
  return false;
};

// Método estático para obtener métricas del dashboard
systemMetricSchema.statics.getDashboardMetrics = function(roles = []) {
  const query = {
    'visibility.dashboard': true,
    status: 'active'
  };
  
  if (roles.length > 0) {
    query['visibility.roles'] = { $in: roles };
  }
  
  return this.find(query)
    .sort({ 'visibility.priority': -1, updatedAt: -1 })
    .limit(20);
};

// Método estático para obtener métricas por categoría
systemMetricSchema.statics.getByCategory = function(category, period = 'daily', limit = 10) {
  return this.find({
    category: category,
    period: period,
    status: 'active'
  })
  .sort({ date: -1 })
  .limit(limit);
};

// Método estático para obtener métricas que necesitan actualización
systemMetricSchema.statics.getNeedingUpdate = function() {
  return this.find({
    'updateConfig.autoUpdate': true,
    'updateConfig.nextUpdate': { $lt: new Date() },
    status: 'active'
  });
};

// Método estático para obtener métricas en alerta
systemMetricSchema.statics.getAlertsActive = function() {
  return this.find({
    'alerts.enabled': true,
    status: 'active'
  }).then(metrics => {
    return metrics.filter(metric => metric.isInAlert);
  });
};

// Método estático para crear o actualizar métrica
systemMetricSchema.statics.createOrUpdate = function(metricData) {
  return this.findOneAndUpdate(
    { metricId: metricData.metricId },
    metricData,
    { upsert: true, new: true, runValidators: true }
  );
};

const SystemMetric = mongoose.model('SystemMetric', systemMetricSchema);

module.exports = SystemMetric;