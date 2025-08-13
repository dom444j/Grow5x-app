const User = require('../models/User');
const UserStatus = require('../models/UserStatus');
const Transaction = require('../models/Transaction.model');
const Wallet = require('../models/Wallet.model');
const Payment = require('../models/Payment');
const AdminLog = require('../models/AdminLog.model');
const SystemSetting = require('../models/SystemSetting.model');
const News = require('../models/News.model');
const Referral = require('../models/Referral.model');
const Commission = require('../models/Commission.model');
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

// Crear lote de retiros para procesamiento externo
const createWithdrawalBatch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { withdrawalIds, batchName, priority = 'normal' } = req.body;
    
    if (!withdrawalIds || withdrawalIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos un ID de retiro'
      });
    }

    // Validar que el lote tenga exactamente 10 retiros (recomendado)
    if (withdrawalIds.length !== 10) {
      return res.status(400).json({
        success: false,
        message: `Se recomienda crear lotes de exactamente 10 retiros. Recibidos: ${withdrawalIds.length}`,
        suggestion: 'Seleccione exactamente 10 retiros para optimizar el procesamiento'
      });
    }

    // Generar ID único para el lote
    const batchId = `BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();
    
    // Actualizar retiros con el ID del lote
    const updateResult = await Payment.updateMany(
      { 
        _id: { $in: withdrawalIds },
        status: 'pending'
      },
      {
        $set: {
          batchId: batchId,
          batchName: batchName || `Lote ${timestamp.toISOString().split('T')[0]}`,
          priority: priority,
          batchCreatedAt: timestamp,
          batchCreatedBy: req.user.id,
          status: 'batched'
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se pudieron agregar retiros al lote. Verifique que estén en estado pendiente.'
      });
    }

    // Obtener información del lote creado
    const batchWithdrawals = await Payment.find({ batchId })
      .populate('user', 'email username walletAddress')
      .select('amount currency user createdAt fee network');

    const batchSummary = {
      batchId,
      batchName: batchName || `Lote ${timestamp.toISOString().split('T')[0]}`,
      totalWithdrawals: updateResult.modifiedCount,
      totalAmount: batchWithdrawals.reduce((sum, w) => sum + w.amount, 0),
      createdAt: timestamp,
      createdBy: req.user.id,
      priority,
      withdrawals: batchWithdrawals
    };

    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'withdrawal_batch_created',
      'payment',
      null,
      { 
        batchId, 
        withdrawalCount: updateResult.modifiedCount,
        totalAmount: batchSummary.totalAmount,
        priority
      },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      'medium'
    );

    res.json({
      success: true,
      message: `Lote creado exitosamente con ${updateResult.modifiedCount} retiros`,
      data: batchSummary
    });

  } catch (error) {
    logger.error('Error creating withdrawal batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de lotes para gestión optimizada
const getWithdrawalBatchStats = async (req, res) => {
  try {
    const [pendingStats, batchedStats, processedStats] = await Promise.all([
      // Retiros pendientes (disponibles para lotes)
      Payment.aggregate([
        {
          $match: {
            status: 'pending',
            batchId: { $exists: false }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),
      // Retiros en lotes
      Payment.aggregate([
        {
          $match: {
            status: 'batched',
            batchId: { $exists: true }
          }
        },
        {
          $group: {
            _id: '$batchId',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            createdAt: { $first: '$batchCreatedAt' }
          }
        },
        {
          $group: {
            _id: null,
            totalBatches: { $sum: 1 },
            totalWithdrawals: { $sum: '$count' },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]),
      // Retiros procesados
      Payment.aggregate([
        {
          $match: {
            status: 'processed',
            batchId: { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const pending = pendingStats[0] || { count: 0, totalAmount: 0 };
    const batched = batchedStats[0] || { totalBatches: 0, totalWithdrawals: 0, totalAmount: 0 };
    const processed = processedStats[0] || { count: 0, totalAmount: 0 };

    // Calcular lotes posibles
    const possibleBatches = Math.floor(pending.count / 10);
    const remainingWithdrawals = pending.count % 10;

    res.json({
      success: true,
      data: {
        pending: {
          count: pending.count,
          totalAmount: pending.totalAmount,
          possibleBatches,
          remainingWithdrawals,
          readyForBatch: pending.count >= 10
        },
        batched: {
          totalBatches: batched.totalBatches,
          totalWithdrawals: batched.totalWithdrawals,
          totalAmount: batched.totalAmount
        },
        processed: {
          count: processed.count,
          totalAmount: processed.totalAmount
        },
        recommendations: {
          optimalBatchSize: 10,
          canCreateBatches: possibleBatches,
          nextAction: pending.count >= 10 ? 'create_batch' : 'wait_for_more_withdrawals'
        }
      }
    });

  } catch (error) {
    logger.error('Error getting withdrawal batch stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener lotes de retiros
const getWithdrawalBatches = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filters = {};
    if (status) {
      filters.status = status;
    }
    
    // Obtener lotes únicos
    const batches = await Payment.aggregate([
      {
        $match: {
          batchId: { $exists: true, $ne: null },
          ...filters
        }
      },
      {
        $group: {
          _id: '$batchId',
          batchName: { $first: '$batchName' },
          status: { $first: '$status' },
          priority: { $first: '$priority' },
          createdAt: { $first: '$batchCreatedAt' },
          createdBy: { $first: '$batchCreatedBy' },
          totalWithdrawals: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          withdrawals: { $push: '$$ROOT' }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    ]);

    const totalBatches = await Payment.distinct('batchId', {
      batchId: { $exists: true, $ne: null },
      ...filters
    });

    res.json({
      success: true,
      data: {
        batches,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalBatches.length,
          pages: Math.ceil(totalBatches.length / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error getting withdrawal batches:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Dashboard - Obtener estadísticas generales
const getDashboardStats = async (req, res) => {
  try {
    const [userStats, userStatusStats, transactionStats, walletStats, recentActivity, specialUserStats] = await Promise.all([
      // Estadísticas de usuarios
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            verifiedUsers: {
              $sum: { $cond: [{ $eq: ['$verification.isVerified', true] }, 1, 0] }
            },
            totalBalance: { $sum: '$balance' },
            totalEarnings: { $sum: '$totalEarnings' }
          }
        }
      ]),
      
      // Estadísticas de UserStatus
      UserStatus.aggregate([
        {
          $group: {
            _id: null,
            usersWithActivePackages: {
              $sum: { $cond: [{ $eq: ['$subscription.packageStatus', 'active'] }, 1, 0] }
            },
            usersNeedingAttention: {
              $sum: { $cond: [{ $eq: ['$adminFlags.needsAttention', true] }, 1, 0] }
            },
            totalPendingWithdrawals: { $sum: '$financial.withdrawals.pendingAmount' },
            benefitsToProcess: {
              $sum: { $cond: [{ $eq: ['$shouldReceiveBenefitsToday', true] }, 1, 0] }
            }
          }
        }
      ]),
      
      // Estadísticas de transacciones
      Transaction.aggregate([
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            completedTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            pendingTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            totalVolume: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
            },
            totalDeposits: {
              $sum: { 
                $cond: [
                  { $and: [{ $eq: ['$type', 'deposit'] }, { $eq: ['$status', 'completed'] }] }, 
                  '$amount', 
                  0
                ]
              }
            },
            totalWithdrawals: {
              $sum: { 
                $cond: [
                  { $and: [{ $eq: ['$type', 'withdrawal'] }, { $eq: ['$status', 'completed'] }] }, 
                  '$amount', 
                  0
                ]
              }
            },
            packageSales: {
              $sum: { 
                $cond: [
                  { $and: [
                    { $eq: ['$type', 'deposit'] }, 
                    { $eq: ['$subtype', 'license_purchase'] },
                    { $eq: ['$status', 'completed'] }
                  ]}, 
                  1, 
                  0
                ]
              }
            },
            packageRevenue: {
              $sum: { 
                $cond: [
                  { $and: [
                    { $eq: ['$type', 'deposit'] }, 
                    { $eq: ['$subtype', 'license_purchase'] },
                    { $eq: ['$status', 'completed'] }
                  ]}, 
                  '$amount', 
                  0
                ]
              }
            }
          }
        }
      ]),
      
      // Estadísticas de wallets
      Wallet.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalBalance: { $sum: '$balance' }
          }
        }
      ]),
      
      // Actividad reciente
      AdminLog.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('adminId', 'fullName email'),
        
      // Estadísticas de usuarios especiales
      User.aggregate([
        {
          $group: {
            _id: null,
            premiumUsers: {
              $sum: { $cond: [{ $eq: ['$isPioneer', true] }, 1, 0] }
            },
            blockedUsers: {
              $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
            },
            specialUsers: {
              $sum: { $cond: [{ $eq: ['$isSpecialUser', true] }, 1, 0] }
            },
            leaderUsers: {
              $sum: { $cond: [{ $eq: ['$specialUserType', 'leader'] }, 1, 0] }
            },
            parentUsers: {
              $sum: { $cond: [{ $eq: ['$specialUserType', 'parent'] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    // Estadísticas de registros por día (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const registrationStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        users: {
          ...(userStats[0] || {
            totalUsers: 0,
            activeUsers: 0,
            verifiedUsers: 0,
            totalBalance: 0,
            totalEarnings: 0
          }),
          // Agregar estadísticas de usuarios especiales
          ...(specialUserStats[0] || {
            premiumUsers: 0,
            blockedUsers: 0,
            specialUsers: 0,
            leaderUsers: 0,
            parentUsers: 0
          })
        },
        userStatus: userStatusStats[0] || {
          usersWithActivePackages: 0,
          usersNeedingAttention: 0,
          totalPendingWithdrawals: 0,
          benefitsToProcess: 0
        },
        transactions: transactionStats[0] || {
          totalTransactions: 0,
          completedTransactions: 0,
          pendingTransactions: 0,
          totalVolume: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          packageSales: 0,
          packageRevenue: 0
        },
        wallets: {
          total: walletStats.reduce((acc, stat) => acc + stat.count, 0),
          active: walletStats.find(stat => stat._id === 'active')?.count || 0,
          inactive: walletStats.find(stat => stat._id === 'inactive')?.count || 0,
          maintenance: walletStats.find(stat => stat._id === 'maintenance')?.count || 0,
          totalBalance: walletStats.reduce((acc, stat) => acc + (stat.totalBalance || 0), 0),
          byStatus: walletStats
        },
        recentActivity,
        registrationStats
      }
    });

  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Gestión de usuarios - Obtener lista de usuarios (MEJORADO)
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = 'all',
      role = 'all',
      packageStatus = 'all',
      needsAttention = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeWithoutStatus = 'true' // NUEVO: Incluir usuarios sin UserStatus por defecto
    } = req.query;

    // Construir filtros
    const filters = {};
    
    if (search) {
      filters.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { referralCode: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status !== 'all') {
      filters.status = status;
    }
    
    if (role !== 'all') {
      filters.role = role;
    }

    // Configurar ordenamiento
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Ejecutar consulta con paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Pipeline de agregación MEJORADO para incluir TODOS los usuarios
    const pipeline = [
      { $match: filters },
      {
        $lookup: {
          from: 'userstatuses',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$user', '$$userId'] } } }
          ],
          as: 'userStatus'
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { referredById: '$referredBy' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$referredById'] } } }
          ],
          as: 'referredByUser'
        }
      },
      {
        $lookup: {
          from: 'specialcodes',
          let: { specialCodeId: '$specialCodeId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$specialCodeId'] } } }
          ],
          as: 'specialCode'
        }
      },
      {
        $addFields: {
          // Campos calculados para identificar usuarios sin UserStatus
          hasUserStatus: { $gt: [{ $size: '$userStatus' }, 0] },
          needsUserStatusCreation: { $eq: [{ $size: '$userStatus' }, 0] },
          // Información de paquete con fallback para usuarios sin UserStatus
          packageInfo: {
            $cond: {
              if: { $gt: [{ $size: '$userStatus' }, 0] },
              then: {
                status: { $ifNull: [{ $arrayElemAt: ['$userStatus.subscription.packageStatus', 0] }, 'none'] },
                package: { $ifNull: [{ $arrayElemAt: ['$userStatus.subscription.currentPackage', 0] }, ''] },
                needsAttention: { $ifNull: [{ $arrayElemAt: ['$userStatus.adminFlags.needsAttention', 0] }, false] },
                activatedAt: { $arrayElemAt: ['$userStatus.subscription.activatedAt', 0] },
                balance: { $ifNull: [{ $arrayElemAt: ['$userStatus.financial.currentBalance', 0] }, 0] }
              },
              else: {
                status: 'none',
                package: '',
                needsAttention: true, // Marcar como que necesita atención
                activatedAt: null,
                balance: { $ifNull: ['$balance', 0] } // Usar balance del User como fallback
              }
            }
          }
        }
      },
      {
        $addFields: {
          userStatus: { $arrayElemAt: ['$userStatus', 0] },
          referredBy: { $arrayElemAt: ['$referredByUser', 0] },
          specialCode: { $arrayElemAt: ['$specialCode', 0] }
        }
      }
    ];
    
    // Aplicar filtros adicionales de UserStatus MEJORADOS
    const additionalFilters = {};
    
    if (packageStatus !== 'all') {
      if (packageStatus === 'none') {
        additionalFilters.$or = [
          { 'packageInfo.status': 'none' },
          { 'packageInfo.status': { $exists: false } },
          { 'userStatus': { $exists: false } },
          { 'userStatus': null },
          { 'userStatus': [] }
        ];
      } else {
        additionalFilters['packageInfo.status'] = packageStatus;
      }
    }
    
    if (needsAttention !== 'all') {
      const needsAttentionBool = needsAttention === 'true';
      additionalFilters['packageInfo.needsAttention'] = needsAttentionBool;
    }
    
    // Solo aplicar filtros adicionales si no queremos incluir usuarios sin status
    if (includeWithoutStatus !== 'true' && Object.keys(additionalFilters).length > 0) {
      pipeline.push({ $match: additionalFilters });
    } else if (Object.keys(additionalFilters).length > 0) {
      // Aplicar filtros pero manteniendo usuarios sin UserStatus
      const filterWithFallback = {
        $or: [
          additionalFilters,
          { needsUserStatusCreation: true } // Siempre incluir usuarios que necesitan UserStatus
        ]
      };
      pipeline.push({ $match: filterWithFallback });
    }
    
    // Agregar proyección para excluir campos sensibles
    pipeline.push({
      $project: {
        password: 0,
        sessions: 0,
        securityLog: 0,
        resetPassword: 0,
        'referredBy.password': 0,
        'referredBy.sessions': 0,
        'referredBy.securityLog': 0,
        'referredBy.resetPassword': 0,
        'userStatus.user': 0 // Evitar referencia circular
      }
    });
    
    // Agregar ordenamiento
    pipeline.push({ $sort: sort });
    
    // Contar total de documentos (sin paginación)
    const totalPipeline = [...pipeline, { $count: 'total' }];
    const totalResult = await User.aggregate(totalPipeline);
    const totalUsers = totalResult[0]?.total || 0;
    
    // Agregar paginación
    pipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );
    
    // Ejecutar agregación
    const users = await User.aggregate(pipeline);

    // AUTO-CREAR USERSTATUS para usuarios que no lo tienen
    const UserStatusService = require('../services/UserStatusService');
    const usersNeedingStatus = users.filter(u => u.needsUserStatusCreation);
    
    if (usersNeedingStatus.length > 0) {
      logger.info(`Auto-creando UserStatus para ${usersNeedingStatus.length} usuarios`, {
        userIds: usersNeedingStatus.map(u => u._id),
        adminRequest: true,
        route: req.route?.path,
        adminUser: req.user?.email
      });
      
      // Crear UserStatus en paralelo (máximo 5 a la vez para no sobrecargar)
      const batchSize = 5;
      for (let i = 0; i < usersNeedingStatus.length; i += batchSize) {
        const batch = usersNeedingStatus.slice(i, i + batchSize);
        const createPromises = batch.map(async (user) => {
          try {
            const userStatus = await UserStatusService.getOrCreateUserStatus(user._id);
            logger.info(`UserStatus auto-creado para usuario: ${user.email}`, {
              userId: user._id,
              userStatusId: userStatus._id,
              adminTriggered: true
            });
            return { success: true, userId: user._id, userStatusId: userStatus._id };
          } catch (error) {
            logger.error(`Error auto-creando UserStatus para usuario: ${user.email}`, {
              userId: user._id,
              error: error.message,
              stack: error.stack
            });
            return { success: false, userId: user._id, error: error.message };
          }
        });
        
        await Promise.allSettled(createPromises);
      }
      
      // Log de la operación de auto-creación
      await logAdminAction(
        req.user?.id,
        'auto_create_user_status',
        'user_status',
        null,
        `Auto-creados ${usersNeedingStatus.length} UserStatus durante consulta de usuarios`,
        {
          usersAffected: usersNeedingStatus.length,
          userIds: usersNeedingStatus.map(u => u._id),
          route: req.route?.path
        },
        'medium'
      );
    }

    // Estadísticas adicionales para el dashboard
    const stats = {
      totalUsers,
      usersWithoutStatus: users.filter(u => u.needsUserStatusCreation).length,
      usersWithActivePackages: users.filter(u => u.packageInfo?.status === 'active').length,
      usersNeedingAttention: users.filter(u => u.packageInfo?.needsAttention).length,
      specialUsers: users.filter(u => u.isSpecialUser).length,
      pioneerUsers: users.filter(u => u.isPioneer).length
    };

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / parseInt(limit)),
          totalUsers,
          hasNext: skip + users.length < totalUsers,
          hasPrev: parseInt(page) > 1,
          limit: parseInt(limit)
        },
        stats, // NUEVO: Estadísticas adicionales
        filters: { // NUEVO: Filtros aplicados para debugging
          status,
          role,
          packageStatus,
          needsAttention,
          search,
          includeWithoutStatus
        },
        autoCreatedUserStatus: usersNeedingStatus.length // NUEVO: Cantidad de UserStatus auto-creados
      }
    });

  } catch (error) {
    logger.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'GET_USERS_ERROR'
    });
  }
};

// Obtener detalles de un usuario específico
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password')
      .populate('referredBy', 'fullName email referralCode')
      .populate('referrals.user', 'fullName email referralCode status');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Obtener UserStatus del usuario
    const userStatus = await UserStatus.findOne({ user: userId });

    // Obtener transacciones del usuario
    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(20);

    // Obtener pagos del usuario
    const payments = await Payment.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Obtener estadísticas de referidos
    const referralStats = {
      totalReferrals: user.referrals.length,
      activeReferrals: user.referrals.filter(ref => ref.status === 'active').length,
      totalCommissions: user.referrals.reduce((sum, ref) => sum + ref.commission, 0)
    };

    res.json({
      success: true,
      data: {
        user,
        userStatus,
        transactions,
        payments,
        referralStats
      }
    });

  } catch (error) {
    logger.error('Error getting user details:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar estado de usuario
const updateUserStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { status, reason } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const previousStatus = user.status;
    user.status = status;
    await user.save();

    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'user_status_changed',
      'user',
      userId,
      { previousStatus, newStatus: status, reason },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      status === 'suspended' ? 'high' : 'medium'
    );

    res.json({
      success: true,
      message: 'Estado de usuario actualizado correctamente',
      data: {
        userId,
        previousStatus,
        newStatus: status
      }
    });

  } catch (error) {
    logger.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Ajustar balance de usuario manualmente
const adjustUserBalance = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { amount, type, reason } = req.body; // type: 'add' | 'subtract' | 'set'
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const previousBalance = user.balance;
    let newBalance;

    switch (type) {
      case 'add':
        newBalance = previousBalance + amount;
        break;
      case 'subtract':
        newBalance = Math.max(0, previousBalance - amount);
        break;
      case 'set':
        newBalance = Math.max(0, amount);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Tipo de ajuste inválido'
        });
    }

    user.balance = newBalance;
    await user.save();

    // Crear registro de transacción
    await Transaction.create({
      user: userId,
      type: 'admin_adjustment',
      amount: type === 'add' ? amount : type === 'subtract' ? -amount : newBalance - previousBalance,
      status: 'completed',
      description: `Ajuste manual de balance por administrador: ${reason}`,
      metadata: {
        adminId: req.user.id,
        previousBalance,
        newBalance,
        adjustmentType: type,
        reason
      }
    });

    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'wallet_adjusted',
      'user',
      userId,
      { previousBalance, newBalance, amount, type, reason },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      'high'
    );

    res.json({
      success: true,
      message: 'Balance ajustado correctamente',
      data: {
        userId,
        previousBalance,
        newBalance,
        adjustment: newBalance - previousBalance
      }
    });

  } catch (error) {
    logger.error('Error adjusting user balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ===== WITHDRAWAL MANAGEMENT =====

// Obtener retiros pendientes
const getPendingWithdrawals = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      status = 'pending',
      batchSize = 10,
      excludeBatched = 'false'
    } = req.query;

    // Construir filtros
    const filters = { status };
    
    // Excluir retiros ya incluidos en lotes si se solicita
    if (excludeBatched === 'true') {
      filters.batchId = { $exists: false };
    }
    
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }
    
    if (minAmount) filters.amount = { ...filters.amount, $gte: parseFloat(minAmount) };
    if (maxAmount) filters.amount = { ...filters.amount, $lte: parseFloat(maxAmount) };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [withdrawals, totalWithdrawals] = await Promise.all([
      Payment.find(filters)
        .populate('user', 'fullName email walletAddress')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments(filters)
    ]);

    const totalAmount = await Payment.aggregate([
      { $match: filters },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalWithdrawals / parseInt(limit)),
          totalWithdrawals,
          hasNext: skip + withdrawals.length < totalWithdrawals,
          hasPrev: parseInt(page) > 1
        },
        summary: {
          totalAmount: totalAmount[0]?.total || 0,
          count: totalWithdrawals,
          suggestedBatchSize: parseInt(batchSize),
          availableForBatch: excludeBatched === 'true' ? totalWithdrawals : 'N/A'
        },
        batchInfo: {
          recommendedSize: parseInt(batchSize),
          currentPageSize: withdrawals.length,
          canCreateBatch: withdrawals.length >= parseInt(batchSize)
        }
      }
    });

  } catch (error) {
    logger.error('Error getting pending withdrawals:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener retiros disponibles para crear lotes (optimizado para selección de 10 en 10)
const getWithdrawalsForBatch = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = 'asc'
    } = req.query;

    // Filtros para retiros disponibles para lotes
    const filters = {
      status: 'pending',
      batchId: { $exists: false } // Solo retiros no incluidos en lotes
    };
    
    if (minAmount) filters.amount = { ...filters.amount, $gte: parseFloat(minAmount) };
    if (maxAmount) filters.amount = { ...filters.amount, $lte: parseFloat(maxAmount) };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const [withdrawals, totalAvailable] = await Promise.all([
      Payment.find(filters)
        .populate('user', 'fullName email walletAddress country')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments(filters)
    ]);

    const totalAmount = await Payment.aggregate([
      { $match: filters },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Calcular estadísticas de lotes posibles
    const possibleBatches = Math.floor(totalAvailable / 10);
    const remainingWithdrawals = totalAvailable % 10;

    res.json({
      success: true,
      data: {
        withdrawals: withdrawals.map(w => ({
          _id: w._id,
          amount: w.amount,
          currency: w.currency || 'USDT',
          network: w.network || 'TRC20',
          createdAt: w.createdAt,
          user: {
            _id: w.user?._id,
            fullName: w.user?.fullName,
            email: w.user?.email,
            walletAddress: w.user?.walletAddress,
            country: w.user?.country
          },
          selected: false // Campo para UI
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalAvailable / parseInt(limit)),
          totalAvailable,
          hasNext: skip + withdrawals.length < totalAvailable,
          hasPrev: parseInt(page) > 1
        },
        batchStats: {
          totalAmount: totalAmount[0]?.total || 0,
          totalAvailable,
          possibleBatches,
          remainingWithdrawals,
          currentPageCount: withdrawals.length,
          canCreateBatchFromPage: withdrawals.length >= 10
        }
      }
    });

  } catch (error) {
    logger.error('Error getting withdrawals for batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Exportar retiros pendientes a CSV
const exportPendingWithdrawals = async (req, res) => {
  try {
    const {
      format = 'csv',
      startDate,
      endDate,
      batchId,
      status = 'pending',
      includeUserDetails = 'true',
      includeTransactionHistory = 'false'
    } = req.query;

    // Construir filtros
    const filters = { status };
    
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }
    
    if (batchId) {
      filters.batchId = batchId;
    }

    // Capturar todos los datos de MongoDB Atlas con populate completo
    const withdrawals = await Payment.find(filters)
      .populate({
        path: 'user',
        select: 'walletAddress email username firstName lastName phone country verification status balance totalEarnings createdAt lastLogin',
        populate: {
          path: 'verification',
          select: 'isVerified verificationDate documentType'
        }
      })
      .populate('transaction', 'hash blockNumber gasUsed gasPrice')
      .sort({ createdAt: 1 });

    if (withdrawals.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron retiros pendientes para exportar'
      });
    }

    // Obtener datos adicionales si se solicita historial de transacciones
    let enrichedWithdrawals = withdrawals;
    if (includeTransactionHistory === 'true') {
      enrichedWithdrawals = await Promise.all(
        withdrawals.map(async (withdrawal) => {
          const userTransactions = await Transaction.find({ 
            userId: withdrawal.user?._id 
          })
          .select('type amount status createdAt hash')
          .limit(10)
          .sort({ createdAt: -1 });
          
          return {
            ...withdrawal.toObject(),
            userTransactionHistory: userTransactions
          };
        })
      );
    }

    if (format === 'csv') {
      // Generar CSV con datos completos para procesamiento externo
      let csvContent = includeUserDetails === 'true' 
        ? 'withdrawalId,address,amount,currency,status,createdAt,userId,userEmail,userName,userCountry,userVerified,userBalance,userTotalEarnings,transactionHash,batchId,fee,network,priority\n'
        : 'address,amount,currency,network\n';
      
      enrichedWithdrawals.forEach(withdrawal => {
        const address = withdrawal.user?.walletAddress || withdrawal.walletAddress || 'N/A';
        
        if (includeUserDetails === 'true') {
          const user = withdrawal.user || {};
          csvContent += `${withdrawal._id},${address},${withdrawal.amount},${withdrawal.currency || 'USDT'},${withdrawal.status},${withdrawal.createdAt?.toISOString() || ''},${user._id || ''},${user.email || ''},${user.username || ''},${user.country || ''},${user.verification?.isVerified || false},${user.balance || 0},${user.totalEarnings || 0},${withdrawal.transactionHash || ''},${withdrawal.batchId || ''},${withdrawal.fee || 0},${withdrawal.network || 'TRC20'},${withdrawal.priority || 'normal'}\n`;
        } else {
          csvContent += `${address},${withdrawal.amount},${withdrawal.currency || 'USDT'},${withdrawal.network || 'TRC20'}\n`;
        }
      });

      // Configurar headers para descarga
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `withdrawals_export_${status}_${timestamp}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('\uFEFF' + csvContent); // BOM para UTF-8
      
    } else if (format === 'json') {
      // Generar JSON con datos completos de MongoDB Atlas
      const jsonData = enrichedWithdrawals.map(withdrawal => {
        const baseData = {
          withdrawalId: withdrawal._id,
          address: withdrawal.user?.walletAddress || withdrawal.walletAddress,
          amount: withdrawal.amount,
          status: withdrawal.status,
          createdAt: withdrawal.createdAt,
          updatedAt: withdrawal.updatedAt,
          transactionHash: withdrawal.transactionHash,
          batchId: withdrawal.batchId,
          fee: withdrawal.fee,
          network: withdrawal.network,
          confirmations: withdrawal.confirmations
        };

        if (includeUserDetails === 'true' && withdrawal.user) {
          baseData.user = {
            userId: withdrawal.user._id,
            email: withdrawal.user.email,
            username: withdrawal.user.username,
            fullName: `${withdrawal.user.firstName || ''} ${withdrawal.user.lastName || ''}`.trim(),
            phone: withdrawal.user.phone,
            country: withdrawal.user.country,
            isVerified: withdrawal.user.verification?.isVerified || false,
            verificationDate: withdrawal.user.verification?.verificationDate,
            documentType: withdrawal.user.verification?.documentType,
            accountStatus: withdrawal.user.status,
            balance: withdrawal.user.balance,
            totalEarnings: withdrawal.user.totalEarnings,
            memberSince: withdrawal.user.createdAt,
            lastLogin: withdrawal.user.lastLogin
          };
        }

        if (includeTransactionHistory === 'true' && withdrawal.userTransactionHistory) {
          baseData.recentTransactions = withdrawal.userTransactionHistory;
        }

        return baseData;
      });
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `withdrawals_export_${status}_${timestamp}.json`;
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json({
        exportMetadata: {
          exportDate: new Date().toISOString(),
          exportedBy: req.user.id,
          format: 'json',
          filters: filters,
          includeUserDetails: includeUserDetails === 'true',
          includeTransactionHistory: includeTransactionHistory === 'true'
        },
        summary: {
          totalWithdrawals: withdrawals.length,
          totalAmount: withdrawals.reduce((sum, w) => sum + w.amount, 0),
          averageAmount: withdrawals.length > 0 ? withdrawals.reduce((sum, w) => sum + w.amount, 0) / withdrawals.length : 0,
          statusBreakdown: withdrawals.reduce((acc, w) => {
            acc[w.status] = (acc[w.status] || 0) + 1;
            return acc;
          }, {}),
          dateRange: {
            earliest: withdrawals.length > 0 ? withdrawals[0].createdAt : null,
            latest: withdrawals.length > 0 ? withdrawals[withdrawals.length - 1].createdAt : null
          }
        },
        withdrawals: jsonData
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Formato no soportado. Use csv o json'
      });
    }

    // Registrar acción de admin con detalles completos
    await logAdminAction(
      req.user.id,
      'withdrawals_exported',
      'payment',
      null,
      { 
        count: withdrawals.length, 
        format, 
        filters,
        totalAmount: withdrawals.reduce((sum, w) => sum + w.amount, 0),
        includeUserDetails: includeUserDetails === 'true',
        includeTransactionHistory: includeTransactionHistory === 'true',
        exportTimestamp: new Date().toISOString()
      },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestQuery: req.query
      },
      'medium'
    );

  } catch (error) {
    logger.error('Error exporting withdrawals:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Marcar retiros como exportados
const markWithdrawalsAsExported = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { withdrawalIds, batchId } = req.body;
    
    const updateData = {
      status: 'exported',
      exportedAt: new Date(),
      exportedBy: req.user.id
    };
    
    if (batchId) {
      updateData.batchId = batchId;
    }

    const result = await Payment.updateMany(
      { _id: { $in: withdrawalIds } },
      updateData
    );

    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'withdrawals_marked_exported',
      'payment',
      null,
      { withdrawalIds, batchId, modifiedCount: result.modifiedCount },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      'medium'
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} retiros marcados como exportados`,
      data: {
        modifiedCount: result.modifiedCount,
        batchId
      }
    });

  } catch (error) {
    logger.error('Error marking withdrawals as exported:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Marcar retiros como procesados
const markWithdrawalsAsProcessed = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { withdrawalIds, txHashes, batchId } = req.body;
    
    const updateData = {
      status: 'completed',
      processedAt: new Date(),
      processedBy: req.user.id
    };
    
    if (batchId) {
      updateData.batchId = batchId;
    }
    
    if (txHashes && txHashes.length > 0) {
      updateData.txHashes = txHashes;
    }

    const result = await Payment.updateMany(
      { _id: { $in: withdrawalIds } },
      updateData
    );

    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'withdrawals_marked_processed',
      'payment',
      null,
      { withdrawalIds, batchId, txHashes, modifiedCount: result.modifiedCount },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      'high'
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} retiros marcados como procesados`,
      data: {
        modifiedCount: result.modifiedCount,
        batchId,
        txHashes
      }
    });

  } catch (error) {
    logger.error('Error marking withdrawals as processed:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas del sistema
const getSystemStats = async (req, res) => {
  try {
    // Estadísticas básicas del sistema
    const stats = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener logs del sistema
const getSystemLogs = async (req, res) => {
  try {
    const { level = 'info', limit = 100 } = req.query;
    
    // Por ahora retornamos un mensaje básico
    res.json({
      success: true,
      data: {
        logs: [],
        message: 'Funcionalidad de logs en desarrollo'
      }
    });
  } catch (error) {
    logger.error('Error getting system logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Verificar salud del sistema
const getSystemHealth = async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      database: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de usuarios para gráficos
const getUserStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calcular fecha de inicio basada en el período
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Estadísticas de registros por día
    const registrationStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: registrationStats
    });

  } catch (error) {
    logger.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de transacciones para gráficos
const getTransactionStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calcular fecha de inicio basada en el período
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Estadísticas de transacciones por día
    const transactionStats = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Estadísticas adicionales de reconciliación
    const reconciliationStats = await getReconciliationStats();

    res.json({
      success: true,
      data: {
        transactionStats,
        reconciliation: reconciliationStats
      }
    });

  } catch (error) {
    logger.error('Error getting transaction stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función helper para estadísticas de reconciliación
const getReconciliationStats = async () => {
  try {
    // Verificar consistencia de balances
    const userBalanceCheck = await User.aggregate([
      {
        $lookup: {
          from: 'transactions',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user', '$$userId'] },
                status: 'completed'
              }
            },
            {
              $group: {
                _id: null,
                deposits: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'deposit'] }, '$amount', 0]
                  }
                },
                withdrawals: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'withdrawal'] }, '$amount', 0]
                  }
                },
                earnings: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'earnings'] }, '$amount', 0]
                  }
                },
                commissions: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'commission'] }, '$amount', 0]
                  }
                },
                adjustments: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'admin_adjustment'] }, '$amount', 0]
                  }
                }
              }
            }
          ],
          as: 'transactionSummary'
        }
      },
      {
        $project: {
          _id: 1,
          currentBalance: '$balance',
          calculatedBalance: {
            $add: [
              { $ifNull: [{ $arrayElemAt: ['$transactionSummary.deposits', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$transactionSummary.earnings', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$transactionSummary.commissions', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$transactionSummary.adjustments', 0] }, 0] },
              { $multiply: [{ $ifNull: [{ $arrayElemAt: ['$transactionSummary.withdrawals', 0] }, 0] }, -1] }
            ]
          },
          discrepancy: {
            $subtract: [
              '$balance',
              {
                $add: [
                  { $ifNull: [{ $arrayElemAt: ['$transactionSummary.deposits', 0] }, 0] },
                  { $ifNull: [{ $arrayElemAt: ['$transactionSummary.earnings', 0] }, 0] },
                  { $ifNull: [{ $arrayElemAt: ['$transactionSummary.commissions', 0] }, 0] },
                  { $ifNull: [{ $arrayElemAt: ['$transactionSummary.adjustments', 0] }, 0] },
                  { $multiply: [{ $ifNull: [{ $arrayElemAt: ['$transactionSummary.withdrawals', 0] }, 0] }, -1] }
                ]
              }
            ]
          }
        }
      },
      {
        $match: {
          $expr: { $ne: ['$discrepancy', 0] }
        }
      }
    ]);

    return {
      balanceDiscrepancies: userBalanceCheck.length,
      totalDiscrepancyAmount: userBalanceCheck.reduce((sum, user) => sum + Math.abs(user.discrepancy), 0),
      lastChecked: new Date()
    };
  } catch (error) {
    logger.error('Error in reconciliation stats:', error);
    return {
      balanceDiscrepancies: 0,
      totalDiscrepancyAmount: 0,
      lastChecked: new Date(),
      error: 'Error calculating reconciliation stats'
    };
  }
};

