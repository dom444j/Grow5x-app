const Notification = require('../models/Notification.model');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Obtener todas las notificaciones (Admin)
const getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, userId } = req.query;
    const query = {};
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (userId) query.userId = userId;
    
    const notifications = await Notification.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Notification.countDocuments(query);
    
    res.json({
      success: true,
      data: notifications,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener las notificaciones',
      error: error.message
    });
  }
};

// Obtener notificaciones de un usuario específico
const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status, type } = req.query;
    
    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estas notificaciones'
      });
    }
    
    const query = { userId };
    if (status) query.status = status;
    if (type) query.type = type;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, status: 'unread' });
    
    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener las notificaciones del usuario',
      error: error.message
    });
  }
};

// Crear una nueva notificación
const createNotification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    
    const { userId, title, message, type, priority, actionUrl, expiresAt } = req.body;
    
    // Verificar que el usuario existe
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
    }
    
    const notification = new Notification({
      userId,
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      actionUrl,
      expiresAt,
      createdBy: req.user.id
    });
    
    await notification.save();
    
    // Aquí podrías implementar push notifications, emails, etc.
    // await sendPushNotification(notification);
    
    res.status(201).json({
      success: true,
      message: 'Notificación creada exitosamente',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear la notificación',
      error: error.message
    });
  }
};

// Crear notificación masiva
const createBulkNotification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    
    const { userIds, title, message, type, priority, actionUrl, expiresAt } = req.body;
    
    // Si no se especifican userIds, enviar a todos los usuarios
    let targetUsers = userIds;
    if (!targetUsers || targetUsers.length === 0) {
      const allUsers = await User.find({ status: 'active' }, '_id');
      targetUsers = allUsers.map(user => user._id);
    }
    
    // Crear notificaciones en lote
    const notifications = targetUsers.map(userId => ({
      userId,
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      actionUrl,
      expiresAt,
      createdBy: req.user.id
    }));
    
    const createdNotifications = await Notification.insertMany(notifications);
    
    res.status(201).json({
      success: true,
      message: `${createdNotifications.length} notificaciones creadas exitosamente`,
      data: {
        count: createdNotifications.length,
        notifications: createdNotifications.slice(0, 5) // Mostrar solo las primeras 5
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear notificaciones masivas',
      error: error.message
    });
  }
};

// Marcar notificación como leída
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.id !== notification.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta notificación'
      });
    }
    
    notification.status = 'read';
    notification.readAt = new Date();
    await notification.save();
    
    res.json({
      success: true,
      message: 'Notificación marcada como leída',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación como leída',
      error: error.message
    });
  }
};

// Marcar todas las notificaciones de un usuario como leídas
const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar estas notificaciones'
      });
    }
    
    const result = await Notification.updateMany(
      { userId, status: 'unread' },
      { 
        status: 'read',
        readAt: new Date()
      }
    );
    
    res.json({
      success: true,
      message: `${result.modifiedCount} notificaciones marcadas como leídas`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificaciones como leídas',
      error: error.message
    });
  }
};

// Eliminar notificación
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.id !== notification.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar esta notificación'
      });
    }
    
    await Notification.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Notificación eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la notificación',
      error: error.message
    });
  }
};

// Obtener estadísticas de notificaciones (Admin)
const getNotificationStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    const stats = await Notification.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          readNotifications: {
            $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] }
          },
          unreadNotifications: {
            $sum: { $cond: [{ $eq: ['$status', 'unread'] }, 1, 0] }
          },
          byType: {
            $push: {
              type: '$type',
              count: 1
            }
          },
          byPriority: {
            $push: {
              priority: '$priority',
              count: 1
            }
          }
        }
      }
    ]);
    
    const typeStats = await Notification.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          readCount: {
            $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          type: '$_id',
          count: 1,
          readCount: 1,
          readRate: {
            $multiply: [
              { $divide: ['$readCount', '$count'] },
              100
            ]
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalNotifications: 0,
          readNotifications: 0,
          unreadNotifications: 0
        },
        byType: typeStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de notificaciones',
      error: error.message
    });
  }
};

// Limpiar notificaciones expiradas
const cleanupExpiredNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    res.json({
      success: true,
      message: `${result.deletedCount} notificaciones expiradas eliminadas`,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al limpiar notificaciones expiradas',
      error: error.message
    });
  }
};

module.exports = {
  getAllNotifications,
  getUserNotifications,
  createNotification,
  createBulkNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats,
  cleanupExpiredNotifications
};