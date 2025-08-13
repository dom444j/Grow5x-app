const Transaction = require('../models/Transaction.model');
const logger = require('./logger');

/**
 * Calcula el beneficio diario para un usuario basado en su estado y configuración
 * Sistema corregido: 12.5% diario, primera semana es cashback de protección
 * @param {Object} user - Usuario
 * @param {Object} userStatus - Estado del usuario
 * @returns {Number} - Monto del beneficio diario
 */
async function calculateDailyBenefit(user, userStatus) {
  try {
    // Verificar si el usuario está usando capital real
    const useRealCapital = user.usingRealCapital || false;
    
    // Tasa fija del 12.5% diario para todas las licencias
    const dailyRate = 0.125; // 12.5%
    
    // Obtener el monto invertido del usuario
    const investedAmount = userStatus.invested_amount || 0;
    
    if (investedAmount <= 0) {
      return 0;
    }
    
    // Calcular el beneficio base (12.5% del monto invertido)
    const baseBenefit = investedAmount * dailyRate;
    
    // Determinar si es la primera semana (cashback de protección)
    const isFirstWeek = await isUserInFirstWeek(user.id);
    
    let finalBenefit = baseBenefit;
    
    // Si se usa capital real, aplicar cálculos basados en capital real
    if (useRealCapital && !isFirstWeek) {
      // Solo aplicar factores de mercado después de la primera semana
      const marketFactor = await getMarketPerformanceFactor();
      const riskFactor = getRiskFactorByPackage(userStatus.package_type);
      
      finalBenefit = baseBenefit * marketFactor * riskFactor;
      
      logger.info(`Beneficio con capital real calculado para usuario ${user.id}: $${finalBenefit} (semana ${isFirstWeek ? '1 - cashback' : '2+'})`);
    } else {
      // Primera semana siempre es cashback fijo (protección)
      logger.info(`Beneficio ${isFirstWeek ? 'cashback' : 'simulado'} calculado para usuario ${user.id}: $${finalBenefit}`);
    }
    
    return finalBenefit;
  } catch (error) {
    logger.error(`Error calculando beneficio diario para usuario ${user.id}:`, error);
    return 0;
  }
}

/**
 * Verifica si el usuario está en su primera semana de beneficios
 * @param {String} userId - ID del usuario
 * @returns {Boolean} - True si está en la primera semana
 */
