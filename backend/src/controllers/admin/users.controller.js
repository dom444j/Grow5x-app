const mongoose = require('mongoose');
const User = require('../../models/User');
const UserStatus = require('../../models/UserStatus');
const Wallet = require('../../models/Wallet.model');
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

// Obtener lista de usuarios
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      role = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      packageStatus = '',
      isActive = '',
      hasPackage = '',
      country = '',
      dateFrom = '',
      dateTo = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const filters = {};

    if (search) {
      filters.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { referralCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) filters.status = status;
    if (role) filters.role = role;
    if (packageStatus) filters.package_status = packageStatus;
    if (country) filters.country = country;

    if (isActive !== '') {
      filters.isActive = isActive === 'true';
    }

    if (hasPackage !== '') {
      if (hasPackage === 'true') {
        filters.current_package = { $exists: true, $ne: null };
      } else {
        filters.$or = [
          { current_package: { $exists: false } },
          { current_package: null }
        ];
      }
    }

    // Filtros de fecha
    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);
    }

    // Configurar ordenamiento
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Ejecutar consulta
    const users = await User.find(filters)
      .select('-password -resetPassword -sessions -securityLog')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalUsers = await User.countDocuments(filters);
    const totalPages = Math.ceil(totalUsers / limitNum);

    // Estadísticas adicionales
    const stats = await User.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$balances.available' },
          activeUsers: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          usersWithPackages: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$current_package', null] },
                    { $ne: ['$current_package', ''] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    await logAdminAction(
      req.user.id,
      'view_users',
      'user_list',
      null,
      `Viewed users list - Page ${page}, Filters: ${JSON.stringify(filters)}`,
      { page, limit, filters, totalUsers },
      'low'
    );

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalUsers,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        },
        stats: stats[0] || {
          totalBalance: 0,
          activeUsers: 0,
          usersWithPackages: 0
        }
      }
    });

  } catch (error) {
    logger.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener detalles de un usuario específico
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    const user = await User.findById(userId)
      .select('-password -resetPassword')
      .populate('referredBy', 'fullName email referralCode')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Obtener información adicional
    const [referrals, userStatus, wallet] = await Promise.all([
      User.find({ referredBy: userId }).select('fullName email status createdAt').lean(),
      UserStatus.findOne({ userId }).lean(),
      Wallet.findOne({ userId }).lean()
    ]);

    await logAdminAction(
      req.user.id,
      'view_user_details',
      'user',
      userId,
      `Viewed details for user: ${user.email}`,
      { userEmail: user.email, userName: user.fullName },
      'low'
    );

    res.json({
      success: true,
      data: {
        user,
        referrals,
        userStatus,
        wallet,
        referralCount: referrals.length
      }
    });

  } catch (error) {
    logger.error('Error getting user details:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const previousStatus = user.status;
    user.status = status;
    user.updatedAt = new Date();

    if (status === 'suspended' || status === 'banned') {
      user.adminFlags = user.adminFlags || {};
      user.adminFlags.suspendedAt = new Date();
      user.adminFlags.suspendedBy = req.user.id;
      user.adminFlags.suspensionReason = reason;
    }

    await user.save();

    await logAdminAction(
      req.user.id,
      'update_user_status',
      'user',
      userId,
      `Changed user status from ${previousStatus} to ${status}. Reason: ${reason || 'No reason provided'}`,
      {
        userEmail: user.email,
        previousStatus,
        newStatus: status,
        reason
      },
      'high'
    );

    res.json({
      success: true,
      message: 'Estado de usuario actualizado exitosamente',
      data: {
        userId,
        previousStatus,
        newStatus: status,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    logger.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Ajustar balance de usuario
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
    const { amount, type, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const previousBalance = user.balances.available;
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

    user.balances.available = newBalance;
    user.updatedAt = new Date();
    await user.save();

    await logAdminAction(
      req.user.id,
      'adjust_user_balance',
      'user',
      userId,
      `Adjusted balance from ${previousBalance} to ${newBalance} (${type}: ${amount}). Reason: ${reason}`,
      {
        userEmail: user.email,
        previousBalance,
        newBalance,
        adjustmentType: type,
        adjustmentAmount: amount,
        reason
      },
      'high'
    );

    res.json({
      success: true,
      message: 'Balance de usuario ajustado exitosamente',
      data: {
        userId,
        previousBalance,
        newBalance,
        adjustmentType: type,
        adjustmentAmount: amount,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    logger.error('Error adjusting user balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getUsers,
  getUserDetails,
  updateUserStatus,
  adjustUserBalance
};