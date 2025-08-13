const SystemSetting = require('../models/SystemSetting.model');
const AdminLog = require('../models/AdminLog.model');
const logger = require('../utils/logger');
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

// Obtener todas las configuraciones (admin)
const getAllSettings = async (req, res) => {
  try {
    const {
      category = 'all',
      isPublic = 'all',
      search = '',
      sortBy = 'category',
      sortOrder = 'asc'
    } = req.query;

    // Construir filtros
    const filters = {};
    
    if (search) {
      filters.$or = [
        { key: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category !== 'all') {
      filters.category = category;
    }
    
    if (isPublic !== 'all') {
      filters.isPublic = isPublic === 'true';
    }

    // Configurar ordenamiento
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const settings = await SystemSetting.find(filters)
      .populate('updatedBy', 'fullName email')
      .sort(sort);

    // Agrupar por categoría para mejor organización
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        settings,
        groupedSettings,
        totalSettings: settings.length
      }
    });

  } catch (error) {
    logger.error('Error getting all settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener configuraciones públicas (para frontend)
const getPublicSettings = async (req, res) => {
  try {
    const { category = 'all' } = req.query;

    const filters = { isPublic: true };
    
    if (category !== 'all') {
      filters.category = category;
    }

    const settings = await SystemSetting.find(filters)
      .select('key value category dataType description')
      .sort({ category: 1, key: 1 });

    // Convertir a formato clave-valor para fácil uso en frontend
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = {
        value: setting.value,
        dataType: setting.dataType,
        category: setting.category,
        description: setting.description
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        settings: settingsMap,
        settingsArray: settings
      }
    });

  } catch (error) {
    logger.error('Error getting public settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener configuración de la aplicación (para frontend)
const getAppConfig = async (req, res) => {
  try {
    // Configuraciones específicas para la aplicación frontend
    const appSettings = await SystemSetting.find({
      isPublic: true,
      category: { $in: ['app', 'general', 'ui', 'features'] }
    })
      .select('key value category dataType description')
      .sort({ category: 1, key: 1 });

    // Configuración base de la aplicación
    const appConfig = {
      app: {
        name: 'Grow5X',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      features: {
        referralSystem: true,
        packages: true,
        automation: true,
        support: true
      },
      ui: {
        theme: 'default',
        language: 'es',
        currency: 'USD'
      }
    };

    // Sobrescribir con configuraciones de la base de datos
    appSettings.forEach(setting => {
      const keys = setting.key.split('.');
      let current = appConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = setting.value;
    });

    res.json({
      success: true,
      data: appConfig
    });

  } catch (error) {
    logger.error('Error getting app config:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener una configuración específica
const getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    
    const setting = await SystemSetting.findOne({ key })
      .populate('updatedBy', 'fullName email');
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    // Si no es admin y la configuración no es pública, denegar acceso
    if (!req.user || (req.user.role !== 'admin' && !setting.isPublic)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    res.json({
      success: true,
      data: { setting }
    });

  } catch (error) {
    logger.error('Error getting setting by key:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nueva configuración
const createSetting = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { key, value, category, description, dataType, isPublic, validation } = req.body;

    // Verificar que la clave no exista
    const existingSetting = await SystemSetting.findOne({ key });
    if (existingSetting) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una configuración con esta clave'
      });
    }

    const setting = await SystemSetting.create({
      key,
      value,
      category,
      description,
      dataType,
      isPublic,
      validation,
      updatedBy: req.user.id
    });
    
    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'system_setting_created',
      'system_setting',
      setting._id,
      { key, value, category, isPublic },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      'medium'
    );

    res.status(201).json({
      success: true,
      message: 'Configuración creada correctamente',
      data: { setting }
    });

  } catch (error) {
    logger.error('Error creating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar configuración
const updateSetting = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { key } = req.params;
    const updateData = req.body;
    
    const setting = await SystemSetting.findOne({ key });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    const previousValue = setting.value;
    const previousData = {
      value: setting.value,
      category: setting.category,
      isPublic: setting.isPublic,
      description: setting.description
    };

    // Actualizar usando el método estático para mantener historial
    const updatedSetting = await SystemSetting.updateSetting(
      key,
      updateData.value !== undefined ? updateData.value : setting.value,
      req.user.id,
      updateData
    );

    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'system_setting_updated',
      'system_setting',
      setting._id,
      { key, previousValue, newValue: updatedSetting.value, previousData, newData: updateData },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      'medium'
    );

    res.json({
      success: true,
      message: 'Configuración actualizada correctamente',
      data: { setting: updatedSetting }
    });

  } catch (error) {
    logger.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar configuración
const deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;
    
    const setting = await SystemSetting.findOne({ key });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    await SystemSetting.findOneAndDelete({ key });

    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'system_setting_deleted',
      'system_setting',
      setting._id,
      { key, value: setting.value, category: setting.category },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      'high'
    );

    res.json({
      success: true,
      message: 'Configuración eliminada correctamente'
    });

  } catch (error) {
    logger.error('Error deleting setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar múltiples configuraciones
const bulkUpdateSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { settings } = req.body; // Array de { key, value }
    
    const updatePromises = settings.map(async ({ key, value }) => {
      const setting = await SystemSetting.findOne({ key });
      if (setting) {
        return SystemSetting.updateSetting(key, value, req.user.id);
      }
      return null;
    });

    const results = await Promise.all(updatePromises);
    const updatedSettings = results.filter(result => result !== null);

    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'system_settings_bulk_update',
      'system_setting',
      null,
      { settingsCount: updatedSettings.length, settings: settings.map(s => ({ key: s.key, value: s.value })) },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      'medium'
    );

    res.json({
      success: true,
      message: `${updatedSettings.length} configuraciones actualizadas correctamente`,
      data: {
        updatedCount: updatedSettings.length,
        updatedSettings
      }
    });

  } catch (error) {
    logger.error('Error bulk updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener historial de una configuración
const getSettingHistory = async (req, res) => {
  try {
    const { key } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const setting = await SystemSetting.findOne({ key });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    // Obtener historial paginado
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const history = setting.history
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(skip, skip + parseInt(limit));

    // Poblar información del usuario para cada entrada del historial
    const populatedHistory = await Promise.all(
      history.map(async (entry) => {
        const User = require('../models/User');
        const user = await User.findById(entry.updatedBy).select('fullName email');
        return {
          ...entry.toObject(),
          updatedByUser: user
        };
      })
    );

    res.json({
      success: true,
      data: {
        key,
        currentValue: setting.value,
        history: populatedHistory,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(setting.history.length / parseInt(limit)),
          totalEntries: setting.history.length,
          hasNext: skip + history.length < setting.history.length,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error getting setting history:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Restaurar configuración a una versión anterior
const restoreSettingVersion = async (req, res) => {
  try {
    const { key } = req.params;
    const { version } = req.body;
    
    const setting = await SystemSetting.findOne({ key });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    // Buscar la versión en el historial
    const historyEntry = setting.history.find(entry => entry.version === version);
    if (!historyEntry) {
      return res.status(404).json({
        success: false,
        message: 'Versión no encontrada en el historial'
      });
    }

    const previousValue = setting.value;
    
    // Restaurar usando el método estático
    const restoredSetting = await SystemSetting.updateSetting(
      key,
      historyEntry.value,
      req.user.id,
      { description: setting.description } // Mantener otros campos
    );

    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'system_setting_restored',
      'system_setting',
      setting._id,
      { key, previousValue, restoredValue: historyEntry.value, restoredVersion: version },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      'medium'
    );

    res.json({
      success: true,
      message: 'Configuración restaurada correctamente',
      data: { setting: restoredSetting }
    });

  } catch (error) {
    logger.error('Error restoring setting version:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de configuraciones
const getSettingsStats = async (req, res) => {
  try {
    const [categoryStats, typeStats, publicStats, recentChanges] = await Promise.all([
      // Estadísticas por categoría
      SystemSetting.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            publicCount: {
              $sum: { $cond: [{ $eq: ['$isPublic', true] }, 1, 0] }
            }
          }
        }
      ]),
      
      // Estadísticas por tipo de dato
      SystemSetting.aggregate([
        {
          $group: {
            _id: '$dataType',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Estadísticas públicas vs privadas
      SystemSetting.aggregate([
        {
          $group: {
            _id: '$isPublic',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Cambios recientes
      SystemSetting.find()
        .select('key category lastModified updatedBy')
        .populate('updatedBy', 'fullName')
        .sort({ lastModified: -1 })
        .limit(10)
    ]);

    res.json({
      success: true,
      data: {
        categoryStats,
        typeStats,
        publicStats,
        recentChanges
      }
    });

  } catch (error) {
    logger.error('Error getting settings stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener configuraciones por categoría
const getSettingsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { includePrivate = 'false' } = req.query;

    const filters = { category };
    
    // Si no es admin, solo mostrar configuraciones públicas
    if (!req.user || req.user.role !== 'admin' || includePrivate === 'false') {
      filters.isPublic = true;
    }

    const settings = await SystemSetting.find(filters)
      .select('key value category dataType description isPublic')
      .sort({ key: 1 });

    // Convertir a formato clave-valor
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = {
        value: setting.value,
        dataType: setting.dataType,
        description: setting.description,
        isPublic: setting.isPublic
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        category,
        settings: settingsMap,
        settingsArray: settings,
        totalSettings: settings.length
      }
    });

  } catch (error) {
    logger.error('Error getting settings by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar configuraciones por categoría
const updateCategorySettings = async (req, res) => {
  try {
    const { category } = req.params;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un objeto de configuraciones'
      });
    }

    const updatePromises = Object.entries(settings).map(async ([key, value]) => {
      return await SystemSetting.findOneAndUpdate(
        { key, category },
        { 
          value,
          lastModified: new Date(),
          updatedBy: req.user.id
        },
        { new: true, upsert: false }
      );
    });

    const updatedSettings = await Promise.all(updatePromises);
    const validUpdates = updatedSettings.filter(setting => setting !== null);

    res.json({
      success: true,
      message: `${validUpdates.length} configuraciones actualizadas en la categoría ${category}`,
      data: {
        category,
        updatedCount: validUpdates.length,
        settings: validUpdates
      }
    });

  } catch (error) {
    logger.error('Error updating category settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Configuraciones de email
const getEmailConfig = async (req, res) => {
  try {
    const emailSettings = await SystemSetting.find({
      category: 'email',
      isPublic: false
    }).select('key value description');

    const config = emailSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Error getting email config:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const updateEmailConfig = async (req, res) => {
  try {
    const updates = req.body;
    const updatePromises = Object.entries(updates).map(async ([key, value]) => {
      return await SystemSetting.findOneAndUpdate(
        { key, category: 'email' },
        { value, lastModified: new Date(), updatedBy: req.user.id },
        { new: true, upsert: true }
      );
    });

    await Promise.all(updatePromises);
    res.json({ success: true, message: 'Configuración de email actualizada' });
  } catch (error) {
    logger.error('Error updating email config:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Configuraciones de pago
const getPaymentConfig = async (req, res) => {
  try {
    const paymentSettings = await SystemSetting.find({
      category: 'payment',
      isPublic: false
    }).select('key value description');

    const config = paymentSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Error getting payment config:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const updatePaymentConfig = async (req, res) => {
  try {
    const updates = req.body;
    const updatePromises = Object.entries(updates).map(async ([key, value]) => {
      return await SystemSetting.findOneAndUpdate(
        { key, category: 'payment' },
        { value, lastModified: new Date(), updatedBy: req.user.id },
        { new: true, upsert: true }
      );
    });

    await Promise.all(updatePromises);
    res.json({ success: true, message: 'Configuración de pago actualizada' });
  } catch (error) {
    logger.error('Error updating payment config:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Configuraciones de seguridad
const getSecurityConfig = async (req, res) => {
  try {
    const securitySettings = await SystemSetting.find({
      category: 'security',
      isPublic: false
    }).select('key value description');

    const config = securitySettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Error getting security config:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const updateSecurityConfig = async (req, res) => {
  try {
    const updates = req.body;
    const updatePromises = Object.entries(updates).map(async ([key, value]) => {
      return await SystemSetting.findOneAndUpdate(
        { key, category: 'security' },
        { value, lastModified: new Date(), updatedBy: req.user.id },
        { new: true, upsert: true }
      );
    });

    await Promise.all(updatePromises);
    res.json({ success: true, message: 'Configuración de seguridad actualizada' });
  } catch (error) {
    logger.error('Error updating security config:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Modo de mantenimiento
const getMaintenanceMode = async (req, res) => {
  try {
    const maintenanceSetting = await SystemSetting.findOne({ key: 'maintenance.enabled' });
    res.json({
      success: true,
      data: {
        enabled: maintenanceSetting ? maintenanceSetting.value : false
      }
    });
  } catch (error) {
    logger.error('Error getting maintenance mode:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const setMaintenanceMode = async (req, res) => {
  try {
    const { enabled, message } = req.body;
    await SystemSetting.findOneAndUpdate(
      { key: 'maintenance.enabled' },
      { value: enabled, lastModified: new Date(), updatedBy: req.user.id },
      { upsert: true }
    );
    
    if (message) {
      await SystemSetting.findOneAndUpdate(
        { key: 'maintenance.message' },
        { value: message, lastModified: new Date(), updatedBy: req.user.id },
        { upsert: true }
      );
    }

    res.json({ success: true, message: 'Modo de mantenimiento actualizado' });
  } catch (error) {
    logger.error('Error setting maintenance mode:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Feature flags
const getFeatureFlags = async (req, res) => {
  try {
    const featureSettings = await SystemSetting.find({
      category: 'features'
    }).select('key value description');

    const features = featureSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    logger.error('Error getting feature flags:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const updateFeatureFlags = async (req, res) => {
  try {
    const updates = req.body;
    const updatePromises = Object.entries(updates).map(async ([key, value]) => {
      return await SystemSetting.findOneAndUpdate(
        { key, category: 'features' },
        { value, lastModified: new Date(), updatedBy: req.user.id },
        { new: true, upsert: true }
      );
    });

    await Promise.all(updatePromises);
    res.json({ success: true, message: 'Feature flags actualizados' });
  } catch (error) {
    logger.error('Error updating feature flags:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Backup y restauración
const backupSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.find({});
    const backup = {
      timestamp: new Date(),
      settings: settings,
      version: '1.0'
    };

    res.json({
      success: true,
      data: backup,
      message: 'Backup de configuraciones generado'
    });
  } catch (error) {
    logger.error('Error creating backup:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const restoreSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: 'Datos de backup inválidos'
      });
    }

    const restorePromises = settings.map(async (setting) => {
      return await SystemSetting.findOneAndUpdate(
        { key: setting.key },
        {
          value: setting.value,
          category: setting.category,
          dataType: setting.dataType,
          description: setting.description,
          isPublic: setting.isPublic,
          lastModified: new Date(),
          updatedBy: req.user.id
        },
        { upsert: true, new: true }
      );
    });

    await Promise.all(restorePromises);
    res.json({ success: true, message: 'Configuraciones restauradas exitosamente' });
  } catch (error) {
    logger.error('Error restoring settings:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const resetToDefaults = async (req, res) => {
  try {
    // Configuraciones por defecto del sistema
    const defaultSettings = [
      { key: 'referral.commission_rate', value: 0.1, category: 'referral', dataType: 'number', description: 'Tasa de comisión por referido', isPublic: true },
      { key: 'referral.max_levels', value: 3, category: 'referral', dataType: 'number', description: 'Niveles máximos de referidos', isPublic: true },
      { key: 'app.maintenance_mode', value: false, category: 'app', dataType: 'boolean', description: 'Modo de mantenimiento', isPublic: false },
      { key: 'features.referral_system', value: true, category: 'features', dataType: 'boolean', description: 'Sistema de referidos habilitado', isPublic: true }
    ];

    const resetPromises = defaultSettings.map(async (setting) => {
      return await SystemSetting.findOneAndUpdate(
        { key: setting.key },
        {
          ...setting,
          lastModified: new Date(),
          updatedBy: req.user.id
        },
        { upsert: true, new: true }
      );
    });

    await Promise.all(resetPromises);
    res.json({ success: true, message: 'Configuraciones restablecidas a valores por defecto' });
  } catch (error) {
    logger.error('Error resetting to defaults:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = {
  getAllSettings,
  getPublicSettings,
  getAppConfig,
  getSettingByKey,
  getSettingsByCategory,
  createSetting,
  updateSetting,
  deleteSetting,
  updateCategorySettings,
  bulkUpdateSettings,
  getSettingHistory,
  restoreSettingVersion,
  getSettingsStats,
  getEmailConfig,
  updateEmailConfig,
  getPaymentConfig,
  updatePaymentConfig,
  getSecurityConfig,
  updateSecurityConfig,
  getMaintenanceMode,
  setMaintenanceMode,
  getFeatureFlags,
  updateFeatureFlags,
  backupSettings,
  restoreSettings,
  resetToDefaults
};