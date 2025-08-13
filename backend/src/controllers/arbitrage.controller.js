const ArbitrageSimulation = require('../models/ArbitrageSimulation');
const User = require('../models/User');
const UserStatus = require('../models/UserStatus');
const { validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Simulador de datos de mercado en tiempo real
class MarketDataSimulator {
  constructor() {
    this.exchanges = ['Binance', 'Coinbase', 'Kraken', 'Huobi', 'KuCoin'];
    this.basePrice = 45000; // Precio base para BTC
    this.volatility = 0.02; // 2% de volatilidad
  }
  
  generatePriceData(symbol = 'BTCUSDT') {
    return this.exchanges.map(exchange => {
      const variation = (Math.random() - 0.5) * this.volatility;
      const price = this.basePrice * (1 + variation);
      const spread = Math.random() * 0.001; // 0.1% spread máximo
      
      return {
        exchange,
        price: parseFloat(price.toFixed(2)),
        volume: Math.random() * 1000 + 100,
        spread: parseFloat(spread.toFixed(6)),
        timestamp: new Date()
      };
    });
  }
  
  detectArbitrageOpportunity(prices) {
    const sortedPrices = prices.sort((a, b) => a.price - b.price);
    const lowest = sortedPrices[0];
    const highest = sortedPrices[sortedPrices.length - 1];
    
    const profitPotential = ((highest.price - lowest.price) / lowest.price) - 0.002; // Menos fees
    
    return {
      detected: profitPotential > 0.001, // Mínimo 0.1% de ganancia
      profitPotential: parseFloat(profitPotential.toFixed(6)),
      exchanges: [lowest.exchange, highest.exchange],
      buyPrice: lowest.price,
      sellPrice: highest.price
    };
  }
}

const marketSimulator = new MarketDataSimulator();

// Obtener todas las simulaciones (Admin)
const getAllSimulations = async (req, res) => {
  try {
    const { status, type, userId, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (type) filter['config.type'] = type;
    if (userId) filter.userId = userId;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'userId', select: 'username email' },
        { path: 'adminControl.createdBy', select: 'username email' }
      ]
    };
    
    const simulations = await ArbitrageSimulation.paginate(filter, options);
    
    res.json({
      success: true,
      data: simulations,
      message: 'Simulaciones obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener simulaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear nueva simulación (Admin)
const createSimulation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    
    const {
      userId,
      config,
      benefitSettings,
      displaySettings,
      metadata
    } = req.body;
    
    // Verificar que el usuario existe si se especifica
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
    }
    
    const simulation = new ArbitrageSimulation({
      userId: userId || null,
      config,
      adminControl: {
        createdBy: req.user.id,
        benefitSettings: benefitSettings || {},
        printSettings: {
          autoCapture: true,
          captureInterval: 3600000, // 1 hora
          captureFormat: 'json'
        }
      },
      displaySettings: displaySettings || {},
      metadata: metadata || {}
    });
    
    // Generar datos iniciales de mercado
    const initialPrices = marketSimulator.generatePriceData(config.tradingPair.symbol);
    const opportunity = marketSimulator.detectArbitrageOpportunity(initialPrices);
    
    simulation.marketData = {
      currentPrices: initialPrices,
      priceHistory: [{
        timestamp: new Date(),
        prices: initialPrices,
        arbitrageOpportunity: opportunity
      }]
    };
    
    await simulation.save();
    
    res.status(201).json({
      success: true,
      data: simulation,
      message: 'Simulación creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear simulación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Controlar simulación (Admin)
const controlSimulation = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, parameters } = req.body;
    
    const simulation = await ArbitrageSimulation.findById(id);
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulación no encontrada'
      });
    }
    
    let result;
    
    switch (action) {
      case 'start':
        result = await simulation.start();
        break;
        
      case 'pause':
        result = await simulation.pause();
        break;
        
      case 'complete':
        result = await simulation.complete();
        break;
        
      case 'update_benefits':
        if (parameters.benefitSettings) {
          simulation.adminControl.benefitSettings = {
            ...simulation.adminControl.benefitSettings,
            ...parameters.benefitSettings
          };
          result = await simulation.save();
        }
        break;
        
      case 'add_trade':
        if (parameters.tradeData) {
          result = await simulation.addTrade(parameters.tradeData);
        }
        break;
        
      case 'update_market':
        // Generar nuevos datos de mercado
        const newPrices = marketSimulator.generatePriceData(simulation.config.tradingPair.symbol);
        const newOpportunity = marketSimulator.detectArbitrageOpportunity(newPrices);
        
        simulation.marketData.currentPrices = newPrices;
        simulation.marketData.priceHistory.push({
          timestamp: new Date(),
          prices: newPrices,
          arbitrageOpportunity: newOpportunity
        });
        
        // Mantener solo los últimos 100 registros de historial
        if (simulation.marketData.priceHistory.length > 100) {
          simulation.marketData.priceHistory = simulation.marketData.priceHistory.slice(-100);
        }
        
        result = await simulation.save();
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Acción no válida'
        });
    }
    
    // Agregar nota administrativa
    simulation.adminControl.notes.push({
      timestamp: new Date(),
      adminId: req.user.id,
      content: `Acción ejecutada: ${action}`,
      type: 'info'
    });
    
    await simulation.save();
    
    res.json({
      success: true,
      data: result,
      message: `Acción '${action}' ejecutada exitosamente`
    });
  } catch (error) {
    console.error('Error al controlar simulación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Capturar estado de simulación (Admin)
const captureSimulation = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;
    
    const simulation = await ArbitrageSimulation.findById(id)
      .populate('userId', 'username email')
      .populate('adminControl.createdBy', 'username email');
      
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulación no encontrada'
      });
    }
    
    const { capture } = simulation.captureState();
    await simulation.save();
    
    if (format === 'pdf') {
      // Generar PDF
      const doc = new PDFDocument();
      const filename = `arbitrage_${simulation.simulationId}_${Date.now()}.pdf`;
      const uploadsDir = process.env.NODE_ENV === 'production'
      ? '/var/www/growx5/backend/uploads/captures'
      : path.join(__dirname, '../../uploads/captures');
    const filepath = path.join(uploadsDir, filename);
      
      // Crear directorio si no existe
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      doc.pipe(fs.createWriteStream(filepath));
      
      // Contenido del PDF
      doc.fontSize(20).text('Reporte de Simulación de Arbitraje', 100, 100);
      doc.fontSize(12);
      doc.text(`ID de Simulación: ${simulation.simulationId}`, 100, 140);
      doc.text(`Fecha de Captura: ${capture.timestamp.toLocaleString()}`, 100, 160);
      doc.text(`Estado: ${capture.status}`, 100, 180);
      doc.text(`Operaciones Totales: ${capture.results.totalTrades}`, 100, 200);
      doc.text(`Ganancia Neta: $${capture.results.netProfit.toFixed(2)}`, 100, 220);
      doc.text(`Tasa de Éxito: ${capture.results.winRate.toFixed(2)}%`, 100, 240);
      
      doc.end();
      
      res.json({
        success: true,
        data: {
          capture,
          downloadUrl: `/api/downloads/captures/${filename}`
        },
        message: 'Estado capturado y PDF generado exitosamente'
      });
    } else {
      res.json({
        success: true,
        data: capture,
        message: 'Estado capturado exitosamente'
      });
    }
  } catch (error) {
    console.error('Error al capturar simulación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener simulaciones del usuario
const getUserSimulations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = { 
      userId,
      'displaySettings.showToUser': true
    };
    
    if (status) filter.status = status;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      select: '-adminControl.notes -adminControl.printSettings'
    };
    
    const simulations = await ArbitrageSimulation.paginate(filter, options);
    
    res.json({
      success: true,
      data: simulations,
      message: 'Simulaciones del usuario obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener simulaciones del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener datos en tiempo real de una simulación
const getSimulationRealTimeData = async (req, res) => {
  try {
    const { id } = req.params;
    
    const simulation = await ArbitrageSimulation.findById(id);
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulación no encontrada'
      });
    }
    
    // Verificar permisos
    const isOwner = simulation.userId && simulation.userId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isVisible = simulation.displaySettings.showToUser;
    
    if (!isOwner && !isAdmin && !isVisible) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta simulación'
      });
    }
    
    // Generar datos actualizados si la simulación está corriendo
    if (simulation.status === 'running' && simulation.displaySettings.showRealTimeData) {
      const newPrices = marketSimulator.generatePriceData(simulation.config.tradingPair.symbol);
      const opportunity = marketSimulator.detectArbitrageOpportunity(newPrices);
      
      simulation.marketData.currentPrices = newPrices;
      
      // Simular operación si hay oportunidad
      if (opportunity.detected && Math.random() > 0.7) {
        const tradeAmount = Math.min(
          simulation.results.availableBalance * 0.1,
          simulation.config.parameters.maxPositionSize
        );
        
        if (tradeAmount > 0) {
          const profit = tradeAmount * opportunity.profitPotential;
          
          await simulation.addTrade({
            type: 'buy',
            exchange: opportunity.exchanges[0],
            price: opportunity.buyPrice,
            quantity: tradeAmount / opportunity.buyPrice,
            fee: tradeAmount * 0.001,
            profit: profit
          });
          
          simulation.results.currentBalance += profit;
          simulation.results.availableBalance += profit;
        }
      }
      
      await simulation.save();
    }
    
    const responseData = {
      simulationId: simulation.simulationId,
      status: simulation.status,
      config: simulation.config,
      results: simulation.results,
      marketData: simulation.marketData,
      recentTrades: simulation.trades.slice(-10),
      roi: simulation.roi,
      runtime: simulation.runtime
    };
    
    res.json({
      success: true,
      data: responseData,
      message: 'Datos en tiempo real obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener datos en tiempo real:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de arbitraje para el dashboard
const getArbitrageStats = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '24h':
        dateFilter = { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
        break;
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
    }
    
    const stats = await ArbitrageSimulation.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalSimulations: { $sum: 1 },
          activeSimulations: {
            $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] }
          },
          completedSimulations: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalTrades: { $sum: '$results.totalTrades' },
          totalProfit: { $sum: '$results.totalProfit' },
          totalLoss: { $sum: '$results.totalLoss' },
          avgWinRate: { $avg: '$results.winRate' }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalSimulations: 0,
      activeSimulations: 0,
      completedSimulations: 0,
      totalTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      avgWinRate: 0
    };
    
    result.netProfit = result.totalProfit - result.totalLoss;
    result.profitability = result.totalLoss > 0 ? (result.totalProfit / result.totalLoss) : 0;
    
    res.json({
      success: true,
      data: result,
      message: 'Estadísticas de arbitraje obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getAllSimulations,
  createSimulation,
  controlSimulation,
  captureSimulation,
  getUserSimulations,
  getSimulationRealTimeData,
  getArbitrageStats
};