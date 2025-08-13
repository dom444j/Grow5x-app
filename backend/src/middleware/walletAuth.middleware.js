const UserWalletRole = require('../models/UserWalletRole.model');
const WalletRole = require('../models/WalletRole.model');
const logger = require('../utils/logger');
const { createResponse } = require('../utils/helpers');

/**
 * Middleware para verificar permisos específicos de wallet
 * @param {string|array} requiredPermissions - Permiso(s) requerido(s)
 * @returns {Function} Middleware function
 */
const requireWalletPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json(
          createResponse(false, 'Authentication required', null, 'AUTH_REQUIRED')
        );
      }

      // Super admin siempre tiene acceso
      if (req.user.role === 'superadmin') {
        return next();
      }

      // Admin tradicional tiene acceso limitado
      if (req.user.role === 'admin') {
        const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
        const adminAllowedPermissions = [
          'view_wallets', 'view_wallet_details', 'view_wallet_stats', 
          'create_wallet', 'update_wallet', 'update_wallet_balance'
        ];
        
        const hasPermission = permissions.every(perm => adminAllowedPermissions.includes(perm));
        if (hasPermission) {
          return next();
        }
      }

      // Verificar roles específicos de wallet
      const userWalletRole = await UserWalletRole.findOne({
        userId: req.user._id,
        isActive: true
      });

      if (!userWalletRole) {
        logger.logSecurityEvent('wallet_access_denied_no_role', {
          userId: req.user._id,
          email: req.user.email,
          requiredPermissions,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        });
        
        return res.status(403).json(
          createResponse(false, 'No wallet permissions assigned', null, 'WALLET_ACCESS_DENIED')
        );
      }

      // Verificar si el rol ha expirado
      if (userWalletRole.isExpired()) {
        logger.logSecurityEvent('wallet_access_denied_expired_role', {
          userId: req.user._id,
          email: req.user.email,
          walletRole: userWalletRole.walletRole,
          expiresAt: userWalletRole.expiresAt,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(403).json(
          createResponse(false, 'Wallet role has expired', null, 'WALLET_ROLE_EXPIRED')
        );
      }

      // Verificar permisos específicos
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      const hasAllPermissions = permissions.every(permission => 
        userWalletRole.hasPermission(permission)
      );

      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(permission => 
          !userWalletRole.hasPermission(permission)
        );

        logger.logSecurityEvent('wallet_access_denied_insufficient_permissions', {
          userId: req.user._id,
          email: req.user.email,
          walletRole: userWalletRole.walletRole,
          requiredPermissions,
          missingPermissions,
          userPermissions: userWalletRole.permissions,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        });
        
        return res.status(403).json(
          createResponse(false, `Insufficient wallet permissions. Missing: ${missingPermissions.join(', ')}`, null, 'INSUFFICIENT_WALLET_PERMISSIONS')
        );
      }

      // Verificar restricciones de IP si están configuradas
      if (userWalletRole.restrictions.ipWhitelist && userWalletRole.restrictions.ipWhitelist.length > 0) {
        const clientIP = req.ip || req.connection.remoteAddress;
        if (!userWalletRole.restrictions.ipWhitelist.includes(clientIP)) {
          logger.logSecurityEvent('wallet_access_denied_ip_restriction', {
            userId: req.user._id,
            email: req.user.email,
            clientIP,
            allowedIPs: userWalletRole.restrictions.ipWhitelist,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          
          return res.status(403).json(
            createResponse(false, 'Access denied from this IP address', null, 'IP_NOT_ALLOWED')
          );
        }
      }

      // Verificar restricciones de tiempo
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();
      
      if (userWalletRole.restrictions.timeRestrictions) {
        const { startHour, endHour, allowedDays } = userWalletRole.restrictions.timeRestrictions;
        
        if (startHour !== undefined && endHour !== undefined) {
          if (currentHour < startHour || currentHour > endHour) {
            return res.status(403).json(
              createResponse(false, `Access only allowed between ${startHour}:00 and ${endHour}:00`, null, 'TIME_RESTRICTION')
            );
          }
        }
        
        if (allowedDays && allowedDays.length > 0 && !allowedDays.includes(currentDay)) {
          return res.status(403).json(
            createResponse(false, 'Access not allowed on this day', null, 'DAY_RESTRICTION')
          );
        }
      }

      // Registrar actividad exitosa
      userWalletRole.logActivity(
        `wallet_access_${req.method.toLowerCase()}`,
        {
          path: req.path,
          permissions: requiredPermissions
        },
        req.ip,
        req.get('User-Agent')
      );
      
      await userWalletRole.save();

      // Agregar información del rol al request para uso posterior
      req.walletRole = userWalletRole;
      
      next();

    } catch (error) {
      logger.error('Error in wallet permission middleware:', error);
      res.status(500).json(
        createResponse(false, 'Internal server error during permission check', null, 'PERMISSION_CHECK_ERROR')
      );
    }
  };
};

