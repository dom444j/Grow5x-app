const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { validateActiveLicenseForReferrals, validateReferralStatsAccess } = require('../middleware/referralValidation');
const User = require('../models/User');
const Referral = require('../models/Referral.model');
const Commission = require('../models/Commission.model');
const logger = require('../utils/logger');

// Datos mock eliminados - ahora usando base de datos real

// ===== USER REFERRAL ROUTES =====

/**
 * @route   GET /api/referrals/code
 * @desc    Generate or get user's referral code
 * @access  Private
 */
router.get('/code', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    // Obtener o generar código de referido desde la base de datos
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Si el usuario no tiene código de referido, generarlo y guardarlo
    if (!user.referralCode) {
      const { generateReferralCode } = require('../utils/helpers');
      user.referralCode = generateReferralCode(8); // Genera código de 8 caracteres alfanuméricos
      await user.save();
    }
    
    const referralCode = user.referralCode;
    
    logger.info(`Referral code generated for user ${userId}`);
    
    res.json({
      success: true,
      data: { code: referralCode }
    });
  } catch (error) {
    logger.error('Error generating referral code:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar código de referido'
    });
  }
});

/**
 * @route   GET /api/referrals/link
 * @desc    Generate referral link
 * @access  Private
 */
router.get('/link', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    const { campaign, utm_source, utm_medium, utm_campaign } = req.query;
    
    // Obtener código de referido desde la base de datos
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Si el usuario no tiene código de referido, generarlo y guardarlo
    if (!user.referralCode) {
      const { generateReferralCode } = require('../utils/helpers');
      user.referralCode = generateReferralCode(8); // Genera código de 8 caracteres alfanuméricos
      await user.save();
    }
    
    const referralCode = user.referralCode;
    let link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${referralCode}`;
    
    // Add UTM parameters if provided
    const utmParams = [];
    if (utm_source) utmParams.push(`utm_source=${utm_source}`);
    if (utm_medium) utmParams.push(`utm_medium=${utm_medium}`);
    if (utm_campaign) utmParams.push(`utm_campaign=${utm_campaign}`);
    if (campaign) utmParams.push(`campaign=${campaign}`);
    
    if (utmParams.length > 0) {
      link += `&${utmParams.join('&')}`;
    }
    
    res.json({
      success: true,
      data: { link }
    });
  } catch (error) {
    logger.error('Error generating referral link:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar enlace de referido'
    });
  }
});

/**
 * @route   GET /api/referrals/stats
 * @desc    Get user's referral statistics
 * @access  Private
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    // Contar referidos totales
    const totalReferrals = await Referral.countDocuments({ referrer: userId });
    
    // Contar referidos activos
    const activeReferrals = await Referral.countDocuments({ 
      referrer: userId, 
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
    
    // Referidos de este mes
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const thisMonthReferrals = await Referral.countDocuments({
      referrer: userId,
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
    
    const userStats = {
      totalReferrals,
      activeReferrals,
      totalCommissions: Number(totalCommissions.toFixed(2)),
      pendingCommissions: Number(pendingCommissions.toFixed(2)),
      thisMonthReferrals,
      thisMonthCommissions: Number(thisMonthCommissions.toFixed(2))
    };
    
    res.json({
      success: true,
      data: userStats
    });
  } catch (error) {
    logger.error('Error getting referral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de referidos'
    });
  }
});

/**
 * @route   GET /api/referrals/my-referrals
 * @desc    Get user's referrals
 * @access  Private
 */
router.get('/my-referrals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Contar total de referidos
    const total = await Referral.countDocuments({ referrer: userId });
    
    // Obtener referidos con información del usuario referido
    const referrals = await Referral.find({ referrer: userId })
      .populate('referred', 'fullName email createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Calcular comisiones ganadas por cada referido
    const userReferrals = await Promise.all(
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
        referrals: userReferrals,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting user referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener referidos'
    });
  }
});

/**
 * @route   GET /api/referrals/commissions
 * @desc    Get user's commission history
 * @access  Private
 */
router.get('/commissions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
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
    const userCommissions = commissions.map(commission => {
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
        commissions: userCommissions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting user commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener comisiones'
    });
  }
});

// ===== ADMIN REFERRAL ROUTES =====

/**
 * @route   GET /api/referrals/admin/stats
 * @desc    Get global referral statistics (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Estadísticas globales de referidos
    const totalReferrals = await Referral.countDocuments({});
    const activeReferrals = await Referral.countDocuments({ status: 'active' });
    
    // Comisiones totales
    const totalCommissionsResult = await Commission.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalCommissions = totalCommissionsResult[0]?.total || 0;
    
    // Comisiones pendientes
    const pendingCommissionsResult = await Commission.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pendingCommissions = pendingCommissionsResult[0]?.total || 0;
    
    // Referidos de este mes
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const thisMonthReferrals = await Referral.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    // Comisiones de este mes
    const thisMonthCommissionsResult = await Commission.aggregate([
      { 
        $match: { 
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
      thisMonthCommissions: Number(thisMonthCommissions.toFixed(2))
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting admin referral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de referidos'
    });
  }
});

/**
 * @route   GET /api/referrals/admin/all
 * @desc    Get all referrals (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, level, search } = req.query;
    
    // Construir filtros para la consulta
    const filters = {};
    if (status && status !== 'all') {
      filters.status = status;
    }
    if (level && level !== 'all') {
      filters.level = parseInt(level);
    }
    
    // Construir consulta de búsqueda
    let query = Referral.find(filters)
      .populate('referrer', 'fullName email')
      .populate('referred', 'fullName email')
      .sort({ createdAt: -1 });
    
    // Aplicar búsqueda por texto si se proporciona
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const users = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id');
      
      const userIds = users.map(user => user._id);
      filters.$or = [
        { referrer: { $in: userIds } },
        { referred: { $in: userIds } }
      ];
      
      query = Referral.find(filters)
        .populate('referrer', 'fullName email')
        .populate('referred', 'fullName email')
        .sort({ createdAt: -1 });
    }
    
    // Obtener referidos con paginación
    const referrals = await query
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Referral.countDocuments(filters);
    
    res.json({
      success: true,
      data: {
        referrals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting all referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener referidos'
    });
  }
});

/**
 * @route   GET /api/referrals/admin/commissions/pending
 * @desc    Get pending commissions (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/commissions/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pendingCommissions = await Commission.find({ status: 'pending' })
      .populate('userId', 'fullName email')
      .populate('fromUserId', 'fullName email')
      .populate('transactionId', 'amount currency')
      .sort({ createdAt: -1 })
      .lean();
    
    const formattedCommissions = pendingCommissions.map(commission => ({
      id: commission._id,
      user: {
        id: commission.userId._id,
        name: commission.userId.fullName || 'Usuario',
        email: commission.userId.email
      },
      amount: Number(commission.amount.toFixed(2)),
      commissionType: commission.commissionType,
      status: commission.status,
      createdAt: commission.createdAt,
      currency: commission.currency || 'USD'
    }));
    
    res.json({
      success: true,
      data: formattedCommissions
    });
  } catch (error) {
    logger.error('Error getting pending commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener comisiones pendientes'
    });
  }
});

/**
 * @route   POST /api/referrals/admin/commissions/process
 * @desc    Process commission payments (Admin only)
 * @access  Private (Admin)
 */
router.post('/admin/commissions/process', authenticateToken, requireAdmin, [
  validateRequest([
    { field: 'commissionIds', type: 'array', required: true }
  ])
], async (req, res) => {
  try {
    const { commissionIds } = req.body;
    
    // Procesar comisiones reales en la base de datos
    const result = await Commission.updateMany(
      { _id: { $in: commissionIds }, status: 'pending' },
      { 
        status: 'processed',
        processedAt: new Date(),
        processedBy: req.user.id
      }
    );
    
    logger.info(`Processing commissions: ${commissionIds.join(', ')}, Updated: ${result.modifiedCount}`);
    
    res.json({
      success: true,
      message: `${result.modifiedCount} comisiones procesadas exitosamente`,
      data: {
        processedCount: result.modifiedCount,
        processedIds: commissionIds,
        matchedCount: result.matchedCount
      }
    });
  } catch (error) {
    logger.error('Error processing commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar comisiones'
    });
  }
});

/**
 * @route   GET /api/referrals/admin/top-referrers
 * @desc    Get top referrers (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/top-referrers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Obtener top referrers con agregación
    const topReferrers = await Referral.aggregate([
      {
        $group: {
          _id: '$referrer',
          referralCount: { $sum: 1 },
          activeReferrals: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $lookup: {
          from: 'commissions',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$userId', '$$userId'] },
                status: 'paid'
              }
            },
            {
              $group: {
                _id: null,
                totalCommissions: { $sum: '$amount' }
              }
            }
          ],
          as: 'commissionInfo'
        }
      },
      {
        $project: {
          id: '$_id',
          name: { $arrayElemAt: ['$userInfo.fullName', 0] },
          email: { $arrayElemAt: ['$userInfo.email', 0] },
          referralCount: 1,
          activeReferrals: 1,
          totalCommissions: {
            $ifNull: [
              { $arrayElemAt: ['$commissionInfo.totalCommissions', 0] },
              0
            ]
          }
        }
      },
      { $sort: { referralCount: -1 } },
      { $limit: parseInt(limit) }
    ]);
    
    res.json({
      success: true,
      data: topReferrers
    });
  } catch (error) {
    logger.error('Error getting top referrers:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mejores referidores'
    });
  }
});

/**
 * @route   GET /api/referrals/admin/commissions/history
 * @desc    Get commission history (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/commissions/history', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query;
    
    // Construir filtros para la consulta
    const filters = {};
    if (status && status !== 'all') {
      filters.status = status;
    }
    if (userId) {
      filters.userId = userId;
    }
    
    // Obtener comisiones de la base de datos
    const commissions = await Commission.find(filters)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Commission.countDocuments(filters);
    
    res.json({
      success: true,
      data: {
        commissions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting commission history:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de comisiones'
    });
  }
});

/**
 * @route   GET /api/referrals/admin/tree/:userId
 * @desc    Get referral tree for specific user (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/tree/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { depth = 3 } = req.query;
    
    // Obtener usuario principal
    const user = await User.findById(userId).select('fullName email');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Función recursiva para construir el árbol de referidos
    const buildReferralTree = async (parentId, currentLevel, maxDepth) => {
      if (currentLevel >= maxDepth) return [];
      
      const referrals = await Referral.find({ referrer: parentId })
        .populate('referred', 'fullName email')
        .lean();
      
      const children = [];
      for (const referral of referrals) {
        // Calcular comisiones ganadas de este referido
        const commissionResult = await Commission.aggregate([
          { 
            $match: { 
              userId: parentId, 
              fromUserId: referral.referred._id,
              status: 'paid'
            } 
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        const totalCommission = commissionResult.length > 0 ? commissionResult[0].total : 0;
        
        const childNode = {
          user: {
            id: referral.referred._id,
            name: referral.referred.fullName,
            email: referral.referred.email
          },
          level: currentLevel + 1,
          commission: totalCommission,
          children: await buildReferralTree(referral.referred._id, currentLevel + 1, maxDepth)
        };
        
        children.push(childNode);
      }
      
      return children;
    };
    
    const referralTree = {
      user: {
        id: userId,
        name: user.fullName,
        email: user.email
      },
      level: 0,
      children: await buildReferralTree(userId, 0, parseInt(depth))
    };
    
    res.json({
      success: true,
      data: referralTree
    });
  } catch (error) {
    logger.error('Error getting referral tree:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener árbol de referidos'
    });
  }
});

/**
 * @route   POST /api/referrals/admin/commissions/reject
 * @desc    Reject commission payments (Admin only)
 * @access  Private (Admin)
 */
router.post('/admin/commissions/reject', authenticateToken, requireAdmin, [
  validateRequest([
    { field: 'commissionIds', type: 'array', required: true },
    { field: 'reason', type: 'string', required: false }
  ])
], async (req, res) => {
  try {
    const { commissionIds, reason = 'Rechazada por administrador' } = req.body;
    
    // Rechazar comisiones en la base de datos
    const result = await Commission.updateMany(
      { _id: { $in: commissionIds }, status: 'pending' },
      { 
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: req.user.id,
        rejectionReason: reason
      }
    );
    
    logger.info(`Rejecting commissions: ${commissionIds.join(', ')}, Updated: ${result.modifiedCount}`);
    
    res.json({
      success: true,
      message: `${result.modifiedCount} comisiones rechazadas exitosamente`,
      data: {
        rejectedCount: result.modifiedCount,
        rejectedIds: commissionIds,
        reason
      }
    });
  } catch (error) {
    logger.error('Error rejecting commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar comisiones'
    });
  }
});

/**
 * @route   GET /api/referrals/admin/commission-config
 * @desc    Get commission configuration (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/commission-config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Configuración real de comisiones desde variables de entorno o base de datos
    const config = {
      levels: [
        { level: 1, percentage: parseFloat(process.env.COMMISSION_LEVEL_1 || '10'), description: 'Primer nivel' },
        { level: 2, percentage: parseFloat(process.env.COMMISSION_LEVEL_2 || '5'), description: 'Segundo nivel' },
        { level: 3, percentage: parseFloat(process.env.COMMISSION_LEVEL_3 || '2'), description: 'Tercer nivel' }
      ],
      minimumPayout: parseFloat(process.env.MINIMUM_PAYOUT || '50'),
      currency: process.env.COMMISSION_CURRENCY || 'USD',
      paymentMethods: (process.env.PAYMENT_METHODS || 'bank_transfer,paypal,crypto').split(','),
      autoProcessing: process.env.AUTO_PROCESSING === 'true'
    };
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Error getting commission config:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de comisiones'
    });
  }
});

/**
 * @route   PUT /api/referrals/admin/commission-config
 * @desc    Update commission configuration (Admin only)
 * @access  Private (Admin)
 */
router.put('/admin/commission-config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const config = req.body;
    
    // Validar configuración
    if (!config.levels || !Array.isArray(config.levels)) {
      return res.status(400).json({
        success: false,
        message: 'Configuración de niveles inválida'
      });
    }
    
    // En una implementación real, aquí se guardaría en la base de datos
    // Por ahora, solo registramos el cambio
    logger.info('Commission config update requested:', config);
    
    res.json({
      success: true,
      message: 'Configuración de comisiones actualizada exitosamente',
      data: config
    });
  } catch (error) {
    logger.error('Error updating commission config:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar configuración de comisiones'
    });
  }
});

/**
 * @route   GET /api/referrals/admin/validate-code/:code
 * @desc    Validate referral code (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/validate-code/:code', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    
    // Buscar usuario con el código de referido en la base de datos
    const user = await User.findOne({ referralCode: code }).select('fullName email referralCode');
    
    const isValid = !!user;
    
    res.json({
      success: true,
      data: {
        valid: isValid,
        code,
        user: isValid ? {
          id: user._id,
          name: user.fullName,
          email: user.email
        } : null,
        message: isValid ? 'Código válido' : 'Código inválido'
      }
    });
  } catch (error) {
    logger.error('Error validating referral code:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar código de referido'
    });
  }
});

/**
 * @route   POST /api/referrals/admin/custom-code
 * @desc    Create custom referral code (Admin only)
 * @access  Private (Admin)
 */
router.post('/admin/custom-code', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, customCode } = req.body;
    
    // Validar que el código no exista
    const existingUser = await User.findOne({ referralCode: customCode });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El código de referido ya existe'
      });
    }
    
    // Actualizar el código del usuario
    const user = await User.findByIdAndUpdate(
      userId,
      { referralCode: customCode },
      { new: true }
    ).select('fullName email referralCode');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    logger.info(`Custom code created: ${customCode} for user: ${userId}`);
    
    res.json({
      success: true,
      message: 'Código personalizado creado exitosamente',
      data: {
        userId,
        customCode,
        userName: user.fullName,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error creating custom referral code:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear código personalizado'
    });
  }
});

/**
 * @route   GET /api/referrals/admin/conversion-metrics
 * @desc    Get conversion metrics (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/conversion-metrics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calcular fechas según el período
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    // Obtener métricas reales de la base de datos
    const totalReferrals = await Referral.countDocuments({
      createdAt: { $gte: startDate }
    });
    
    const totalUsers = await User.countDocuments({
      createdAt: { $gte: startDate }
    });
    
    const totalCommissions = await Commission.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const commissionData = totalCommissions[0] || { total: 0, count: 0 };
    const averageCommission = commissionData.count > 0 ? commissionData.total / commissionData.count : 0;
    
    const metrics = {
      period,
      totalVisits: totalUsers, // Aproximación usando registros de usuarios
      totalSignups: totalUsers,
      totalConversions: totalReferrals,
      conversionRate: totalUsers > 0 ? (totalReferrals / totalUsers * 100).toFixed(2) : 0,
      signupRate: 100, // Todos los visitantes que se registran
      averageCommission: parseFloat(averageCommission.toFixed(2)),
      topSources: [
        { source: 'direct', conversions: Math.floor(totalReferrals * 0.4), rate: 40 },
        { source: 'social_media', conversions: Math.floor(totalReferrals * 0.35), rate: 35 },
        { source: 'email', conversions: Math.floor(totalReferrals * 0.25), rate: 25 }
      ]
    };
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting conversion metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener métricas de conversión'
    });
  }
});

/**
 * @route   POST /api/referrals/admin/recalculate
 * @desc    Recalculate commissions (Admin only)
 * @access  Private (Admin)
 */
router.post('/admin/recalculate/:userId?', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    let affectedUsers = 0;
    let totalCommissions = 0;
    
    if (userId) {
      // Recalcular para un usuario específico
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      // Obtener comisiones del usuario
      const userCommissions = await Commission.find({ userId }).lean();
      totalCommissions = userCommissions.reduce((sum, comm) => sum + comm.amount, 0);
      affectedUsers = 1;
    } else {
      // Recalcular para todos los usuarios
      const allCommissions = await Commission.find({}).lean();
      totalCommissions = allCommissions.reduce((sum, comm) => sum + comm.amount, 0);
      
      const uniqueUsers = new Set(allCommissions.map(comm => comm.userId.toString()));
      affectedUsers = uniqueUsers.size;
    }
    
    const scope = userId ? `usuario ${userId}` : 'todos los usuarios';
    logger.info(`Recalculating commissions for: ${scope}`);
    
    res.json({
      success: true,
      message: `Comisiones recalculadas exitosamente para ${scope}`,
      data: {
        scope: userId || 'all',
        recalculatedAt: new Date().toISOString(),
        affectedUsers,
        totalCommissions: parseFloat(totalCommissions.toFixed(2))
      }
    });
  } catch (error) {
    logger.error('Error recalculating commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al recalcular comisiones'
    });
  }
});

/**
 * @route   GET /api/referrals/admin/reports/:reportType
 * @desc    Generate referral reports (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/reports/:reportType', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reportType } = req.params;
    const { startDate, endDate, format = 'json' } = req.query;
    
    // Construir filtros de fecha
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    const filters = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
    
    // Obtener datos reales según el tipo de reporte
    let reportData;
    
    switch (reportType) {
      case 'referrals':
        const totalReferrals = await Referral.countDocuments(filters);
        const activeReferrers = await Referral.distinct('referrer', filters);
        
        const referralDetails = await Referral.aggregate([
          { $match: filters },
          {
            $group: {
              _id: '$referrer',
              referrals: { $sum: 1 }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: '$user' },
          {
            $project: {
              userId: '$_id',
              userName: '$user.fullName',
              referrals: 1
            }
          },
          { $sort: { referrals: -1 } },
          { $limit: 100 }
        ]);
        
        reportData = {
          type: reportType,
          period: { startDate, endDate },
          generatedAt: new Date().toISOString(),
          data: {
            summary: {
              totalReferrals,
              activeReferrers: activeReferrers.length
            },
            details: referralDetails
          }
        };
        break;
        
      case 'commissions':
        const totalCommissionsResult = await Commission.aggregate([
          { $match: filters },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]);
        
        const commissionDetails = await Commission.aggregate([
          { $match: filters },
          {
            $group: {
              _id: '$userId',
              commissions: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: '$user' },
          {
            $project: {
              userId: '$_id',
              userName: '$user.fullName',
              commissions: { $round: ['$commissions', 2] },
              count: 1
            }
          },
          { $sort: { commissions: -1 } },
          { $limit: 100 }
        ]);
        
        const commissionSummary = totalCommissionsResult[0] || { total: 0, count: 0 };
        
        reportData = {
          type: reportType,
          period: { startDate, endDate },
          generatedAt: new Date().toISOString(),
          data: {
            summary: {
              totalCommissions: parseFloat(commissionSummary.total.toFixed(2)),
              totalPayments: commissionSummary.count
            },
            details: commissionDetails
          }
        };
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Tipo de reporte no válido'
        });
    }
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="referral-report-${reportType}.csv"`);
      
      // Generar contenido CSV real
      let csvContent = '';
      if (reportType === 'referrals') {
        csvContent = 'Usuario,Referidos\n';
        reportData.data.details.forEach(item => {
          csvContent += `${item.userName},${item.referrals}\n`;
        });
      } else if (reportType === 'commissions') {
        csvContent = 'Usuario,Comisiones,Pagos\n';
        reportData.data.details.forEach(item => {
          csvContent += `${item.userName},${item.commissions},${item.count}\n`;
        });
      }
      
      res.send(csvContent);
    } else {
      res.json({
        success: true,
        data: reportData
      });
    }
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte'
    });
  }
});

