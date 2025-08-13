const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  packages: [{
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: true
    },
    packageName: {
      type: String,
      required: true
    },
    totalInvested: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    currentValue: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    totalReturns: {
      type: Number,
      min: 0,
      default: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    activeInvestments: {
      type: Number,
      min: 0,
      default: 0
    },
    completedInvestments: {
      type: Number,
      min: 0,
      default: 0
    },
    averageYieldRate: {
      type: Number,
      min: 0,
      default: 0
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    firstInvestmentDate: {
      type: Date
    },
    lastInvestmentDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'completed'],
      default: 'active'
    }
  }],
  summary: {
    totalInvested: {
      type: Number,
      min: 0,
      default: 0
    },
    currentValue: {
      type: Number,
      min: 0,
      default: 0
    },
    totalReturns: {
      type: Number,
      min: 0,
      default: 0
    },
    totalActiveInvestments: {
      type: Number,
      min: 0,
      default: 0
    },
    totalCompletedInvestments: {
      type: Number,
      min: 0,
      default: 0
    },
    averageROI: {
      type: Number,
      min: 0,
      default: 0
    },
    portfolioYield: {
      type: Number,
      min: 0,
      default: 0
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 5
    }
  },
  diversification: {
    packageCount: {
      type: Number,
      min: 0,
      default: 0
    },
    riskDistribution: {
      low: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      medium: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      high: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      }
    },
    concentrationRisk: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    diversificationScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 5
    }
  },
  performance: {
    monthlyReturns: [{
      month: {
        type: String, // Format: YYYY-MM
        required: true
      },
      returns: {
        type: Number,
        default: 0
      },
      yield: {
        type: Number,
        default: 0
      },
      investedAmount: {
        type: Number,
        default: 0
      }
    }],
    bestPerformingPackage: {
      packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package'
      },
      packageName: String,
      roi: {
        type: Number,
        default: 0
      }
    },
    worstPerformingPackage: {
      packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package'
      },
      packageName: String,
      roi: {
        type: Number,
        default: 0
      }
    },
    volatility: {
      type: Number,
      min: 0,
      default: 0
    },
    sharpeRatio: {
      type: Number,
      default: 0
    }
  },
  goals: {
    targetAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    targetDate: {
      type: Date
    },
    monthlyTarget: {
      type: Number,
      min: 0,
      default: 0
    },
    riskTolerance: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      default: 'moderate'
    },
    autoRebalance: {
      type: Boolean,
      default: false
    },
    rebalanceThreshold: {
      type: Number,
      min: 0,
      max: 50,
      default: 10 // Porcentaje de desviación para rebalancear
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastCalculated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices
portfolioSchema.index({ user: 1 });
portfolioSchema.index({ 'packages.package': 1 });
portfolioSchema.index({ lastUpdated: -1 });
portfolioSchema.index({ 'summary.totalInvested': -1 });
portfolioSchema.index({ 'summary.totalReturns': -1 });

// Middleware para actualizar automáticamente los cálculos
portfolioSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  this.calculateSummary();
  this.calculateDiversification();
  this.calculateRiskScore();
  next();
});

// Métodos de instancia
portfolioSchema.methods.calculateSummary = function() {
  if (!this.packages || this.packages.length === 0) {
    this.summary = {
      totalInvested: 0,
      currentValue: 0,
      totalReturns: 0,
      totalActiveInvestments: 0,
      totalCompletedInvestments: 0,
      averageROI: 0,
      portfolioYield: 0,
      riskScore: 5
    };
    return;
  }

  let totalInvested = 0;
  let totalReturns = 0;
  let totalActiveInvestments = 0;
  let totalCompletedInvestments = 0;
  let weightedYield = 0;

  this.packages.forEach(pkg => {
    totalInvested += pkg.totalInvested;
    totalReturns += pkg.totalReturns;
    totalActiveInvestments += pkg.activeInvestments;
    totalCompletedInvestments += pkg.completedInvestments;
    
    // Calcular porcentaje de cada paquete
    if (totalInvested > 0) {
      pkg.percentage = (pkg.totalInvested / totalInvested) * 100;
      weightedYield += pkg.averageYieldRate * (pkg.percentage / 100);
    }
  });

  this.summary.totalInvested = totalInvested;
  this.summary.currentValue = totalInvested + totalReturns;
  this.summary.totalReturns = totalReturns;
  this.summary.totalActiveInvestments = totalActiveInvestments;
  this.summary.totalCompletedInvestments = totalCompletedInvestments;
  this.summary.averageROI = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
  this.summary.portfolioYield = weightedYield;
};

