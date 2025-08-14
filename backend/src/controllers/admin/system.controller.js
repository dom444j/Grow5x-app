const mongoose = require('mongoose');
const SystemConfig = require('../../models/SystemConfig.model');
const AdminLog = require('../../models/AdminLog.model');
const logger = require('../../utils/logger');
const { validationResult } = require('express-validator');

// Función helper para registrar acciones de admin
const logAdminAction = async (adminId, action, targetType, targetId, details, metadata, severity = 'medium') => {
  try {
    await AdminLog.create({
      adminId,
      action,
      targetType,
      targetId,
      details,
      metadata,
      severity
    });
  } catch (error) {
    logger.error('Error logging admin action:', error);
  }
};

// Obtener configuración del sistema
const getSystemConfig = async (req, res) => {
  try {
    const config = await SystemConfig.findOne().lean();
    
    if (!config) {
      // Crear configuración por defecto si no existe
      const defaultConfig = new SystemConfig({
        maintenance: {
          enabled: false,
          message: 'Sistema en mantenimiento. Volveremos pronto.',
          allowedRoles: ['admin']
        },
        features: {
          registration: true,
          withdrawals: true,
          deposits: true,
          referrals: true,
          trading: true
        },
        limits: {
          minWithdrawal: 10,
          maxWithdrawal: 10000,
          minDeposit: 5,
          maxDeposit: 50000,
          dailyWithdrawalLimit: 5000,
          monthlyWithdrawalLimit: 50000
        },
        fees: {
          withdrawalFeePercentage: 2,
          minimumWithdrawalFee: 1,
          tradingFeePercentage: 0.1
        },
        security: {
          maxLoginAttempts: 5,
          lockoutDuration: 30,
          sessionTimeout: 24,
          requireEmailVerification: true,
          require2FA: false
        },
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true
        }
      });
      
      await defaultConfig.save();
      
      await logAdminAction(
        req.user.id,
        'create_default_system_config',
        'system_config',
        defaultConfig._id,
        'Created default system configuration',
        { configId: defaultConfig._id },
        'medium'
      );
      
      return res.json({
        success: true,
        data: defaultConfig
      });
    }

    await logAdminAction(
      req.user.id,
      'view_system_config',
      'system_config',
      config._id,
      'Viewed system configuration',
      { configId: config._id },
      'low'
    );

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error('Error getting system config:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Actualizar configuración del sistema
const updateSystemConfig = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const updateData = req.body;
    
    let config = await SystemConfig.findOne();
    
    if (!config) {
      config = new SystemConfig(updateData);
    } else {
      // Merge de configuraciones
      Object.keys(updateData).forEach(key => {
        if (typeof updateData[key] === 'object' && updateData[key] !== null && !Array.isArray(updateData[key])) {
          config[key] = { ...config[key], ...updateData[key] };
        } else {
          config[key] = updateData[key];
        }
      });
    }

    config.updatedAt = new Date();
    config.updatedBy = req.user.id;
    
    await config.save();

    await logAdminAction(
      req.user.id,
      'update_system_config',
      'system_config',
      config._id,
      'Updated system configuration',
      {
        configId: config._id,
        updatedFields: Object.keys(updateData),
        changes: updateData
      },
      'high'
    );

    res.json({
      success: true,
      message: 'Configuración del sistema actualizada exitosamente',
      data: config
    });

  } catch (error) {
    logger.error('Error updating system config:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Activar/Desactivar modo mantenimiento
const toggleMaintenance = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { enabled, message, allowedRoles } = req.body;
    
    let config = await SystemConfig.findOne();
    
    if (!config) {
      config = new SystemConfig();
    }

    const oldMaintenanceState = config.maintenance?.enabled || false;
    
    config.maintenance = {
      enabled: enabled !== undefined ? enabled : !oldMaintenanceState,
      message: message || config.maintenance?.message || 'Sistema en mantenimiento. Volveremos pronto.',
      allowedRoles: allowedRoles || config.maintenance?.allowedRoles || ['admin'],
      lastToggled: new Date(),
      toggledBy: req.user.id
    };
    
    config.updatedAt = new Date();
    config.updatedBy = req.user.id;
    
    await config.save();

    await logAdminAction(
      req.user.id,
      'toggle_maintenance_mode',
      'system_config',
      config._id,
      `${config.maintenance.enabled ? 'Enabled' : 'Disabled'} maintenance mode`,
      {
        configId: config._id,
        maintenanceEnabled: config.maintenance.enabled,
        message: config.maintenance.message,
        allowedRoles: config.maintenance.allowedRoles
      },
      'high'
    );

    res.json({
      success: true,
      message: `Modo mantenimiento ${config.maintenance.enabled ? 'activado' : 'desactivado'} exitosamente`,
      data: {
        maintenance: config.maintenance
      }
    });

  } catch (error) {
    logger.error('Error toggling maintenance mode:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Actualizar límites del sistema
const updateSystemLimits = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const {
      minWithdrawal,
      maxWithdrawal,
      minDeposit,
      maxDeposit,
      dailyWithdrawalLimit,
      monthlyWithdrawalLimit
    } = req.body;
    
    let config = await SystemConfig.findOne();
    
    if (!config) {
      config = new SystemConfig();
    }

    const oldLimits = { ...config.limits };
    
    config.limits = {
      ...config.limits,
      ...(minWithdrawal !== undefined && { minWithdrawal }),
      ...(maxWithdrawal !== undefined && { maxWithdrawal }),
      ...(minDeposit !== undefined && { minDeposit }),
      ...(maxDeposit !== undefined && { maxDeposit }),
      ...(dailyWithdrawalLimit !== undefined && { dailyWithdrawalLimit }),
      ...(monthlyWithdrawalLimit !== undefined && { monthlyWithdrawalLimit })
    };
    
    config.updatedAt = new Date();
    config.updatedBy = req.user.id;
    
    await config.save();

    await logAdminAction(
      req.user.id,
      'update_system_limits',
      'system_config',
      config._id,
      'Updated system limits',
      {
        configId: config._id,
        oldLimits,
        newLimits: config.limits,
        changes: req.body
      },
      'high'
    );

    res.json({
      success: true,
      message: 'Límites del sistema actualizados exitosamente',
      data: {
        limits: config.limits
      }
    });

  } catch (error) {
    logger.error('Error updating system limits:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Actualizar tarifas del sistema
const updateSystemFees = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const {
      withdrawalFeePercentage,
      minimumWithdrawalFee,
      tradingFeePercentage
    } = req.body;
    
    let config = await SystemConfig.findOne();
    
    if (!config) {
      config = new SystemConfig();
    }

    const oldFees = { ...config.fees };
    
    config.fees = {
      ...config.fees,
      ...(withdrawalFeePercentage !== undefined && { withdrawalFeePercentage }),
      ...(minimumWithdrawalFee !== undefined && { minimumWithdrawalFee }),
      ...(tradingFeePercentage !== undefined && { tradingFeePercentage })
    };
    
    config.updatedAt = new Date();
    config.updatedBy = req.user.id;
    
    await config.save();

    await logAdminAction(
      req.user.id,
      'update_system_fees',
      'system_config',
      config._id,
      'Updated system fees',
      {
        configId: config._id,
        oldFees,
        newFees: config.fees,
        changes: req.body
      },
      'high'
    );

    res.json({
      success: true,
      message: 'Tarifas del sistema actualizadas exitosamente',
      data: {
        fees: config.fees
      }
    });

  } catch (error) {
    logger.error('Error updating system fees:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Activar/Desactivar características del sistema
const toggleSystemFeature = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { feature, enabled } = req.body;
    
    const allowedFeatures = ['registration', 'withdrawals', 'deposits', 'referrals', 'trading'];
    
    if (!allowedFeatures.includes(feature)) {
      return res.status(400).json({
        success: false,
        message: 'Característica no válida'
      });
    }
    
    let config = await SystemConfig.findOne();
    
    if (!config) {
      config = new SystemConfig();
    }

    const oldFeatureState = config.features?.[feature] || false;
    
    config.features = {
      ...config.features,
      [feature]: enabled !== undefined ? enabled : !oldFeatureState
    };
    
    config.updatedAt = new Date();
    config.updatedBy = req.user.id;
    
    await config.save();

    await logAdminAction(
      req.user.id,
      'toggle_system_feature',
      'system_config',
      config._id,
      `${config.features[feature] ? 'Enabled' : 'Disabled'} feature: ${feature}`,
      {
        configId: config._id,
        feature,
        enabled: config.features[feature],
        oldState: oldFeatureState
      },
      'medium'
    );

    res.json({
      success: true,
      message: `Característica ${feature} ${config.features[feature] ? 'activada' : 'desactivada'} exitosamente`,
      data: {
        feature,
        enabled: config.features[feature]
      }
    });

  } catch (error) {
    logger.error('Error toggling system feature:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getSystemConfig,
  updateSystemConfig,
  toggleMaintenance,
  updateSystemLimits,
  updateSystemFees,
  toggleSystemFeature
};