async function isUserInFirstWeek(userId) {
  try {
    // Buscar la primera transacción de beneficio del usuario
    const firstBenefit = await Transaction.findOne({
      user: userId,
      type: 'benefit',
      status: 'completed'
    }).sort({ createdAt: 1 });
    
    if (!firstBenefit) {
      return true; // Si no tiene beneficios, está en primera semana
    }
    
    // Calcular días desde el primer beneficio
    const daysSinceFirst = Math.floor((Date.now() - firstBenefit.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Primera semana son los primeros 7 días
    return daysSinceFirst < 7;
  } catch (error) {
    logger.error(`Error verificando primera semana para usuario ${userId}:`, error);
    return true; // En caso de error, asumir primera semana por seguridad
  }
}

/**
 * Obtiene la tasa de beneficio según el tipo de paquete
 * ACTUALIZADO: Todas las licencias pagan 12.5% diario
 * @param {String} packageType - Tipo de paquete
 * @returns {Number} - Tasa de beneficio diario (siempre 12.5%)
 */
function getBenefitRateByPackage(packageType) {
  // Todas las licencias pagan 12.5% diario
  return 0.125;
}

/**
 * Obtiene el factor de riesgo según el tipo de paquete
 * @param {String} packageType - Tipo de paquete
 * @returns {Number} - Factor de riesgo
 */
function getRiskFactorByPackage(packageType) {
  const factors = {
    basic: 0.9, // Menor riesgo, menor variabilidad
    premium: 1.0, // Riesgo estándar
    vip: 1.1, // Mayor riesgo, mayor potencial
    pioneer: 1.2 // Máximo riesgo y potencial
  };
  
  return factors[packageType] || factors.basic;
}

/**
 * Obtiene un factor de rendimiento basado en condiciones de mercado
 * En una implementación real, esto podría conectarse a APIs externas
 * @returns {Number} - Factor de rendimiento de mercado
 */
async function getMarketPerformanceFactor() {
  // Simulación simple - en producción, esto podría obtener datos reales de mercado
  // Fluctuación entre 0.8 y 1.2 (±20%)
  return 0.8 + (Math.random() * 0.4);
}

/**
 * Verifica si se debe usar capital real basado en el total acumulado
 * @returns {Boolean} - True si se debe usar capital real
 */
async function shouldUseRealCapital() {
  try {
    // Calcular el capital total a partir de transacciones completadas
    const totalCapital = await calculateTotalCapital();
    
    // Umbral para usar capital real: 1.4M USDT
    const threshold = 1400000;
    
    return totalCapital >= threshold;
  } catch (error) {
    logger.error('Error verificando si se debe usar capital real:', error);
    return false;
  }
}

/**
 * Calcula el capital total acumulado en el sistema
 * @returns {Number} - Capital total en USDT
 */
async function calculateTotalCapital() {
  try {
    const result = await Transaction.findAll({
      where: {
        type: {
          [require('sequelize').Op.in]: ['deposit', 'pioneer_payment']
        },
        status: 'completed'
      },
      attributes: [
        [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total']
      ],
      raw: true
    });
    
    return parseFloat(result[0]?.total || 0);
  } catch (error) {
    logger.error('Error calculando capital total:', error);
    return 0;
  }
}

/**
 * Calcula la comisión de referido directo sobre el cashback
 * 10% del cashback obtenido en los primeros 8 días (excluyendo día 9 de pausa)
 * @param {String} referredUserId - ID del usuario referido
 * @param {Number} cashbackAmount - Monto del cashback del día
 * @returns {Number} - Monto de la comisión
 */
async function calculateDirectReferralCommission(referredUserId, cashbackAmount) {
  try {
    // Verificar si el usuario referido está en período de cashback (primeros 8 días)
    const isInCashbackPeriod = await isUserInCashbackPeriod(referredUserId);
    
    if (!isInCashbackPeriod) {
      return 0;
    }
    
    // 10% del cashback para referido directo
    const commissionRate = 0.10;
    return cashbackAmount * commissionRate;
  } catch (error) {
    logger.error(`Error calculando comisión de referido directo:`, error);
    return 0;
  }
}

/**
 * Verifica si el usuario está en período de cashback (primeros 8 días activos)
 * @param {String} userId - ID del usuario
 * @returns {Boolean} - True si está en período de cashback
 */
async function isUserInCashbackPeriod(userId) {
  try {
    // Contar días de beneficios recibidos (excluyendo días de pausa)
    const benefitDays = await Transaction.countDocuments({
      user: userId,
      type: 'benefit',
      status: 'completed'
    });
    
    // Los primeros 8 días de beneficios son período de cashback
    return benefitDays < 8;
  } catch (error) {
    logger.error(`Error verificando período de cashback para usuario ${userId}:`, error);
    return false;
  }
}

/**
 * Calcula la comisión adicional para códigos líder/padre (5% adicional)
 * Se paga en la segunda semana de todas las licencias
 * @param {String} specialCodeUserId - ID del usuario con código especial
 * @param {Number} licenseAmount - Monto de la licencia
 * @returns {Number} - Monto de la comisión adicional
 */
async function calculateLeaderParentBonus(specialCodeUserId, licenseAmount) {
  try {
    // 5% adicional para códigos líder/padre
    const bonusRate = 0.05;
    return licenseAmount * bonusRate;
  } catch (error) {
    logger.error(`Error calculando bono líder/padre:`, error);
    return 0;
  }
}

module.exports = {
  calculateDailyBenefit,
  shouldUseRealCapital,
  calculateTotalCapital,
  isUserInFirstWeek,
  calculateDirectReferralCommission,
  isUserInCashbackPeriod,
  calculateLeaderParentBonus
};