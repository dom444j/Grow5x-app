const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

// Esquema para gestionar billeteras desde el panel de administración
const walletSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  network: {
    type: String,
    required: true,
    enum: ['BEP20'],
    default: 'BEP20'
  },
  currency: {
    type: String,
    required: true,
    default: 'USDT'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  lastUsed: {
    type: Date,
    default: null
  },
  usageCount: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  // Información adicional
  label: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // Configuración de uso
  maxUsage: {
    type: Number,
    default: 100 // Máximo número de veces que se puede usar
  },
  cooldownPeriod: {
    type: Number,
    default: 3600000 // 1 hora en milisegundos
  },
  // Configuración de prioridad y estado
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Configuración para billeteras de recaudo
  isPaymentWallet: {
    type: Boolean,
    default: false
  },
  distributionMethod: {
    type: String,
    enum: ['random', 'sequential', 'load_balanced'],
    default: 'random'
  },
  maxConcurrentUsers: {
    type: Number,
    default: 1,
    min: 1
  },
  // Metadatos de administración
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Estadísticas
  totalReceived: {
    type: Number,
    default: 0
  },
  transactionCount: {
    type: Number,
    default: 0
  },
  // Configuración de monitoreo
  monitoringEnabled: {
    type: Boolean,
    default: true
  },
  lastChecked: {
    type: Date,
    default: Date.now
  },
  // Notas administrativas
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Índices para optimizar consultas
walletSchema.index({ network: 1, status: 1 });
walletSchema.index({ isUsed: 1, status: 1 });
walletSchema.index({ lastUsed: 1 });
walletSchema.index({ address: 1 }, { unique: true });

// Método para obtener una billetera disponible (asignación aleatoria, múltiples usuarios)
walletSchema.statics.getAvailableWallet = async function(network = 'BEP20') {
  const now = new Date();
  
  // Buscar todas las billeteras activas de la red especificada
  const wallets = await this.find({
    network: network,
    status: 'active'
  });
  
  if (wallets.length === 0) {
    return null;
  }
  
  // Selección aleatoria de wallet
  const randomIndex = Math.floor(Math.random() * wallets.length);
  const selectedWallet = wallets[randomIndex];
  
  // Actualizar estadísticas de uso (sin bloquear la wallet)
  selectedWallet.lastUsed = now;
  selectedWallet.usageCount += 1;
  await selectedWallet.save();
  
  return selectedWallet;
};

// Método para liberar una billetera
walletSchema.methods.release = async function() {
  this.isUsed = false;
  return await this.save();
};

// Método para actualizar balance
walletSchema.methods.updateBalance = async function(amount) {
  this.balance += amount;
  this.totalReceived += amount;
  this.transactionCount += 1;
  this.lastChecked = new Date();
  return await this.save();
};

// Método para verificar disponibilidad
walletSchema.methods.isAvailable = function() {
  if (this.status !== 'active') return false;
  if (this.usageCount >= this.maxUsage) return false;
  
  if (this.isUsed && this.lastUsed) {
    const cooldownEnd = new Date(this.lastUsed.getTime() + this.cooldownPeriod);
    return new Date() > cooldownEnd;
  }
  
  return true;
};

// Middleware pre-save
walletSchema.pre('save', function(next) {
  if (this.isModified('address')) {
    this.address = this.address.trim();
  }
  next();
});

// Método virtual para tiempo restante de cooldown
walletSchema.virtual('cooldownRemaining').get(function() {
  if (!this.isUsed || !this.lastUsed) return 0;
  
  const cooldownEnd = new Date(this.lastUsed.getTime() + this.cooldownPeriod);
  const remaining = cooldownEnd.getTime() - new Date().getTime();
  
  return Math.max(0, remaining);
});

// Configurar toJSON para incluir virtuals
walletSchema.set('toJSON', { virtuals: true });

// Agregar plugin de paginación
walletSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Wallet', walletSchema);