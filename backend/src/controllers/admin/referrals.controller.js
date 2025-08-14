const User = require('../../models/User');
const Commission = require('../../models/Commission.model');
const AdminLoggerService = require('../../services/admin/adminLogger.service');
const AdminValidationService = require('../../services/admin/validation.service');
const AdminUtilsService = require('../../services/admin/utils.service');

/**
 * Controlador para gestión de referidos
 * Maneja todas las operaciones relacionadas con el sistema de referidos
 */

// Obtener lista de referidos
const getReferrals = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      referrerId
    } = req.query;

    const query = {
      referredBy: { $exists: true, $ne: null }
    };

    // Filtros
    if (referrerId) {
      query.referredBy = referrerId;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        {
          path: 'referredBy',
          select: 'username email firstName lastName'
        }
      ]
    };

    const result = await User.paginate(query, options);

    res.json({
      success: true,
      data: result.docs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        itemsPerPage: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    });

  } catch (error) {
    console.error('Error obteniendo referidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener detalles de un referido específico
const getReferralDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!AdminValidationService.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de referido inválido'
      });
    }

    const referral = await User.findById(id)
      .populate('referredBy', 'username email firstName lastName')
      .populate('referrals', 'username email firstName lastName createdAt status');

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referido no encontrado'
      });
    }

    // Obtener comisiones generadas por este referido
    const commissions = await Commission.find({
      $or: [
        { fromUser: id },
        { toUser: id }
      ]
    }).populate('fromUser toUser', 'username email');

    res.json({
      success: true,
      data: {
        referral,
        commissions,
        stats: {
          totalReferrals: referral.referrals?.length || 0,
          totalCommissions: commissions.length,
          totalCommissionAmount: commissions.reduce((sum, c) => sum + c.amount, 0)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo detalles del referido:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener árbol de referidos
const getReferralTree = async (req, res) => {
  try {
    const { userId, depth = 3 } = req.query;

    if (!userId || !AdminValidationService.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido'
      });
    }

    const maxDepth = Math.min(parseInt(depth), 5); // Limitar profundidad

    const buildReferralTree = async (parentId, currentDepth = 0) => {
      if (currentDepth >= maxDepth) return [];

      const referrals = await User.find({ referredBy: parentId })
        .select('username email firstName lastName createdAt status')
        .lean();

      const tree = [];
      for (const referral of referrals) {
        const children = await buildReferralTree(referral._id, currentDepth + 1);
        tree.push({
          ...referral,
          children,
          level: currentDepth + 1
        });
      }

      return tree;
    };

    const rootUser = await User.findById(userId)
      .select('username email firstName lastName createdAt status')
      .lean();

    if (!rootUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const tree = await buildReferralTree(userId);

    res.json({
      success: true,
      data: {
        root: rootUser,
        tree,
        metadata: {
          maxDepth,
          totalNodes: AdminUtilsService.countTreeNodes(tree)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo árbol de referidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener comisiones de referidos
const getReferralCommissions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId,
      status,
      type,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filtros
    if (userId) {
      if (!AdminValidationService.isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de usuario inválido'
        });
      }
      query.$or = [
        { fromUser: userId },
        { toUser: userId }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        {
          path: 'fromUser',
          select: 'username email firstName lastName'
        },
        {
          path: 'toUser',
          select: 'username email firstName lastName'
        }
      ]
    };

    const result = await Commission.paginate(query, options);

    // Calcular totales
    const totals = await Commission.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: 1 },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: result.docs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        itemsPerPage: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      },
      summary: totals[0] || {
        totalAmount: 0,
        totalCount: 0,
        paidAmount: 0,
        pendingAmount: 0
      }
    });

  } catch (error) {
    console.error('Error obteniendo comisiones de referidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Procesar comisiones pendientes
const processReferralCommissions = async (req, res) => {
  try {
    const { commissionIds, action } = req.body;

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs de comisiones requeridos'
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Acción inválida. Debe ser approve o reject'
      });
    }

    // Validar IDs
    for (const id of commissionIds) {
      if (!AdminValidationService.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: `ID de comisión inválido: ${id}`
        });
      }
    }

    const newStatus = action === 'approve' ? 'paid' : 'rejected';
    const updateData = {
      status: newStatus,
      processedAt: new Date(),
      processedBy: req.admin.id
    };

    const result = await Commission.updateMany(
      {
        _id: { $in: commissionIds },
        status: 'pending'
      },
      updateData
    );

    // Log de la acción
    await AdminLoggerService.logAdminAction(
      req.admin.id,
      'COMMISSION_PROCESS',
      {
        action,
        commissionIds,
        modifiedCount: result.modifiedCount
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} comisiones ${action === 'approve' ? 'aprobadas' : 'rechazadas'} exitosamente`,
      data: {
        modifiedCount: result.modifiedCount,
        action,
        newStatus
      }
    });

  } catch (error) {
    console.error('Error procesando comisiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar configuración de referidos
const updateReferralSettings = async (req, res) => {
  try {
    const {
      commissionRate,
      maxLevels,
      minWithdrawal,
      autoApprove,
      levelRates
    } = req.body;

    const validationErrors = [];

    if (commissionRate !== undefined) {
      if (!AdminValidationService.isValidPercentage(commissionRate)) {
        validationErrors.push('Tasa de comisión debe estar entre 0 y 100');
      }
    }

    if (maxLevels !== undefined) {
      if (!Number.isInteger(maxLevels) || maxLevels < 1 || maxLevels > 10) {
        validationErrors.push('Niveles máximos debe ser un entero entre 1 y 10');
      }
    }

    if (minWithdrawal !== undefined) {
      if (!AdminValidationService.isValidAmount(minWithdrawal)) {
        validationErrors.push('Retiro mínimo debe ser un número positivo');
      }
    }

    if (levelRates !== undefined) {
      if (!Array.isArray(levelRates)) {
        validationErrors.push('Tasas por nivel debe ser un array');
      } else {
        levelRates.forEach((rate, index) => {
          if (!AdminValidationService.isValidPercentage(rate)) {
            validationErrors.push(`Tasa del nivel ${index + 1} debe estar entre 0 y 100`);
          }
        });
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: validationErrors
      });
    }

    // Aquí normalmente actualizarías la configuración en la base de datos
    // Por ahora simulamos la actualización
    const updatedSettings = {
      commissionRate,
      maxLevels,
      minWithdrawal,
      autoApprove,
      levelRates,
      updatedAt: new Date(),
      updatedBy: req.admin.id
    };

    // Log de la acción
    await AdminLoggerService.logAdminAction(
      req.admin.id,
      'REFERRAL_SETTINGS_UPDATE',
      updatedSettings
    );

    res.json({
      success: true,
      message: 'Configuración de referidos actualizada exitosamente',
      data: updatedSettings
    });

  } catch (error) {
    console.error('Error actualizando configuración de referidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener configuración actual de referidos
const getReferralSettings = async (req, res) => {
  try {
    // Aquí normalmente obtendrías la configuración de la base de datos
    // Por ahora devolvemos configuración por defecto
    const settings = {
      commissionRate: 10,
      maxLevels: 3,
      minWithdrawal: 50,
      autoApprove: false,
      levelRates: [10, 5, 2],
      lastUpdated: new Date(),
      updatedBy: null
    };

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Error obteniendo configuración de referidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Exportar reporte de referidos
const exportReferralReport = async (req, res) => {
  try {
    const {
      format = 'csv',
      startDate,
      endDate,
      userId,
      includeCommissions = true
    } = req.query;

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Formato no soportado. Use csv o json'
      });
    }

    const query = {
      referredBy: { $exists: true, $ne: null }
    };

    if (userId) {
      if (!AdminValidationService.isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de usuario inválido'
        });
      }
      query.referredBy = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const referrals = await User.find(query)
      .populate('referredBy', 'username email')
      .select('username email firstName lastName createdAt status')
      .lean();

    let reportData = referrals;

    if (includeCommissions === 'true') {
      // Agregar información de comisiones
      for (const referral of reportData) {
        const commissions = await Commission.find({
          $or: [
            { fromUser: referral._id },
            { toUser: referral._id }
          ]
        }).lean();

        referral.commissions = {
          total: commissions.length,
          totalAmount: commissions.reduce((sum, c) => sum + c.amount, 0),
          paid: commissions.filter(c => c.status === 'paid').length,
          pending: commissions.filter(c => c.status === 'pending').length
        };
      }
    }

    // Log de la acción
    await AdminLoggerService.logAdminAction(
      req.admin.id,
      'REFERRAL_REPORT_EXPORT',
      {
        format,
        recordCount: reportData.length,
        filters: { startDate, endDate, userId, includeCommissions }
      }
    );

    if (format === 'csv') {
      const csv = AdminUtilsService.convertToCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=referrals-${Date.now()}.csv`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=referrals-${Date.now()}.json`);
      res.json({
        success: true,
        data: reportData,
        metadata: {
          exportDate: new Date(),
          recordCount: reportData.length,
          filters: { startDate, endDate, userId, includeCommissions }
        }
      });
    }

  } catch (error) {
    console.error('Error exportando reporte de referidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getReferrals,
  getReferralDetails,
  getReferralTree,
  getReferralCommissions,
  processReferralCommissions,
  updateReferralSettings,
  getReferralSettings,
  exportReferralReport
};