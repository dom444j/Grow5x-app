const Purchase = require('../models/Purchase.model');
const Product = require('../models/Product.model');
const Package = require('../models/Package.model');
const User = require('../models/User');
const Transaction = require('../models/Transaction.model');
const Notification = require('../models/Notification.model');
const Wallet = require('../models/Wallet.model');
const { sendEmail } = require('../utils/email');
const { notifyTelegram } = require('../utils/telegram');
const LicenseActivationService = require('../services/LicenseActivationService');
const { validationResult } = require('express-validator');

// Obtener todas las compras (Admin)
const getAllPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId, productId } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (userId) query.userId = userId;
    if (productId) query.productId = productId;
    
    const purchases = await Purchase.find(query)
      .populate('userId', 'name email')
      .populate('productId', 'name price')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Purchase.countDocuments(query);
    
    res.json({
      success: true,
      data: purchases,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener las compras',
      error: error.message
    });
  }
};

// Obtener compras de un usuario específico
const getUserPurchases = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    
    // Verificar que el usuario solo pueda ver sus propias compras (excepto admin)
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estas compras'
      });
    }
    
    const query = { userId };
    if (status) query.status = status;
    
    const purchases = await Purchase.find(query)
      .populate('productId', 'name price description images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Purchase.countDocuments(query);
    
    res.json({
      success: true,
      data: purchases,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener las compras del usuario',
      error: error.message
    });
  }
};

// Obtener una compra específica
const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const purchase = await Purchase.findById(id)
      .populate('userId', 'name email')
      .populate('productId', 'name price description images downloadUrl');
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Compra no encontrada'
      });
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.id !== purchase.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta compra'
      });
    }
    
    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener la compra',
      error: error.message
    });
  }
};

// Crear una nueva compra
const createPurchase = async (req, res) => {
  try {
    console.log('🛒 Iniciando createPurchase:', {
      body: req.body,
      userId: req.user._id || req.user.id,
      userEmail: req.user.email
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { productId, paymentMethod, amount, customerInfo, metadata } = req.body;
    const userId = req.user._id || req.user.id; // Compatibilidad con mock users y usuarios reales
    
    // Debug logs
    console.log('DEBUG - req.body:', req.body);
    console.log('DEBUG - metadata from req.body:', metadata);
    console.log('DEBUG - req.user:', req.user);
    console.log('DEBUG - userId:', userId);
    console.log('DEBUG - typeof userId:', typeof userId);
    
    // Buscar el paquete en la base de datos
    let product = null;
    let productPrice = 0;
    let productName = '';
    let actualProductId = productId; // ID real para usar en la base de datos
    
    // Primero intentar buscar por slug (que es lo que envía el frontend)
    try {
      // Crear el slug basado en el productId recibido
      const slug = productId.toLowerCase()
        .replace('licencia ', '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      console.log('DEBUG - Buscando paquete por slug:', slug);
      
      // Buscar por nombre que contenga el slug o por slug directo
      product = await Package.findOne({
        $or: [
          { name: { $regex: new RegExp(productId, 'i') } },
          { slug: productId },
          { slug: slug }
        ],
        status: 'active'
      });
      
      if (product) {
        console.log('DEBUG - Paquete encontrado:', product.name);
        productPrice = product.price;
        productName = product.name;
        actualProductId = product._id;
      }
    } catch (error) {
      console.log('DEBUG - Error buscando paquete:', error.message);
    }
    
    // Si no se encuentra por slug, intentar buscar por ID de MongoDB
    if (!product) {
      try {
        product = await Package.findById(productId);
        if (product) {
          console.log('DEBUG - Paquete encontrado por ID:', product.name);
          productPrice = product.price;
          productName = product.name;
          actualProductId = product._id;
        }
      } catch (error) {
        console.log('DEBUG - Error buscando por ID en Package:', error.message);
      }
    }
    
    // Si no se encuentra en Package, buscar en Product
    if (!product) {
      try {
        product = await Product.findById(productId);
        if (product && product.status === 'active') {
          console.log('DEBUG - Producto encontrado en Product:', product.name);
          productPrice = product.price;
          productName = product.name;
        }
      } catch (error) {
        console.log('DEBUG - Error buscando en Product o modelo no disponible:', error.message);
      }
    }
    
    // Si no se encuentra el producto o paquete
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto o paquete no encontrado'
      });
    }
    
    // Verificar si el usuario ya compró este producto/paquete
    const existingPurchase = await Purchase.findOne({
      userId,
      productId: actualProductId,
      status: 'completed'
    });
    
    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: 'Ya has comprado este producto'
      });
    }
    
    console.log('💰 Método de pago detectado:', paymentMethod);
    
    // Para paquetes de criptomonedas, no verificamos saldo de wallet
    // ya que el pago se realizará externamente
    if (paymentMethod && ['usdt-bep20', 'usdt-trc20', 'bitcoin', 'bnb'].includes(paymentMethod)) {
      console.log('🔐 Procesando pago con criptomonedas:', paymentMethod);
      // Crear la compra pendiente para pago con criptomonedas
      const purchaseData = {
        userId: userId.toString(), // Convertir a string para compatibilidad con mock users
        productId: actualProductId,
        amount: amount || productPrice,
        paymentMethod,
        status: 'pending',
        customerInfo: customerInfo || {},
        metadata: metadata || {}
      };
      
      console.log('DEBUG - purchaseData before save:', purchaseData);
      console.log('DEBUG - metadata in purchaseData:', purchaseData.metadata);
      
      const purchase = new Purchase(purchaseData);
      
      await purchase.save();
      
      console.log('DEBUG - purchase after save:', {
        id: purchase._id,
        metadata: purchase.metadata
      });

      // Crear transacción para el webhook de confirmación
      const externalReference = `PKG_${Date.now()}_${userId.toString().slice(-6)}`;
      const paymentWalletAddress = process.env.PAYMENT_WALLET_ADDRESS || 'TBD';
      const paymentNetwork = paymentMethod === 'usdt-bep20' ? 'BSC' : 'TRC20';
      
      console.log('🔄 Creando transacción:', {
        userId: userId.toString(),
        externalReference,
        userIdSlice: userId.toString().slice(-6)
      });
      
      const transaction = new Transaction({
        user: userId,
        type: 'package_purchase',
        amount: amount || productPrice,
        currency: 'USDT',
        status: 'pending',
        externalReference: externalReference,
        description: `Compra de paquete ${productName}`,
        payment: {
          method: 'crypto',
          address: paymentWalletAddress,
          network: paymentNetwork === 'BSC' ? 'BEP20' : 'TRC20',
          confirmations: 0
        },
        metadata: {
          purchaseId: purchase._id,
          packageType: product.slug || product.category || 'starter',
          productName: productName
        },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutos para completar el pago
      });

      await transaction.save();
      
      console.log('✅ Transacción guardada:', {
        transactionId: transaction._id,
        externalReference: transaction.externalReference,
        status: transaction.status
      });
      
      // Respuesta para pago con criptomonedas
      res.status(201).json({
        success: true,
        message: 'Compra creada exitosamente. Procede con el pago.',
        data: {
          purchaseId: purchase._id,
          transactionId: transaction._id,
          externalReference: externalReference,
          productName,
          amount: amount || productPrice,
          currency: 'USDT',
          paymentMethod,
          status: 'pending',
          packageType: product.slug || product.category || 'starter',
          walletAddress: transaction.payment.address,
          network: transaction.payment.network,
          expiresAt: transaction.expiresAt
        }
      });
      return;
    }
    
    // Para pagos con wallet (método tradicional)
    const userWallet = await Wallet.findOne({ userId });
    if (!userWallet || userWallet.balance < productPrice) {
      return res.status(400).json({
        success: false,
        message: 'Saldo insuficiente para realizar la compra'
      });
    }
    
    // Crear la compra
    const purchase = new Purchase({
      userId: userId.toString(), // Convertir a string para compatibilidad con mock users
      productId: actualProductId,
      amount: productPrice,
      paymentMethod: paymentMethod || 'wallet',
      status: 'pending'
    });
    
    await purchase.save();
    
    // Procesar el pago (deducir del wallet)
    userWallet.balance -= productPrice;
    await userWallet.save();
    
    // Crear transacción
    const transaction = new Transaction({
      userId,
      type: 'purchase',
      amount: -productPrice,
      description: `Compra de ${productName}`,
      relatedId: purchase._id,
      status: 'completed'
    });
    
    await transaction.save();
    
    // Actualizar estado de la compra
    purchase.status = 'completed';
    purchase.transactionId = transaction._id;
    await purchase.save();
    
    // Respuesta para pago con wallet
    res.status(201).json({
      success: true,
      message: 'Compra realizada exitosamente',
      data: {
        purchaseId: purchase._id,
        productName,
        amount: productPrice,
        paymentMethod: paymentMethod || 'wallet',
        status: 'completed'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al procesar la compra',
      error: error.message
    });
  }
};

