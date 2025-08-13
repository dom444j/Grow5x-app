const express = require('express');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const userController = require('../controllers/user.controller');
const router = express.Router();

// GET /api/user/notifications - Obtener notificaciones del usuario
router.get('/notifications', requireAuth, userController.getNotifications);

// POST /api/user/notifications - Crear notificación para el usuario
router.post('/notifications', requireAuth, async (req, res) => {
  try {
    const { title, message, type = 'info', actionUrl } = req.body;
    const { user } = req;
    
    // Validar datos requeridos
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Título y mensaje son requeridos'
      });
    }
    
    // Crear notificación usando el modelo
    const Notification = require('../models/Notification.model');
    const notification = new Notification({
      recipient: user.id,
      title,
      message,
      type,
      actionUrl,
      status: 'sent',
      isRead: false
    });
    
    await notification.save();
    
    res.json({
      success: true,
      message: 'Notificación creada exitosamente',
      data: notification
    });
  } catch (error) {
    logger.error('Error creating user notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la notificación'
    });
  }
});

// PATCH /api/user/notifications/:id/read - Marcar notificación como leída
router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;
    
    // Por ahora solo simulamos la operación
    // En el futuro esto actualizará la base de datos
    console.log(`Marking notification ${id} as read for user ${user.id}`);
    
    res.json({
      success: true,
      message: 'Notificación marcada como leída'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar la notificación como leída'
    });
  }
});

// ===== REFERRAL ROUTES =====

/**
 * @route   GET /api/user/referrals/code
 * @desc    Get user's referral code
 * @access  Private (User)
 */
router.get('/referrals/code', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    // Obtener o generar código de referido desde la base de datos
    const User = require('../models/User');
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Si el usuario no tiene código de referido, generarlo y guardarlo
    if (!user.referralCode) {
      user.referralCode = `GX5-${userId.toString().slice(-6).toUpperCase()}`;
      await user.save();
    }
    
    const referralCode = user.referralCode;
    
    res.json({
      success: true,
      data: {
        code: referralCode,
        link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${referralCode}`
      }
    });
  } catch (error) {
    logger.error('Error getting referral code:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/user/referrals/stats
 * @desc    Get user's referral statistics
 * @access  Private (User)
 */
router.get('/referrals/stats', requireAuth, userController.getReferralStats);

/**
 * @route   GET /api/user/referrals
 * @desc    Get user's referrals
 * @access  Private (User)
 */
router.get('/referrals', requireAuth, userController.getReferrals);

/**
 * @route   GET /api/user/referrals/commissions
 * @desc    Get user's commission history
 * @access  Private (User)
 */
router.get('/referrals/commissions', requireAuth, userController.getCommissionHistory);

module.exports = router;