const mongoose = require('mongoose');

/**
 * UserStatus Model - Sistema de Estados Unificado (Fase 1)
 * 
 * Este modelo centraliza toda la información de estado del usuario
 * para facilitar la gestión administrativa y automatización de procesos.
 * 
 * Diseñado para trabajar junto al modelo User existente sin modificarlo.
 */
const userStatusSchema = new mongoose.Schema({
  // Referencia al usuario
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // === ESTADO DE SUSCRIPCIÓN/PAQUETE ===
  subscription: {
    // Paquete actual activo
    currentPackage: {
      type: String,
      enum: ['starter', 'basic', 'standard', 'premium', 'gold', 'platinum', 'diamond', ''],
      default: ''
    },
    // Estado del paquete
    packageStatus: {
      type: String,
      enum: ['none', 'active', 'paused', 'expired', 'cancelled'],
      default: 'none'
    },
    // Fechas importantes
    activatedAt: Date,
    expiresAt: Date,
    lastBenefitDate: Date, // Último día que recibió beneficios
    
    // Ciclo de beneficios (8 días activos + 1 día pausa)
    benefitCycle: {
      currentDay: {
        type: Number,
        default: 0, // 0 = no iniciado, 1-8 = días activos, 9 = día de pausa
        min: 0,
        max: 9
      },
      cycleStartDate: Date,
      nextBenefitDate: Date,
      isPaused: {
        type: Boolean,
        default: false
      },
      totalCyclesCompleted: {
        type: Number,
        default: 0
      },
      // Seguimiento de semanas completadas (5 semanas de 8 días + 1 ajuste)
      weeksCompleted: {
        type: Number,
        default: 0
      },
      maxWeeks: {
        type: Number,
        default: 5 // Máximo 5 semanas hasta completar 500%
      }
    },

    // Beneficios acumulados
    benefits: {
      dailyRate: {
        type: Number,
        default: 0.125 // 12.5%
      },
      totalEarned: {
        type: Number,
        default: 0
      },
      pendingBenefits: {
        type: Number,
        default: 0
      },
      lastCalculatedAt: Date
    }
  },

  // === ESTADO PIONEER ===
  pioneer: {
    isActive: {
      type: Boolean,
      default: false
    },
    level: {
      type: String,
      enum: ['basic', 'premium', 'elite', ''],
      default: ''
    },
    // Período de espera de 48 horas
    waitingPeriod: {
      isInWaitingPeriod: {
        type: Boolean,
        default: false
      },
      startedAt: Date,
      endsAt: Date
    },
    activatedAt: Date,
    expiresAt: Date,
    benefits: {
      discountPercentage: {
        type: Number,
        default: 0
      },
      prioritySupport: {
        type: Boolean,
        default: false
      },
      fastWithdrawals: {
        type: Boolean,
        default: false
      }
    }
  },

  // === MÉTRICAS DE ACTIVIDAD ===
  activity: {
    // Última actividad significativa
    lastLogin: Date,
    lastTransaction: Date,
    lastWithdrawal: Date,
    lastDeposit: Date,
    
    // Contadores
    totalTransactions: {
      type: Number,
      default: 0
    },
    totalWithdrawals: {
      type: Number,
      default: 0
    },
    totalDeposits: {
      type: Number,
      default: 0
    },
    
    // Estado de actividad
    isActive: {
      type: Boolean,
      default: true
    },
    inactivityDays: {
      type: Number,
      default: 0
    }
  },

  // === SISTEMA DE REFERIDOS ===
  referrals: {
    // Información del referidor
    referredBy: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isLeaderCode: {
        type: Boolean,
        default: false
      },
      commissionPaid: {
        type: Number,
        default: 0
      }
    },
    
    // Referidos directos
    directReferrals: {
      count: {
        type: Number,
        default: 0
      },
      activeCount: {
        type: Number,
        default: 0
      },
      pioneerCount: {
        type: Number,
        default: 0
      },
      totalCommissionsEarned: {
        type: Number,
        default: 0
      }
    },

    // Comisiones pendientes
    pendingCommissions: {
      directReferral: {
        type: Number,
        default: 0
      },
      leaderBonus: {
        type: Number,
        default: 0
      },
      parentBonus: {
        type: Number,
        default: 0
      }
    }
  },

  // === TRACKING DE COMISIONES ===
  commissionTracking: {
    totalEarned: {
      type: Number,
      default: 0
    },
    pendingCommissions: {
      type: Number,
      default: 0
    },
    paidCommissions: {
      type: Number,
      default: 0
    },
    byType: {
      directReferral: {
        type: Number,
        default: 0
      },
      leaderBonus: {
        type: Number,
        default: 0
      },
      parentBonus: {
        type: Number,
        default: 0
      }
    },
    lastCommissionDate: Date,
    // Tracking de pagos únicos por usuario
    uniquePayments: {
      leaderBonusPaid: [{
        fromUserId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        paidAt: Date,
        amount: Number
      }],
      parentBonusPaid: [{
        fromUserId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        paidAt: Date,
        amount: Number
      }]
    }
  },

  // === GESTIÓN FINANCIERA ===
  financial: {
    // Balance actual
    currentBalance: {
      type: Number,
      default: 0
    },
    
    // Retiros
    withdrawals: {
      pendingAmount: {
        type: Number,
        default: 0
      },
      pendingCount: {
        type: Number,
        default: 0
      },
      lastWithdrawalRequest: Date,
      totalWithdrawn: {
        type: Number,
        default: 0
      }
    },
    
    // Límites y restricciones
    limits: {
      dailyWithdrawalLimit: {
        type: Number,
        default: 1000
      },
      monthlyWithdrawalLimit: {
        type: Number,
        default: 10000
      },
      usedDailyLimit: {
        type: Number,
        default: 0
      },
      usedMonthlyLimit: {
        type: Number,
        default: 0
      },
      lastLimitReset: Date,

    }
  },

  // === FLAGS ADMINISTRATIVOS ===
  adminFlags: {
    // Alertas automáticas
    needsAttention: {
      type: Boolean,
      default: false
    },
    attentionReason: {
      type: String,
      enum: [
        'high_withdrawal_volume',
        'pioneer_waiting_period',
        'benefit_cycle_issue',
        'suspicious_activity',
        'commission_calculation_error',
        'inactive_user',
        'manual_review_required',
        ''
      ],
      default: ''
    },
    
    // Prioridades
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    
    // Notas administrativas
    adminNotes: [{
      note: String,
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      addedAt: {
        type: Date,
        default: Date.now
      },
      category: {
        type: String,
        enum: ['general', 'financial', 'technical', 'support'],
        default: 'general'
      }
    }],
    
    // Flags de estado
    isBlocked: {
      type: Boolean,
      default: false
    },
    blockReason: String,
    blockedAt: Date,
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // === MÉTRICAS CALCULADAS ===
  calculated: {
    // ROI y rendimiento
    totalInvested: {
      type: Number,
      default: 0
    },
    totalReturned: {
      type: Number,
      default: 0
    },
    currentROI: {
      type: Number,
      default: 0
    },
    
    // Proyecciones
    projectedEarnings: {
      type: Number,
      default: 0
    },
    daysToComplete: {
      type: Number,
      default: 0
    },
    
    // Última actualización de cálculos
    lastCalculatedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// === ÍNDICES PARA OPTIMIZACIÓN ===
// Nota: El índice { user: 1 } ya está definido como único en el esquema
userStatusSchema.index({ 'subscription.packageStatus': 1 });
userStatusSchema.index({ 'subscription.benefitCycle.currentDay': 1 });
userStatusSchema.index({ 'pioneer.isActive': 1 });
userStatusSchema.index({ 'pioneer.waitingPeriod.isInWaitingPeriod': 1 });
userStatusSchema.index({ 'adminFlags.needsAttention': 1 });
userStatusSchema.index({ 'adminFlags.priority': 1 });
userStatusSchema.index({ 'financial.withdrawals.pendingCount': 1 });
userStatusSchema.index({ 'activity.isActive': 1 });

// Índices compuestos para consultas administrativas
userStatusSchema.index({ 
  'adminFlags.needsAttention': 1, 
  'adminFlags.priority': 1 
});
userStatusSchema.index({ 
  'subscription.packageStatus': 1, 
  'subscription.benefitCycle.currentDay': 1 
});
userStatusSchema.index({ 
  'pioneer.isActive': 1, 
  'pioneer.waitingPeriod.isInWaitingPeriod': 1 
});

// === MÉTODOS VIRTUALES ===

// Verificar si el usuario necesita atención inmediata
userStatusSchema.virtual('requiresImmediateAttention').get(function() {
  return this.adminFlags.needsAttention && 
         ['high', 'urgent'].includes(this.adminFlags.priority);
});

// Verificar si está en período de espera Pioneer
userStatusSchema.virtual('isInPioneerWaiting').get(function() {
  return this.pioneer.waitingPeriod.isInWaitingPeriod && 
         this.pioneer.waitingPeriod.endsAt > new Date();
});

// Verificar si debe recibir beneficios hoy
userStatusSchema.virtual('shouldReceiveBenefitsToday').get(function() {
  const today = new Date();
  const nextBenefit = this.subscription.benefitCycle.nextBenefitDate;
  
  return this.subscription.packageStatus === 'active' &&
         !this.subscription.benefitCycle.isPaused &&
         nextBenefit && 
         nextBenefit <= today;
});

// === MÉTODOS DE INSTANCIA ===

// Actualizar ciclo de beneficios (8 días activos + 1 día pausa)
userStatusSchema.methods.updateBenefitCycle = function() {
  const now = new Date();
  
  // Si no hay ciclo iniciado, iniciar uno nuevo
  if (this.subscription.benefitCycle.currentDay === 0) {
    this.subscription.benefitCycle.currentDay = 1;
    this.subscription.benefitCycle.cycleStartDate = now;
    this.subscription.benefitCycle.nextBenefitDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return;
  }
  
  // Verificar si ya completó las 5 semanas máximas
  if (this.subscription.benefitCycle.weeksCompleted >= this.subscription.benefitCycle.maxWeeks) {
    // Ya completó el ciclo total (500%), pausar beneficios
    this.subscription.packageStatus = 'completed';
    this.subscription.benefitCycle.isPaused = true;
    return;
  }
  
  // Avanzar al siguiente día
  if (this.subscription.benefitCycle.currentDay < 8) {
    // Días activos (1-8)
    this.subscription.benefitCycle.currentDay += 1;
    this.subscription.benefitCycle.isPaused = false;
    this.subscription.benefitCycle.nextBenefitDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  } else if (this.subscription.benefitCycle.currentDay === 8) {
    // Entrar en día de pausa (día 9)
    this.subscription.benefitCycle.currentDay = 9;
    this.subscription.benefitCycle.isPaused = true;
    this.subscription.benefitCycle.nextBenefitDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  } else {
    // Completar semana y empezar una nueva (día 9 -> día 1)
    this.subscription.benefitCycle.currentDay = 1;
    this.subscription.benefitCycle.isPaused = false;
    this.subscription.benefitCycle.totalCyclesCompleted += 1;
    this.subscription.benefitCycle.weeksCompleted += 1;
    this.subscription.benefitCycle.cycleStartDate = now;
    this.subscription.benefitCycle.nextBenefitDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
};

// Verificar si el usuario está en período de cashback (primera semana)
userStatusSchema.methods.isInCashbackPeriod = function() {
  return this.subscription.benefitCycle.weeksCompleted === 0;
};

// Verificar si el usuario puede recibir comisiones de referidos
userStatusSchema.methods.canReceiveReferralCommissions = function() {
  // Solo durante los primeros 8 días de cada semana (excluyendo día 9 de pausa)
  return this.subscription.benefitCycle.currentDay >= 1 && 
         this.subscription.benefitCycle.currentDay <= 8 &&
         !this.subscription.benefitCycle.isPaused;
};

// Calcular progreso total del usuario (hasta 500%)
userStatusSchema.methods.calculateTotalProgress = function() {
  const totalDaysCompleted = (this.subscription.benefitCycle.weeksCompleted * 8) + 
                            (this.subscription.benefitCycle.currentDay > 8 ? 8 : this.subscription.benefitCycle.currentDay);
  const maxDays = this.subscription.benefitCycle.maxWeeks * 8; // 5 semanas * 8 días = 40 días
  
  return {
    daysCompleted: totalDaysCompleted,
    maxDays: maxDays,
    progressPercentage: (totalDaysCompleted / maxDays) * 100,
    weeksCompleted: this.subscription.benefitCycle.weeksCompleted,
    currentWeekDay: this.subscription.benefitCycle.currentDay,
    isCompleted: this.subscription.benefitCycle.weeksCompleted >= this.subscription.benefitCycle.maxWeeks
  };
};

// Marcar para atención administrativa
userStatusSchema.methods.flagForAttention = function(reason, priority = 'normal') {
  this.adminFlags.needsAttention = true;
  this.adminFlags.attentionReason = reason;
  this.adminFlags.priority = priority;
  return this.save();
};

// Agregar nota administrativa
userStatusSchema.methods.addAdminNote = function(note, addedBy, category = 'general') {
  this.adminFlags.adminNotes.push({
    note,
    addedBy,
    category,
    addedAt: new Date()
  });
  return this.save();
};

// Iniciar período de espera Pioneer
userStatusSchema.methods.startPioneerWaitingPeriod = function() {
  const now = new Date();
  const endTime = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 horas
  
  this.pioneer.waitingPeriod.isInWaitingPeriod = true;
  this.pioneer.waitingPeriod.startedAt = now;
  this.pioneer.waitingPeriod.endsAt = endTime;
  
  // Marcar para atención administrativa
  this.flagForAttention('pioneer_waiting_period', 'normal');
  
  return this.save();
};

// === MIDDLEWARE ===

// Pre-save: Actualizar métricas calculadas
userStatusSchema.pre('save', function(next) {
  // Actualizar ROI
  if (this.calculated.totalInvested > 0) {
    this.calculated.currentROI = 
      ((this.calculated.totalReturned / this.calculated.totalInvested) - 1) * 100;
  }
  
  // Actualizar timestamp de cálculo
  this.calculated.lastCalculatedAt = new Date();
  
  next();
});

const UserStatus = mongoose.model('UserStatus', userStatusSchema);

module.exports = UserStatus;