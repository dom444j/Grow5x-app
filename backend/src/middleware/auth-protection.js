const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { createResponse } = require('../utils/helpers');

/**
 * SISTEMA DE BLINDAJE DE AUTENTICACIÓN
 * Protege contra pérdida de sesiones durante deploys
 * Implementa múltiples capas de validación y recuperación
 */

class AuthProtection {
  constructor() {
    this.tokenCache = new Map();
    this.userSessionCache = new Map();
    this.failureCount = new Map();
    this.maxFailures = 3;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Middleware principal de protección de autenticación
   */
  protectAuth = async (req, res, next) => {
    try {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      
      // Log de inicio de validación
      logger.info('Auth Protection - Inicio de validación', {
        requestId,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Extraer token con múltiples métodos
      const token = this.extractToken(req);
      if (!token) {
        return this.handleAuthFailure(res, 'NO_TOKEN', 'Token de acceso requerido', requestId);
      }

      // Verificar token con cache y fallback
      const tokenValidation = await this.validateTokenWithFallback(token, requestId);
      if (!tokenValidation.valid) {
        return this.handleAuthFailure(res, tokenValidation.error, tokenValidation.message, requestId);
      }

      // Verificar usuario con cache
      const userValidation = await this.validateUserWithCache(tokenValidation.decoded, requestId);
      if (!userValidation.valid) {
        return this.handleAuthFailure(res, userValidation.error, userValidation.message, requestId);
      }

      // Actualizar cache de sesión
      this.updateSessionCache(userValidation.user);

      // Agregar información al request
      req.user = userValidation.user;
      req.authInfo = {
        requestId,
        validatedAt: new Date(),
        method: 'protected_auth',
        processingTime: Date.now() - startTime
      };

      // Log de éxito
      logger.info('Auth Protection - Validación exitosa', {
        requestId,
        userId: userValidation.user._id,
        processingTime: Date.now() - startTime
      });

      next();
    } catch (error) {
      logger.error('Auth Protection - Error crítico', {
        error: error.message,
        stack: error.stack,
        path: req.path
      });
      
      return res.status(500).json(
        createResponse(false, 'Error interno de autenticación', null, 'AUTH_SYSTEM_ERROR')
      );
    }
  };

  /**
   * Extrae token de múltiples fuentes
   */
  extractToken(req) {
    // Método 1: Authorization header (Bearer)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    // Método 2: Authorization header (sin Bearer)
    if (authHeader && !authHeader.includes(' ')) {
      return authHeader;
    }

    // Método 3: Query parameter
    if (req.query.token) {
      return req.query.token;
    }

    // Método 4: Cookie
    if (req.cookies && req.cookies.authToken) {
      return req.cookies.authToken;
    }

    // Método 5: Header personalizado
    if (req.headers['x-auth-token']) {
      return req.headers['x-auth-token'];
    }

    return null;
  }

  /**
   * Valida token con cache y múltiples intentos
   */
  async validateTokenWithFallback(token, requestId) {
    try {
      // Verificar cache primero
      const cacheKey = this.generateTokenCacheKey(token);
      const cachedValidation = this.tokenCache.get(cacheKey);
      
      if (cachedValidation && (Date.now() - cachedValidation.timestamp) < this.cacheTimeout) {
        logger.debug('Auth Protection - Token validado desde cache', { requestId });
        return { valid: true, decoded: cachedValidation.decoded };
      }

      // Intentar validación con JWT_SECRET principal
      let decoded = await this.verifyTokenWithSecret(token, process.env.JWT_SECRET);
      if (decoded) {
        this.cacheTokenValidation(cacheKey, decoded);
        return { valid: true, decoded };
      }

      // Fallback: Intentar con JWT_REFRESH_SECRET
      decoded = await this.verifyTokenWithSecret(token, process.env.JWT_REFRESH_SECRET);
      if (decoded) {
        logger.warn('Auth Protection - Token validado con refresh secret', { requestId });
        this.cacheTokenValidation(cacheKey, decoded);
        return { valid: true, decoded };
      }

      // Fallback: Intentar con secrets de backup (si existen)
      const backupSecrets = this.getBackupSecrets();
      for (const secret of backupSecrets) {
        decoded = await this.verifyTokenWithSecret(token, secret);
        if (decoded) {
          logger.warn('Auth Protection - Token validado con backup secret', { requestId });
          this.cacheTokenValidation(cacheKey, decoded);
          return { valid: true, decoded };
        }
      }

      return {
        valid: false,
        error: 'INVALID_TOKEN',
        message: 'Token inválido o expirado'
      };

    } catch (error) {
      logger.error('Auth Protection - Error en validación de token', {
        requestId,
        error: error.message
      });
      
      return {
        valid: false,
        error: 'TOKEN_VALIDATION_ERROR',
        message: 'Error al validar token'
      };
    }
  }

  /**
   * Verifica token con un secret específico
   */
  async verifyTokenWithSecret(token, secret) {
    try {
      if (!secret) return null;
      
      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        ignoreExpiration: false
      });
      
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        // Intentar con ignoreExpiration para tokens recién expirados
        try {
          const decoded = jwt.verify(token, secret, {
            algorithms: ['HS256'],
            ignoreExpiration: true
          });
          
          // Solo aceptar si expiró hace menos de 5 minutos
          const now = Math.floor(Date.now() / 1000);
          if (decoded.exp && (now - decoded.exp) < 300) {
            logger.warn('Auth Protection - Token expirado recientemente aceptado', {
              userId: decoded.userId,
              expiredSeconds: now - decoded.exp
            });
            return decoded;
          }
        } catch (innerError) {
          // Ignorar errores del fallback
        }
      }
      return null;
    }
  }

