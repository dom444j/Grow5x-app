const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const newsController = require('../controllers/news.controller');
const systemSettingsController = require('../controllers/systemSettings.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting for public routes
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  handler: (req, res) => {
    logger.logSecurityEvent('public_rate_limit_exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
      retryAfter: 15 * 60
    });
  }
});

// Apply rate limiting to all public routes
router.use(publicLimiter);

// ===== PUBLIC NEWS ROUTES =====

/**
 * @route   GET /api/public/news
 * @desc    Get published news for public viewing
 * @access  Public
 */
router.get('/news', newsController.getPublicNews);

/**
 * @route   GET /api/public/news/:newsId
 * @desc    Get specific news by ID (public)
 * @access  Public
 */
router.get('/news/:newsId', newsController.getNewsById);

// ===== PUBLIC SYSTEM SETTINGS ROUTES =====

/**
 * @route   GET /api/public/settings
 * @desc    Get public system settings
 * @access  Public
 */
router.get('/settings', systemSettingsController.getPublicSettings);

/**
 * @route   GET /api/public/settings/:key
 * @desc    Get specific public setting by key
 * @access  Public
 */
router.get('/settings/:key', systemSettingsController.getSettingByKey);

// ===== PUBLIC DOWNLOAD ROUTES =====

/**
 * @route   GET /api/public/download/:documentType
 * @desc    Download public documents (user-guides, faq, terms-conditions)
 * @access  Public
 */
router.get('/download/:documentType', async (req, res) => {
  try {
    const { documentType } = req.params;
    
    // Mapeo de tipos de documentos a archivos
    const documentMap = {
      'user-guides': 'guias-usuario.pdf',
      'faq': 'preguntas-frecuentes.pdf',
      'terms-conditions': 'terminos-condiciones.pdf'
    };
    
    const fileName = documentMap[documentType];
    
    if (!fileName) {
      return res.status(404).json({
        success: false,
        message: 'Tipo de documento no válido'
      });
    }
    
    // Ruta del archivo
    const uploadsDir = process.env.NODE_ENV === 'production'
      ? '/var/www/growx5/backend/uploads/documents'
      : path.join(__dirname, '../../uploads/documents');
    const filePath = path.join(uploadsDir, fileName);
    
    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      // Si no existe, crear un PDF de ejemplo
      const exampleContent = `Documento: ${documentType}\n\nEste es un documento de ejemplo para ${documentType}.\n\nPara más información, contacta con soporte.`;
      
      return res.status(404).json({
        success: false,
        message: 'Documento no disponible temporalmente',
        note: 'El documento será agregado próximamente'
      });
    }
    
    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/pdf');
    
    // Log de descarga
    logger.logSecurityEvent('document_download', {
      documentType,
      fileName,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Enviar archivo
    res.sendFile(path.resolve(filePath));
    
  } catch (error) {
    logger.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===== PUBLIC KPI ROUTES =====

/**
 * @route   GET /api/public/kpis
 * @desc    Get public KPIs (user counts with cache)
 * @access  Public
 */
router.get('/kpis', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Cache key para los KPIs
    const cacheKey = 'public_kpis';
    const cacheTime = 60 * 1000; // 60 segundos
    
    // Verificar si tenemos datos en cache (simple cache en memoria)
    if (router.kpisCache && router.kpisCache.timestamp && 
        (Date.now() - router.kpisCache.timestamp) < cacheTime) {
      return res.json(router.kpisCache.data);
    }
    
    // Contar usuarios totales (excluyendo eliminados)
    const usersTotal = await User.countDocuments({ 
      status: { $ne: 'deleted' } 
    });
    
    // Contar usuarios activos (con email verificado y status activo)
    const usersActive = await User.countDocuments({ 
      status: 'active',
      'verification.isVerified': true
    });
    
    const kpisData = {
      success: true,
      usersTotal,
      usersActive,
      generatedAt: new Date().toISOString()
    };
    
    // Guardar en cache
    router.kpisCache = {
      data: kpisData,
      timestamp: Date.now()
    };
    
    logger.info('Public KPIs generated:', { usersTotal, usersActive });
    
    res.json(kpisData);
    
  } catch (error) {
    logger.error('Error getting public KPIs:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      usersTotal: 0,
      usersActive: 0,
      generatedAt: new Date().toISOString()
    });
  }
});

// ===== AUTHENTICATED USER ROUTES =====
// These routes require authentication but are not admin-only

/**
 * @route   GET /api/public/user/news
 * @desc    Get news for authenticated users (may include additional content)
 * @access  Private (User)
 */
router.get('/user/news', authenticateToken, newsController.getPublicNews);

/**
 * @route   GET /api/public/user/news/:newsId
 * @desc    Get specific news by ID for authenticated users
 * @access  Private (User)
 */
router.get('/user/news/:newsId', authenticateToken, newsController.getNewsById);

/**
 * @route   GET /api/public/user/settings
 * @desc    Get settings for authenticated users
 * @access  Private (User)
 */
router.get('/user/settings', authenticateToken, systemSettingsController.getPublicSettings);

// ===== HEALTH CHECK ROUTE =====

/**
 * @route   GET /api/public/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0'
  });
});

// ===== PUBLIC STATS ROUTE =====

/**
 * @route   GET /api/public/stats
 * @desc    Get public statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const User = require('../models/User');
    const News = require('../models/News.model');
    
    const [totalUsers, activeUsers, totalNews] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      News.countDocuments({ status: 'published' })
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers
        },
        news: {
          published: totalNews
        },
        platform: {
          name: 'GrowX5',
          version: process.env.API_VERSION || '1.0.0'
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error getting public stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===== API INFO ROUTE =====

/**
 * @route   GET /api/public/info
 * @desc    Get basic API information
 * @access  Public
 */
router.get('/info', async (req, res) => {
  try {
    // Get some basic public statistics
    const User = require('../models/User');
    const News = require('../models/News.model');
    
    const [totalUsers, totalNews] = await Promise.all([
      User.countDocuments({ status: 'active' }),
      News.countDocuments({ status: 'published' })
    ]);

    res.json({
      success: true,
      data: {
        apiVersion: process.env.API_VERSION || '1.0.0',
        platform: 'GrowX5',
        statistics: {
          activeUsers: totalUsers,
          publishedNews: totalNews
        },
        features: [
          'User Management',
          'Wallet System',
          'Referral Program',
          'News System',
          'Multi-language Support'
        ],
        supportedLanguages: ['es', 'en'],
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error getting API info:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;