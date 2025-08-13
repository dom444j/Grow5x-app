const User = require('../models/User');
const SpecialCode = require('../models/SpecialCode.model');
const logger = require('../utils/logger');

/**
 * Middleware para Usuarios Especiales
 * 
 * Propósito: Validar y gestionar el acceso de usuarios especiales (leader/parent)
 * que tienen lógica de pago única del 5% y requieren validación especial
 * 
 * Fecha: 31 de julio de 2025
 */

/**
 * Middleware para verificar si un usuario es especial
 * Se ejecuta después de la autenticación básica
 */
const checkSpecialUserStatus = async (req, res, next) => {
  try {
    const { user } = req;
    
    if (!user) {
      return next();
    }
    
    // Si el usuario ya tiene marcado isSpecialUser, continuar
    if (user.isSpecialUser) {
      logger.info(`Usuario especial autenticado: ${user.email} (${user.specialUserType})`);
      return next();
    }
    
    // Verificar si el usuario tiene un código especial asociado
    const specialCode = await SpecialCode.findOne({
      userId: user._id,
      isActive: true
    });
    
    if (specialCode) {
      // Usuario tiene código especial pero no está marcado como especial
      // Actualizar automáticamente
      logger.warn(`Usuario ${user.email} tiene código especial pero no está marcado como especial. Actualizando...`);
      
      await User.findByIdAndUpdate(user._id, {
        isSpecialUser: true,
        specialUserType: specialCode.codeType,
        specialCodeId: specialCode._id,
        updatedAt: new Date()
      });
      
      // Actualizar el objeto user en la request
      req.user.isSpecialUser = true;
      req.user.specialUserType = specialCode.codeType;
      req.user.specialCodeId = specialCode._id;
      
      logger.info(`Usuario especial actualizado automáticamente: ${user.email} (${specialCode.codeType})`);
    }
    
    next();
    
  } catch (error) {
    logger.error('Error en checkSpecialUserStatus middleware:', error);
    // No bloquear el login por errores en este middleware
    next();
  }
};

/**
 * Middleware para validar acceso de usuarios especiales a rutas específicas
 */
const requireSpecialUser = (allowedTypes = ['leader', 'parent']) => {
  return (req, res, next) => {
    try {
      const { user } = req;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }
      
      if (!user.isSpecialUser) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado: Se requiere usuario especial'
        });
      }
      
      if (!allowedTypes.includes(user.specialUserType)) {
        return res.status(403).json({
          success: false,
          message: `Acceso denegado: Tipo de usuario especial no autorizado. Requerido: ${allowedTypes.join(', ')}`
        });
      }
      
      logger.info(`Acceso autorizado para usuario especial: ${user.email} (${user.specialUserType})`);
      next();
      
    } catch (error) {
      logger.error('Error en requireSpecialUser middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
};

/**
 * Middleware para enriquecer la respuesta con información de usuario especial
 */
const enrichSpecialUserResponse = async (req, res, next) => {
  try {
    const { user } = req;
    
    if (!user || !user.isSpecialUser) {
      return next();
    }
    
    // Obtener información adicional del código especial
    const specialCode = await SpecialCode.findById(user.specialCodeId)
      .select('code codeType commissionConfig isActive createdAt');
    
    if (specialCode) {
      // Añadir información especial al usuario
      req.user.specialCodeInfo = {
        code: specialCode.code,
        type: specialCode.codeType,
        commissionConfig: specialCode.commissionConfig,
        isActive: specialCode.isActive,
        createdAt: specialCode.createdAt
      };
      
      logger.info(`Información de código especial añadida para usuario: ${user.email}`);
    }
    
    next();
    
  } catch (error) {
    logger.error('Error en enrichSpecialUserResponse middleware:', error);
    // No bloquear la respuesta por errores en este middleware
    next();
  }
};

/**
 * Función utilitaria para verificar si un usuario es especial
 */
const isSpecialUser = (user) => {
  return user && user.isSpecialUser && ['leader', 'parent'].includes(user.specialUserType);
};

/**
 * Función utilitaria para obtener el tipo de usuario especial
 */
const getSpecialUserType = (user) => {
  return isSpecialUser(user) ? user.specialUserType : null;
};

/**
 * Función para validar consistencia de datos de usuario especial
 */
const validateSpecialUserConsistency = async (userId) => {
  try {
    const user = await User.findById(userId)
      .select('isSpecialUser specialUserType specialCodeId email');
    
    if (!user) {
      return { isValid: false, error: 'Usuario no encontrado' };
    }
    
    if (!user.isSpecialUser) {
      return { isValid: true, message: 'Usuario normal - no requiere validación especial' };
    }
    
    // Verificar que tiene tipo especial válido
    if (!['leader', 'parent'].includes(user.specialUserType)) {
      return {
        isValid: false,
        error: `Tipo de usuario especial inválido: ${user.specialUserType}`
      };
    }
    
    // Verificar que tiene código especial asociado
    if (!user.specialCodeId) {
      return {
        isValid: false,
        error: 'Usuario especial sin código asociado'
      };
    }
    
    // Verificar que el código especial existe y es consistente
    const specialCode = await SpecialCode.findById(user.specialCodeId);
    if (!specialCode) {
      return {
        isValid: false,
        error: 'Código especial asociado no encontrado'
      };
    }
    
    if (specialCode.codeType !== user.specialUserType) {
      return {
        isValid: false,
        error: `Inconsistencia: usuario tipo ${user.specialUserType} pero código tipo ${specialCode.codeType}`
      };
    }
    
    if (!specialCode.isActive) {
      return {
        isValid: false,
        error: 'Código especial asociado está inactivo'
      };
    }
    
    return {
      isValid: true,
      message: 'Usuario especial válido y consistente',
      data: {
        userType: user.specialUserType,
        codeId: user.specialCodeId,
        code: specialCode.code
      }
    };
    
  } catch (error) {
    logger.error('Error validando consistencia de usuario especial:', error);
    return {
      isValid: false,
      error: `Error de validación: ${error.message}`
    };
  }
};

module.exports = {
  checkSpecialUserStatus,
  requireSpecialUser,
  enrichSpecialUserResponse,
  isSpecialUser,
  getSpecialUserType,
  validateSpecialUserConsistency
};