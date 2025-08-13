const UserStatus = require('../models/UserStatus');
const logger = require('../utils/logger');

/**
 * Middleware para validar que el usuario tiene licencia activa para acceder a beneficios de referidos
 * Solo aplica para endpoints de usuario, no para administración
 */
const validateActiveLicenseForReferrals = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Si es admin, permitir acceso sin validación de licencia
    if (req.user.role === 'admin') {
      return next();
    }

    // Obtener estado del usuario
    const userStatus = await UserStatus.findOne({ user: userId });
    
    if (!userStatus) {
      // Si no tiene UserStatus, devolver lista vacía con mensaje informativo
      return res.json({
        success: true,
        data: {
          referrals: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0
          },
          message: 'Necesitas activar una licencia para acceder a los beneficios de referidos'
        }
      });
    }

    // Verificar que el usuario tiene un paquete activo
    if (userStatus.subscription.packageStatus !== 'active') {
      // Si no tiene licencia activa, devolver lista vacía con mensaje informativo
      return res.json({
        success: true,
        data: {
          referrals: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0
          },
          message: 'Necesitas una licencia activa para acceder a los beneficios de referidos',
          requiresActiveLicense: true,
          currentStatus: userStatus.subscription.packageStatus
        }
      });
    }

    // Si tiene licencia activa, continuar con el procesamiento normal
    req.userStatus = userStatus;
    next();
    
  } catch (error) {
    logger.error('Error validando licencia activa para referidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error validando estado de licencia'
    });
  }
};

/**
 * Middleware para validar acceso a estadísticas de referidos
 * Versión más permisiva que permite ver estadísticas básicas sin licencia activa
 */
const validateReferralStatsAccess = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Si es admin, permitir acceso completo
    if (req.user.role === 'admin') {
      return next();
    }

    // Para usuarios normales, obtener estado pero permitir acceso limitado
    const userStatus = await UserStatus.findOne({ user: userId });
    req.userStatus = userStatus;
    req.hasActiveLicense = userStatus && userStatus.subscription.packageStatus === 'active';
    
    next();
    
  } catch (error) {
    logger.error('Error validando acceso a estadísticas de referidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error validando acceso'
    });
  }
};

module.exports = {
  validateActiveLicenseForReferrals,
  validateReferralStatsAccess
};