const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const arbitrageSimulationSchema = new mongoose.Schema({
  // Información básica de la simulación
  simulationId: {
    type: String,
    required: true,
    unique: true,
    default: () => `ARB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Usuario asociado (opcional, puede ser simulación global)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Configuración de la simulación
  config: {
    // Tipo de arbitraje
    type: {
      type: String,
      enum: ['spot', 'futures', 'cross_exchange', 'triangular', 'statistical'],
      required: true
    },
    
    // Par de trading
    tradingPair: {
      base: { type: String, required: true }, // BTC, ETH, etc.
      quote: { type: String, required: true }, // USDT, USD, etc.
      symbol: { type: String, required: true } // BTCUSDT
    },
    
    // Exchanges involucrados
    exchanges: [{
      name: { type: String, required: true }, // Binance, Coinbase, etc.
      fee: { type: Number, default: 0.001 }, // Fee del exchange
      latency: { type: Number, default: 100 } // Latencia en ms
    }],
    
    // Parámetros de la simulación
    parameters: {
      initialCapital: { type: Number, required: true },
      maxPositionSize: { type: Number, required: true },
      minProfitThreshold: { type: Number, default: 0.001 }, // 0.1%
      maxRiskPerTrade: { type: Number, default: 0.02 }, // 2%
      stopLossPercentage: { type: Number, default: 0.005 }, // 0.5%
      takeProfitPercentage: { type: Number, default: 0.01 } // 1%
    }
  },
  
  // Estado de la simulación
  status: {
    type: String,
    enum: ['pending', 'running', 'paused', 'completed', 'error'],
    default: 'pending'
  },
  
  // Resultados de la simulación
  results: {
    // Métricas financieras
    totalTrades: { type: Number, default: 0 },
    successfulTrades: { type: Number, default: 0 },
    failedTrades: { type: Number, default: 0 },
    
    // Rendimiento
    totalProfit: { type: Number, default: 0 },
    totalLoss: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    profitPercentage: { type: Number, default: 0 },
    
    // Estadísticas
    winRate: { type: Number, default: 0 },
    averageProfit: { type: Number, default: 0 },
    averageLoss: { type: Number, default: 0 },
    maxDrawdown: { type: Number, default: 0 },
    sharpeRatio: { type: Number, default: 0 },
    
    // Balance actual
    currentBalance: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    lockedBalance: { type: Number, default: 0 }
  },
  
  // Historial de operaciones
  trades: [{
    tradeId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['buy', 'sell'], required: true },
    exchange: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    fee: { type: Number, required: true },
    profit: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'filled', 'cancelled'], default: 'pending' }
  }],
  
  // Datos de mercado simulados
  marketData: {
    currentPrices: [{
      exchange: String,
      price: Number,
      timestamp: { type: Date, default: Date.now },
      volume: Number,
      spread: Number
    }],
    
    priceHistory: [{
      timestamp: { type: Date, default: Date.now },
      prices: [{
        exchange: String,
        price: Number,
        volume: Number
      }],
      arbitrageOpportunity: {
        detected: { type: Boolean, default: false },
        profitPotential: { type: Number, default: 0 },
        exchanges: [String]
      }
    }]
  },
  
  // Control administrativo
  adminControl: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Configuración de beneficios
    benefitSettings: {
      enabled: { type: Boolean, default: true },
      profitMultiplier: { type: Number, default: 1.0 }, // Multiplicador de ganancias
      maxDailyProfit: { type: Number, default: 1000 },
      distributionSchedule: {
        frequency: { type: String, enum: ['hourly', 'daily', 'weekly'], default: 'daily' },
        nextDistribution: { type: Date }
      }
    },
    
    // Configuración de impresión/captura
    printSettings: {
      autoCapture: { type: Boolean, default: true },
      captureInterval: { type: Number, default: 3600000 }, // 1 hora en ms
      lastCapture: { type: Date },
      captureFormat: { type: String, enum: ['json', 'pdf', 'csv'], default: 'json' }
    },
    
    // Notas administrativas
    notes: [{
      timestamp: { type: Date, default: Date.now },
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      type: { type: String, enum: ['info', 'warning', 'error', 'success'], default: 'info' }
    }]
  },
  
  // Configuración de visualización
  displaySettings: {
    showToUser: { type: Boolean, default: true },
    showRealTimeData: { type: Boolean, default: true },
    allowUserInteraction: { type: Boolean, default: false },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' }
  },
  
  // Metadatos
  metadata: {
    version: { type: String, default: '1.0.0' },
    tags: [String],
    description: String,
    isTemplate: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimizar consultas
arbitrageSimulationSchema.index({ simulationId: 1 });
arbitrageSimulationSchema.index({ userId: 1, status: 1 });
arbitrageSimulationSchema.index({ 'adminControl.createdBy': 1 });
arbitrageSimulationSchema.index({ status: 1, createdAt: -1 });
arbitrageSimulationSchema.index({ 'config.type': 1, 'config.tradingPair.symbol': 1 });

// Añadir plugin de paginación
arbitrageSimulationSchema.plugin(mongoosePaginate);

// Virtual para calcular el ROI
arbitrageSimulationSchema.virtual('roi').get(function() {
  if (this.config.parameters.initialCapital === 0) return 0;
  return (this.results.netProfit / this.config.parameters.initialCapital) * 100;
});

// Virtual para calcular el tiempo de ejecución
arbitrageSimulationSchema.virtual('runtime').get(function() {
  if (this.status === 'pending') return 0;
  const endTime = this.status === 'completed' ? this.updatedAt : new Date();
  return endTime - this.createdAt;
});

// Método para iniciar la simulación
arbitrageSimulationSchema.methods.start = function() {
  this.status = 'running';
  this.results.currentBalance = this.config.parameters.initialCapital;
  this.results.availableBalance = this.config.parameters.initialCapital;
  return this.save();
};

// Método para pausar la simulación
arbitrageSimulationSchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

// Método para completar la simulación
arbitrageSimulationSchema.methods.complete = function() {
  this.status = 'completed';
  this.results.profitPercentage = this.roi;
  return this.save();
};

// Método para agregar una operación
arbitrageSimulationSchema.methods.addTrade = function(tradeData) {
  const trade = {
    tradeId: `TRADE_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    ...tradeData
  };
  
  this.trades.push(trade);
  this.results.totalTrades += 1;
  
  if (trade.profit > 0) {
    this.results.successfulTrades += 1;
    this.results.totalProfit += trade.profit;
  } else {
    this.results.failedTrades += 1;
    this.results.totalLoss += Math.abs(trade.profit);
  }
  
  this.results.netProfit = this.results.totalProfit - this.results.totalLoss;
  this.results.winRate = (this.results.successfulTrades / this.results.totalTrades) * 100;
  
  return this.save();
};

// Método para capturar estado actual
arbitrageSimulationSchema.methods.captureState = function() {
  const capture = {
    timestamp: new Date(),
    simulationId: this.simulationId,
    status: this.status,
    results: this.results,
    marketData: this.marketData.currentPrices,
    recentTrades: this.trades.slice(-10) // Últimas 10 operaciones
  };
  
  this.adminControl.printSettings.lastCapture = new Date();
  return { capture, simulation: this.save() };
};

// Método estático para crear simulación desde template
arbitrageSimulationSchema.statics.createFromTemplate = function(templateId, userId, adminId) {
  return this.findById(templateId).then(template => {
    if (!template || !template.metadata.isTemplate) {
      throw new Error('Template no encontrado');
    }
    
    const newSimulation = new this({
      userId,
      config: template.config,
      adminControl: {
        ...template.adminControl,
        createdBy: adminId
      },
      displaySettings: template.displaySettings,
      metadata: {
        ...template.metadata,
        isTemplate: false,
        description: `Simulación basada en template: ${template.metadata.description}`
      }
    });
    
    return newSimulation.save();
  });
};

module.exports = mongoose.model('ArbitrageSimulation', arbitrageSimulationSchema);