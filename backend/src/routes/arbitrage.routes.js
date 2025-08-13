const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getAllSimulations,
  createSimulation,
  controlSimulation,
  captureSimulation,
  getUserSimulations,
  getSimulationRealTimeData,
  getArbitrageStats
} = require('../controllers/arbitrage.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Validaciones
const createSimulationValidation = [
  body('config.type')
    .isIn(['spot', 'futures', 'cross_exchange', 'triangular', 'statistical'])
    .withMessage('Tipo de arbitraje inválido'),
  body('config.tradingPair.base')
    .notEmpty()
    .withMessage('Moneda base requerida'),
  body('config.tradingPair.quote')
    .notEmpty()
    .withMessage('Moneda cotización requerida'),
  body('config.tradingPair.symbol')
    .notEmpty()
    .withMessage('Símbolo de trading requerido'),
  body('config.exchanges')
    .isArray({ min: 2 })
    .withMessage('Se requieren al menos 2 exchanges'),
  body('config.parameters.initialCapital')
    .isFloat({ min: 100 })
    .withMessage('Capital inicial debe ser mayor a $100'),
  body('config.parameters.maxPositionSize')
    .isFloat({ min: 10 })
    .withMessage('Tamaño máximo de posición debe ser mayor a $10'),
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('ID de usuario inválido')
];

const controlSimulationValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID de simulación inválido'),
  body('action')
    .isIn(['start', 'pause', 'complete', 'update_benefits', 'add_trade', 'update_market'])
    .withMessage('Acción inválida')
];

const simulationIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID de simulación inválido')
];

// ==========================================
// RUTAS ADMINISTRATIVAS
// ==========================================

// Obtener todas las simulaciones (Admin)
router.get('/admin/simulations', 
  authenticateToken, 
  requireAdmin, 
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe estar entre 1 y 100'),
    query('status').optional().isIn(['pending', 'running', 'paused', 'completed', 'error']).withMessage('Estado inválido'),
    query('type').optional().isIn(['spot', 'futures', 'cross_exchange', 'triangular', 'statistical']).withMessage('Tipo inválido')
  ],
  getAllSimulations
);

// Crear nueva simulación (Admin)
router.post('/admin/simulations', 
  authenticateToken, 
  requireAdmin, 
  createSimulationValidation,
  createSimulation
);

// Controlar simulación (Admin)
router.post('/admin/simulations/:id/control', 
  authenticateToken, 
  requireAdmin, 
  controlSimulationValidation,
  controlSimulation
);

// Capturar estado de simulación (Admin)
router.post('/admin/simulations/:id/capture', 
  authenticateToken, 
  requireAdmin, 
  [
    ...simulationIdValidation,
    query('format').optional().isIn(['json', 'pdf', 'csv']).withMessage('Formato inválido')
  ],
  captureSimulation
);

// Obtener estadísticas de arbitraje (Admin)
router.get('/admin/stats', 
  authenticateToken, 
  requireAdmin,
  [
    query('period').optional().isIn(['24h', '7d', '30d']).withMessage('Período inválido')
  ],
  getArbitrageStats
);

