const logger = require('../utils/logger');
const bep20Service = require('../services/bep20.service');
const Wallet = require('../models/Wallet.model');
const mongoose = require('mongoose');

// Wallets ahora se obtienen dinámicamente de la base de datos MongoDB
// usando el modelo Wallet definido en ../models/Wallet.model.js

// Obtener todas las billeteras (Admin)
exports.getAllWallets = async (req, res) => {
  try {
    const { page = 1, limit = 20, network, status, search } = req.query;
    
    // Construir filtros de búsqueda
    const filters = {};
    
    if (network) {
      filters.network = network;
    }
    if (status) {
      filters.status = status;
    }
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filters.$or = [
        { address: searchRegex },
        { label: searchRegex },
        { description: searchRegex }
      ];
    }
    
    // Opciones de paginación
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }, // Ordenar por fecha de creación (más recientes primero)
      populate: [
        { path: 'addedBy', select: 'username email' },
        { path: 'lastModifiedBy', select: 'username email' },
        { path: 'notes.addedBy', select: 'username email' }
      ]
    };
    
    // Obtener wallets paginadas de la base de datos
    const result = await Wallet.paginate(filters, options);
    
    res.json({
      success: true,
      data: result
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
      maxUsage = 100,
      cooldownPeriod = 3600000,
      priority = 'normal',
      isPaymentWallet = true,
      distributionMethod = 'random',
      maxConcurrentUsers = 1
    } = req.body;

    // Validar campos requeridos
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'La dirección es requerida'
      });
    }

    // Validar dirección BEP20
    if (network === 'BEP20' && !bep20Service.isValidAddress(address)) {
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
    const walletData = {
      address,
      network,
      currency,
      status: 'active',
      isUsed: false,
      usageCount: 0,
      balance: 0,
      label: label || '',
      description: description || '',
      maxUsage: maxUsage || 100,
      cooldownPeriod: cooldownPeriod || 3600000,
      priority: priority || 'normal',
      isPaymentWallet: isPaymentWallet !== undefined ? isPaymentWallet : true,
      distributionMethod: distributionMethod || 'random',
      maxConcurrentUsers: maxConcurrentUsers || 1,
      addedBy: req.user?.id,
      totalReceived: 0,
      transactionCount: 0,
      monitoringEnabled: true,
      lastChecked: new Date(),
      notes: []
    };

    // Guardar en la base de datos
    const wallet = new Wallet(walletData);
    await wallet.save();

    // Obtener balance inicial si es BEP20
    if (network === 'BEP20') {
      try {
        const balance = await bep20Service.getAddressBalance(address);
        wallet.balance = balance;
        await wallet.save();
        logger.info(`Balance inicial obtenido: ${balance} USDT`);
      } catch (balanceError) {
        logger.warn('No se pudo obtener el balance inicial:', balanceError.message);
      }
    }

    // Poblar los campos de usuario
    await wallet.populate([
      { path: 'addedBy', select: 'username email' }
    ]);

    logger.info(`Nueva billetera creada: ${address} por ${req.user?.username || 'admin'}`);

    res.status(201).json({
      success: true,
      message: 'Billetera creada exitosamente',
      data: wallet
    });

  } catch (error) {
    logger.error('Error creando billetera:', error);
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages
      });
    }
    
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
      maxUsage,
      cooldownPeriod,
      monitoringEnabled,
      priority,
      isPaymentWallet,
      distributionMethod,
      maxConcurrentUsers
    } = req.body;

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de billetera inválido'
      });
    }

    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Billetera no encontrada'
      });
    }

    // Actualizar campos permitidos
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (label !== undefined) updateData.label = label;
    if (description !== undefined) updateData.description = description;
    if (maxUsage !== undefined) updateData.maxUsage = maxUsage;
    if (cooldownPeriod !== undefined) updateData.cooldownPeriod = cooldownPeriod;
    if (monitoringEnabled !== undefined) updateData.monitoringEnabled = monitoringEnabled;
    if (priority !== undefined) updateData.priority = priority;
    if (isPaymentWallet !== undefined) updateData.isPaymentWallet = isPaymentWallet;
    if (distributionMethod !== undefined) updateData.distributionMethod = distributionMethod;
    if (maxConcurrentUsers !== undefined) updateData.maxConcurrentUsers = maxConcurrentUsers;
    
    updateData.lastModifiedBy = req.user?.id;
    updateData.updatedAt = new Date();

    // Actualizar en la base de datos
    const updatedWallet = await Wallet.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'addedBy', select: 'username email' },
      { path: 'lastModifiedBy', select: 'username email' }
    ]);

    logger.info(`Billetera actualizada: ${updatedWallet.address} por ${req.user?.username || 'admin'}`);

    res.json({
      success: true,
      message: 'Billetera actualizada exitosamente',
      data: updatedWallet
    });

  } catch (error) {
    logger.error('Error actualizando billetera:', error);
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages
      });
    }
    
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

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de billetera inválido'
      });
    }

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

    // Eliminar de la base de datos
    await Wallet.findByIdAndDelete(id);

    logger.info(`Billetera eliminada: ${wallet.address} por ${req.user?.username || 'admin'}`);

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

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de billetera inválido'
      });
    }

    const wallet = await Wallet.findById(id).populate([
      { path: 'addedBy', select: 'username email' },
      { path: 'lastModifiedBy', select: 'username email' },
      { path: 'notes.addedBy', select: 'username email' }
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

// Obtener estadísticas de billeteras (Admin)
exports.getWalletStats = async (req, res) => {
  try {
    // Obtener todas las wallets para calcular estadísticas
    const wallets = await Wallet.find({});
    
    const stats = {
      total: wallets.length,
      active: wallets.filter(w => w.status === 'active').length,
      inactive: wallets.filter(w => w.status === 'inactive').length,
      maintenance: wallets.filter(w => w.status === 'maintenance').length,
      inUse: wallets.filter(w => w.isUsed).length,
      available: wallets.filter(w => !w.isUsed && w.status === 'active').length,
      totalBalance: wallets.reduce((sum, w) => sum + (w.balance || 0), 0),
      totalReceived: wallets.reduce((sum, w) => sum + (w.totalReceived || 0), 0),
      totalTransactions: wallets.reduce((sum, w) => sum + (w.transactionCount || 0), 0),
      networks: {
        BEP20: wallets.filter(w => w.network === 'BEP20').length,
        TRC20: wallets.filter(w => w.network === 'TRC20').length,
        ERC20: wallets.filter(w => w.network === 'ERC20').length
      },
      byPriority: {
        high: wallets.filter(w => w.priority === 'high').length,
        normal: wallets.filter(w => w.priority === 'normal').length,
        low: wallets.filter(w => w.priority === 'low').length
      },
      paymentWallets: wallets.filter(w => w.isPaymentWallet).length,
      monitoringEnabled: wallets.filter(w => w.monitoringEnabled).length
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas:', error);
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

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de billetera inválido'
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
    const updateData = {
      balance: parseFloat(newBalance),
      lastChecked: new Date(),
      updatedAt: new Date()
    };

    // Agregar nota si se proporciona una razón
    if (reason && reason.trim()) {
      const note = {
        content: `Balance actualizado: ${oldBalance} → ${newBalance}. Razón: ${reason.trim()}`,
        addedBy: req.user?.id,
        timestamp: new Date()
      };
      updateData.$push = { notes: note };
    }

    const updatedWallet = await Wallet.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'addedBy', select: 'username email' },
      { path: 'lastModifiedBy', select: 'username email' },
      { path: 'notes.addedBy', select: 'username email' }
    ]);

    logger.info(`Balance actualizado: ${updatedWallet.address} de ${oldBalance} a ${newBalance} por ${req.user?.username || 'admin'}`);

    res.json({
      success: true,
      message: 'Balance actualizado exitosamente',
      data: {
        oldBalance,
        newBalance: updatedWallet.balance,
        wallet: updatedWallet
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

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de billetera inválido'
      });
    }

    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Billetera no encontrada'
      });
    }

    const updatedWallet = await Wallet.findByIdAndUpdate(
      id,
      {
        isUsed: false,
        lastUsed: new Date(),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    logger.info(`Billetera liberada: ${updatedWallet.address} por ${req.user?.username || 'admin'}`);

    res.json({
      success: true,
      message: 'Billetera liberada exitosamente',
      data: updatedWallet
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

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de billetera inválido'
      });
    }

    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Billetera no encontrada'
      });
    }

    const noteObj = {
      content: noteContent.trim(),
      addedBy: req.user?.id,
      timestamp: new Date()
    };

    const updatedWallet = await Wallet.findByIdAndUpdate(
      id,
      {
        $push: { notes: noteObj },
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'addedBy', select: 'username email' },
      { path: 'notes.addedBy', select: 'username email' }
    ]);

    // Obtener la nota recién añadida
    const addedNote = updatedWallet.notes[updatedWallet.notes.length - 1];

    res.json({
      success: true,
      message: 'Nota añadida exitosamente',
      data: addedNote
    });

  } catch (error) {
    logger.error('Error añadiendo nota:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener billetera disponible para pagos
exports.getAvailableWallet = async (req, res) => {
  try {
    const { network = 'BEP20', currency = 'USDT' } = req.query;
    
    // Usar el método estático del modelo Wallet para obtener una wallet disponible
    const availableWallet = await Wallet.getAvailableWallet(network, currency);
    
    if (!availableWallet) {
      return res.status(404).json({
        success: false,
        message: 'No hay billeteras disponibles para esta red y moneda'
      });
    }
    
    res.json({
      success: true,
      data: availableWallet
    });
    
  } catch (error) {
    logger.error('Error obteniendo billetera disponible:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Las wallets ahora se obtienen dinámicamente de la base de datos MongoDB
// usando el modelo Wallet y sus métodos estáticos definidos en ../models/Wallet.model.js