// Actualizar estado de una compra (Admin)
const updatePurchaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Compra no encontrada'
      });
    }
    
    purchase.status = status;
    if (notes) purchase.notes = notes;
    
    await purchase.save();
    
    res.json({
      success: true,
      message: 'Estado de compra actualizado',
      data: purchase
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la compra',
      error: error.message
    });
  }
};

// Obtener estadísticas de compras
const getPurchaseStats = async (req, res) => {
  try {
    // Obtener estadísticas reales de transacciones
    const totalTransactions = await Transaction.countDocuments();
    const completedTransactions = await Transaction.countDocuments({ status: 'completed' });
    const pendingTransactions = await Transaction.countDocuments({ status: 'pending' });
    const failedTransactions = await Transaction.countDocuments({ status: 'failed' });
    
    // Calcular ingresos totales de transacciones completadas
    const revenueResult = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    
    // Calcular promedio de transacción
    const averageAmount = completedTransactions > 0 ? totalRevenue / completedTransactions : 0;
    
    // Obtener tipos de transacciones más frecuentes
    const topTypes = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);
    
    const stats = {
      total: totalTransactions,
      completed: completedTransactions,
      pending: pendingTransactions,
      totalSpent: Math.round(totalRevenue * 100) / 100,
      failed: failedTransactions,
      averageAmount: Math.round(averageAmount * 100) / 100
    };
    
    res.json({
      success: true,
      data: {
        overview: stats,
        topTypes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de compras',
      error: error.message
    });
  }
};

// Obtener todos los paquetes disponibles
const getPackages = async (req, res) => {
  try {
    // Obtener paquetes activos de la base de datos
    const packages = await Package.find({ status: 'active' })
      .sort({ sortOrder: 1, price: 1 })
      .select('-__v');
    
    if (!packages || packages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron paquetes disponibles',
        packages: [],
        total: 0
      });
    }
    
    // También intentar obtener productos si existen
    let products = [];
    try {
      products = await Product.find({ status: 'active' })
        .sort({ price: 1 })
        .select('-__v');
    } catch (error) {
      console.log('Modelo Product no disponible o error:', error.message);
    }
    
    res.json({
      success: true,
      packages: packages,
      products: products,
      total: packages.length + products.length
    });
  } catch (error) {
    console.error('Error al obtener paquetes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getAllPurchases,
  getUserPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchaseStatus,
  getPurchaseStats,
  getPackages
};