portfolioSchema.methods.calculateDiversification = function() {
  const packageCount = this.packages.length;
  this.diversification.packageCount = packageCount;

  if (packageCount === 0) {
    this.diversification.riskDistribution = { low: 0, medium: 0, high: 0 };
    this.diversification.concentrationRisk = 'low';
    this.diversification.diversificationScore = 0;
    return;
  }

  // Calcular distribución de riesgo
  let lowRisk = 0, mediumRisk = 0, highRisk = 0;
  let maxConcentration = 0;

  this.packages.forEach(pkg => {
    const percentage = pkg.percentage || 0;
    maxConcentration = Math.max(maxConcentration, percentage);

    switch (pkg.riskLevel) {
      case 'low':
        lowRisk += percentage;
        break;
      case 'medium':
        mediumRisk += percentage;
        break;
      case 'high':
        highRisk += percentage;
        break;
    }
  });

  this.diversification.riskDistribution = {
    low: Math.round(lowRisk),
    medium: Math.round(mediumRisk),
    high: Math.round(highRisk)
  };

  // Determinar riesgo de concentración
  if (maxConcentration > 70) {
    this.diversification.concentrationRisk = 'high';
  } else if (maxConcentration > 40) {
    this.diversification.concentrationRisk = 'medium';
  } else {
    this.diversification.concentrationRisk = 'low';
  }

  // Calcular score de diversificación (0-10)
  let diversificationScore = 0;
  if (packageCount >= 5) diversificationScore += 3;
  else if (packageCount >= 3) diversificationScore += 2;
  else if (packageCount >= 2) diversificationScore += 1;

  if (maxConcentration < 30) diversificationScore += 3;
  else if (maxConcentration < 50) diversificationScore += 2;
  else if (maxConcentration < 70) diversificationScore += 1;

  // Bonus por distribución equilibrada de riesgo
  const riskBalance = Math.min(lowRisk, mediumRisk, highRisk);
  if (riskBalance > 20) diversificationScore += 2;
  else if (riskBalance > 10) diversificationScore += 1;

  this.diversification.diversificationScore = Math.min(diversificationScore, 10);
};

portfolioSchema.methods.calculateRiskScore = function() {
  if (this.packages.length === 0) {
    this.summary.riskScore = 5;
    return;
  }

  let weightedRisk = 0;
  this.packages.forEach(pkg => {
    const weight = pkg.percentage / 100;
    let riskValue = 5; // Default medium risk
    
    switch (pkg.riskLevel) {
      case 'low':
        riskValue = 3;
        break;
      case 'medium':
        riskValue = 5;
        break;
      case 'high':
        riskValue = 8;
        break;
    }
    
    weightedRisk += riskValue * weight;
  });

  // Ajustar por concentración
  const concentrationMultiplier = {
    'low': 0.9,
    'medium': 1.0,
    'high': 1.2
  };

  this.summary.riskScore = Math.min(Math.max(
    weightedRisk * concentrationMultiplier[this.diversification.concentrationRisk], 
    1
  ), 10);
};

portfolioSchema.methods.addPackageInvestment = function(packageId, packageName, amount, yieldRate, riskLevel = 'medium') {
  const existingPackage = this.packages.find(p => p.package.toString() === packageId.toString());
  
  if (existingPackage) {
    // Actualizar paquete existente
    existingPackage.totalInvested += amount;
    existingPackage.currentValue += amount;
    existingPackage.activeInvestments += 1;
    existingPackage.lastInvestmentDate = new Date();
    
    // Recalcular yield rate promedio
    const totalInvestments = existingPackage.activeInvestments + existingPackage.completedInvestments;
    existingPackage.averageYieldRate = ((existingPackage.averageYieldRate * (totalInvestments - 1)) + yieldRate) / totalInvestments;
  } else {
    // Agregar nuevo paquete
    this.packages.push({
      package: packageId,
      packageName: packageName,
      totalInvested: amount,
      currentValue: amount,
      totalReturns: 0,
      percentage: 0, // Se calculará en calculateSummary
      activeInvestments: 1,
      completedInvestments: 0,
      averageYieldRate: yieldRate,
      riskLevel: riskLevel,
      firstInvestmentDate: new Date(),
      lastInvestmentDate: new Date(),
      status: 'active'
    });
  }
  
  return this.save();
};

