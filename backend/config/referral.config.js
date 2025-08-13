/**
 * Configuración del Sistema de Referidos - Grow5X
 * Sistema de un solo nivel directo con bonos especiales para FATHER/LEADER
 * Actualizado según especificaciones de subida.txt
 */

const REFERRAL_CONFIG = {
  // Códigos Principales del Sistema
  MAIN_CODES: {
    FATHER: {
      code: 'GROW5X-FATHER-001',
      name: 'Código Padre Principal',
      level: 'FATHER',
      permissions: ['create_leaders', 'manage_network', 'view_all_stats'],
      commission_rate: 0.05, // 5% del monto de todas las licencias (pool cada 2 semanas)
      max_direct_referrals: 1000,
      pool_payment_frequency: 'biweekly' // Cada 2 semanas
    },
    LEADER: {
      code: 'GROW5X-LEADER-001',
      name: 'Código Líder Principal',
      level: 'LEADER',
      permissions: ['manage_team', 'view_team_stats', 'create_referrals'],
      commission_rate: 0.05, // 5% del monto de todas las licencias (pool cada 2 semanas)
      max_direct_referrals: 100,
      pool_payment_frequency: 'biweekly' // Cada 2 semanas
    }
  },

  // Configuración de Enlaces de Referidos
  REFERRAL_LINKS: {
    base_url: process.env.FRONTEND_URL || 'http://localhost:5173',
    registration_path: '/register',
    param_name: 'ref',
    
    // Generación de enlaces
    generateLink: function(referralCode) {
      return `${this.base_url}${this.registration_path}?${this.param_name}=${referralCode}`;
    }
  },

  // Niveles de Usuario en el Sistema de Referidos
  USER_LEVELS: {
    FATHER: {
      name: 'Padre',
      priority: 1,
      can_create: ['LEADER', 'MEMBER'],
      benefits: {
        direct_commission_rate: 0.10, // 10% del cashback total del referido directo (un solo nivel)
        special_bonus_rate: 0.05, // 5% del monto de todas las licencias (pool cada 2 semanas)
        bonus_multiplier: 2.0,
        special_rewards: true,
        pool_payment_day: 17 // Día 17 de cada ciclo
      }
    },
    LEADER: {
      name: 'Líder',
      priority: 2,
      can_create: ['MEMBER'],
      benefits: {
        direct_commission_rate: 0.10, // 10% del cashback total del referido directo (un solo nivel)
        special_bonus_rate: 0.05, // 5% del monto de todas las licencias (pool cada 2 semanas)
        bonus_multiplier: 1.5,
        special_rewards: true,
        pool_payment_day: 17 // Día 17 de cada ciclo
      }
    },
    MEMBER: {
      name: 'Miembro',
      priority: 3,
      can_create: ['MEMBER'],
      benefits: {
        direct_commission_rate: 0.10, // 10% del cashback total del referido directo (un solo nivel)
        special_bonus_rate: 0.00, // Sin bono especial de pool
        bonus_multiplier: 1.0,
        special_rewards: false,
        pool_payment_day: null // Sin acceso a pool
      }
    }
  },

  // Configuración de Comisiones - Sistema Detallado
  COMMISSION_CONFIG: {
    // Comisión Directa de Referidos (Un solo nivel)
    direct_referral: {
      rate: 0.10, // 10% del valor del paquete
      trigger_day: 1, // Se activa inmediatamente al comprar
      trigger_condition: 'purchase_completion',
      payment_type: 'automated', // Pago automático
      base_calculation: 'package_value', // Sobre el valor del paquete
      requires_license: true, // El referidor debe tener licencia activa
      levels: 1, // Solo un nivel directo
      description: 'Comisión del 10% sobre el valor del paquete del referido directo'
    },
    
    // Bono de Líder (Pool especial)
    leader_bonus: {
      rate: 0.05, // 5% del monto total de licencias
      trigger_day: 17, // Se activa en el día 17 (segundo ciclo)
      trigger_condition: 'second_cycle_completion',
      payment_type: 'pool', // Tipo pool sin niveles
      base_calculation: 'license_amount', // Sobre el monto de la licencia
      requires_license: true, // El líder debe tener licencia activa
      is_unique_per_user: true, // Pago único por usuario
      payment_frequency: 'biweekly', // Cada 2 semanas
      description: '5% del pool total de licencias, pagado cada 2 semanas'
    },
    
    // Bono de Padre (Pool especial)
    parent_bonus: {
      rate: 0.05, // 5% del monto total de licencias
      trigger_day: 17, // Se activa en el día 17 (segundo ciclo)
      trigger_condition: 'second_cycle_completion',
      payment_type: 'pool', // Tipo pool sin niveles
      base_calculation: 'license_amount', // Sobre el monto de la licencia
      requires_license: true, // El padre debe tener licencia activa
      is_unique_per_user: true, // Pago único por usuario
      payment_frequency: 'biweekly', // Cada 2 semanas
      description: '5% del pool total de licencias, pagado cada 2 semanas'
    },
    
    // Beneficios Personales
    personal_benefits: {
      // Beneficios por compras propias de paquetes
      own_packages: {
        cashback_rate: 1.0, // 100% cashback en 8 días (primer ciclo)
        bonus_rate: 4.0, // 400% beneficio adicional en 32 días (4 ciclos restantes)
        total_cycles: 5, // 5 ciclos de 8 días cada uno (40 días total)
        daily_rate: 0.125, // 12.5% diario
        total_potential_return: 5.0, // 500% retorno total potencial
        description: '12.5% diario por 8 días, 5 ciclos, 500% total potencial'
      },
      // Beneficios por compras propias de licencias
      own_licenses: {
        immediate_benefit: 0.02, // 2% beneficio inmediato
        long_term_benefit: 0.08 // 8% beneficio a largo plazo
      }
    },
    
    // Límites y configuraciones
    limits: {
      max_levels: 1, // Solo referidos directos (un nivel)
      min_commission: 0.01, // Mínimo $0.01
      max_commission_per_transaction: 10000.00, // Máximo $10000 por transacción
      commission_currency: 'USDT', // Moneda de las comisiones
      referral_system_type: 'single_level_direct' // Sistema de un solo nivel directo
    }
  },

  // Validación de Códigos de Referido
  CODE_VALIDATION: {
    prefix: '', // Sin prefijo obligatorio
    min_length: 6,
    max_length: 10,
    allowed_chars: /^[A-Z0-9]+$/,
    
    // Función de validación
    isValid: function(code) {
      if (!code || typeof code !== 'string') return false;
      if (code.length < this.min_length || code.length > this.max_length) return false;
      // Sin validación de prefijo
      return this.allowed_chars.test(code);
    },
    
    // Generación de código único
    generate: function(userType = 'MEMBER', userId) {
      // Generar código de 8 caracteres alfanuméricos
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
  },

  // Configuración de Tracking
  TRACKING: {
    cookie_name: 'grow5x_ref',
    cookie_duration: 30 * 24 * 60 * 60 * 1000, // 30 días en millisegundos
    session_tracking: true,
    ip_tracking: true,
    user_agent_tracking: true
  },

  // Estadísticas y Métricas
  STATS: {
    track_clicks: true,
    track_registrations: true,
    track_conversions: true,
    track_commissions: true,
    
    // Métricas a calcular
    metrics: [
      'total_clicks',
      'total_registrations',
      'conversion_rate',
      'total_commissions',
      'active_referrals',
      'monthly_performance'
    ]
  },

  // Configuración de Notificaciones
  NOTIFICATIONS: {
    new_referral: {
      enabled: true,
      email: true,
      dashboard: true,
      push: false
    },
    commission_earned: {
      enabled: true,
      email: true,
      dashboard: true,
      push: true
    },
    level_upgrade: {
      enabled: true,
      email: true,
      dashboard: true,
      push: true
    }
  }
};

// Funciones Utilitarias
const ReferralUtils = {
  /**
   * Genera un enlace de referido para un usuario
   */
  generateReferralLink(userCode) {
    return REFERRAL_CONFIG.REFERRAL_LINKS.generateLink(userCode);
  },

  /**
   * Valida un código de referido
   */
  validateReferralCode(code) {
    return REFERRAL_CONFIG.CODE_VALIDATION.isValid(code);
  },

  /**
   * Genera un nuevo código de referido
   */
  generateNewCode(userType, userId) {
    return REFERRAL_CONFIG.CODE_VALIDATION.generate(userType, userId);
  },

  /**
   * Calcula comisión por referido directo
   */
  calculateReferralCommission(amount, type) {
    const config = REFERRAL_CONFIG.COMMISSION_CONFIG.direct_referral;
    let rate = 0;
    
    if (type === 'package') {
      rate = config.packages.rate;
    } else if (type === 'license') {
      rate = config.licenses.rate;
    }
    
    const commission = amount * rate;
    
    // Aplicar límites
    const limits = REFERRAL_CONFIG.COMMISSION_CONFIG.limits;
    return Math.max(limits.min_commission, Math.min(commission, limits.max_commission_per_transaction));
  },
  
  /**
   * Calcula beneficios personales
   */
  calculatePersonalBenefits(amount, type) {
    const config = REFERRAL_CONFIG.COMMISSION_CONFIG.personal_benefits;
    
    if (type === 'package') {
      return {
        cashback: amount * config.own_packages.cashback_rate,
        bonus: amount * config.own_packages.bonus_rate,
        dailyRate: config.own_packages.daily_rate,
        totalCycles: config.own_packages.total_cycles
      };
    } else if (type === 'license') {
      return {
        immediate: amount * config.own_licenses.immediate_benefit,
        longTerm: amount * config.own_licenses.long_term_benefit
      };
    }
    
    return null;
  },

  /**
   * Obtiene configuración de usuario por nivel
   */
  getUserLevelConfig(level) {
    return REFERRAL_CONFIG.USER_LEVELS[level] || REFERRAL_CONFIG.USER_LEVELS.MEMBER;
  },

  /**
   * Verifica si un usuario puede crear referidos de cierto tipo
   */
  canCreateReferral(userLevel, targetLevel) {
    const config = this.getUserLevelConfig(userLevel);
    return config.can_create.includes(targetLevel);
  }
};

module.exports = {
  REFERRAL_CONFIG,
  ReferralUtils
};