// Obtener simulación específica (Admin)
router.get('/admin/simulations/:id', 
  authenticateToken, 
  requireAdmin, 
  simulationIdValidation,
  async (req, res) => {
    try {
      const { id } = req.params;
      const simulation = await require('../models/ArbitrageSimulation')
        .findById(id)
        .populate('userId', 'username email')
        .populate('adminControl.createdBy', 'username email');
        
      if (!simulation) {
        return res.status(404).json({
          success: false,
          message: 'Simulación no encontrada'
        });
      }
      
      res.json({
        success: true,
        data: simulation,
        message: 'Simulación obtenida exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener simulación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Eliminar simulación (Admin)
router.delete('/admin/simulations/:id', 
  authenticateToken, 
  requireAdmin, 
  simulationIdValidation,
  async (req, res) => {
    try {
      const { id } = req.params;
      const simulation = await require('../models/ArbitrageSimulation').findById(id);
      
      if (!simulation) {
        return res.status(404).json({
          success: false,
          message: 'Simulación no encontrada'
        });
      }
      
      await simulation.deleteOne();
      
      res.json({
        success: true,
        message: 'Simulación eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar simulación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Crear template de simulación (Admin)
router.post('/admin/templates', 
  authenticateToken, 
  requireAdmin, 
  [
    ...createSimulationValidation,
    body('metadata.description').notEmpty().withMessage('Descripción del template requerida')
  ],
  async (req, res) => {
    try {
      const templateData = {
        ...req.body,
        userId: null, // Templates no tienen usuario específico
        adminControl: {
          createdBy: req.user.id,
          benefitSettings: req.body.benefitSettings || {},
          printSettings: {
            autoCapture: false,
            captureInterval: 3600000,
            captureFormat: 'json'
          }
        },
        metadata: {
          ...req.body.metadata,
          isTemplate: true,
          version: '1.0.0'
        },
        status: 'pending'
      };
      
      const template = new (require('../models/ArbitrageSimulation'))(templateData);
      await template.save();
      
      res.status(201).json({
        success: true,
        data: template,
        message: 'Template creado exitosamente'
      });
    } catch (error) {
      console.error('Error al crear template:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Obtener templates disponibles (Admin)
router.get('/admin/templates', 
  authenticateToken, 
  requireAdmin,
  async (req, res) => {
    try {
      const templates = await require('../models/ArbitrageSimulation')
        .find({ 'metadata.isTemplate': true })
        .populate('adminControl.createdBy', 'username email')
        .sort({ createdAt: -1 });
        
      res.json({
        success: true,
        data: templates,
        message: 'Templates obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener templates:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// ==========================================
// RUTAS DE USUARIO
// ==========================================

// Obtener simulaciones del usuario
router.get('/user/simulations', 
  authenticateToken, 
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Límite debe estar entre 1 y 50'),
    query('status').optional().isIn(['pending', 'running', 'paused', 'completed']).withMessage('Estado inválido')
  ],
  getUserSimulations
);

// Obtener datos en tiempo real de una simulación
router.get('/simulations/:id/realtime', 
  authenticateToken, 
  simulationIdValidation,
  getSimulationRealTimeData
);

// Obtener simulación específica (Usuario)
router.get('/user/simulations/:id', 
  authenticateToken, 
  simulationIdValidation,
  async (req, res) => {
    try {
      const { id } = req.params;
      const simulation = await require('../models/ArbitrageSimulation')
        .findOne({ 
          _id: id, 
          $or: [
            { userId: req.user.id },
            { 'displaySettings.showToUser': true, userId: null }
          ]
        })
        .select('-adminControl.notes -adminControl.printSettings');
        
      if (!simulation) {
        return res.status(404).json({
          success: false,
          message: 'Simulación no encontrada o no tienes permisos para verla'
        });
      }
      
      res.json({
        success: true,
        data: simulation,
        message: 'Simulación obtenida exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener simulación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Obtener estadísticas del usuario
router.get('/user/stats', 
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      const stats = await require('../models/ArbitrageSimulation').aggregate([
        { 
          $match: { 
            userId: require('mongoose').Types.ObjectId(userId),
            'displaySettings.showToUser': true
          } 
        },
        {
          $group: {
            _id: null,
            totalSimulations: { $sum: 1 },
            activeSimulations: {
              $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] }
            },
            totalTrades: { $sum: '$results.totalTrades' },
            totalProfit: { $sum: '$results.totalProfit' },
            avgWinRate: { $avg: '$results.winRate' },
            bestROI: { $max: '$results.profitPercentage' }
          }
        }
      ]);
      
      const result = stats[0] || {
        totalSimulations: 0,
        activeSimulations: 0,
        totalTrades: 0,
        totalProfit: 0,
        avgWinRate: 0,
        bestROI: 0
      };
      
      res.json({
        success: true,
        data: result,
        message: 'Estadísticas del usuario obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener estadísticas del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// ==========================================
// RUTAS PÚBLICAS (para simulaciones públicas)
// ==========================================

// Obtener simulaciones públicas
router.get('/public/simulations', 
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Límite debe estar entre 1 y 20')
  ],
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        select: 'simulationId config results marketData status createdAt metadata'
      };
      
      const simulations = await require('../models/ArbitrageSimulation').paginate(
        { 
          'metadata.isPublic': true,
          'displaySettings.showToUser': true
        }, 
        options
      );
      
      res.json({
        success: true,
        data: simulations,
        message: 'Simulaciones públicas obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener simulaciones públicas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

module.exports = router;