/**
 * Middleware para verificar límites de creación de wallets
 */
const checkWalletCreationLimits = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json(
        createResponse(false, 'Authentication required', null, 'AUTH_REQUIRED')
      );
    }

    // Super admin no tiene límites
    if (req.user.role === 'superadmin') {
      return next();
    }

    const userWalletRole = await UserWalletRole.findOne({
      userId: req.user._id,
      isActive: true
    });

    if (!userWalletRole) {
      return res.status(403).json(
        createResponse(false, 'No wallet role assigned', null, 'NO_WALLET_ROLE')
      );
    }

    const canCreate = userWalletRole.canCreateWallet();
    if (!canCreate.allowed) {
      logger.logSecurityEvent('wallet_creation_limit_exceeded', {
        userId: req.user._id,
        email: req.user.email,
        reason: canCreate.reason,
        dailyCount: userWalletRole.activityLimits.dailyWalletCreations.count,
        dailyLimit: userWalletRole.activityLimits.dailyWalletCreations.limit,
        monthlyCount: userWalletRole.activityLimits.monthlyWalletCreations.count,
        monthlyLimit: userWalletRole.activityLimits.monthlyWalletCreations.limit,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(429).json(
        createResponse(false, canCreate.reason, null, 'WALLET_CREATION_LIMIT_EXCEEDED')
      );
    }

    next();

  } catch (error) {
    logger.error('Error checking wallet creation limits:', error);
    res.status(500).json(
      createResponse(false, 'Internal server error during limit check', null, 'LIMIT_CHECK_ERROR')
    );
  }
};

/**
 * Middleware para incrementar contadores después de crear wallet exitosamente
 */
const incrementWalletCreationCounter = async (req, res, next) => {
  try {
    if (req.walletRole && req.user.role !== 'superadmin') {
      req.walletRole.incrementWalletCreation();
      req.walletRole.logActivity(
        'wallet_created',
        {
          walletId: res.locals.createdWalletId, // Se debe establecer en el controlador
          address: res.locals.createdWalletAddress
        },
        req.ip,
        req.get('User-Agent')
      );
      
      await req.walletRole.save();
    }
    next();
  } catch (error) {
    logger.error('Error incrementing wallet creation counter:', error);
    // No bloquear la respuesta por este error
    next();
  }
};

/**
 * Middleware para verificar si una red específica está permitida
 */
const checkAllowedNetwork = (req, res, next) => {
  try {
    if (!req.walletRole || req.user.role === 'superadmin') {
      return next();
    }

    const requestedNetwork = req.body.network || req.params.network;
    if (!requestedNetwork) {
      return next();
    }

    const allowedNetworks = req.walletRole.restrictions.allowedNetworks;
    if (allowedNetworks && allowedNetworks.length > 0 && !allowedNetworks.includes(requestedNetwork)) {
      logger.logSecurityEvent('wallet_network_not_allowed', {
        userId: req.user._id,
        email: req.user.email,
        requestedNetwork,
        allowedNetworks,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json(
        createResponse(false, `Network ${requestedNetwork} not allowed. Allowed networks: ${allowedNetworks.join(', ')}`, null, 'NETWORK_NOT_ALLOWED')
      );
    }

    next();
  } catch (error) {
    logger.error('Error checking allowed network:', error);
    res.status(500).json(
      createResponse(false, 'Internal server error during network check', null, 'NETWORK_CHECK_ERROR')
    );
  }
};

module.exports = {
  requireWalletPermission,
  checkWalletCreationLimits,
  incrementWalletCreationCounter,
  checkAllowedNetwork
};