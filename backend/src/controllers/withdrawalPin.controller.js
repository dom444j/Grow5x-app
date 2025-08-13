const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Controlador para gestionar el PIN de retiro
 */
const withdrawalPinController = {
  /**
   * Configurar un nuevo PIN de retiro
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async setupPin(req, res) {
    try {
      const { newPin } = req.body;
      const userId = req.user.id;

      // Validar el PIN
      if (!newPin || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
        return res.status(400).json({
          success: false,
          message: 'El PIN debe tener entre 4 y 6 dígitos numéricos'
        });
      }

      // Verificar si el usuario ya tiene un PIN configurado
      const user = await User.findById(userId);
      if (user.security?.withdrawalPin?.hasPin) {
        return res.status(400).json({
          success: false,
          message: 'Ya tienes un PIN configurado. Utiliza la función de cambiar PIN.'
        });
      }

      // Generar hash del PIN
      const salt = await bcrypt.genSalt(12);
      const pinHash = await bcrypt.hash(newPin, salt);

      // Actualizar el usuario con el nuevo PIN
      await User.findByIdAndUpdate(userId, {
        'security.withdrawalPin.hash': pinHash,
        'security.withdrawalPin.enabled': true,
        'security.withdrawalPin.hasPin': true,
        'security.withdrawalPin.lastChanged': new Date(),
        'security.withdrawalPin.failedAttempts': 0,
        'security.withdrawalPin.lockedUntil': null
      });

      // Registrar la acción en el log de seguridad
      await User.findByIdAndUpdate(userId, {
        $push: {
          securityLog: {
            action: 'withdrawal_pin_setup',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date()
          }
        }
      });

      return res.json({
        success: true,
        message: 'PIN de retiro configurado exitosamente',
        data: {
          security: {
            withdrawalPin: {
              enabled: true,
              hasPin: true
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error al configurar PIN de retiro:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al configurar el PIN de retiro'
      });
    }
  },

  /**
   * Cambiar un PIN de retiro existente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async changePin(req, res) {
    try {
      const { currentPin, newPin } = req.body;
      const userId = req.user.id;

      // Validar el nuevo PIN
      if (!newPin || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
        return res.status(400).json({
          success: false,
          message: 'El nuevo PIN debe tener entre 4 y 6 dígitos numéricos'
        });
      }

      // Obtener el usuario
      const user = await User.findById(userId);
      
      // Verificar si el usuario tiene un PIN configurado
      if (!user.security?.withdrawalPin?.hasPin) {
        return res.status(400).json({
          success: false,
          message: 'No tienes un PIN configurado. Utiliza la función de configurar PIN.'
        });
      }

      // Verificar si el PIN está bloqueado
      if (user.security?.withdrawalPin?.lockedUntil && new Date(user.security.withdrawalPin.lockedUntil) > new Date()) {
        return res.status(403).json({
          success: false,
          message: 'Tu PIN está temporalmente bloqueado debido a múltiples intentos fallidos. Intenta más tarde.'
        });
      }

      // Verificar el PIN actual
      const isMatch = await bcrypt.compare(currentPin, user.security.withdrawalPin.hash);
      if (!isMatch) {
        // Incrementar contador de intentos fallidos
        const failedAttempts = (user.security.withdrawalPin.failedAttempts || 0) + 1;
        let lockedUntil = null;
        
        // Bloquear después de 5 intentos fallidos
        if (failedAttempts >= 5) {
          lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
        }
        
        await User.findByIdAndUpdate(userId, {
          'security.withdrawalPin.failedAttempts': failedAttempts,
          'security.withdrawalPin.lockedUntil': lockedUntil
        });
        
        return res.status(400).json({
          success: false,
          message: 'PIN actual incorrecto',
          data: {
            remainingAttempts: Math.max(0, 5 - failedAttempts),
            locked: !!lockedUntil
          }
        });
      }

      // Generar hash del nuevo PIN
      const salt = await bcrypt.genSalt(12);
      const pinHash = await bcrypt.hash(newPin, salt);

      // Actualizar el usuario con el nuevo PIN
      await User.findByIdAndUpdate(userId, {
        'security.withdrawalPin.hash': pinHash,
        'security.withdrawalPin.lastChanged': new Date(),
        'security.withdrawalPin.failedAttempts': 0,
        'security.withdrawalPin.lockedUntil': null
      });

      // Registrar la acción en el log de seguridad
      await User.findByIdAndUpdate(userId, {
        $push: {
          securityLog: {
            action: 'withdrawal_pin_change',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date()
          }
        }
      });

      return res.json({
        success: true,
        message: 'PIN de retiro cambiado exitosamente'
      });
    } catch (error) {
      logger.error('Error al cambiar PIN de retiro:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cambiar el PIN de retiro'
      });
    }
  },

  /**
   * Activar o desactivar el PIN de retiro
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async togglePin(req, res) {
    try {
      const { enabled } = req.body;
      const userId = req.user.id;

      // Verificar si el usuario tiene un PIN configurado
      const user = await User.findById(userId);
      if (!user.security?.withdrawalPin?.hasPin) {
        return res.status(400).json({
          success: false,
          message: 'No tienes un PIN configurado. Configura un PIN primero.'
        });
      }

      // Actualizar el estado del PIN
      await User.findByIdAndUpdate(userId, {
        'security.withdrawalPin.enabled': enabled
      });

      // Registrar la acción en el log de seguridad
      await User.findByIdAndUpdate(userId, {
        $push: {
          securityLog: {
            action: enabled ? 'withdrawal_pin_enabled' : 'withdrawal_pin_disabled',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date()
          }
        }
      });

      return res.json({
        success: true,
        message: enabled ? 'PIN de retiro activado' : 'PIN de retiro desactivado',
        data: {
          security: {
            withdrawalPin: {
              enabled
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error al cambiar estado del PIN de retiro:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cambiar el estado del PIN de retiro'
      });
    }
  },

  /**
   * Validar un PIN de retiro para una operación
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async validatePin(req, res) {
    try {
      const { pin } = req.body;
      const userId = req.user.id;

      // Obtener el usuario
      const user = await User.findById(userId);
      
      // Verificar si el usuario tiene un PIN configurado y activado
      if (!user.security?.withdrawalPin?.hasPin || !user.security?.withdrawalPin?.enabled) {
        return res.status(400).json({
          success: false,
          message: 'No tienes un PIN de retiro configurado o está desactivado'
        });
      }

      // Verificar si el PIN está bloqueado
      if (user.security?.withdrawalPin?.lockedUntil && new Date(user.security.withdrawalPin.lockedUntil) > new Date()) {
        return res.status(403).json({
          success: false,
          message: 'Tu PIN está temporalmente bloqueado debido a múltiples intentos fallidos. Intenta más tarde.'
        });
      }

      // Verificar el PIN
      const isMatch = await bcrypt.compare(pin, user.security.withdrawalPin.hash);
      if (!isMatch) {
        // Incrementar contador de intentos fallidos
        const failedAttempts = (user.security.withdrawalPin.failedAttempts || 0) + 1;
        let lockedUntil = null;
        
        // Bloquear después de 5 intentos fallidos
        if (failedAttempts >= 5) {
          lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
        }
        
        await User.findByIdAndUpdate(userId, {
          'security.withdrawalPin.failedAttempts': failedAttempts,
          'security.withdrawalPin.lockedUntil': lockedUntil
        });
        
        return res.status(400).json({
          success: false,
          message: 'PIN incorrecto',
          data: {
            remainingAttempts: Math.max(0, 5 - failedAttempts),
            locked: !!lockedUntil
          }
        });
      }

      // Resetear contador de intentos fallidos
      await User.findByIdAndUpdate(userId, {
        'security.withdrawalPin.failedAttempts': 0
      });

      return res.json({
        success: true,
        message: 'PIN validado correctamente'
      });
    } catch (error) {
      logger.error('Error al validar PIN de retiro:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al validar el PIN de retiro'
      });
    }
  },

  /**
   * Obtener el estado del PIN de retiro
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async getPinStatus(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      return res.json({
        success: true,
        data: {
          security: {
            withdrawalPin: {
              enabled: user.security?.withdrawalPin?.enabled || false,
              hasPin: user.security?.withdrawalPin?.hasPin || false,
              locked: user.security?.withdrawalPin?.lockedUntil && new Date(user.security.withdrawalPin.lockedUntil) > new Date()
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error al obtener estado del PIN de retiro:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el estado del PIN de retiro'
      });
    }
  }
};

module.exports = withdrawalPinController;