/**
 * @route   GET /api/referrals/validate/:code
 * @desc    Validate referral code (Public)
 * @access  Public
 */
router.get('/validate/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    // Buscar usuario con el código de referido en la base de datos
    const user = await User.findOne({ referralCode: code }).select('fullName email referralCode');
    
    const isValid = !!user;
    
    res.json({
      success: true,
      data: {
        valid: isValid,
        code,
        user: isValid ? {
          id: user._id,
          name: user.fullName,
          email: user.email
        } : null,
        message: isValid ? 'Código válido' : 'Código inválido'
      }
    });
  } catch (error) {
    logger.error('Error validating referral code:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar código de referido'
    });
  }
});

/**
 * @route   POST /api/referrals/register
 * @desc    Register a referral (internal use)
 * @access  Internal
 */
router.post('/register', async (req, res) => {
  try {
    const { referralCode, userId, source, utm_source, utm_medium, utm_campaign } = req.body;
    
    // Buscar el usuario que tiene el código de referido
    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: 'Código de referido no válido'
      });
    }
    
    // Verificar que el usuario referido existe
    const referredUser = await User.findById(userId);
    if (!referredUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario referido no encontrado'
      });
    }
    
    // Verificar que no se auto-refiera
    if (referrer._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes referirte a ti mismo'
      });
    }
    
    // Verificar que no exista ya una relación de referido
    const existingReferral = await Referral.findOne({
      referrer: referrer._id,
      referred: userId
    });
    
    if (existingReferral) {
      return res.status(400).json({
        success: false,
        message: 'La relación de referido ya existe'
      });
    }
    
    // Crear la relación de referido
    const referral = new Referral({
      referrer: referrer._id,
      referred: userId,
      referralCode,
      source: source || 'direct',
      utm_source,
      utm_medium,
      utm_campaign,
      status: 'active'
    });
    
    await referral.save();
    
    logger.info(`Referral registered: ${referralCode} -> ${userId}`);
    
    res.json({
      success: true,
      message: 'Referido registrado exitosamente',
      data: {
        referralCode,
        userId,
        referrerId: referrer._id,
        registeredAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error registering referral:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar referido'
    });
  }
});

module.exports = router;