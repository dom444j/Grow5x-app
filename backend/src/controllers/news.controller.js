const News = require('../models/News.model');
const AdminLog = require('../models/AdminLog.model');
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

// Obtener todas las noticias (admin)
const getAllNews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      category = 'all',
      priority = 'all',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros
    const filters = {};
    
    if (search) {
      filters.$or = [
        { 'title.es': { $regex: search, $options: 'i' } },
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'content.es': { $regex: search, $options: 'i' } },
        { 'content.en': { $regex: search, $options: 'i' } },
        { 'metadata.tags': { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (status !== 'all') {
      filters.status = status;
    }
    
    if (category !== 'all') {
      filters.category = category;
    }
    
    if (priority !== 'all') {
      filters.priority = priority;
    }

    // Configurar ordenamiento
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Ejecutar consulta con paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [news, totalNews] = await Promise.all([
      News.find(filters)
        .populate('author', 'fullName email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      News.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: {
        news,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalNews / parseInt(limit)),
          totalNews,
          hasNext: skip + news.length < totalNews,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error getting all news:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener noticias públicas (para usuarios)
const getPublicNews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category = 'all',
      language = 'es',
      featured = false
    } = req.query;

    // Construir filtros para noticias activas
    const filters = {
      status: 'published',
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    };
    
    if (category !== 'all') {
      filters.category = category;
    }
    
    if (featured === 'true') {
      filters['metadata.featured'] = true;
    }

    // Ejecutar consulta con paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [news, totalNews] = await Promise.all([
      News.find(filters)
        .select(`title.${language} summary.${language} category priority publishedAt metadata.featured statistics.views`)
        .sort({ priority: -1, publishedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      News.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: {
        news,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalNews / parseInt(limit)),
          totalNews,
          hasNext: skip + news.length < totalNews,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error getting public news:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener una noticia específica
const getNewsById = async (req, res) => {
  try {
    const { newsId } = req.params;
    const { language = 'es', incrementView = false } = req.query;
    
    const news = await News.findById(newsId)
      .populate('author', 'fullName email');
    
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'Noticia no encontrada'
      });
    }

    // Incrementar vistas si se solicita (para usuarios públicos)
    if (incrementView === 'true' && news.status === 'published') {
      await news.incrementView();
    }

    // Si es una consulta pública, verificar que esté activa
    if (!req.user || req.user.role !== 'admin') {
      if (news.status !== 'published' || (news.expiresAt && news.expiresAt < new Date())) {
        return res.status(404).json({
          success: false,
          message: 'Noticia no encontrada'
        });
      }
    }

    res.json({
      success: true,
      data: { news }
    });

  } catch (error) {
    logger.error('Error getting news by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nueva noticia
const createNews = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const newsData = {
      ...req.body,
      author: req.user.id
    };

    // Si se publica inmediatamente, establecer publishedAt
    if (newsData.status === 'published') {
      newsData.publishedAt = new Date();
    }

    const news = await News.create(newsData);
    
    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'news_created',
      'news',
      news._id,
      { title: news.title, status: news.status, category: news.category },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      'medium'
    );

    res.status(201).json({
      success: true,
      message: 'Noticia creada correctamente',
      data: { news }
    });

  } catch (error) {
    logger.error('Error creating news:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar noticia
const updateNews = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { newsId } = req.params;
    const updateData = req.body;
    
    const news = await News.findById(newsId);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'Noticia no encontrada'
      });
    }

    // Si se cambia a publicado y no tenía publishedAt, establecerlo
    if (updateData.status === 'published' && !news.publishedAt) {
      updateData.publishedAt = new Date();
    }

    const previousData = {
      title: news.title,
      status: news.status,
      category: news.category,
      priority: news.priority
    };

    const updatedNews = await News.findByIdAndUpdate(
      newsId,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'fullName email');

    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'news_updated',
      'news',
      newsId,
      { previousData, newData: updateData },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      'medium'
    );

    res.json({
      success: true,
      message: 'Noticia actualizada correctamente',
      data: { news: updatedNews }
    });

  } catch (error) {
    logger.error('Error updating news:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar noticia
const deleteNews = async (req, res) => {
  try {
    const { newsId } = req.params;
    
    const news = await News.findById(newsId);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'Noticia no encontrada'
      });
    }

    await News.findByIdAndDelete(newsId);

    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'news_deleted',
      'news',
      newsId,
      { title: news.title, status: news.status, category: news.category },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      'high'
    );

    res.json({
      success: true,
      message: 'Noticia eliminada correctamente'
    });

  } catch (error) {
    logger.error('Error deleting news:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Cambiar estado de múltiples noticias
const bulkUpdateNewsStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { newsIds, status } = req.body;
    
    const updateData = { status };
    if (status === 'published') {
      updateData.publishedAt = new Date();
    }

    const result = await News.updateMany(
      { _id: { $in: newsIds } },
      updateData
    );

    // Registrar acción de admin
    await logAdminAction(
      req.user.id,
      'news_bulk_status_update',
      'news',
      null,
      { newsIds, newStatus: status, affectedCount: result.modifiedCount },
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      'medium'
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} noticias actualizadas correctamente`,
      data: {
        modifiedCount: result.modifiedCount,
        newStatus: status
      }
    });

  } catch (error) {
    logger.error('Error bulk updating news status:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de noticias
const getNewsStats = async (req, res) => {
  try {
    const [statusStats, categoryStats, viewStats, recentNews] = await Promise.all([
      // Estadísticas por estado
      News.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Estadísticas por categoría
      News.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalViews: { $sum: '$statistics.views' }
          }
        }
      ]),
      
      // Noticias más vistas
      News.find({ status: 'published' })
        .select('title statistics.views category publishedAt')
        .sort({ 'statistics.views': -1 })
        .limit(10),
      
      // Noticias recientes
      News.find()
        .select('title status category publishedAt author')
        .populate('author', 'fullName')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    res.json({
      success: true,
      data: {
        statusStats,
        categoryStats,
        mostViewed: viewStats,
        recentNews
      }
    });

  } catch (error) {
    logger.error('Error getting news stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getAllNews,
  getPublicNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  bulkUpdateNewsStatus,
  getNewsStats
};