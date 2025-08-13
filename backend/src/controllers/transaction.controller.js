const Transaction = require('../models/Transaction.model');
const bep20Service = require('../services/bep20.service');
const logger = require('../utils/logger');

/**
 * Obtiene todas las transacciones con filtros y paginación
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      network,
      userId,
      startDate,
      endDate,
      search
    } = req.query;

    // Construir filtros
    const filters = {};

    if (status && status !== 'all') {
      filters.status = status;
    }

    if (type && type !== 'all') {
      filters.type = type;
    }

    if (network && network !== 'all') {
      filters['paymentDetails.network'] = network;
    }

    if (userId) {
      filters.user = userId;
    }

    // Filtros de fecha
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) {
        filters.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filters.createdAt.$lte = new Date(endDate);
      }
    }

    // Búsqueda por texto
    if (search) {
      filters.$or = [
        { 'paymentDetails.txHash': { $regex: search, $options: 'i' } },
        { 'paymentDetails.address': { $regex: search, $options: 'i' } }
      ];
    }

    // Calcular paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener transacciones
    const transactions = await Transaction.find(filters)
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Contar total de transacciones
    const total = await Transaction.countDocuments(filters);

    // Calcular estadísticas
    const stats = await Transaction.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          completedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          },
          failedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'failed'] }, '$amount', 0]
            }
          },
          completedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          failedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const summary = stats[0] || {
      totalAmount: 0,
      completedAmount: 0,
      pendingAmount: 0,
      failedAmount: 0,
      completedCount: 0,
      pendingCount: 0,
      failedCount: 0
    };

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        summary
      }
    });
  } catch (error) {
    logger.error('Error al obtener transacciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Inicia el monitoreo de transacciones BEP20 pendientes
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.monitorBEP20Transactions = async (req, res) => {
  try {
    logger.info('Iniciando monitoreo de transacciones BEP20 pendientes');
    
    // Obtener transacciones pendientes de BEP20
    const pendingTransactions = await Transaction.find({
      status: 'pending',
      'paymentDetails.network': 'BEP20',
      'paymentDetails.txHash': { $exists: true, $ne: null },
      expiresAt: { $gt: new Date() }
    });

    logger.info(`Encontradas ${pendingTransactions.length} transacciones BEP20 pendientes`);

    // Iniciar el proceso de monitoreo en segundo plano
    bep20Service.monitorPendingTransactions();

    res.json({
      success: true,
      message: 'Monitoreo de transacciones BEP20 iniciado correctamente',
      data: {
        pendingTransactionsCount: pendingTransactions.length
      }
    });
  } catch (error) {
    logger.error('Error al iniciar monitoreo de transacciones BEP20:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar monitoreo de transacciones BEP20'
    });
  }
};

/**
 * Verifica forzadamente una transacción específica
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.forceVerifyTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    logger.info(`Verificando forzadamente transacción: ${transactionId}`);
    
    // Buscar la transacción
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }
    
    // Verificar que sea una transacción BEP20
    if (transaction.paymentDetails?.network !== 'BEP20') {
      return res.status(400).json({
        success: false,
        message: 'La transacción no es de tipo BEP20'
      });
    }
    
    // Verificar que tenga un hash de transacción
    if (!transaction.paymentDetails?.txHash) {
      return res.status(400).json({
        success: false,
        message: 'La transacción no tiene un hash asociado'
      });
    }
    
    // Procesar la transacción
    await bep20Service.processTransaction(transaction);
    
    // Obtener la transacción actualizada
    const updatedTransaction = await Transaction.findById(transactionId);
    
    res.json({
      success: true,
      message: 'Verificación forzada completada',
      data: {
        transaction: {
          id: updatedTransaction._id,
          status: updatedTransaction.status,
          amount: updatedTransaction.amount,
          confirmations: updatedTransaction.confirmations,
          txHash: updatedTransaction.paymentDetails?.txHash,
          updatedAt: updatedTransaction.updatedAt
        }
      }
    });
  } catch (error) {
    logger.error('Error al verificar forzadamente transacción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar forzadamente la transacción'
    });
  }
};

/**
 * Crear nueva transacción desde el panel de administración
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.createTransaction = async (req, res) => {
  try {
    const {
      userId,
      type,
      amount,
      description,
      method = 'manual',
      status = 'completed'
    } = req.body;

    // Validaciones básicas
    if (!userId || !type || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Usuario, tipo y monto son requeridos'
      });
    }

    // Verificar que el usuario existe
    const User = require('../models/User.model');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Crear la transacción
    const transactionData = {
      user: userId,
      type,
      amount: parseFloat(amount),
      description: description || `${type} manual creado por administrador`,
      status,
      paymentDetails: {
        method,
        network: 'manual',
        processedBy: req.user._id
      },
      metadata: {
        createdByAdmin: true,
        adminId: req.user._id,
        adminUsername: req.user.username
      }
    };

    const transaction = new Transaction(transactionData);
    await transaction.save();

    // Poblar los datos del usuario para la respuesta
    await transaction.populate('user', 'username email');

    // Si es un depósito completado, actualizar el balance del usuario
    if (type === 'deposit' && status === 'completed') {
      user.balance += parseFloat(amount);
      await user.save();
    }

    // Log de la acción administrativa
    logger.info(`Admin ${req.user.username} created transaction`, {
      transactionId: transaction._id,
      userId,
      type,
      amount,
      adminId: req.user._id
    });

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transacción creada correctamente'
    });

  } catch (error) {
     logger.error('Error creating transaction from admin:', error);
     res.status(500).json({
       success: false,
       message: 'Error interno del servidor'
     });
   }
 };