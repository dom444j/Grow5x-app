const User = require('../models/User');
const Transaction = require('../models/Transaction.model');
const Referral = require('../models/Referral.model');
const Commission = require('../models/Commission.model');
const Notification = require('../models/Notification.model');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * User Controller - Controlador para gestión de usuarios
 * Maneja operaciones relacionadas con usuarios autenticados
 */

// Obtener perfil del usuario
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId)
      .select('-password -sessions -securityLog -resetPassword')
      .populate('referredBy', 'fullName email referralCode');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar perfil del usuario
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    
    const userId = req.user.id;
    const { fullName, phone, country, city, telegram, preferences } = req.body;
    
    // Preparar los datos de actualización
    const updateData = {
      fullName,
      phone,
      country,
      city,
      updatedAt: new Date()
    };
    
    // Agregar telegram si se proporciona
    if (telegram !== undefined) {
      updateData.telegram = telegram;
    }
    
    // Agregar preferences si se proporcionan
    if (preferences !== undefined) {
      updateData.preferences = preferences;
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -sessions -securityLog -resetPassword');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: user
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener notificaciones del usuario
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    
    // Construir filtros
    const filters = { recipient: userId };
    if (unreadOnly === 'true') {
      filters.isRead = false;
    }
    
    // Obtener notificaciones con paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const notifications = await Notification.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Contar total y no leídas
    const total = await Notification.countDocuments(filters);
    const unread = await Notification.countDocuments({ 
      recipient: userId, 
      isRead: false 
    });
    
    res.json({
      success: true,
      data: {
        notifications,
        total,
        unread,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error getting user notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Marcar notificación como leída
const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    
    // Actualizar notificación en MongoDB Atlas
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
    
    logger.info(`Notification ${notificationId} marked as read for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Notificación marcada como leída',
      data: notification
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de referidos
const getReferralStats = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    // Obtener usuario para el código de referido
    const user = await User.findById(userId).select('referralCode');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Contar referidos totales (solo directos - level 1)
    const totalReferrals = await Referral.countDocuments({ 
      referrer: userId, 
      level: 1 
    });
    
    // Contar referidos activos (solo directos - level 1)
    const activeReferrals = await Referral.countDocuments({ 
      referrer: userId, 
      level: 1,
      status: 'active' 
    });
    
    // Calcular comisiones totales
    const totalCommissionsResult = await Commission.aggregate([
      { $match: { userId: userId, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalCommissions = totalCommissionsResult[0]?.total || 0;
    
    // Calcular comisiones pendientes
    const pendingCommissionsResult = await Commission.aggregate([
      { $match: { userId: userId, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pendingCommissions = pendingCommissionsResult[0]?.total || 0;
    
    // Referidos de este mes (solo directos - level 1)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const thisMonthReferrals = await Referral.countDocuments({
      referrer: userId,
      level: 1,
      createdAt: { $gte: startOfMonth }
    });
    
    // Comisiones de este mes
    const thisMonthCommissionsResult = await Commission.aggregate([
      { 
        $match: { 
          userId: userId, 
          status: 'paid',
          createdAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const thisMonthCommissions = thisMonthCommissionsResult[0]?.total || 0;
    
    const stats = {
      totalReferrals,
      activeReferrals,
      totalCommissions: Number(totalCommissions.toFixed(2)),
      pendingCommissions: Number(pendingCommissions.toFixed(2)),
      thisMonthReferrals,
      thisMonthCommissions: Number(thisMonthCommissions.toFixed(2)),
      referralCode: user.referralCode,
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${user.referralCode}`
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting referral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener lista de referidos
const getReferrals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Contar total de referidos (solo directos - level 1)
    const total = await Referral.countDocuments({ 
      referrer: userId, 
      level: 1 
    });
    
    // Obtener referidos con información del usuario referido (solo directos - level 1)
    const referrals = await Referral.find({ 
      referrer: userId, 
      level: 1 
    })
      .populate('referred', 'fullName email createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Calcular comisiones ganadas por cada referido
    const referralsWithCommissions = await Promise.all(
      referrals.map(async (referral) => {
        const commissionResult = await Commission.aggregate([
          { 
            $match: { 
              userId: userId, 
              fromUserId: referral.referred._id,
              status: 'paid'
            } 
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        const commissionEarned = commissionResult[0]?.total || 0;
        
        return {
          id: referral._id,
          name: referral.referred.fullName || 'Usuario',
          email: referral.referred.email,
          status: referral.status,
          joinDate: referral.createdAt,
          commissionEarned: Number(commissionEarned.toFixed(2))
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        referrals: referralsWithCommissions,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total
        }
      }
    });
  } catch (error) {
    logger.error('Error getting user referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener historial de comisiones
const getCommissionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Construir query de filtros
    const query = { userId: userId };
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Contar total de comisiones
    const total = await Commission.countDocuments(query);
    
    // Obtener comisiones con información del usuario que las generó
    const commissions = await Commission.find(query)
      .populate('fromUserId', 'fullName email')
      .populate('transactionId', 'amount currency')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Formatear datos para la respuesta
    const formattedCommissions = commissions.map(commission => {
      const fromUserName = commission.fromUserId?.fullName || 'Usuario';
      let description = '';
      
      switch (commission.commissionType) {
        case 'direct_referral':
          description = `Comisión por referido: ${fromUserName}`;
          break;
        case 'leader_bonus':
          description = `Bono de líder: ${fromUserName}`;
          break;
        case 'parent_bonus':
          description = `Bono de padre: ${fromUserName}`;
          break;
        // ⚠️ CASO ELIMINADO - 'assignment_bonus' NO EXISTE EN EL SISTEMA ⚠️
        // Ver optimizacion/LOGICA-SISTEMA-COMISIONES.md para información correcta
        // case 'assignment_bonus':
          description = `Bono de asignación: ${fromUserName}`;
          break;
        default:
          description = `Comisión: ${fromUserName}`;
      }
      
      return {
        id: commission._id,
        amount: Number(commission.amount.toFixed(2)),
        commissionType: commission.commissionType,
        status: commission.status,
        description,
        createdAt: commission.createdAt,
        paidAt: commission.paidDate || null,
        currency: commission.currency || 'USD'
      };
    });
    
    res.json({
      success: true,
      data: {
        commissions: formattedCommissions,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total
        }
      }
    });
  } catch (error) {
    logger.error('Error getting commission history:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener balance del usuario
const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('balance totalEarnings');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: {
        balance: user.balance || 0,
        totalEarnings: user.totalEarnings || 0,
        currency: 'USD'
      }
    });
  } catch (error) {
    logger.error('Error getting user balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getNotifications,
  markNotificationAsRead,
  getReferralStats,
  getReferrals,
  getCommissionHistory,
  getBalance
};