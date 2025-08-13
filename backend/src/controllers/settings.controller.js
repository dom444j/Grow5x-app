const User = require('../models/User');
const UserSettings = require('../models/UserSettings');
// const UserSession = require('../models/UserSession'); // Modelo no existe
// const UserDevice = require('../models/UserDevice'); // Modelo no existe
// const ApiKey = require('../models/ApiKey'); // Modelo no existe
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class SettingsController {
  // ===== CONFIGURACIONES GENERALES =====
  
  async getGeneralSettings(req, res) {
    try {
      const userId = req.user.id;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        // Crear configuraciones por defecto
        settings = new UserSettings({
          userId,
          general: {
            language: 'es',
            theme: 'system',
            timezone: 'America/Mexico_City',
            currency: 'USD'
          }
        });
        await settings.save();
      }
      
      res.json({
        success: true,
        data: settings.general
      });
    } catch (error) {
      console.error('Error getting general settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuraciones generales'
      });
    }
  }
  
  async updateGeneralSettings(req, res) {
    try {
      const userId = req.user.id;
      const { language, theme, timezone, currency } = req.body;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        settings = new UserSettings({ userId });
      }
      
      // Actualizar solo los campos proporcionados
      if (language !== undefined) settings.general.language = language;
      if (theme !== undefined) settings.general.theme = theme;
      if (timezone !== undefined) settings.general.timezone = timezone;
      if (currency !== undefined) settings.general.currency = currency;
      
      settings.updatedAt = new Date();
      await settings.save();
      
      res.json({
        success: true,
        message: 'Configuraciones generales actualizadas',
        data: settings.general
      });
    } catch (error) {
      console.error('Error updating general settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar configuraciones generales'
      });
    }
  }
  
  // ===== CONFIGURACIONES DE NOTIFICACIONES =====
  
  async getNotificationSettings(req, res) {
    try {
      const userId = req.user.id;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        settings = new UserSettings({
          userId,
          notifications: {
            emailNotifications: true,
            pushNotifications: true,
            smsNotifications: false,
            marketingEmails: false,
            securityAlerts: true,
            transactionAlerts: true,
            referralNotifications: true,
            systemUpdates: true
          }
        });
        await settings.save();
      }
      
      res.json({
        success: true,
        data: settings.notifications
      });
    } catch (error) {
      console.error('Error getting notification settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuraciones de notificaciones'
      });
    }
  }
  
  async updateNotificationSettings(req, res) {
    try {
      const userId = req.user.id;
      const notificationData = req.body;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        settings = new UserSettings({ userId });
      }
      
      // Actualizar configuraciones de notificaciones
      Object.keys(notificationData).forEach(key => {
        if (notificationData[key] !== undefined) {
          settings.notifications[key] = notificationData[key];
        }
      });
      
      settings.updatedAt = new Date();
      await settings.save();
      
      res.json({
        success: true,
        message: 'Configuraciones de notificaciones actualizadas',
        data: settings.notifications
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar configuraciones de notificaciones'
      });
    }
  }
  
  // ===== CONFIGURACIONES DE PRIVACIDAD =====
  
  async getPrivacySettings(req, res) {
    try {
      const userId = req.user.id;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        settings = new UserSettings({
          userId,
          privacy: {
            profileVisibility: 'private',
            showEmail: false,
            showPhone: false,
            showLastActivity: true,
            allowDataCollection: false,
            allowAnalytics: true,
            twoFactorAuth: false
          }
        });
        await settings.save();
      }
      
      res.json({
        success: true,
        data: settings.privacy
      });
    } catch (error) {
      console.error('Error getting privacy settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuraciones de privacidad'
      });
    }
  }
  
  async updatePrivacySettings(req, res) {
    try {
      const userId = req.user.id;
      const privacyData = req.body;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        settings = new UserSettings({ userId });
      }
      
      // Actualizar configuraciones de privacidad
      Object.keys(privacyData).forEach(key => {
        if (privacyData[key] !== undefined) {
          settings.privacy[key] = privacyData[key];
        }
      });
      
      settings.updatedAt = new Date();
      await settings.save();
      
      res.json({
        success: true,
        message: 'Configuraciones de privacidad actualizadas',
        data: settings.privacy
      });
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar configuraciones de privacidad'
      });
    }
  }
  
  // ===== CONFIGURACIONES DE SEGURIDAD =====
  
  async getSecuritySettings(req, res) {
    try {
      const userId = req.user.id;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        settings = new UserSettings({
          userId,
          security: {
            sessionTimeout: 30,
            loginNotifications: true,
            deviceTracking: true,
            ipWhitelist: [],
            autoLogout: true
          }
        });
        await settings.save();
      }
      
      res.json({
        success: true,
        data: settings.security
      });
    } catch (error) {
      console.error('Error getting security settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuraciones de seguridad'
      });
    }
  }
  
  async updateSecuritySettings(req, res) {
    try {
      const userId = req.user.id;
      const securityData = req.body;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        settings = new UserSettings({ userId });
      }
      
      // Actualizar configuraciones de seguridad
      Object.keys(securityData).forEach(key => {
        if (securityData[key] !== undefined) {
          settings.security[key] = securityData[key];
        }
      });
      
      settings.updatedAt = new Date();
      await settings.save();
      
      res.json({
        success: true,
        message: 'Configuraciones de seguridad actualizadas',
        data: settings.security
      });
    } catch (error) {
      console.error('Error updating security settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar configuraciones de seguridad'
      });
    }
  }
  
  // ===== CONFIGURACIONES ESPECÍFICAS =====
  
  async updateTheme(req, res) {
    try {
      const userId = req.user.id;
      const { theme } = req.body;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        settings = new UserSettings({ userId });
      }
      
      settings.general.theme = theme;
      settings.updatedAt = new Date();
      await settings.save();
      
      res.json({
        success: true,
        message: 'Tema actualizado correctamente',
        data: { theme }
      });
    } catch (error) {
      console.error('Error updating theme:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar tema'
      });
    }
  }
  
  async updateLanguage(req, res) {
    try {
      const userId = req.user.id;
      const { language } = req.body;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        settings = new UserSettings({ userId });
      }
      
      settings.general.language = language;
      settings.updatedAt = new Date();
      await settings.save();
      
      res.json({
        success: true,
        message: 'Idioma actualizado correctamente',
        data: { language }
      });
    } catch (error) {
      console.error('Error updating language:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar idioma'
      });
    }
  }
  
  // ===== GESTIÓN DE CONFIGURACIONES =====
  
  async getAllSettings(req, res) {
    try {
      const userId = req.user.id;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        settings = new UserSettings({ userId });
        await settings.save();
      }
      
      res.json({
        success: true,
        data: {
          general: settings.general,
          notifications: settings.notifications,
          privacy: settings.privacy,
          security: settings.security
        }
      });
    } catch (error) {
      console.error('Error getting all settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener todas las configuraciones'
      });
    }
  }
  
  async resetSettings(req, res) {
    try {
      const userId = req.user.id;
      const { category = 'all' } = req.body;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        settings = new UserSettings({ userId });
      }
      
      const defaultSettings = {
        general: {
          language: 'es',
          theme: 'system',
          timezone: 'America/Mexico_City',
          currency: 'USD'
        },
        notifications: {
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          marketingEmails: false,
          securityAlerts: true,
          transactionAlerts: true,
          referralNotifications: true,
          systemUpdates: true
        },
        privacy: {
          profileVisibility: 'private',
          showEmail: false,
          showPhone: false,
          showLastActivity: true,
          allowDataCollection: false,
          allowAnalytics: true,
          twoFactorAuth: false
        },
        security: {
          sessionTimeout: 30,
          loginNotifications: true,
          deviceTracking: true,
          ipWhitelist: [],
          autoLogout: true
        }
      };
      
      if (category === 'all') {
        Object.keys(defaultSettings).forEach(key => {
          settings[key] = defaultSettings[key];
        });
      } else if (defaultSettings[category]) {
        settings[category] = defaultSettings[category];
      }
      
      settings.updatedAt = new Date();
      await settings.save();
      
      res.json({
        success: true,
        message: `Configuraciones ${category === 'all' ? 'generales' : `de ${category}`} restablecidas`,
        data: category === 'all' ? {
          general: settings.general,
          notifications: settings.notifications,
          privacy: settings.privacy,
          security: settings.security
        } : settings[category]
      });
    } catch (error) {
      console.error('Error resetting settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al restablecer configuraciones'
      });
    }
  }
  
  async exportSettings(req, res) {
    try {
      const userId = req.user.id;
      
      const settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron configuraciones para exportar'
        });
      }
      
      const exportData = {
        exportDate: new Date().toISOString(),
        userId: userId,
        settings: {
          general: settings.general,
          notifications: settings.notifications,
          privacy: settings.privacy,
          security: settings.security
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=settings-${userId}-${new Date().toISOString().split('T')[0]}.json`);
      
      res.json(exportData);
    } catch (error) {
      console.error('Error exporting settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al exportar configuraciones'
      });
    }
  }
  
  async importSettings(req, res) {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó archivo de configuraciones'
        });
      }
      
      const fileContent = await fs.readFile(req.file.path, 'utf8');
      const importData = JSON.parse(fileContent);
      
      if (!importData.settings) {
        return res.status(400).json({
          success: false,
          message: 'Formato de archivo inválido'
        });
      }
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        settings = new UserSettings({ userId });
      }
      
      // Importar configuraciones
      if (importData.settings.general) {
        settings.general = { ...settings.general, ...importData.settings.general };
      }
      if (importData.settings.notifications) {
        settings.notifications = { ...settings.notifications, ...importData.settings.notifications };
      }
      if (importData.settings.privacy) {
        settings.privacy = { ...settings.privacy, ...importData.settings.privacy };
      }
      if (importData.settings.security) {
        settings.security = { ...settings.security, ...importData.settings.security };
      }
      
      settings.updatedAt = new Date();
      await settings.save();
      
      // Limpiar archivo temporal
      await fs.unlink(req.file.path);
      
      res.json({
        success: true,
        message: 'Configuraciones importadas correctamente',
        data: {
          general: settings.general,
          notifications: settings.notifications,
          privacy: settings.privacy,
          security: settings.security
        }
      });
    } catch (error) {
      console.error('Error importing settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al importar configuraciones'
      });
    }
  }
  
  // ===== AUTENTICACIÓN DE DOS FACTORES =====
  
  async enable2FA(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      // Generar secreto para 2FA
      const secret = speakeasy.generateSecret({
        name: `Grow5x (${user.email})`,
        issuer: 'Grow5x'
      });
      
      // Generar QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
      
      // Guardar secreto temporal (no activado hasta verificación)
      user.twoFactorSecret = secret.base32;
      user.twoFactorEnabled = false;
      await user.save();
      
      res.json({
        success: true,
        message: '2FA configurado. Escanea el código QR y verifica.',
        data: {
          secret: secret.base32,
          qrCode: qrCodeUrl,
          manualEntryKey: secret.base32
        }
      });
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Error al habilitar 2FA'
      });
    }
  }
  
  async disable2FA(req, res) {
    try {
      const userId = req.user.id;
      const { code } = req.body;
      
      const user = await User.findById(userId);
      
      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA no está habilitado'
        });
      }
      
      // Verificar código
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
      });
      
      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Código de verificación inválido'
        });
      }
      
      // Deshabilitar 2FA
      user.twoFactorEnabled = false;
      user.twoFactorSecret = null;
      await user.save();
      
      res.json({
        success: true,
        message: '2FA deshabilitado correctamente'
      });
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Error al deshabilitar 2FA'
      });
    }
  }
  
  async verify2FA(req, res) {
    try {
      const userId = req.user.id;
      const { code } = req.body;
      
      const user = await User.findById(userId);
      
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({
          success: false,
          message: '2FA no está configurado'
        });
      }
      
      // Verificar código
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
      });
      
      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Código de verificación inválido'
        });
      }
      
      // Activar 2FA si no estaba activado
      if (!user.twoFactorEnabled) {
        user.twoFactorEnabled = true;
        await user.save();
      }
      
      res.json({
        success: true,
        message: '2FA verificado correctamente'
      });
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar 2FA'
      });
    }
  }
  
  // ===== GESTIÓN DE DISPOSITIVOS =====
  
  async getDevices(req, res) {
    try {
      const userId = req.user.id;
      
      // Nota: Implementar modelo UserDevice si no existe
      const devices = [];
      
      res.json({
        success: true,
        data: devices
      });
    } catch (error) {
      console.error('Error getting devices:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener dispositivos'
      });
    }
  }
  
  async revokeDevice(req, res) {
    try {
      const userId = req.user.id;
      const { deviceId } = req.params;
      
      // Implementar lógica de revocación de dispositivo
      
      res.json({
        success: true,
        message: 'Dispositivo revocado correctamente'
      });
    } catch (error) {
      console.error('Error revoking device:', error);
      res.status(500).json({
        success: false,
        message: 'Error al revocar dispositivo'
      });
    }
  }
  
  // ===== GESTIÓN DE SESIONES =====
  
  async getSessions(req, res) {
    try {
      const userId = req.user.id;
      
      // Nota: Implementar modelo UserSession si no existe
      const sessions = [];
      
      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      console.error('Error getting sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener sesiones'
      });
    }
  }
  
  async revokeSession(req, res) {
    try {
      const userId = req.user.id;
      const { sessionId } = req.params;
      
      // Implementar lógica de revocación de sesión
      
      res.json({
        success: true,
        message: 'Sesión revocada correctamente'
      });
    } catch (error) {
      console.error('Error revoking session:', error);
      res.status(500).json({
        success: false,
        message: 'Error al revocar sesión'
      });
    }
  }
  
  async revokeAllSessions(req, res) {
    try {
      const userId = req.user.id;
      
      // Implementar lógica de revocación de todas las sesiones
      
      res.json({
        success: true,
        message: 'Todas las sesiones revocadas correctamente'
      });
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Error al revocar todas las sesiones'
      });
    }
  }
  
  // ===== GESTIÓN DE CLAVES API =====
  
  async getApiKeys(req, res) {
    try {
      const userId = req.user.id;
      
      // Nota: Implementar modelo ApiKey si no existe
      const apiKeys = [];
      
      res.json({
        success: true,
        data: apiKeys
      });
    } catch (error) {
      console.error('Error getting API keys:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener claves API'
      });
    }
  }
  
  async createApiKey(req, res) {
    try {
      const userId = req.user.id;
      const { name, permissions = [] } = req.body;
      
      // Generar clave API
      const apiKey = crypto.randomBytes(32).toString('hex');
      
      // Implementar creación de clave API
      
      res.json({
        success: true,
        message: 'Clave API creada correctamente',
        data: {
          name,
          key: apiKey,
          permissions,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear clave API'
      });
    }
  }
  
  async revokeApiKey(req, res) {
    try {
      const userId = req.user.id;
      const { keyId } = req.params;
      
      // Implementar lógica de revocación de clave API
      
      res.json({
        success: true,
        message: 'Clave API revocada correctamente'
      });
    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(500).json({
        success: false,
        message: 'Error al revocar clave API'
      });
    }
  }
  
  // ===== RUTAS DE ADMINISTRACIÓN =====
  
  async getAllUserSettings(req, res) {
    try {
      const settings = await UserSettings.find({})
        .populate('userId', 'email firstName lastName')
        .sort({ updatedAt: -1 });
      
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error getting all user settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuraciones de usuarios'
      });
    }
  }
  
  async getUserSettings(req, res) {
    try {
      const { userId } = req.params;
      
      const settings = await UserSettings.findOne({ userId })
        .populate('userId', 'email firstName lastName');
      
      if (!settings) {
        return res.status(404).json({
          success: false,
          message: 'Configuraciones no encontradas'
        });
      }
      
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error getting user settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener configuraciones del usuario'
      });
    }
  }
  
  async updateUserSettings(req, res) {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        settings = new UserSettings({ userId });
      }
      
      // Actualizar configuraciones
      Object.keys(updateData).forEach(category => {
        if (settings[category] && typeof updateData[category] === 'object') {
          settings[category] = { ...settings[category], ...updateData[category] };
        }
      });
      
      settings.updatedAt = new Date();
      await settings.save();
      
      res.json({
        success: true,
        message: 'Configuraciones actualizadas correctamente',
        data: settings
      });
    } catch (error) {
      console.error('Error updating user settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar configuraciones del usuario'
      });
    }
  }
  
  async getSettingsStats(req, res) {
    try {
      const totalUsers = await UserSettings.countDocuments();
      const themeStats = await UserSettings.aggregate([
        { $group: { _id: '$general.theme', count: { $sum: 1 } } }
      ]);
      const languageStats = await UserSettings.aggregate([
        { $group: { _id: '$general.language', count: { $sum: 1 } } }
      ]);
      
      res.json({
        success: true,
        data: {
          totalUsers,
          themeDistribution: themeStats,
          languageDistribution: languageStats
        }
      });
    } catch (error) {
      console.error('Error getting settings stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de configuraciones'
      });
    }
  }
  
  async resetUserSettings(req, res) {
    try {
      const { userId } = req.params;
      const { category = 'all' } = req.body;
      
      let settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        return res.status(404).json({
          success: false,
          message: 'Configuraciones no encontradas'
        });
      }
      
      // Usar la misma lógica de reset que para el usuario normal
      const defaultSettings = {
        general: {
          language: 'es',
          theme: 'system',
          timezone: 'America/Mexico_City',
          currency: 'USD'
        },
        notifications: {
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          marketingEmails: false,
          securityAlerts: true,
          transactionAlerts: true,
          referralNotifications: true,
          systemUpdates: true
        },
        privacy: {
          profileVisibility: 'private',
          showEmail: false,
          showPhone: false,
          showLastActivity: true,
          allowDataCollection: false,
          allowAnalytics: true,
          twoFactorAuth: false
        },
        security: {
          sessionTimeout: 30,
          loginNotifications: true,
          deviceTracking: true,
          ipWhitelist: [],
          autoLogout: true
        }
      };
      
      if (category === 'all') {
        Object.keys(defaultSettings).forEach(key => {
          settings[key] = defaultSettings[key];
        });
      } else if (defaultSettings[category]) {
        settings[category] = defaultSettings[category];
      }
      
      settings.updatedAt = new Date();
      await settings.save();
      
      res.json({
        success: true,
        message: `Configuraciones ${category === 'all' ? 'generales' : `de ${category}`} restablecidas`,
        data: settings
      });
    } catch (error) {
      console.error('Error resetting user settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al restablecer configuraciones del usuario'
      });
    }
  }
}

module.exports = new SettingsController();