const Wallet = require('../models/Wallet.model');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

// Obtener todas las billeteras con paginación y filtros (Admin)
exports.getAllWallets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      network,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros
    const filters = {};
    if (status) filters.status = status;
    if (network) filters.network = network;
    if (search) {
      filters.$or = [
        { address: { $regex: search, $options: 'i' } },
        { label: { $regex: search, $options: 'i' } }
      ];
    }

    // Configurar paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Obtener billeteras
    const wallets = await Wallet.find(filters)
      .populate([
        { path: 'addedBy', select: 'username email' },
        { path: 'lastModifiedBy', select: 'username email' }
      ])
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Contar total
    const total = await Wallet.countDocuments(filters);

    res.json({
      success: true,
      data: {
        wallets,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo billeteras:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nueva billetera (Admin)
exports.createWallet = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { address, network, privateKey, label, priority } = req.body;

    // Verificar si la billetera ya existe
    const existingWallet = await Wallet.findOne({ address });
    if (existingWallet) {
      return res.status(400).json({
        success: false,
        message: 'La billetera ya existe'
      });
    }

    // Crear nueva billetera
    const wallet = new Wallet({
      address,
      network,
      privateKey,
      label,
      priority: priority || 1,
      addedBy: req.user.id,
      status: 'active'
    });

    await wallet.save();

    logger.info(`Nueva billetera creada: ${address} por ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Billetera creada exitosamente',
      data: {
        id: wallet._id,
        address: wallet.address,
        network: wallet.network,
        status: wallet.status
      }
    });

  } catch (error) {
    logger.error('Error creando billetera:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de billeteras (Admin) - VERSIÓN CORREGIDA
exports.getWalletStats = async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas de wallets...');
    
    const stats = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          inactive: {
            $sum: {
              $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0]
            }
          },
          inUse: {
            $sum: {
              $cond: ['$isUsed', 1, 0]
            }
          },
          totalBalance: { $sum: '$balance' },
          totalReceived: { $sum: '$totalReceived' },
          totalTransactions: { $sum: '$transactionCount' }
        }
      }
    ]);

    const networkStats = await Wallet.aggregate([
      {
        $group: {
          _id: '$network',
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          totalBalance: { $sum: '$balance' }
        }
      }
    ]);

    // Estructura de respuesta que coincide con el frontend
    const responseData = {
      totalWallets: stats[0]?.total || 0,
      activeWallets: stats[0]?.active || 0,
      inactiveWallets: stats[0]?.inactive || 0,
      totalBalance: stats[0]?.totalBalance || 0,
      totalReceived: stats[0]?.totalReceived || 0,
      totalTransactions: stats[0]?.totalTransactions || 0,
      networks: networkStats
    };

    console.log('📊 Wallet stats response:', JSON.stringify(responseData, null, 2));

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas de billeteras:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener billetera disponible para pagos
exports.getAvailableWallet = async (req, res) => {
  try {
    const { network = 'BEP20' } = req.query;

    const wallet = await Wallet.getAvailableWallet(network);

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'No hay billeteras disponibles en este momento'
      });
    }

    res.json({
      success: true,
      data: {
        address: wallet.address,
        network: wallet.network,
        currency: wallet.currency
      }
    });

  } catch (error) {
    logger.error('Error obteniendo billetera disponible:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar balance de billetera (Admin)
exports.updateWalletBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { newBalance, reason } = req.body;

    if (newBalance === undefined || newBalance < 0) {
      return res.status(400).json({
        success: false,
        message: 'Balance inválido'
      });
    }

    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Billetera no encontrada'
      });
    }

    const oldBalance = wallet.balance;
    wallet.balance = newBalance;
    wallet.lastModifiedBy = req.user.id;
    wallet.lastModified = new Date();

    await wallet.save();

    logger.info(`Balance actualizado: ${wallet.address} de ${oldBalance} a ${newBalance} por ${req.user.username}. Razón: ${reason || 'No especificada'}`);

    res.json({
      success: true,
      message: 'Balance actualizado exitosamente',
      data: {
        oldBalance,
        newBalance,
        wallet: {
          id: wallet._id,
          address: wallet.address,
          balance: wallet.balance
        }
      }
    });

  } catch (error) {
    logger.error('Error actualizando balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Liberar billetera (Admin)
exports.releaseWallet = async (req, res) => {
  try {
    const { id } = req.params;

    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Billetera no encontrada'
      });
    }

    await wallet.release();

    logger.info(`Billetera liberada: ${wallet.address} por ${req.user.username}`);

    res.json({
      success: true,
      message: 'Billetera liberada exitosamente'
    });

  } catch (error) {
    logger.error('Error liberando billetera:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar billetera (Admin)
exports.deleteWallet = async (req, res) => {
  try {
    const { id } = req.params;

    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Billetera no encontrada'
      });
    }

    // Verificar si la billetera está en uso
    if (wallet.isUsed) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una billetera en uso'
      });
    }

    await Wallet.findByIdAndDelete(id);

    logger.info(`Billetera eliminada: ${wallet.address} por ${req.user.username}`);

    res.json({
      success: true,
      message: 'Billetera eliminada exitosamente'
    });

  } catch (error) {
    logger.error('Error eliminando billetera:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener billetera por ID (Admin)
exports.getWalletById = async (req, res) => {
  try {
    const { id } = req.params;

    const wallet = await Wallet.findById(id).populate([
      { path: 'addedBy', select: 'username email' },
      { path: 'lastModifiedBy', select: 'username email' }
    ]);

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Billetera no encontrada'
      });
    }

    res.json({
      success: true,
      data: wallet
    });

  } catch (error) {
    logger.error('Error obteniendo billetera:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};