portfolioSchema.methods.updatePackageReturns = function(packageId, returnsAmount) {
  const packageIndex = this.packages.findIndex(p => p.package.toString() === packageId.toString());
  
  if (packageIndex !== -1) {
    this.packages[packageIndex].totalReturns += returnsAmount;
    this.packages[packageIndex].currentValue += returnsAmount;
    return this.save();
  }
  
  return Promise.resolve(this);
};

portfolioSchema.methods.completeInvestment = function(packageId) {
  const packageIndex = this.packages.findIndex(p => p.package.toString() === packageId.toString());
  
  if (packageIndex !== -1) {
    this.packages[packageIndex].activeInvestments = Math.max(0, this.packages[packageIndex].activeInvestments - 1);
    this.packages[packageIndex].completedInvestments += 1;
    
    // Si no hay más inversiones activas, marcar como completado
    if (this.packages[packageIndex].activeInvestments === 0) {
      this.packages[packageIndex].status = 'completed';
    }
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Métodos estáticos
portfolioSchema.statics.getOrCreatePortfolio = async function(userId) {
  let portfolio = await this.findOne({ user: userId }).populate('packages.package');
  
  if (!portfolio) {
    portfolio = new this({
      user: userId,
      packages: [],
      summary: {
        totalInvested: 0,
        currentValue: 0,
        totalReturns: 0,
        totalActiveInvestments: 0,
        totalCompletedInvestments: 0,
        averageROI: 0,
        portfolioYield: 0,
        riskScore: 5
      }
    });
    await portfolio.save();
  }
  
  return portfolio;
};

portfolioSchema.statics.updatePortfolioFromInvestments = async function(userId) {
  const Investment = mongoose.model('Investment');
  const Package = mongoose.model('Package');
  
  // Obtener todas las inversiones del usuario
  const investments = await Investment.find({ user: userId }).populate('package');
  
  // Obtener o crear portfolio
  const portfolio = await this.getOrCreatePortfolio(userId);
  
  // Resetear packages
  portfolio.packages = [];
  
  // Agrupar inversiones por paquete
  const packageMap = new Map();
  
  investments.forEach(investment => {
    const packageId = investment.package._id.toString();
    
    if (!packageMap.has(packageId)) {
      packageMap.set(packageId, {
        package: investment.package._id,
        packageName: investment.package.name,
        totalInvested: 0,
        currentValue: 0,
        totalReturns: 0,
        activeInvestments: 0,
        completedInvestments: 0,
        averageYieldRate: 0,
        riskLevel: investment.package.riskLevel || 'medium',
        firstInvestmentDate: investment.startDate,
        lastInvestmentDate: investment.startDate,
        status: 'active',
        yieldRates: []
      });
    }
    
    const packageData = packageMap.get(packageId);
    packageData.totalInvested += investment.amount;
    packageData.currentValue += investment.amount + investment.totalReturns;
    packageData.totalReturns += investment.totalReturns;
    packageData.yieldRates.push(investment.dailyYieldRate);
    
    if (investment.status === 'active') {
      packageData.activeInvestments += 1;
    } else if (investment.status === 'completed') {
      packageData.completedInvestments += 1;
    }
    
    // Actualizar fechas
    if (investment.startDate < packageData.firstInvestmentDate) {
      packageData.firstInvestmentDate = investment.startDate;
    }
    if (investment.startDate > packageData.lastInvestmentDate) {
      packageData.lastInvestmentDate = investment.startDate;
    }
  });
  
  // Convertir map a array y calcular promedios
  packageMap.forEach(packageData => {
    // Calcular yield rate promedio
    if (packageData.yieldRates.length > 0) {
      packageData.averageYieldRate = packageData.yieldRates.reduce((sum, rate) => sum + rate, 0) / packageData.yieldRates.length;
    }
    delete packageData.yieldRates;
    
    // Determinar status del paquete
    if (packageData.activeInvestments > 0) {
      packageData.status = 'active';
    } else if (packageData.completedInvestments > 0) {
      packageData.status = 'completed';
    } else {
      packageData.status = 'inactive';
    }
    
    portfolio.packages.push(packageData);
  });
  
  return portfolio.save();
};

const Portfolio = mongoose.model('Portfolio', portfolioSchema);

module.exports = Portfolio;