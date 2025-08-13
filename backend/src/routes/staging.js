/**
 * Rutas exclusivas para STAGING
 * Solo disponibles cuando TEST_E2E=true
 */

const express = require('express');
const router = express.Router();
const OptimizedCalculationService = require('../services/OptimizedCalculationService');
const Commission = require('../models/Commission.model');
const Purchase = require('../models/Purchase.model');
const User = require('../models/User.model');
const auth = require('../middleware/auth');

// Middleware para verificar que estamos en staging
const stagingOnly = (req, res, next) => {
  if (process.env.TEST_E2E !== 'true') {
    return res.status(403).json({
      success: false,
      message: 'Endpoint solo disponible en staging (TEST_E2E=true)'
    });
  }
  next();
};

/**
 * POST /api/staging/simulate-pool-day17
 * Simula el pool del día 17 (ciclo 2) para una purchaseId específica
 */
router.post('/simulate-pool-day17', stagingOnly, auth, async (req, res) => {
  try {
    const { purchaseId, cycleNumber = 2 } = req.body;
    
    if (!purchaseId) {
      return res.status(400).json({
        success: false,
        message: 'purchaseId es requerido'
      });
    }
    
    // Verificar que la compra existe y tiene firstCycleCompleted
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase no encontrada'
      });
    }
    
    if (!purchase.firstCycleCompleted) {
      return res.status(400).json({
        success: false,
        message: 'La compra debe tener firstCycleCompleted=true para simular ciclo 2'
      });
    }
    
    // Buscar admin
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      return res.status(500).json({
        success: false,
        message: 'Admin no encontrado'
      });
    }
    
    // Verificar si ya existe pool_bonus para este ciclo
    const existingPool = await Commission.findOne({
      'metadata.purchaseId': purchaseId,
      type: 'pool_bonus',
      'metadata.cycleNumber': cycleNumber
    });
    
    if (existingPool) {
      return res.json({
        success: true,
        message: 'Pool bonus ya existe para este ciclo',
        data: {
          poolBonus: existingPool,
          isNew: false
        }
      });
    }
    
    // Procesar pool bonus
    const result = await OptimizedCalculationService.processPoolBonuses({
      purchaseId: purchaseId,
      cycleNumber: cycleNumber,
      adminId: admin._id,
      userId: purchase.userId,
      baseAmount: purchase.amount
    });
    
    // Obtener el pool bonus creado
    const poolBonus = await Commission.findOne({
      'metadata.purchaseId': purchaseId,
      type: 'pool_bonus',
      'metadata.cycleNumber': cycleNumber
    });
    
    res.json({
      success: true,
      message: 'Pool bonus del día 17 simulado exitosamente',
      data: {
        poolBonus: poolBonus,
        isNew: true,
        processingResult: result
      }
    });
    
  } catch (error) {
    console.error('Error simulando pool día 17:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * GET /api/staging/pool-status/:purchaseId
 * Obtiene el estado de los pools para una purchaseId
 */
router.get('/pool-status/:purchaseId', stagingOnly, auth, async (req, res) => {
  try {
    const { purchaseId } = req.params;
    
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase no encontrada'
      });
    }
    
    const poolBonuses = await Commission.find({
      'metadata.purchaseId': purchaseId,
      type: 'pool_bonus'
    }).sort({ 'metadata.cycleNumber': 1 });
    
    res.json({
      success: true,
      data: {
        purchase: {
          id: purchase._id,
          amount: purchase.amount,
          firstCycleCompleted: purchase.firstCycleCompleted,
          createdAt: purchase.createdAt
        },
        poolBonuses: poolBonuses.map(pb => ({
          id: pb._id,
          amount: pb.amount,
          cycleNumber: pb.metadata.cycleNumber,
          createdAt: pb.createdAt
        })),
        totalCycles: poolBonuses.length
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo estado pool:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * POST /api/staging/verify-idempotency
 * Verifica la idempotencia ejecutando la misma operación dos veces
 */
router.post('/verify-idempotency', stagingOnly, auth, async (req, res) => {
  try {
    const { purchaseId, cycleNumber = 2 } = req.body;
    
    if (!purchaseId) {
      return res.status(400).json({
        success: false,
        message: 'purchaseId es requerido'
      });
    }
    
    // Contar antes
    const beforeCount = await Commission.countDocuments({
      'metadata.purchaseId': purchaseId,
      type: 'pool_bonus',
      'metadata.cycleNumber': cycleNumber
    });
    
    // Ejecutar dos veces
    const purchase = await Purchase.findById(purchaseId);
    const admin = await User.findOne({ role: 'admin' });
    
    await OptimizedCalculationService.processPoolBonuses({
      purchaseId: purchaseId,
      cycleNumber: cycleNumber,
      adminId: admin._id,
      userId: purchase.userId,
      baseAmount: purchase.amount
    });
    
    await OptimizedCalculationService.processPoolBonuses({
      purchaseId: purchaseId,
      cycleNumber: cycleNumber,
      adminId: admin._id,
      userId: purchase.userId,
      baseAmount: purchase.amount
    });
    
    // Contar después
    const afterCount = await Commission.countDocuments({
      'metadata.purchaseId': purchaseId,
      type: 'pool_bonus',
      'metadata.cycleNumber': cycleNumber
    });
    
    const isIdempotent = (afterCount - beforeCount) <= 1;
    
    res.json({
      success: true,
      data: {
        isIdempotent: isIdempotent,
        beforeCount: beforeCount,
        afterCount: afterCount,
        difference: afterCount - beforeCount,
        message: isIdempotent ? 'Idempotencia verificada' : 'Falla de idempotencia detectada'
      }
    });
    
  } catch (error) {
    console.error('Error verificando idempotencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;