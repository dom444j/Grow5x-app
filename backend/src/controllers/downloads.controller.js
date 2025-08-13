// const Download = require('../models/Download.model'); // Modelo no existe
// const Purchase = require('../models/Purchase.model'); // Modelo no existe
const Product = require('../models/Product.model');
const User = require('../models/User');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

// Generar URL de descarga segura
const generateSecureDownloadUrl = (productId, userId, purchaseId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now();
  const expiresAt = new Date(timestamp + (24 * 60 * 60 * 1000)); // 24 horas
  
  return {
    token,
    url: `/api/downloads/secure/${token}`,
    expiresAt
  };
};

// Obtener todas las descargas (Admin)
const getAllDownloads = async (req, res) => {
  try {
    const { page = 1, limit = 10, userId, productId, status } = req.query;
    const query = {};
    
    if (userId) query.userId = userId;
    if (productId) query.productId = productId;
    
    const downloads = await Download.find(query)
      .populate('userId', 'name email')
      .populate('productId', 'name version')
      .populate('purchaseId', 'amount status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Download.countDocuments(query);
    
    res.json({
      success: true,
      data: downloads,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener las descargas',
      error: error.message
    });
  }
};

// Obtener descargas de un usuario específico
const getUserDownloads = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estas descargas'
      });
    }
    
    const downloads = await Download.find({ userId })
      .populate('productId', 'name version description images')
      .populate('purchaseId', 'amount createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Download.countDocuments({ userId });
    
    res.json({
      success: true,
      data: downloads,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener las descargas del usuario',
      error: error.message
    });
  }
};

// Crear enlace de descarga
const createDownloadLink = async (req, res) => {
  try {
    const { purchaseId } = req.body;
    const userId = req.user.id;
    
    // Verificar que la compra existe y pertenece al usuario
    const purchase = await Purchase.findOne({
      _id: purchaseId,
      userId,
      status: 'completed'
    }).populate('productId');
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Compra no encontrada o no completada'
      });
    }
    
    // Verificar límite de descargas
    const downloadCount = await Download.countDocuments({
      purchaseId,
      userId
    });
    
    if (downloadCount >= purchase.maxDownloads) {
      return res.status(400).json({
        success: false,
        message: 'Has alcanzado el límite máximo de descargas para este producto'
      });
    }
    
    // Generar URL de descarga segura
    const { token, url, expiresAt } = generateSecureDownloadUrl(
      purchase.productId._id,
      userId,
      purchaseId
    );
    
    // Crear registro de descarga
    const download = new Download({
      userId,
      purchaseId,
      productId: purchase.productId._id,
      downloadUrl: url,
      downloadToken: token,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    await download.save();
    
    // Actualizar contador de descargas en la compra
    purchase.downloadCount = downloadCount + 1;
    await purchase.save();
    
    res.json({
      success: true,
      message: 'Enlace de descarga generado exitosamente',
      data: {
        downloadUrl: url,
        expiresAt,
        remainingDownloads: purchase.maxDownloads - (downloadCount + 1)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al generar enlace de descarga',
      error: error.message
    });
  }
};

// Procesar descarga segura
const processSecureDownload = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Buscar el registro de descarga
    const download = await Download.findOne({
      downloadToken: token,
      expiresAt: { $gt: new Date() }
    }).populate('productId').populate('purchaseId');
    
    if (!download) {
      return res.status(404).json({
        success: false,
        message: 'Enlace de descarga inválido o expirado'
      });
    }
    
    // Verificar que el usuario tiene permisos
    if (req.user && req.user.id !== download.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para esta descarga'
      });
    }
    
    // Actualizar estadísticas de descarga
    download.downloadedAt = new Date();
    download.ipAddress = req.ip;
    download.userAgent = req.get('User-Agent');
    await download.save();
    
    // Aquí deberías implementar la lógica para servir el archivo
    // Por ejemplo, redirigir a un CDN o servir el archivo directamente
    const fileUrl = download.productId.downloadUrl;
    
    if (!fileUrl) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no disponible'
      });
    }
    
    // Registrar la descarga en logs
    console.log(`Download processed: User ${download.userId}, Product ${download.productId._id}`);
    
    // Redirigir al archivo o devolver la URL
    res.json({
      success: true,
      message: 'Descarga autorizada',
      data: {
        fileUrl,
        fileName: download.productId.name,
        fileSize: download.productId.fileSize || 'N/A'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al procesar la descarga',
      error: error.message
    });
  }
};

// Obtener estadísticas de descargas (Admin)
const getDownloadStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    const stats = await Download.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalDownloads: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueProducts: { $addToSet: '$productId' },
          completedDownloads: {
            $sum: { $cond: [{ $ne: ['$downloadedAt', null] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          totalDownloads: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          uniqueProducts: { $size: '$uniqueProducts' },
          completedDownloads: 1,
          conversionRate: {
            $multiply: [
              { $divide: ['$completedDownloads', '$totalDownloads'] },
              100
            ]
          }
        }
      }
    ]);
    
    const topProducts = await Download.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$productId',
          downloadCount: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productName: '$product.name',
          downloadCount: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { downloadCount: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalDownloads: 0,
          uniqueUsers: 0,
          uniqueProducts: 0,
          completedDownloads: 0,
          conversionRate: 0
        },
        topProducts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de descargas',
      error: error.message
    });
  }
};

// Revocar enlace de descarga
const revokeDownloadLink = async (req, res) => {
  try {
    const { id } = req.params;
    
    const download = await Download.findById(id);
    if (!download) {
      return res.status(404).json({
        success: false,
        message: 'Descarga no encontrada'
      });
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.id !== download.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para revocar esta descarga'
      });
    }
    
    // Marcar como expirado
    download.expiresAt = new Date();
    await download.save();
    
    res.json({
      success: true,
      message: 'Enlace de descarga revocado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al revocar enlace de descarga',
      error: error.message
    });
  }
};

module.exports = {
  getAllDownloads,
  getUserDownloads,
  createDownloadLink,
  processSecureDownload,
  getDownloadStats,
  revokeDownloadLink
};