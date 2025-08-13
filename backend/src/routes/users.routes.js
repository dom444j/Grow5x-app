const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');
const logger = require('../utils/logger');
const router = express.Router();

/**
 * @route   GET /api/users/:userId/referrals
 * @desc    Get user's referrals by userId
 * @access  Private
 */
router.get('/:userId/referrals', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id || req.user?._id;
    
    // Verificar que el usuario puede acceder a estos datos
    if (userId !== requestingUserId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estos datos'
      });
    }
    
    // Usar el controlador existente pero con el userId de los parámetros
    req.user.id = userId;
    await userController.getReferrals(req, res);
  } catch (error) {
    logger.error('Error getting user referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/users/:userId/referrals/commissions
 * @desc    Get user's commission history by userId
 * @access  Private
 */
router.get('/:userId/referrals/commissions', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id || req.user?._id;
    
    // Verificar que el usuario puede acceder a estos datos
    if (userId !== requestingUserId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estos datos'
      });
    }
    
    // Usar el controlador existente pero con el userId de los parámetros
    req.user.id = userId;
    await userController.getCommissionHistory(req, res);
  } catch (error) {
    logger.error('Error getting user commission history:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/users/:userId/referrals/stats
 * @desc    Get user's referral statistics by userId
 * @access  Private
 */
router.get('/:userId/referrals/stats', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id || req.user?._id;
    
    // Verificar que el usuario puede acceder a estos datos
    if (userId !== requestingUserId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estos datos'
      });
    }
    
    // Usar el controlador existente pero con el userId de los parámetros
    req.user.id = userId;
    await userController.getReferralStats(req, res);
  } catch (error) {
    logger.error('Error getting user referral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/users/:userId/transactions
 * @desc    Get user's transaction history
 * @access  Private
 */
router.get('/:userId/transactions', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id || req.user?._id;
    
    // Verificar que el usuario puede acceder a estos datos
    if (userId !== requestingUserId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estos datos'
      });
    }

    const Transaction = require('../models/Transaction.model');
    
    // Obtener filtros de query params
    const { limit = 10, offset = 0, type, status } = req.query;
    
    const filter = { user: userId };
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('user', 'username email');
    
    const total = await Transaction.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        }
      }
    });
  } catch (error) {
    logger.error('Error getting user transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/users/:userId/transactions/recent
 * @desc    Get user's recent transactions (last 10)
 * @access  Private
 */
router.get('/:userId/transactions/recent', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id || req.user?._id;
    
    // Verificar que el usuario puede acceder a estos datos
    if (userId !== requestingUserId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estos datos'
      });
    }

    const Transaction = require('../models/Transaction.model');
    
    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'username email')
      .select('type amount status createdAt description paymentDetails');
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    logger.error('Error getting recent transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;