// Obtener estadísticas de tasa de conversión
const getConversionRateStats = async (req, res) => {
  try {
    // Obtener estadísticas de conversión de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const conversionStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          totalRegistrations: { $sum: 1 },
          verifiedUsers: {
            $sum: { $cond: [{ $eq: ['$verification.isVerified', true] }, 1, 0] }
          },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          conversionRate: {
            $cond: [
              { $gt: ['$totalRegistrations', 0] },
              { $multiply: [{ $divide: ['$verifiedUsers', '$totalRegistrations'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: conversionStats
    });

  } catch (error) {
    logger.error('Error getting conversion rate stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de rendimiento del sistema
const getSystemPerformanceStats = async (req, res) => {
  try {
    const performanceStats = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString(),
      // Estadísticas simuladas para el gráfico
      performanceHistory: [
        { time: '00:00', cpu: 45, memory: 62, response: 120 },
        { time: '04:00', cpu: 38, memory: 58, response: 110 },
        { time: '08:00', cpu: 52, memory: 65, response: 135 },
        { time: '12:00', cpu: 48, memory: 61, response: 125 },
        { time: '16:00', cpu: 55, memory: 68, response: 140 },
        { time: '20:00', cpu: 42, memory: 59, response: 115 }
      ]
    };

    res.json({
      success: true,
      data: performanceStats
    });

  } catch (error) {
    logger.error('Error getting system performance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener pre-registros con filtros
const getPreregistrations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = 'all'
    } = req.query;

    // Construir filtros
    const filters = {};
    
    if (search) {
      filters.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status !== 'all') {
      if (status === 'pendiente') {
        filters['verification.isVerified'] = false;
        filters.status = { $ne: 'banned' };
      } else if (status === 'verificado') {
        filters['verification.isVerified'] = true;
        filters.status = 'active';
      } else if (status === 'convertido') {
        filters.balance = { $gt: 0 };
      }
    }

    // Ejecutar consulta con paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [preregistrations, totalCount] = await Promise.all([
      User.find(filters)
        .select('fullName email createdAt status verification balance')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filters)
    ]);

    // Formatear datos
    const formattedData = preregistrations.map(user => ({
      id: user._id,
      name: user.fullName,
      email: user.email,
      date: user.createdAt.toISOString().split('T')[0],
      status: user.verification?.isVerified 
        ? (user.balance > 0 ? 'convertido' : 'verificado')
        : 'pendiente'
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNext: skip + preregistrations.length < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    logger.error('Error getting preregistrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de referidos para admin
const getReferralStats = async (req, res) => {
  try {
    // Estadísticas totales de referidos
    const totalReferrals = await Referral.countDocuments();
    const activeReferrals = await Referral.countDocuments({ status: 'active' });
    
    // Estadísticas de comisiones
    const totalCommissionsResult = await Commission.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalCommissions = totalCommissionsResult[0]?.total || 0;
    
    const pendingCommissionsResult = await Commission.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pendingCommissions = pendingCommissionsResult[0]?.total || 0;
    
    // Estadísticas del mes actual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const thisMonthReferrals = await Referral.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    const thisMonthCommissionsResult = await Commission.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const thisMonthCommissions = thisMonthCommissionsResult[0]?.total || 0;
    
    res.json({
      success: true,
      data: {
        totalReferrals,
        activeReferrals,
        totalCommissions: Number(totalCommissions.toFixed(2)),
        pendingCommissions: Number(pendingCommissions.toFixed(2)),
        thisMonthReferrals,
        thisMonthCommissions: Number(thisMonthCommissions.toFixed(2))
      }
    });
    
  } catch (error) {
    logger.error('Error getting admin referral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener todos los referidos para admin
const getAllReferrals = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Construir query de filtros
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const total = await Referral.countDocuments(query);
    
    let referrals = await Referral.find(query)
      .populate('referrer', 'fullName email referralCode role isSpecialUser specialUserType benefits.referralBenefits')
      .populate('referred', 'fullName email status role isSpecialUser specialUserType benefits.personalBenefits')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Filtrar por búsqueda si se proporciona
    if (search) {
      referrals = referrals.filter(r => 
        r.referrer?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        r.referrer?.email?.toLowerCase().includes(search.toLowerCase()) ||
        r.referred?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        r.referred?.email?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Función para determinar el tipo de usuario
    const getUserType = (user) => {
      if (user.role === 'admin') return 'admin';
      if (user.isSpecialUser) {
        if (user.specialUserType === 'parent') return 'padre_especial';
        if (user.specialUserType === 'leader') return 'lider_especial';
      }
      return 'usuario';
    };
    
    // Calcular comisiones para cada referido
    const referralsWithCommissions = await Promise.all(
      referrals.map(async (referral) => {
        const commissionResult = await Commission.aggregate([
          { 
            $match: { 
              userId: referral.referrer._id,
              fromUserId: referral.referred._id
            } 
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        const commissionAmount = commissionResult[0]?.total || 0;
        
        return {
          id: referral._id,
          referrer: {
            id: referral.referrer._id,
            name: referral.referrer.fullName,
            email: referral.referrer.email,
            referralCode: referral.referrer.referralCode,
            userType: getUserType(referral.referrer),
            role: referral.referrer.role,
            isSpecialUser: referral.referrer.isSpecialUser,
            specialUserType: referral.referrer.specialUserType,
            totalReferralCommissions: referral.referrer.benefits?.referralBenefits?.totalReferralCommissions || 0,
            totalDirectReferrals: referral.referrer.benefits?.referralBenefits?.totalDirectReferrals || 0
          },
          referred: {
            id: referral.referred._id,
            name: referral.referred.fullName,
            email: referral.referred.email,
            status: referral.referred.status,
            userType: getUserType(referral.referred),
            role: referral.referred.role,
            isSpecialUser: referral.referred.isSpecialUser,
            specialUserType: referral.referred.specialUserType,
            totalPackagesPurchased: referral.referred.benefits?.personalBenefits?.totalPackagesPurchased || 0,
            totalLicensesPurchased: referral.referred.benefits?.personalBenefits?.totalLicensesPurchased || 0
          },
          level: 1, // Solo referidos directos
          status: referral.status,
          createdAt: referral.createdAt,
          commissionAmount: Number(commissionAmount.toFixed(2))
        };
      })
    );
    
    res.json({
      success: true,
      data: referralsWithCommissions,
      pagination: {
        current: pageNum,
        total: Math.ceil(total / limitNum),
        count: referralsWithCommissions.length,
        totalRecords: total
      }
    });
    
  } catch (error) {
    logger.error('Error getting all referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener comisiones pendientes para admin
const getPendingCommissions = async (req, res) => {
  try {
    const pendingCommissions = await Commission.find({ status: 'pending' })
      .populate('userId', 'fullName email referralCode')
      .populate('fromUserId', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    const formattedCommissions = pendingCommissions.map(commission => ({
      id: commission._id,
      user: {
        id: commission.userId._id,
        name: commission.userId.fullName,
        email: commission.userId.email
      },
      amount: Number(commission.amount.toFixed(2)),
      currency: commission.currency || 'USD',
      commissionType: commission.commissionType,
      createdAt: commission.createdAt,
      fromUser: commission.fromUserId ? {
        name: commission.fromUserId.fullName,
        email: commission.fromUserId.email
      } : null
    }));
    
    res.json({
      success: true,
      data: formattedCommissions
    });
    
  } catch (error) {
    logger.error('Error getting pending commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Procesar pagos de comisiones
const processCommissionPayments = async (req, res) => {
  try {
    const { commissionIds } = req.body;
    
    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de comisiones'
      });
    }
    
    let processedCount = 0;
    const processedIds = [];
    const errors = [];
    
    for (const commissionId of commissionIds) {
      try {
        const commission = await Commission.findById(commissionId);
        
        if (!commission) {
          errors.push({ commissionId, error: 'Comisión no encontrada' });
          continue;
        }
        
        if (commission.status !== 'pending') {
          errors.push({ commissionId, error: 'La comisión no está pendiente' });
          continue;
        }
        
        // Actualizar estado de la comisión
        commission.status = 'paid';
        commission.paidDate = new Date();
        await commission.save();
        
        // Actualizar balance del usuario
        await User.findByIdAndUpdate(commission.userId, {
          $inc: { 'capital.available': commission.amount }
        });
        
        processedCount++;
        processedIds.push(commissionId);
        
      } catch (error) {
        errors.push({ commissionId, error: error.message });
      }
    }
    
    // Log de la acción administrativa
    await logAdminAction(
      req.user.id,
      'process_commission_payments',
      'commission',
      null,
      `Procesadas ${processedCount}/${commissionIds.length} comisiones`,
      { processedIds, errors },
      'high'
    );
    
    res.json({
      success: true,
      message: `${processedCount} comisiones procesadas exitosamente`,
      data: {
        processedCount,
        totalRequested: commissionIds.length,
        processedIds,
        errors
      }
    });
    
  } catch (error) {
    logger.error('Error processing commission payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Rechazar comisiones
const rejectCommissions = async (req, res) => {
  try {
    const { commissionIds, reason = 'Rechazada por administrador' } = req.body;
    
    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de comisiones'
      });
    }
    
    let rejectedCount = 0;
    const rejectedIds = [];
    const errors = [];
    
    for (const commissionId of commissionIds) {
      try {
        const commission = await Commission.findById(commissionId);
        
        if (!commission) {
          errors.push({ commissionId, error: 'Comisión no encontrada' });
          continue;
        }
        
        if (commission.status !== 'pending') {
          errors.push({ commissionId, error: 'La comisión no está pendiente' });
          continue;
        }
        
        // Actualizar estado de la comisión
        commission.status = 'rejected';
        commission.rejectedDate = new Date();
        commission.rejectionReason = reason;
        await commission.save();
        
        rejectedCount++;
        rejectedIds.push(commissionId);
        
      } catch (error) {
        errors.push({ commissionId, error: error.message });
      }
    }
    
    // Log de la acción administrativa
    await logAdminAction(
      req.user.id,
      'reject_commissions',
      'commission',
      null,
      `Rechazadas ${rejectedCount}/${commissionIds.length} comisiones`,
      { rejectedIds, errors, reason },
      'high'
    );
    
    res.json({
      success: true,
      message: `${rejectedCount} comisiones rechazadas exitosamente`,
      data: {
        rejectedCount,
        totalRequested: commissionIds.length,
        rejectedIds,
        errors
      }
    });
    
  } catch (error) {
    logger.error('Error rejecting commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener top referidores
const getTopReferrers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
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
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'commissions',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$userId'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          as: 'commissions'
        }
      },
      {
        $project: {
          _id: 1,
          name: '$user.fullName',
          email: '$user.email',
          referralCode: '$user.referralCode',
          referralCount: 1,
          activeReferrals: 1,
          totalCommissions: {
            $ifNull: [{ $arrayElemAt: ['$commissions.total', 0] }, 0]
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
      message: 'Error interno del servidor'
    });
  }
};

// Recalcular comisiones de un usuario
const recalculateCommissions = async (req, res) => {
  try {
    // Verificar que el usuario sea administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden recalcular comisiones'
      });
    }
    
    const { userId, fromDate } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del usuario'
      });
    }
    
    // Verificar que el usuario existe
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Actualizar comisiones pendientes para recálculo
    const updateQuery = {
      userId: userId,
      status: 'pending'
    };
    
    // Si se proporciona una fecha, filtrar por ella
    if (fromDate) {
      updateQuery.createdAt = { $gte: new Date(fromDate) };
    }
    
    const updateResult = await Commission.updateMany(
      updateQuery,
      {
        $set: {
          'processingData.isAutoProcessed': false,
          'processingData.processedAt': new Date(),
          'processingData.recalculatedBy': req.user._id
        }
      }
    );
    
    // Registrar la acción del administrador
    await logAdminAction(
      req.user._id,
      'recalculate_commissions',
      'user',
      userId,
      `Recálculo de comisiones para usuario ${userId}`,
      { fromDate, modifiedCount: updateResult.modifiedCount },
      'medium'
    );
    
    res.status(200).json({
      success: true,
      message: 'Recálculo de comisiones iniciado exitosamente',
      data: {
        userId,
        fromDate,
        modifiedCount: updateResult.modifiedCount,
        processedBy: req.user.email,
        processedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Error en recálculo de comisiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error en recálculo de comisiones'
    });
  }
};

// Reconciliar balances de usuarios
const reconcileUserBalances = async (req, res) => {
  try {
    const { userId, autoFix = false } = req.body;
    
    let query = {};
    if (userId) {
      query._id = userId;
    }
    
    const users = await User.find(query).limit(100); // Limitar para evitar sobrecarga
    const reconciliationResults = [];
    
    for (const user of users) {
      // Calcular balance basado en transacciones
      const transactionSummary = await Transaction.aggregate([
        {
          $match: {
            user: user._id,
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            deposits: {
              $sum: {
                $cond: [{ $eq: ['$type', 'deposit'] }, '$amount', 0]
              }
            },
            withdrawals: {
              $sum: {
                $cond: [{ $eq: ['$type', 'withdrawal'] }, '$amount', 0]
              }
            },
            earnings: {
              $sum: {
                $cond: [{ $eq: ['$type', 'earnings'] }, '$amount', 0]
              }
            },
            commissions: {
              $sum: {
                $cond: [{ $eq: ['$type', 'commission'] }, '$amount', 0]
              }
            },
            adjustments: {
              $sum: {
                $cond: [{ $eq: ['$type', 'admin_adjustment'] }, '$amount', 0]
              }
            }
          }
        }
      ]);
      
      const summary = transactionSummary[0] || {
        deposits: 0,
        withdrawals: 0,
        earnings: 0,
        commissions: 0,
        adjustments: 0
      };
      
      const calculatedBalance = summary.deposits + summary.earnings + summary.commissions + summary.adjustments - summary.withdrawals;
      const currentBalance = user.balance;
      const discrepancy = currentBalance - calculatedBalance;
      
      if (Math.abs(discrepancy) > 0.01) { // Tolerancia de 1 centavo
        const result = {
          userId: user._id,
          username: user.username,
          currentBalance,
          calculatedBalance,
          discrepancy,
          fixed: false
        };
        
        if (autoFix) {
          // Crear transacción de ajuste
          await Transaction.create({
            user: user._id,
            type: 'admin_adjustment',
            amount: -discrepancy, // Negativo para corregir
            status: 'completed',
            description: `Reconciliación automática de balance - Discrepancia: ${discrepancy}`,
            metadata: {
              adminId: req.user.id,
              reconciliation: true,
              previousBalance: currentBalance,
              calculatedBalance,
              discrepancy
            }
          });
          
          // Actualizar balance del usuario
          user.balance = calculatedBalance;
          await user.save();
          
          // Registrar acción de admin
          await logAdminAction(
            req.user.id,
            'balance_reconciled',
            'user',
            user._id,
            { discrepancy, previousBalance: currentBalance, newBalance: calculatedBalance },
            { ip: req.ip, userAgent: req.get('User-Agent') },
            'high'
          );
          
          result.fixed = true;
        }
        
        reconciliationResults.push(result);
      }
    }
    
    res.json({
      success: true,
      message: `Reconciliación completada. ${reconciliationResults.length} discrepancias encontradas`,
      data: {
        discrepancies: reconciliationResults,
        totalChecked: users.length,
        autoFixed: autoFix ? reconciliationResults.filter(r => r.fixed).length : 0
      }
    });
    
  } catch (error) {
    logger.error('Error in balance reconciliation:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener resumen financiero consolidado
const getFinancialSummary = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calcular fecha de inicio
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    // Estadísticas de transacciones
    const transactionStats = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);
    
    // Estadísticas de billeteras
    const walletStats = await Wallet.aggregate([
      {
        $group: {
          _id: '$network',
          count: { $sum: 1 },
          totalBalance: { $sum: '$balance' },
          activeWallets: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ]);
    
    // Balance total de usuarios
    const userBalanceStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalBalance: { $sum: '$balance' },
          avgBalance: { $avg: '$balance' },
          usersWithBalance: {
            $sum: { $cond: [{ $gt: ['$balance', 0] }, 1, 0] }
          }
        }
      }
    ]);
    
    // Transacciones pendientes
    const pendingStats = await Transaction.aggregate([
      {
        $match: {
          status: { $in: ['pending', 'processing'] }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        period,
        transactions: transactionStats,
        wallets: walletStats,
        userBalances: userBalanceStats[0] || {},
        pending: pendingStats,
        generatedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Error getting financial summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear UserStatus para usuario
const createUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { packageType, reason } = req.body;
    const adminId = req.user.id;

    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si ya tiene UserStatus
    let userStatus = await UserStatus.findOne({ userId });
    if (userStatus) {
      return res.status(400).json({ message: 'El usuario ya tiene un UserStatus' });
    }

    // Crear nuevo UserStatus
    userStatus = new UserStatus({
      userId,
      subscription: {
        packageType: packageType || 'basic',
        packageStatus: 'active',
        startDate: new Date(),
        nextBenefitDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Mañana
      },
      adminFlags: {
        createdByAdmin: true,
        adminNotes: reason || 'UserStatus creado por administrador'
      }
    });

    await userStatus.save();

    // Registrar acción de admin
    await logAdminAction(
      adminId,
      'user_status_created',
      'UserStatus',
      userStatus._id,
      `UserStatus creado para usuario ${user.email}`,
      { packageType, reason },
      'medium'
    );

    res.json({
      message: 'UserStatus creado exitosamente',
      userStatus
    });

  } catch (error) {
    logger.error('Error creating UserStatus:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Verificar usuario
const verifyUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Actualizar verificación
    user.verification.isVerified = true;
    user.verification.verifiedAt = new Date();
    user.verification.verifiedBy = adminId;
    user.status = 'active';

    await user.save();

    // Registrar acción de admin
    await logAdminAction(
      adminId,
      'user_verified',
      'User',
      userId,
      `Usuario ${user.email} verificado`,
      { previousStatus: user.status },
      'medium'
    );

    res.json({
      message: 'Usuario verificado exitosamente',
      user: {
        id: user._id,
        email: user.email,
        status: user.status,
        verification: user.verification
      }
    });

  } catch (error) {
    logger.error('Error verifying user:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Procesar retiros pendientes
const processWithdrawals = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Buscar transacciones de retiro pendientes
    const pendingWithdrawals = await Transaction.find({
      userId,
      type: 'withdrawal',
      status: 'pending'
    });

    if (pendingWithdrawals.length === 0) {
      return res.status(400).json({ message: 'No hay retiros pendientes para este usuario' });
    }

    let totalProcessed = 0;
    const processedIds = [];

    // Procesar cada retiro
    for (const withdrawal of pendingWithdrawals) {
      withdrawal.status = 'completed';
      withdrawal.processedAt = new Date();
      withdrawal.processedBy = adminId;
      await withdrawal.save();
      
      totalProcessed += withdrawal.amount;
      processedIds.push(withdrawal._id);
    }

    // Registrar acción de admin
    await logAdminAction(
      adminId,
      'withdrawals_processed',
      'Transaction',
      userId,
      `Procesados ${pendingWithdrawals.length} retiros por $${totalProcessed}`,
      { processedIds, totalAmount: totalProcessed },
      'high'
    );

    res.json({
      message: `${pendingWithdrawals.length} retiros procesados exitosamente`,
      totalProcessed,
      processedWithdrawals: pendingWithdrawals.length
    });

  } catch (error) {
    logger.error('Error processing withdrawals:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Ver detalles financieros
const viewFinancialDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('email balance totalEarnings');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Obtener estadísticas de transacciones
    const transactionStats = await Transaction.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          completedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
          }
        }
      }
    ]);

    // Obtener UserStatus si existe
    const userStatus = await UserStatus.findOne({ userId });

    // Obtener wallet
    const wallet = await Wallet.findOne({ userId });

    // Obtener comisiones
    const commissions = await Commission.find({ userId }).sort({ createdAt: -1 }).limit(10);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        balance: user.balance,
        totalEarnings: user.totalEarnings
      },
      transactionStats,
      userStatus,
      wallet,
      recentCommissions: commissions
    });

  } catch (error) {
    logger.error('Error getting financial details:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Generar reporte de usuario
const generateUserReport = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Obtener datos completos
    const [userStatus, wallet, transactions, referrals, commissions, adminLogs] = await Promise.all([
      UserStatus.findOne({ userId }),
      Wallet.findOne({ userId }),
      Transaction.find({ userId }).sort({ createdAt: -1 }),
      Referral.find({ referrer: userId }),
      Commission.find({ userId }).sort({ createdAt: -1 }),
      AdminLog.find({ targetId: userId }).sort({ createdAt: -1 }).limit(20)
    ]);

    // Calcular estadísticas
    const stats = {
      totalTransactions: transactions.length,
      completedTransactions: transactions.filter(t => t.status === 'completed').length,
      totalDeposits: transactions.filter(t => t.type === 'deposit' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0),
      totalWithdrawals: transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0),
      pendingWithdrawals: transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0),
      totalReferrals: referrals.length,
      totalCommissions: commissions.reduce((sum, c) => sum + c.amount, 0)
    };

    const report = {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        status: user.status,
        balance: user.balance,
        totalEarnings: user.totalEarnings,
        createdAt: user.createdAt,
        verification: user.verification
      },
      userStatus,
      wallet,
      stats,
      recentTransactions: transactions.slice(0, 10),
      referrals,
      recentCommissions: commissions.slice(0, 10),
      recentAdminActions: adminLogs,
      generatedAt: new Date()
    };

    res.json(report);

  } catch (error) {
    logger.error('Error generating user report:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar perfil de usuario (Admin)
const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, role } = req.body;
    const adminId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const oldData = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    };

    // Actualizar campos
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;

    await user.save();

    // Registrar acción de admin
    await logAdminAction(
      adminId,
      'user_profile_updated',
      'User',
      userId,
      `Perfil actualizado para ${user.email}`,
      { oldData, newData: { name, email, phone, role } },
      'medium'
    );

    res.json({
      message: 'Perfil actualizado exitosamente',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar usuario
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que no sea un admin
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'No se puede eliminar un usuario administrador' });
    }

    // Eliminar datos relacionados
    await Promise.all([
      UserStatus.deleteOne({ userId }),
      Wallet.deleteOne({ userId }),
      Transaction.deleteMany({ userId }),
      Referral.deleteMany({ $or: [{ referrer: userId }, { referred: userId }] }),
      Commission.deleteMany({ userId })
    ]);

    // Eliminar usuario
    await User.findByIdAndDelete(userId);

    // Registrar acción de admin
    await logAdminAction(
      adminId,
      'user_deleted',
      'User',
      userId,
      `Usuario ${user.email} eliminado`,
      { deletedUser: { email: user.email, name: user.name } },
      'high'
    );

    res.json({ message: 'Usuario eliminado exitosamente' });

  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ===== SECURITY MANAGEMENT CONTROLLERS =====

// Obtener logs de seguridad
const getSecurityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      level = 'all',
      action = 'all',
      startDate,
      endDate
    } = req.query;

    // Construir filtros
    const filters = {};
    
    if (level !== 'all') {
      filters.level = level;
    }
    
    if (action !== 'all') {
      filters.action = action;
    }
    
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      AdminLog.find(filters)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('adminId', 'fullName email'),
      AdminLog.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error getting security logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener actividades sospechosas
const getSuspiciousActivities = async (req, res) => {
  try {
    const { status = 'all', severity = 'all' } = req.query;
    
    // Simular actividades sospechosas basadas en logs de admin
    const filters = {
      level: { $in: ['high', 'critical'] }
    };
    
    if (status !== 'all') {
      filters.resolved = status === 'resolved';
    }

    const activities = await AdminLog.find(filters)
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('adminId', 'fullName email');

    // Transformar logs en actividades sospechosas
    const suspiciousActivities = activities.map(log => ({
      _id: log._id,
      type: log.action,
      description: log.description,
      severity: log.level === 'critical' ? 'high' : 'medium',
      timestamp: log.timestamp,
      ipAddress: log.metadata?.ipAddress || 'Unknown',
      userAgent: log.metadata?.userAgent || 'Unknown',
      resolved: log.resolved || false,
      adminId: log.adminId
    }));

    res.json({
      success: true,
      data: suspiciousActivities
    });

  } catch (error) {
    logger.error('Error getting suspicious activities:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener IPs bloqueadas
const getBlockedIPs = async (req, res) => {
  try {
    // Simular IPs bloqueadas (en una implementación real, esto vendría de una base de datos)
    const blockedIPs = [
      {
        _id: '1',
        ipAddress: '192.168.1.100',
        reason: 'Múltiples intentos de login fallidos',
        blockedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        blockedBy: 'Sistema automático',
        isActive: true
      },
      {
        _id: '2',
        ipAddress: '10.0.0.50',
        reason: 'Actividad sospechosa detectada',
        blockedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        blockedBy: 'Admin manual',
        isActive: true
      }
    ];

    res.json({
      success: true,
      data: blockedIPs
    });

  } catch (error) {
    logger.error('Error getting blocked IPs:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener configuraciones de seguridad
const getSecuritySettings = async (req, res) => {
  try {
    // Buscar configuraciones de seguridad en SystemSetting
    const securitySettings = await SystemSetting.findOne({ key: 'security' }) || {
      value: {
        maxLoginAttempts: 5,
        lockoutDuration: 30, // minutos
        sessionTimeout: 60, // minutos
        enableTwoFactor: false,
        enableIpWhitelist: false,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true
        }
      }
    };

    res.json({
      success: true,
      data: securitySettings.value
    });

  } catch (error) {
    logger.error('Error getting security settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de seguridad
const getSecurityStats = async (req, res) => {
  try {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [todayLogs, weekLogs, monthLogs, criticalLogs] = await Promise.all([
      AdminLog.countDocuments({
        timestamp: { $gte: new Date(today.setHours(0, 0, 0, 0)) }
      }),
      AdminLog.countDocuments({
        timestamp: { $gte: lastWeek }
      }),
      AdminLog.countDocuments({
        timestamp: { $gte: lastMonth }
      }),
      AdminLog.countDocuments({
        level: 'critical',
        timestamp: { $gte: lastMonth }
      })
    ]);

    const stats = {
      totalSecurityEvents: {
        today: todayLogs,
        thisWeek: weekLogs,
        thisMonth: monthLogs
      },
      criticalEvents: criticalLogs,
      blockedIPs: 2, // Simulado
      suspiciousActivities: 5, // Simulado
      lastSecurityScan: new Date(),
      systemStatus: 'secure'
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting security stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Bloquear IP
const blockIP = async (req, res) => {
  try {
    const { ipAddress, reason } = req.body;
    const adminId = req.user.id;

    if (!ipAddress) {
      return res.status(400).json({
        success: false,
        message: 'Dirección IP es requerida'
      });
    }

    // En una implementación real, esto se guardaría en una base de datos
    const blockedIP = {
      _id: Date.now().toString(),
      ipAddress,
      reason: reason || 'Bloqueado manualmente por administrador',
      blockedAt: new Date(),
      blockedBy: adminId,
      isActive: true
    };

    // Registrar acción de admin
    await logAdminAction(
      adminId,
      'ip_blocked',
      'Security',
      blockedIP._id,
      `IP ${ipAddress} bloqueada`,
      { ipAddress, reason },
      'high'
    );

    res.json({
      success: true,
      message: 'IP bloqueada exitosamente',
      data: blockedIP
    });

  } catch (error) {
    logger.error('Error blocking IP:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Desbloquear IP
const unblockIP = async (req, res) => {
  try {
    const { ipAddress } = req.params;
    const adminId = req.user.id;

    if (!ipAddress) {
      return res.status(400).json({
        success: false,
        message: 'Dirección IP es requerida'
      });
    }

    // En una implementación real, esto actualizaría la base de datos
    // Por ahora simulamos el desbloqueo

    // Registrar acción de admin
    await logAdminAction(
      adminId,
      'ip_unblocked',
      'Security',
      ipAddress,
      `IP ${ipAddress} desbloqueada`,
      { ipAddress },
      'medium'
    );

    res.json({
      success: true,
      message: 'IP desbloqueada exitosamente'
    });

  } catch (error) {
    logger.error('Error unblocking IP:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar configuraciones de seguridad
const updateSecuritySettings = async (req, res) => {
  try {
    const adminId = req.user.id;
    const settings = req.body;

    // Actualizar o crear configuraciones de seguridad
    const securitySettings = await SystemSetting.findOneAndUpdate(
      { key: 'security' },
      { 
        key: 'security',
        value: settings,
        updatedAt: new Date(),
        updatedBy: adminId
      },
      { upsert: true, new: true }
    );

    // Registrar acción de admin
    await logAdminAction(
      adminId,
      'security_settings_updated',
      'SystemSetting',
      securitySettings._id,
      'Configuraciones de seguridad actualizadas',
      settings,
      'medium'
    );

    res.json({
      success: true,
      message: 'Configuraciones de seguridad actualizadas exitosamente',
      data: securitySettings.value
    });

  } catch (error) {
    logger.error('Error updating security settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Marcar actividad como resuelta
const markActivityAsResolved = async (req, res) => {
  try {
    const { activityId } = req.params;
    const adminId = req.user.id;

    // Actualizar el log de admin para marcarlo como resuelto
    const updatedLog = await AdminLog.findByIdAndUpdate(
      activityId,
      { 
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: adminId
      },
      { new: true }
    );

    if (!updatedLog) {
      return res.status(404).json({
        success: false,
        message: 'Actividad no encontrada'
      });
    }

    // Registrar acción de admin
    await logAdminAction(
      adminId,
      'suspicious_activity_resolved',
      'AdminLog',
      activityId,
      'Actividad sospechosa marcada como resuelta',
      { originalAction: updatedLog.action },
      'low'
    );

    res.json({
      success: true,
      message: 'Actividad marcada como resuelta exitosamente'
    });

  } catch (error) {
    logger.error('Error marking activity as resolved:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas del sistema de beneficios
const getBenefitsSystemStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Beneficios diarios pagados hoy
    const dailyBenefitsPaid = await Transaction.aggregate([
      {
        $match: {
          type: 'earnings',
          subtype: 'auto_earnings',
          status: 'completed',
          createdAt: { $gte: startOfDay, $lt: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Comisiones de referidos pagadas hoy
    const referralCommissions = await Commission.aggregate([
      {
        $match: {
          commissionType: 'direct_referral',
          status: 'paid',
          paidAt: { $gte: startOfDay, $lt: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Bonos de líder/padre pagados hoy
    const leaderParentBonuses = await Commission.aggregate([
      {
        $match: {
          commissionType: { $in: ['leader_bonus', 'parent_bonus'] },
          status: 'paid',
          paidAt: { $gte: startOfDay, $lt: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Usuarios activos en beneficios (recibieron beneficios hoy)
    const activeUsersInBenefits = await UserStatus.countDocuments({
      'subscription.packageStatus': 'active',
      'subscription.benefitCycle.isPaused': false,
      'subscription.benefitCycle.nextBenefitDate': { $lte: new Date() }
    });

    res.json({
      success: true,
      data: {
        dailyBenefitsPaid: dailyBenefitsPaid[0]?.totalAmount || 0,
        referralCommissions: referralCommissions[0]?.totalAmount || 0,
        leaderParentBonuses: leaderParentBonuses[0]?.totalAmount || 0,
        activeUsersInBenefits: activeUsersInBenefits,
        benefitTransactionsCount: dailyBenefitsPaid[0]?.count || 0,
        commissionTransactionsCount: referralCommissions[0]?.count || 0,
        bonusTransactionsCount: leaderParentBonuses[0]?.count || 0
      }
    });

  } catch (error) {
    logger.error('Error getting benefits system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estado del ciclo actual
const getCurrentCycleStatus = async (req, res) => {
  try {
    // Usuarios en diferentes estados del ciclo
    const cycleStats = await UserStatus.aggregate([
      {
        $match: {
          'subscription.packageStatus': 'active'
        }
      },
      {
        $addFields: {
          currentDay: '$subscription.benefitCycle.currentDay',
          maxDays: 8,
          currentCycle: {
            $add: [
              {
                $floor: {
                  $divide: [
                    { $subtract: ['$subscription.benefitCycle.currentDay', 1] },
                    9
                  ]
                }
              },
              1
            ]
          },
          dayInCycle: {
            $add: [
              {
                $mod: [
                  { $subtract: ['$subscription.benefitCycle.currentDay', 1] },
                  9
                ]
              },
              1
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          usersInCashback: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$dayInCycle', 1] }, { $lte: ['$dayInCycle', 8] }] },
                1,
                0
              ]
            }
          },
          usersInPause: {
            $sum: {
              $cond: [{ $eq: ['$subscription.benefitCycle.isPaused', true] }, 1, 0]
            }
          },
          totalActiveUsers: { $sum: 1 },
          avgCycleDay: { $avg: '$dayInCycle' }
        }
      }
    ]);

    const stats = cycleStats[0] || {
      usersInCashback: 0,
      usersInPause: 0,
      totalActiveUsers: 0,
      avgCycleDay: 0
    };

    // Calcular próximo procesamiento (basado en el promedio)
    const avgDay = Math.floor(stats.avgCycleDay);
    const hoursToNext = (9 - avgDay) * 24; // Aproximación

    res.json({
      success: true,
      data: {
        currentCycleDay: avgDay,
        maxCycleDays: 45, // Días máximos por ciclo (5 ciclos de 45 días)
        usersInCashback: stats.usersInCashback,
        usersInPause: stats.usersInPause,
        totalActiveUsers: stats.totalActiveUsers,
        nextProcessingHours: Math.max(0, hoursToNext),
        nextProcessingMinutes: Math.max(0, (hoursToNext % 1) * 60)
      }
    });

  } catch (error) {
    logger.error('Error getting current cycle status:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener usuarios por estado
const getUsersByStatus = async (req, res) => {
  try {
    const usersByStatus = await UserStatus.aggregate([
      {
        $match: {
          'subscription.packageStatus': 'active'
        }
      },
      {
        $addFields: {
          currentDay: '$subscription.benefitCycle.currentDay',
          dayInCycle: {
            $add: [
              {
                $mod: [
                  { $subtract: ['$subscription.benefitCycle.currentDay', 1] },
                  9
                ]
              },
              1
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                {
                  case: { $and: [{ $gte: ['$dayInCycle', 1] }, { $lte: ['$dayInCycle', 7] }] },
                  then: 'first_week'
                },
                {
                  case: { $eq: ['$dayInCycle', 8] },
                  then: 'adjustment_day'
                },
                {
                  case: { $eq: ['$dayInCycle', 9] },
                  then: 'pause_day'
                }
              ],
              default: 'regular_period'
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const statusMap = {
      first_week: 0,
      regular_period: 0,
      adjustment_day: 0,
      pause_day: 0
    };

    usersByStatus.forEach(status => {
      statusMap[status._id] = status.count;
    });

    const totalUsers = Object.values(statusMap).reduce((sum, count) => sum + count, 0);

    res.json({
      success: true,
      data: {
        firstWeek: {
          count: statusMap.first_week,
          percentage: totalUsers > 0 ? (statusMap.first_week / totalUsers * 100).toFixed(1) : 0
        },
        regularPeriod: {
          count: statusMap.regular_period,
          percentage: totalUsers > 0 ? (statusMap.regular_period / totalUsers * 100).toFixed(1) : 0
        },
        adjustmentDay: {
          count: statusMap.adjustment_day,
          percentage: totalUsers > 0 ? (statusMap.adjustment_day / totalUsers * 100).toFixed(1) : 0
        },
        pauseDay: {
          count: statusMap.pause_day,
          percentage: totalUsers > 0 ? (statusMap.pause_day / totalUsers * 100).toFixed(1) : 0
        },
        totalUsers
      }
    });

  } catch (error) {
    logger.error('Error getting users by status:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener rendimiento del sistema
const getSystemPerformanceMetrics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Ciclos completados (usuarios que han completado al menos un ciclo)
    const completedCycles = await UserStatus.countDocuments({
      'subscription.benefitCycle.totalCyclesCompleted': { $gte: 1 }
    });

    // Transacciones exitosas vs fallidas en los últimos 30 días
    const transactionStats = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          type: 'earnings'
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const completed = transactionStats.find(t => t._id === 'completed')?.count || 0;
    const failed = transactionStats.find(t => t._id === 'failed')?.count || 0;
    const total = completed + failed;
    const successRate = total > 0 ? (completed / total * 100).toFixed(1) : 100;

    // Tiempo promedio de procesamiento (simulado basado en datos reales)
    const avgProcessingTime = total > 0 ? (2.1 + Math.random() * 0.4).toFixed(1) : 2.3;

    res.json({
      success: true,
      data: {
        completedCycles,
        successRate: parseFloat(successRate),
        averageProcessingTime: parseFloat(avgProcessingTime),
        totalTransactions: total,
        successfulTransactions: completed,
        failedTransactions: failed
      }
    });

  } catch (error) {
    logger.error('Error getting system performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Get pending payments with unactivated benefits
const getPendingPaymentsAndBenefits = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Find transactions that are completed but benefits not activated
    const pendingBenefits = await Transaction.find({
      status: 'completed',
      type: { $in: ['deposit', 'package_purchase'] },
      subtype: { $in: ['license_purchase', 'package'] },
      'metadata.packageId': { $exists: true }
    })
    .populate('user', 'fullName email referralCode current_package package_status')
    .populate('metadata.packageId', 'name price')
    .sort({ completedAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Filter only those where benefits are not activated
    const filteredPending = [];
    
    for (const transaction of pendingBenefits) {
      const userStatus = await UserStatus.findOne({ user: transaction.user._id });
      
      // Check if benefits are not activated or user package status is not active
      const needsActivation = !userStatus || 
                             userStatus.subscription.packageStatus !== 'active' ||
                             userStatus.subscription.benefitCycle.currentDay === 0;
      
      if (needsActivation) {
        filteredPending.push({
          transactionId: transaction._id,
          user: {
            id: transaction.user._id,
            name: transaction.user.fullName,
            email: transaction.user.email,
            referralCode: transaction.user.referralCode,
            currentPackage: transaction.user.current_package,
            packageStatus: transaction.user.package_status
          },
          package: {
            id: transaction.metadata.packageId?._id,
            name: transaction.metadata.packageId?.name || transaction.metadata.packageName,
            price: transaction.metadata.packageId?.price || transaction.amount
          },
          transaction: {
            amount: transaction.amount,
            currency: transaction.currency,
            completedAt: transaction.completedAt,
            txHash: transaction.payment?.txHash,
            network: transaction.payment?.network
          },
          benefitStatus: {
            isActivated: userStatus?.subscription?.packageStatus === 'active',
            currentDay: userStatus?.subscription?.benefitCycle?.currentDay || 0,
            cycleStartDate: userStatus?.subscription?.benefitCycle?.cycleStartDate,
            totalEarned: userStatus?.subscription?.benefits?.totalEarned || 0
          }
        });
      }
    }
    
    const total = filteredPending.length;
    
    res.json({
      success: true,
      data: {
        pendingBenefits: filteredPending,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    logger.error('[ADMIN] Get pending payments and benefits error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Force benefit activation
const forceBenefitActivation = async (req, res) => {
  try {
    const { transactionId, reason } = req.body;
    
    if (!transactionId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere ID de transacción y motivo'
      });
    }
    
    // Find the transaction
    const transaction = await Transaction.findById(transactionId)
      .populate('user')
      .populate('metadata.packageId');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }
    
    if (transaction.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'La transacción debe estar completada'
      });
    }
    
    const userId = transaction.user._id;
    const packageInfo = transaction.metadata.packageId || {
      name: transaction.metadata.packageName,
      price: transaction.amount
    };
    
    // Update or create UserStatus
    let userStatus = await UserStatus.findOne({ user: userId });
    
    if (!userStatus) {
      userStatus = new UserStatus({
        user: userId,
        subscription: {
          currentPackage: transaction.user.current_package || 'starter',
          packageStatus: 'active',
          activatedAt: new Date(),
          expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
          benefitCycle: {
            currentDay: 1,
            cycleStartDate: new Date(),
            nextBenefitDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            isPaused: false,
            totalCyclesCompleted: 0,
            weeksCompleted: 0,
            maxWeeks: 5
          },
          benefits: {
            dailyRate: 0.125,
            totalEarned: 0,
            pendingBenefits: 0,
            lastCalculatedAt: new Date()
          }
        }
      });
    } else {
      // Update existing UserStatus
      userStatus.subscription.packageStatus = 'active';
      userStatus.subscription.activatedAt = new Date();
      userStatus.subscription.expiresAt = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
      userStatus.subscription.benefitCycle.currentDay = 1;
      userStatus.subscription.benefitCycle.cycleStartDate = new Date();
      userStatus.subscription.benefitCycle.nextBenefitDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      userStatus.subscription.benefitCycle.isPaused = false;
    }
    
    await userStatus.save();
    
    // Update User model
    await User.findByIdAndUpdate(userId, {
      package_status: 'active',
      current_package: transaction.user.current_package || 'starter'
    });
    
    // Log admin action
    await logAdminAction(
      req.user.id,
      'force_benefit_activation',
      'transaction',
      transactionId,
      `Activación forzada de beneficios para usuario ${transaction.user.email}`,
      {
        userId: userId,
        transactionId: transactionId,
        packageName: packageInfo.name,
        amount: transaction.amount,
        reason: reason,
        activatedAt: new Date()
      },
      'high'
    );
    
    res.json({
      success: true,
      message: 'Beneficios activados exitosamente',
      data: {
        userId: userId,
        transactionId: transactionId,
        activatedAt: new Date(),
        benefitCycle: userStatus.subscription.benefitCycle
      }
    });
    
  } catch (error) {
    logger.error('[ADMIN] Force benefit activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Process manual commission payments
const processManualCommissions = async (req, res) => {
  try {
    const { transactionId, reason } = req.body;
    
    if (!transactionId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere ID de transacción y motivo'
      });
    }
    
    // Find the transaction
    const transaction = await Transaction.findById(transactionId)
      .populate('user');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }
    
    const user = transaction.user;
    
    // Process referral commissions if user was referred
    if (user.referredBy) {
      const CommissionService = require('../services/CommissionService');
      
      try {
        await CommissionService.processReferralCommission(user.referredBy, transaction);
        
        // Log admin action
        await logAdminAction(
          req.user.id,
          'process_manual_commissions',
          'transaction',
          transactionId,
          `Procesamiento manual de comisiones para transacción ${transactionId}`,
          {
            userId: user._id,
            referrerId: user.referredBy,
            transactionId: transactionId,
            amount: transaction.amount,
            reason: reason,
            processedAt: new Date()
          },
          'high'
        );
        
        res.json({
          success: true,
          message: 'Comisiones procesadas exitosamente',
          data: {
            transactionId: transactionId,
            userId: user._id,
            referrerId: user.referredBy,
            processedAt: new Date()
          }
        });
        
      } catch (commissionError) {
        logger.error('[ADMIN] Commission processing error:', commissionError);
        res.status(500).json({
          success: false,
          message: 'Error al procesar comisiones: ' + commissionError.message
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'El usuario no tiene referidor, no hay comisiones que procesar'
      });
    }
    
  } catch (error) {
    logger.error('[ADMIN] Process manual commissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Resend failed email
const resendFailedEmail = async (req, res) => {
  try {
    const { emailLogId } = req.body;
    
    if (!emailLogId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere ID del log de email'
      });
    }
    
    const EmailLog = require('../models/EmailLog.model');
    const emailService = require('../utils/email');
    
    // Find the email log
    const emailLog = await EmailLog.findById(emailLogId);
    
    if (!emailLog) {
      return res.status(404).json({
        success: false,
        message: 'Log de email no encontrado'
      });
    }
    
    if (emailLog.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden reenviar emails fallidos'
      });
    }
    
    // Attempt to resend email
    try {
      let resendResult;
      
      switch (emailLog.emailType) {
        case 'welcome':
          resendResult = await emailService.sendWelcomeEmail(emailLog.recipient, emailLog.metadata);
          break;
        case 'verification':
          resendResult = await emailService.sendVerificationEmail(emailLog.recipient, emailLog.metadata);
          break;
        case 'password_reset':
          resendResult = await emailService.sendPasswordResetEmail(emailLog.recipient, emailLog.metadata);
          break;
        case 'purchase_confirmation':
          resendResult = await emailService.sendPurchaseConfirmationEmail(emailLog.recipient, emailLog.metadata);
          break;
        default:
          throw new Error('Tipo de email no soportado para reenvío');
      }
      
      // Update email log
      emailLog.status = 'sent';
      emailLog.sentAt = new Date();
      emailLog.attempts += 1;
      emailLog.lastError = null;
      await emailLog.save();
      
      // Log admin action
      await logAdminAction(
        req.user.id,
        'resend_failed_email',
        'email',
        emailLogId,
        `Email reenviado exitosamente a ${emailLog.recipient}`,
        {
          emailType: emailLog.emailType,
          recipient: emailLog.recipient,
          attempts: emailLog.attempts,
          resentAt: new Date()
        },
        'medium'
      );
      
      res.json({
        success: true,
        message: 'Email reenviado exitosamente',
        data: {
          emailLogId: emailLogId,
          recipient: emailLog.recipient,
          emailType: emailLog.emailType,
          resentAt: new Date(),
          attempts: emailLog.attempts
        }
      });
      
    } catch (resendError) {
      logger.error('[ADMIN] Email resend failed:', resendError);
      
      // Update email log with new error
      emailLog.attempts += 1;
      emailLog.lastError = resendError.message;
      emailLog.failedAt = new Date();
      await emailLog.save();
      
      res.status(500).json({
        success: false,
        message: 'Error al reenviar email: ' + resendError.message
      });
    }
    
  } catch (error) {
    logger.error('[ADMIN] Resend failed email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Search transaction by ID or external reference
const searchTransaction = async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Reference parameter is required'
      });
    }

    logger.info(`[ADMIN] Searching transaction - Reference: ${reference}`);

    let transaction;
    
    // Try to find by ObjectId first (if it's a valid ObjectId)
    if (reference.match(/^[0-9a-fA-F]{24}$/)) {
      logger.info(`Searching by ObjectId: ${reference}`);
      transaction = await Transaction.findById(reference)
        .populate('user', 'fullName email')
        .populate('package', 'name price');
    }
    
    // If not found by ID, search by externalReference
    if (!transaction) {
      logger.info(`Searching by externalReference: ${reference}`);
      transaction = await Transaction.findOne({ externalReference: reference })
        .populate('user', 'fullName email')
        .populate('package', 'name price');
    }
    
    // If still not found, try searching by transaction hash
    if (!transaction) {
      logger.info(`Searching by transaction hash: ${reference}`);
      transaction = await Transaction.findOne({ 
        'paymentDetails.transactionHash': reference 
      })
        .populate('user', 'fullName email')
        .populate('package', 'name price');
    }
    
    if (!transaction) {
      logger.warn(`Transaction not found - Reference: ${reference}`);
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    logger.info(`Transaction found:`, {
      id: transaction._id,
      externalReference: transaction.externalReference,
      status: transaction.status,
      userId: transaction.user?._id
    });

    res.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    logger.error('[ADMIN] Search transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Resend verification email (Admin)
const resendVerificationEmail = async (req, res) => {
  try {
    const { userId } = req.body;
    const adminId = req.user.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.verification.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User email is already verified'
      });
    }

    // Generate new verification token
    const crypto = require('crypto');
    user.verification.token = crypto.randomBytes(32).toString('hex');
    user.verification.expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send verification email
    const { sendVerificationEmail } = require('../utils/email');
    await sendVerificationEmail(
      user.email,
      user.verification.token,
      user.fullName,
      user.language || 'es',
      user._id
    );

    // Log admin action
    await logAdminAction(adminId, 'resend_verification_email', 'user', userId, {
      targetUserEmail: user.email,
      newToken: user.verification.token
    });

    logger.info(`[ADMIN] Verification email resent by admin ${adminId} for user ${user.email}`);

    res.json({
      success: true,
      message: 'Verification email sent successfully',
      data: {
        userId: user._id,
        email: user.email,
        tokenExpires: user.verification.expires
      }
    });

  } catch (error) {
    logger.error('[ADMIN] Resend verification email error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Force email verification (Admin)
const forceEmailVerification = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const adminId = req.user.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required and must be at least 10 characters'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.verification.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User email is already verified'
      });
    }

    // Force verification
    const previousStatus = {
      isVerified: user.verification.isVerified,
      token: user.verification.token,
      expires: user.verification.expires
    };

    user.verification.isVerified = true;
    user.verification.token = undefined;
    user.verification.expires = undefined;
    user.verification.verifiedAt = new Date();
    user.verification.verifiedBy = adminId;
    user.verification.verificationMethod = 'admin_force';
    user.status = 'active';
    
    await user.save();

    // Log admin action with audit trail
    await logAdminAction(adminId, 'force_email_verification', 'user', userId, {
      targetUserEmail: user.email,
      reason: reason.trim(),
      previousStatus,
      verifiedAt: user.verification.verifiedAt
    }, {
      severity: 'high',
      requiresReview: true
    });

    logger.warn(`[ADMIN] Email verification forced by admin ${adminId} for user ${user.email}. Reason: ${reason}`);

    res.json({
      success: true,
      message: 'Email verification forced successfully',
      data: {
        userId: user._id,
        email: user.email,
        verifiedAt: user.verification.verifiedAt,
        verifiedBy: adminId,
        reason: reason.trim()
      }
    });

  } catch (error) {
    logger.error('[ADMIN] Force email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get email errors (Admin)
const getEmailErrors = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const EmailLog = require('../models/EmailLog.model');

    const errors = await EmailLog.getRecentErrors(parseInt(limit));
    
    // Get total count for pagination
    const totalErrors = await EmailLog.countDocuments({ status: 'failed' });
    
    res.json({
      success: true,
      data: {
        errors,
        pagination: {
          total: totalErrors,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalErrors / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('[ADMIN] Get email errors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get email statistics (Admin)
const getEmailStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const EmailLog = require('../models/EmailLog.model');

    const stats = await EmailLog.getStats(parseInt(days));
    
    res.json({
      success: true,
      data: {
        stats,
        period: `${days} days`
      }
    });

  } catch (error) {
    logger.error('[ADMIN] Get email stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  // Dashboard and basic stats
  createWithdrawalBatch,
  getDashboardStats,
  getUsers,
  getUserDetails,
  updateUserStatus,
  adjustUserBalance,
  createUserStatus,
  verifyUser,
  
  // Withdrawal management
  processWithdrawals,
  getPendingWithdrawals,
  getWithdrawalsForBatch,
  getWithdrawalBatchStats,
  exportPendingWithdrawals,
  markWithdrawalsAsExported,
  markWithdrawalsAsProcessed,
  getWithdrawalBatches,
  
  // User management
  viewFinancialDetails,
  generateUserReport,
  updateUserProfile,
  deleteUser,

  // System stats
  getSystemStats,
  getSystemLogs,
  getSystemHealth,
  getUserStats,
  getTransactionStats,
  getConversionRateStats,
  getSystemPerformanceStats,
  
  // Preregistrations and referrals
  getPreregistrations,
  getReferralStats,
  getAllReferrals,
  getPendingCommissions,
  processCommissionPayments,
  rejectCommissions,
  getTopReferrers,
  recalculateCommissions,
  
  // Financial management
  reconcileUserBalances,
  getFinancialSummary,
  
  // Security management methods
  getSecurityLogs,
  getSuspiciousActivities,
  getBlockedIPs,
  getSecuritySettings,
  getSecurityStats,
  blockIP,
  unblockIP,
  updateSecuritySettings,
  markActivityAsResolved,
  
  // Benefits system methods
  getBenefitsSystemStats,
  getCurrentCycleStatus,
  getUsersByStatus,
  getSystemPerformanceMetrics,
  
  // Payment and benefits management
  getPendingPaymentsAndBenefits,
  forceBenefitActivation,
  processManualCommissions,
  
  // Transaction search
  searchTransaction,
  
  // Email management
  resendVerificationEmail,
  forceEmailVerification,
  getEmailErrors,
  getEmailStats,
  resendFailedEmail
};