  /**
   * Valida usuario con cache
   */
  async validateUserWithCache(decoded, requestId) {
    try {
      if (!decoded.userId) {
        return {
          valid: false,
          error: 'INVALID_TOKEN_PAYLOAD',
          message: 'Token no contiene información de usuario'
        };
      }

      // Verificar cache de usuario
      const userCacheKey = `user_${decoded.userId}`;
      const cachedUser = this.userSessionCache.get(userCacheKey);
      
      if (cachedUser && (Date.now() - cachedUser.timestamp) < this.cacheTimeout) {
        logger.debug('Auth Protection - Usuario validado desde cache', { requestId, userId: decoded.userId });
        return { valid: true, user: cachedUser.user };
      }

      // Cargar usuario desde base de datos
      const User = require('../models/User');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return {
          valid: false,
          error: 'USER_NOT_FOUND',
          message: 'Usuario no encontrado'
        };
      }

      // Validaciones de estado
      if (user.status !== 'active' && user.status !== 'pending') {
        return {
          valid: false,
          error: 'USER_INACTIVE',
          message: 'Cuenta de usuario inactiva'
        };
      }

      if (user.isLocked) {
        return {
          valid: false,
          error: 'USER_LOCKED',
          message: 'Cuenta temporalmente bloqueada'
        };
      }

      // Actualizar cache
      this.userSessionCache.set(userCacheKey, {
        user,
        timestamp: Date.now()
      });

      return { valid: true, user };

    } catch (error) {
      logger.error('Auth Protection - Error en validación de usuario', {
        requestId,
        userId: decoded.userId,
        error: error.message
      });
      
      return {
        valid: false,
        error: 'USER_VALIDATION_ERROR',
        message: 'Error al validar usuario'
      };
    }
  }

  /**
   * Maneja fallos de autenticación
   */
  handleAuthFailure(res, errorCode, message, requestId) {
    logger.warn('Auth Protection - Fallo de autenticación', {
      requestId,
      errorCode,
      message
    });

    const statusCode = this.getStatusCodeForError(errorCode);
    
    return res.status(statusCode).json(
      createResponse(false, message, null, errorCode)
    );
  }

  /**
   * Obtiene código de estado HTTP según el error
   */
  getStatusCodeForError(errorCode) {
    const statusMap = {
      'NO_TOKEN': 401,
      'INVALID_TOKEN': 401,
      'TOKEN_VALIDATION_ERROR': 401,
      'USER_NOT_FOUND': 401,
      'USER_INACTIVE': 403,
      'USER_LOCKED': 403,
      'AUTH_SYSTEM_ERROR': 500
    };
    
    return statusMap[errorCode] || 401;
  }

  /**
   * Genera ID único para request
   */
  generateRequestId() {
    return `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Genera clave de cache para token
   */
  generateTokenCacheKey(token) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex').substr(0, 16);
  }

  /**
   * Cachea validación de token
   */
  cacheTokenValidation(cacheKey, decoded) {
    this.tokenCache.set(cacheKey, {
      decoded,
      timestamp: Date.now()
    });
  }

  /**
   * Actualiza cache de sesión
   */
  updateSessionCache(user) {
    const userCacheKey = `user_${user._id}`;
    this.userSessionCache.set(userCacheKey, {
      user,
      timestamp: Date.now()
    });
  }

  /**
   * Obtiene secrets de backup
   */
  getBackupSecrets() {
    const secrets = [];
    
    // Agregar secrets de backup si existen
    if (process.env.JWT_SECRET_BACKUP) {
      secrets.push(process.env.JWT_SECRET_BACKUP);
    }
    
    if (process.env.JWT_SECRET_OLD) {
      secrets.push(process.env.JWT_SECRET_OLD);
    }
    
    return secrets;
  }

  /**
   * Limpia caches periódicamente
   */
  cleanupCaches() {
    const now = Date.now();
    
    // Limpiar cache de tokens
    for (const [key, value] of this.tokenCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.tokenCache.delete(key);
      }
    }
    
    // Limpiar cache de usuarios
    for (const [key, value] of this.userSessionCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.userSessionCache.delete(key);
      }
    }
  }

  /**
   * Inicia limpieza automática de caches
   */
  startCacheCleanup() {
    setInterval(() => {
      this.cleanupCaches();
    }, 60000); // Cada minuto
  }

  /**
   * Método de validación para compatibilidad con auth.middleware.js
   */
  async validateRequest(req, options = {}) {
    try {
      const token = this.extractToken(req);
      if (!token) {
        if (options.optional) {
          return { success: false, error: 'NO_TOKEN' };
        }
        return { success: false, error: 'Token de acceso requerido', code: 'NO_TOKEN' };
      }

      const tokenValidation = await this.validateTokenWithFallback(token, 'validate_request');
      if (!tokenValidation.valid) {
        return { 
          success: false, 
          error: tokenValidation.message, 
          code: tokenValidation.error 
        };
      }

      const userValidation = await this.validateUserWithCache(tokenValidation.decoded, 'validate_request');
      if (!userValidation.valid) {
        return { 
          success: false, 
          error: userValidation.message, 
          code: userValidation.error 
        };
      }

      return {
        success: true,
        data: {
          token,
          decoded: tokenValidation.decoded,
          user: userValidation.user
        }
      };
    } catch (error) {
      logger.error('Auth Protection - Error en validateRequest', {
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: 'Error interno de autenticación',
        code: 'AUTH_SYSTEM_ERROR'
      };
    }
  }
}

// Crear instancia singleton
const authProtection = new AuthProtection();
authProtection.startCacheCleanup();

module.exports = {
  authProtection,
  AuthProtection
};