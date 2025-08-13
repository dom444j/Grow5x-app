const mongoose = require('mongoose');

/**
 * SpecialCode Model - Gestión de Códigos Especiales (Líder y Padre)
 * 
 * Este modelo maneja los códigos especiales que reciben:
 * - 5% sobre usuarios que logran 100% en la segunda semana
 * - 10% por referidos directos inscritos (comisión normal)
 * - Sin bono de asignación monetario
 */
const specialCodeSchema = new mongoose.Schema({
  // Tipo de código especial
  type: {
    type: String,
    enum: ['LIDER', 'PADRE'],
    required: true,
    unique: true // Solo puede haber un código líder y un código padre
  },
  
  // Código único generado
  code: {
    type: String,
    required: true,
    unique: true
  },
  
  // Usuario asignado al código especial
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // Un usuario no puede tener múltiples códigos especiales
  },
  
  // Código de referido del usuario (para facilitar búsquedas)
  referralCode: {
    type: String,
    required: true,
    unique: true
  },
  
  // Estado del código especial
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Configuración de comisiones
  commissionConfig: {
    // Bono de Líder/Padre: 5% del monto total de licencias (día 17)
    bonusPercentage: {
      type: Number,
      default: 5, // 5% del monto total de licencias
      min: 0,
      max: 100
    },
    // Día de pago para bonos especiales
    paymentDay: {
      type: Number,
      default: 17 // Día 17 para bonos de líder y padre
    },
    // Tipo de distribución
    distributionType: {
      type: String,
      default: 'pool' // Tipo pool sin niveles
    },
    currency: {
      type: String,
      default: 'USDT'
    },
    // Sin bono de asignación
    assignmentBonus: {
      amount: {
        type: Number,
        default: 0 // Sin bono de asignación
      },
      currency: {
        type: String,
        default: 'USD'
      },
      paid: {
        type: Boolean,
        default: false
      },
      paidDate: {
        type: Date
      }
    }
  },
  
  // Estadísticas de comisiones
  statistics: {
    totalCommissionsEarned: {
      type: Number,
      default: 0
    },
    totalUsersAffected: {
      type: Number,
      default: 0
    },
    lastCommissionDate: Date,
    monthlyCommissions: {
      type: Number,
      default: 0
    },
    lastMonthlyReset: Date
  },
  
  // Historial de comisiones
  commissionHistory: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    weekNumber: {
      type: Number,
      required: true
    },
    packageType: String,
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    date: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending'
    }
  }],
  
  // Fechas importantes
  assignedAt: {
    type: Date,
    default: Date.now
  },
  
  activatedAt: Date,
  
  deactivatedAt: Date,
  
  // Información administrativa
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  notes: String,
  
  // Metadata
  metadata: {
    assignmentReason: String,
    priority: {
      type: Number,
      default: 1 // 1 = líder, 2 = padre (para ordenamiento)
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Índices
specialCodeSchema.index({ type: 1 });
specialCodeSchema.index({ code: 1 });
specialCodeSchema.index({ userId: 1 });
specialCodeSchema.index({ referralCode: 1 });
specialCodeSchema.index({ isActive: 1 });
specialCodeSchema.index({ assignedAt: -1 });

// Índices compuestos
specialCodeSchema.index({ type: 1, isActive: 1 });
specialCodeSchema.index({ userId: 1, isActive: 1 });

// Virtual para obtener el nombre del tipo en español
specialCodeSchema.virtual('typeName').get(function() {
  return this.type === 'LIDER' ? 'Líder' : 'Padre';
});

// Virtual para verificar si está activo y válido
specialCodeSchema.virtual('isActiveAndValid').get(function() {
  return this.isActive && this.userId;
});

// Método para agregar comisión al historial
specialCodeSchema.methods.addCommission = function(userId, amount, weekNumber, packageType, transactionId) {
  this.commissionHistory.push({
    userId,
    amount,
    weekNumber,
    packageType,
    transactionId,
    date: new Date(),
    status: 'pending'
  });
  
  // Actualizar estadísticas
  this.statistics.totalCommissionsEarned += amount;
  this.statistics.lastCommissionDate = new Date();
  
  return this.save();
};

// Método para marcar comisión como pagada
specialCodeSchema.methods.markCommissionAsPaid = function(commissionId) {
  const commission = this.commissionHistory.id(commissionId);
  if (commission) {
    commission.status = 'paid';
    return this.save();
  }
  return Promise.reject(new Error('Comisión no encontrada'));
};

// Método para activar/desactivar código
specialCodeSchema.methods.toggleActive = function() {
  this.isActive = !this.isActive;
  if (this.isActive) {
    this.activatedAt = new Date();
    this.deactivatedAt = undefined;
  } else {
    this.deactivatedAt = new Date();
  }
  return this.save();
};

// Método estático para obtener código activo por tipo
specialCodeSchema.statics.getActiveByType = function(codeType) {
  return this.findOne({ type: codeType, isActive: true })
    .populate('userId', 'email fullName referralCode')
    .populate('assignedBy', 'email fullName');
};

// Método estático para obtener todos los códigos activos
specialCodeSchema.statics.getAllActive = function() {
  return this.find({ isActive: true })
    .populate('userId', 'email fullName referralCode')
    .populate('assignedBy', 'email fullName')
    .sort({ 'metadata.priority': 1 });
};

// Método estático para verificar si un usuario ya tiene código especial
specialCodeSchema.statics.userHasSpecialCode = function(userId) {
  return this.findOne({ userId, isActive: true });
};

// Método estático para verificar disponibilidad de tipo de código
specialCodeSchema.statics.isCodeTypeAvailable = async function(codeType) {
  const existingCode = await this.findOne({
    type: codeType,
    isActive: true
  });
  return !existingCode;
};

// Método para procesar el bono de asignación
// Método processAssignmentBonus eliminado - Los bonos de asignación han sido removidos
// Solo se mantienen las comisiones del 5% para segunda semana y 10% para referidos directos

// Método estático para obtener estadísticas generales
specialCodeSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalCodes: { $sum: 1 },
        totalCommissions: { $sum: '$statistics.totalCommissionsEarned' },
        totalUsersAffected: { $sum: '$statistics.totalUsersAffected' },
        leaderCommissions: {
          $sum: {
            $cond: [{ $eq: ['$type', 'LIDER'] }, '$statistics.totalCommissionsEarned', 0]
          }
        },
        parentCommissions: {
          $sum: {
            $cond: [{ $eq: ['$type', 'PADRE'] }, '$statistics.totalCommissionsEarned', 0]
          }
        }
      }
    }
  ]);
};

// Middleware pre-save
specialCodeSchema.pre('save', function(next) {
  this.metadata.lastUpdated = new Date();
  next();
});

// Middleware para validar que solo haya un código de cada tipo
specialCodeSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('type')) {
    const existingCode = await this.constructor.findOne({
      type: this.type,
      isActive: true,
      _id: { $ne: this._id }
    });
    
    if (existingCode) {
      const error = new Error(`Ya existe un código ${this.type} activo`);
      error.code = 'DUPLICATE_SPECIAL_CODE';
      return next(error);
    }
  }
  next();
});

const SpecialCode = mongoose.model('SpecialCode', specialCodeSchema);

module.exports = SpecialCode;