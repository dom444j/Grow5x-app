const Wallet = require('../models/Wallet.model');
const logger = require('../utils/logger');
const bep20Service = require('../services/bep20.service');

// Obtener todas las billeteras (Admin)
exports.getAllWallets = async (req, res) => {
  try {
    const { page = 1, limit = 20, network, status, search } = req.query;
    
    // Construir filtros
    const filters = {};
    if (network) filters.network = network;
    if (status) filters.status = status;
    if (search) {
      filters.$or = [
        { address: { $regex: search, $options: 'i' } },
        { label: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
      // Removemos populate para evitar errores con usuarios mock
    };

    const wallets = await Wallet.paginate(filters, options);

    res.json({
      success: true,
      data: wallets
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
    logger.info('Creando nueva billetera:', req.body);
    
    const {
      address,
      network = 'BEP20',
      currency = 'USDT',
      label,
      description,
      priority,
      isActive,
      isPaymentWallet,
      distributionMethod
    } = req.body;

    // Validar campos requeridos
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'La dirección es requerida'
      });
    }

    // Validar dirección BEP20
    if (!bep20Service.isValidAddress(address)) {
      logger.warn(`Dirección BEP20 inválida: ${address}`);
      return res.status(400).json({
        success: false,
        message: 'Dirección BEP20 inválida'
      });
    }

    // Verificar si la dirección ya existe
    const existingWallet = await Wallet.findOne({ address });
    if (existingWallet) {
      return res.status(400).json({
        success: false,
        message: 'Esta dirección ya está registrada'
      });
    }

    // Crear nueva billetera
    const wallet = new Wallet({
      address,
      network,
      currency,
      label,
      description,
      priority,
      isActive,
      isPaymentWallet,
      distributionMethod,
      addedBy: req.user.id
    });

    await wallet.save();

    // Obtener balance inicial si es BEP20
    if (network === 'BEP20') {
      try {
        const balance = await bep20Service.getAddressBalance(address);
        wallet.balance = balance;
        await wallet.save();
      } catch (error) {
        logger.warn(`No se pudo obtener balance inicial para ${address}:`, error);
      }
    }

    // Evitamos populate para usuarios mock
    // await wallet.populate([
    //   { path: 'addedBy', select: 'fullName email' }
    // ]);

    logger.info(`Nueva billetera creada: ${address} por ${req.user.fullName}`);

    res.status(201).json({
      success: true,
      message: 'Billetera creada exitosamente',
      data: wallet
    });

  } catch (error) {
    logger.error('Error creando billetera:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar billetera (Admin)
exports.updateWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      label,
      description,
      monitoringEnabled
    } = req.body;

    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Billetera no encontrada'
      });
    }

    // Actualizar campos permitidos
    if (status !== undefined) wallet.status = status;
    if (label !== undefined) wallet.label = label;
    if (description !== undefined) wallet.description = description;
    if (monitoringEnabled !== undefined) wallet.monitoringEnabled = monitoringEnabled;
    
    wallet.lastModifiedBy = req.user.id;

    await wallet.save();
    // Evitamos populate para usuarios mock
    // await wallet.populate([
    //   { path: 'addedBy', select: 'fullName email' },
    //   { path: 'lastModifiedBy', select: 'fullName email' }
    // ]);

    logger.info(`Billetera actualizada: ${wallet.address} por ${req.user.fullName}`);

    res.json({
      success: true,
      message: 'Billetera actualizada exitosamente',
      data: wallet
    });

  } catch (error) {
    logger.error('Error actualizando billetera:', error);
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

    // Verificar si la billetera está siendo usada
    if (wallet.isUsed) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una billetera que está siendo usada'
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
    wallet.balance = parseFloat(newBalance);
    wallet.lastChecked = new Date();
    
    // Agregar nota si se proporciona una razón
    if (reason && reason.trim()) {
      wallet.notes.push({
        content: `Balance actualizado: ${oldBalance} → ${newBalance}. Razón: ${reason.trim()}`,
        addedBy: req.user.id
      });
    }
    
    await wallet.save();

    logger.info(`Balance actualizado: ${wallet.address} de ${oldBalance} a ${newBalance} por ${req.user.username}`);

    res.json({
      success: true,
      message: 'Balance actualizado exitosamente',
      data: {
        oldBalance,
        newBalance: wallet.balance,
        wallet
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

// Obtener estadísticas de billeteras (Admin)
exports.getWalletStats = async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: {
        general: stats[0] || {
          total: 0,
          active: 0,
          inactive: 0,
          inUse: 0,
          totalBalance: 0,
          totalReceived: 0,
          totalTransactions: 0
        },
        byNetwork: networkStats
      }
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas de billeteras:', error);
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

// Añadir nota a billetera (Admin)
exports.addWalletNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, note } = req.body;
    
    // Aceptar tanto 'content' como 'note' para compatibilidad
    const noteContent = content || note;

    if (!noteContent || noteContent.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El contenido de la nota es requerido'
      });
    }

    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Billetera no encontrada'
      });
    }

    wallet.notes.push({
      content: noteContent.trim(),
      addedBy: req.user.id
    });

    await wallet.save();
    await wallet.populate('notes.addedBy', 'username email');

    res.json({
      success: true,
      message: 'Nota añadida exitosamente',
      data: wallet.notes[wallet.notes.length - 1]
    });

  } catch (error) {
    logger.error('Error añadiendo nota:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};