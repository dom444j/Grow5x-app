const User = require('../models/User');
const Notification = require('../models/Notification.model');
const logger = require('../utils/logger');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.initializeEmailTransporter();
    
    this.notificationTypes = {
      SYSTEM_ALERT: 'system_alert',
      LIQUIDITY_WARNING: 'liquidity_warning',
      DAILY_REPORT: 'daily_report',
      USER_ACTION: 'user_action',
      AUTOMATION_STATUS: 'automation_status',
      SECURITY_ALERT: 'security_alert'
    };
    
    this.priorities = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
  }

  /**
   * Inicializar transportador de email
   */
  async initializeEmailTransporter() {
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        this.emailTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        
        // Verificar conexión
        await this.emailTransporter.verify();
        logger.info('Transportador de email inicializado correctamente');
      } else {
        logger.warn('Configuración SMTP no encontrada, emails deshabilitados');
      }
    } catch (error) {
      logger.error('Error inicializando transportador de email:', error);
    }
  }

  /**
   * Procesar notificaciones pendientes
   */
  async processNotifications() {
    try {
      logger.info('Procesando notificaciones pendientes...');
      
      const pendingNotifications = await Notification.find({
        status: 'pending',
        scheduledFor: { $lte: new Date() }
      }).sort({ priority: -1, createdAt: 1 }).limit(50);
      
      const results = {
        processed: 0,
        sent: 0,
        failed: 0,
        errors: []
      };
      
      for (const notification of pendingNotifications) {
        try {
          results.processed++;
          
          const success = await this.sendNotification(notification);
          
          if (success) {
            results.sent++;
            await this.markNotificationAsSent(notification._id);
          } else {
            results.failed++;
            await this.markNotificationAsFailed(notification._id, 'Send failed');
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            notificationId: notification._id,
            error: error.message
          });
          
          await this.markNotificationAsFailed(notification._id, error.message);
          logger.error(`Error procesando notificación ${notification._id}:`, error);
        }
      }
      
      logger.info(`Procesamiento completado: ${results.sent} enviadas, ${results.failed} fallidas`);
      return results;
      
    } catch (error) {
      logger.error('Error procesando notificaciones:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación
   */
  async sendNotification(notification) {
    try {
      const user = await User.findById(notification.recipient);
      
      if (!user) {
        throw new Error('Usuario destinatario no encontrado');
      }
      
      let success = false;
      
      // Enviar notificación in-app
      if (notification.channels.includes('in_app')) {
        success = await this.sendInAppNotification(notification, user);
      }
      
      // Enviar email
      if (notification.channels.includes('email') && user.email) {
        const emailSuccess = await this.sendEmailNotification(notification, user);
        success = success || emailSuccess;
      }
      
      // Enviar SMS (placeholder para futura implementación)
      if (notification.channels.includes('sms') && user.phone) {
        const smsSuccess = await this.sendSMSNotification(notification, user);
        success = success || smsSuccess;
      }
      
      return success;
      
    } catch (error) {
      logger.error('Error enviando notificación:', error);
      return false;
    }
  }

  /**
   * Enviar notificación in-app
   */
  async sendInAppNotification(notification, user) {
    try {
      // La notificación ya está en la base de datos, solo marcar como enviada
      return true;
    } catch (error) {
      logger.error('Error enviando notificación in-app:', error);
      return false;
    }
  }

  /**
   * Enviar notificación por email
   */
  async sendEmailNotification(notification, user) {
    try {
      if (!this.emailTransporter) {
        logger.warn('Transportador de email no disponible');
        return false;
      }
      
      const emailTemplate = this.getEmailTemplate(notification);
      
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text
      };
      
      await this.emailTransporter.sendMail(mailOptions);
      
      logger.info(`Email enviado a ${user.email} para notificación ${notification._id}`);
      return true;
      
    } catch (error) {
      logger.error('Error enviando email:', error);
      return false;
    }
  }

  /**
   * Enviar notificación por SMS (placeholder)
   */
  async sendSMSNotification(notification, user) {
    try {
      // Implementar integración con servicio SMS (Twilio, etc.)
      logger.info(`SMS placeholder para ${user.phone} - ${notification.title}`);
      return true;
    } catch (error) {
      logger.error('Error enviando SMS:', error);
      return false;
    }
  }

  /**
   * Obtener plantilla de email
   */
  getEmailTemplate(notification) {
    const baseTemplate = {
      subject: notification.title,
      text: notification.message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">${notification.title}</h2>
            <div style="background-color: white; padding: 20px; border-radius: 4px; border-left: 4px solid ${this.getPriorityColor(notification.priority)};">
              <p style="color: #666; line-height: 1.6; margin: 0;">${notification.message}</p>
            </div>
            ${notification.actionUrl ? `
              <div style="margin-top: 20px; text-align: center;">
                <a href="${notification.actionUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Ver Detalles</a>
              </div>
            ` : ''}
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
              <p>Este es un mensaje automático del sistema GrowX5.</p>
              <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
            </div>
          </div>
        </div>
      `
    };
    
    // Personalizar según el tipo de notificación
    switch (notification.type) {
      case this.notificationTypes.LIQUIDITY_WARNING:
        baseTemplate.subject = `⚠️ Alerta de Liquidez - ${notification.title}`;
        break;
      case this.notificationTypes.SYSTEM_ALERT:
        baseTemplate.subject = `🚨 Alerta del Sistema - ${notification.title}`;
        break;
      case this.notificationTypes.DAILY_REPORT:
        baseTemplate.subject = `📊 Reporte Diario - ${notification.title}`;
        break;
      default:
        break;
    }
    
    return baseTemplate;
  }

  /**
   * Obtener color según prioridad
   */
  getPriorityColor(priority) {
    switch (priority) {
      case this.priorities.CRITICAL:
        return '#dc3545';
      case this.priorities.HIGH:
        return '#fd7e14';
      case this.priorities.MEDIUM:
        return '#ffc107';
      case this.priorities.LOW:
      default:
        return '#28a745';
    }
  }

  /**
   * Crear notificación
   */
  async createNotification({
    recipient,
    title,
    message,
    type = this.notificationTypes.SYSTEM_ALERT,
    priority = this.priorities.MEDIUM,
    channels = ['in_app'],
    actionUrl = null,
    scheduledFor = null,
    metadata = {}
  }) {
    try {
      const notification = new Notification({
        recipient,
        title,
        message,
        type,
        priority,
        channels,
        actionUrl,
        scheduledFor: scheduledFor || new Date(),
        metadata,
        status: 'pending'
      });
      
      await notification.save();
      
      logger.info(`Notificación creada: ${notification._id} para usuario ${recipient}`);
      return notification;
      
    } catch (error) {
      logger.error('Error creando notificación:', error);
      throw error;
    }
  }

  /**
   * Crear notificación para administradores
   */
  async notifyAdmins({
    title,
    message,
    type = this.notificationTypes.SYSTEM_ALERT,
    priority = this.priorities.HIGH,
    channels = ['in_app', 'email'],
    actionUrl = null,
    metadata = {}
  }) {
    try {
      const admins = await User.find({
        role: 'admin',
        status: 'active'
      });
      
      const notifications = [];
      
      for (const admin of admins) {
        const notification = await this.createNotification({
          recipient: admin._id,
          title,
          message,
          type,
          priority,
          channels,
          actionUrl,
          metadata
        });
        
        notifications.push(notification);
      }
      
      logger.info(`${notifications.length} notificaciones creadas para administradores`);
      return notifications;
      
    } catch (error) {
      logger.error('Error notificando administradores:', error);
      throw error;
    }
  }

  /**
   * Marcar notificación como enviada
   */
  async markNotificationAsSent(notificationId) {
    try {
      await Notification.findByIdAndUpdate(notificationId, {
        status: 'sent',
        sentAt: new Date()
      });
    } catch (error) {
      logger.error('Error marcando notificación como enviada:', error);
    }
  }

  /**
   * Marcar notificación como fallida
   */
  async markNotificationAsFailed(notificationId, errorMessage) {
    try {
      await Notification.findByIdAndUpdate(notificationId, {
        status: 'failed',
        failedAt: new Date(),
        'metadata.error': errorMessage
      });
    } catch (error) {
      logger.error('Error marcando notificación como fallida:', error);
    }
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        {
          _id: notificationId,
          recipient: userId
        },
        {
          isRead: true,
          readAt: new Date()
        },
        { new: true }
      );
      
      if (!notification) {
        throw new Error('Notificación no encontrada');
      }
      
      return notification;
      
    } catch (error) {
      logger.error('Error marcando notificación como leída:', error);
      throw error;
    }
  }

  /**
   * Obtener notificaciones de usuario
   */
  async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    try {
      const query = { recipient: userId };
      
      if (unreadOnly) {
        query.isRead = false;
      }
      
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Notification.countDocuments(query);
      
      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      logger.error('Error obteniendo notificaciones de usuario:', error);
      throw error;
    }
  }

  /**
   * Obtener conteo de notificaciones no leídas
   */
  async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({
        recipient: userId,
        isRead: false
      });
    } catch (error) {
      logger.error('Error obteniendo conteo de no leídas:', error);
      return 0;
    }
  }

  /**
   * Limpiar notificaciones antiguas
   */
  async cleanupOldNotifications(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: ['sent', 'failed'] }
      });
      
      logger.info(`Limpieza de notificaciones: ${result.deletedCount} eliminadas`);
      return result.deletedCount;
      
    } catch (error) {
      logger.error('Error en limpieza de notificaciones:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  async getNotificationStatistics(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const stats = await Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              status: '$status',
              type: '$type',
              priority: '$priority'
            },
            count: { $sum: 1 }
          }
        }
      ]);
      
      const summary = await Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            sent: {
              $sum: {
                $cond: [{ $eq: ['$status', 'sent'] }, 1, 0]
              }
            },
            failed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
              }
            },
            pending: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
              }
            }
          }
        }
      ]);
      
      return {
        detailed: stats,
        summary: summary[0] || {
          total: 0,
          sent: 0,
          failed: 0,
          pending: 0
        },
        period: {
          startDate,
          endDate: new Date(),
          days
        }
      };
      
    } catch (error) {
      logger.error('Error obteniendo estadísticas de notificaciones:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación de alerta de liquidez
   */
  async sendLiquidityAlert(liquidityData) {
    try {
      const { ratio, availableBalance, projectedBalance } = liquidityData;
      
      let priority = this.priorities.MEDIUM;
      let title = 'Alerta de Liquidez';
      
      if (ratio < 25 || availableBalance < 500) {
        priority = this.priorities.CRITICAL;
        title = 'Alerta Crítica de Liquidez';
      } else if (ratio < 50 || availableBalance < 1000) {
        priority = this.priorities.HIGH;
        title = 'Alerta de Liquidez Baja';
      }
      
      const message = `
        Ratio de liquidez: ${ratio.toFixed(2)}%\n
        Saldo disponible: $${availableBalance.toFixed(2)}\n
        Proyección a 7 días: $${projectedBalance.toFixed(2)}\n
        Se recomienda revisar el estado de liquidez del sistema.
      `;
      
      return await this.notifyAdmins({
        title,
        message,
        type: this.notificationTypes.LIQUIDITY_WARNING,
        priority,
        channels: ['in_app', 'email'],
        actionUrl: '/admin/automation',
        metadata: {
          liquidityRatio: ratio,
          availableBalance,
          projectedBalance,
          alertType: 'liquidity'
        }
      });
      
    } catch (error) {
      logger.error('Error enviando alerta de liquidez:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación de reporte diario
   */
  async sendDailyReportNotification(reportData) {
    try {
      const { date, summary, alerts } = reportData;
      
      const message = `
        Reporte diario generado para ${date}\n
        - Beneficios totales: $${summary.totalEarnings.toFixed(2)}\n
        - Usuarios activos: ${summary.activeUsers}\n
        - Saldo disponible: $${summary.availableBalance.toFixed(2)}\n
        - Ratio de liquidez: ${summary.liquidityRatio.toFixed(2)}%\n
        ${alerts.length > 0 ? `\nAlertas: ${alerts.length}` : ''}
      `;
      
      return await this.notifyAdmins({
        title: `Reporte Diario - ${date}`,
        message,
        type: this.notificationTypes.DAILY_REPORT,
        priority: this.priorities.LOW,
        channels: ['in_app'],
        actionUrl: '/admin/reports',
        metadata: {
          reportDate: date,
          summary,
          alertsCount: alerts.length
        }
      });
      
    } catch (error) {
      logger.error('Error enviando notificación de reporte diario:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;