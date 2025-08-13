const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const BenefitsProcessor = require('../services/BenefitsProcessor');
const logger = require('../utils/logger');

/**
 * @route   POST /api/commissions/process-direct
 * @desc    Process direct referral commissions manually (for testing)
 * @access  Private (Admin)
 */
router.post('/process-direct', authenticateToken, requireAdmin, async (req, res) => {
  try {
    logger.info('🔥 COMMISSION ROUTE CALLED - DEBUG LOG');
    logger.info('Commission route /process-direct called with body:', JSON.stringify(req.body));
    const { userId, referrerId, purchaseId, force = false, TEST_E2E, metadata } = req.body;
    
    // Si se proporciona referrerId, necesitamos encontrar al usuario referido que completó el cashback
    let targetUserId = userId;
    
    if (referrerId && !userId) {
      // Buscar usuarios referidos por este referrer que hayan completado cashback
      const Referral = require('../models/Referral.model');
      const referrals = await Referral.find({ referrer: referrerId, status: 'active' }).populate('referred');
      
      if (referrals.length > 0) {
        // Usar el primer usuario referido encontrado
        targetUserId = referrals[0].referred._id || referrals[0].referred.id;
        logger.info(`Found referred user ${targetUserId} for referrer ${referrerId}`);
      } else {
        return res.status(400).json({
          success: false,
          message: 'No se encontraron usuarios referidos para el referrer especificado'
        });
      }
    }
    
    logger.info(`Manual direct commission processing triggered${targetUserId ? ` for user ${targetUserId}` : ' for all users'}`);
    
    // Procesar comisiones directas usando BenefitsProcessor
    logger.info(`About to call processReferralCommissionsManual with targetUserId=${targetUserId}, force=${force}`);
    const benefitsProcessor = new BenefitsProcessor();
    logger.info('BenefitsProcessor instance created');
    const result = await benefitsProcessor.processReferralCommissionsManual(targetUserId, force);
    logger.info(`processReferralCommissionsManual completed with result: ${JSON.stringify(result)}`);
    
    res.json({
      success: true,
      message: 'Comisiones directas procesadas exitosamente',
      data: result
    });
  } catch (error) {
    logger.error('Error processing direct commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar comisiones directas',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/commissions/trigger-daily
 * @desc    Trigger daily commission processing (for testing)
 * @access  Private (Admin)
 */
router.post('/trigger-daily', authenticateToken, requireAdmin, async (req, res) => {
  try {
    logger.info('Manual daily commission processing triggered');
    
    // Procesar beneficios diarios que incluyen comisiones
    const benefitsProcessor = new BenefitsProcessor();
    const result = await benefitsProcessor.processDailyBenefits();
    
    res.json({
      success: true,
      message: 'Procesamiento diario de comisiones activado',
      data: result
    });
  } catch (error) {
    logger.error('Error triggering daily commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al activar procesamiento diario',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/commissions/status/:userId
 * @desc    Get commission status for a specific user
 * @access  Private
 */
router.get('/status/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar si el usuario puede recibir beneficios
    const benefitsProcessor = new BenefitsProcessor();
    const canReceive = await benefitsProcessor.canUserReceiveBenefits(userId);
    
    // Obtener información de comisiones del usuario
    const Commission = require('../models/Commission');
    const commissions = await Commission.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    res.json({
      success: true,
      data: {
        userId,
        canReceiveBenefits: canReceive,
        recentCommissions: commissions
      }
    });
  } catch (error) {
    logger.error('Error getting commission status:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado de comisiones',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/commissions/test/direct/:purchaseId
 * @desc    Emergency patch - Force create direct referral commission by purchaseId (STAGING ONLY)
 * @access  Admin only
 */
router.post('/test/direct/:purchaseId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const purchaseId = req.params.purchaseId;
    
    // Import models
    const Purchase = require('../models/Purchase.model');
    const User = require('../models/User');
    const Commission = require('../models/Commission.model');
    
    // Find purchase
    const purchase = await Purchase.findById(purchaseId).lean();
    if (!purchase) {
      return res.status(404).json({ error: 'purchase_not_found' });
    }
    
    // Find user and sponsor
    const user = await User.findById(purchase.userId, 'referredBy').lean();
    const sponsorId = user?.referredBy;
    if (!sponsorId) {
      return res.json({ skipped: 'no_sponsor' });
    }
    
    // Calculate base amount (more robust)
    const baseAmount = purchase.netAmount ?? purchase.amount ?? purchase.price;
    if (!baseAmount) {
      return res.json({ skipped: 'no_base_amount' });
    }
    
    // Check if commission already exists
    const key = {
      commissionType: 'direct_referral',
      userId: sponsorId,
      fromUserId: purchase.userId,
      purchaseId: purchase._id
    };
    
    const exists = await Commission.findOne(key).lean();
    if (exists) {
      return res.json({ ok: true, created: false, reason: 'exists', commission: exists });
    }
    
    // Create commission
    const amount = +(baseAmount * 0.10).toFixed(2);
    const metadata = {
      base: 'purchase',
      percentage: 10,
      firstCycleCompleted: !!purchase.firstCycleCompleted,
      purchaseId: purchase._id // Agregar purchaseId también en metadata
    };
    
    // Include runId if available (for smoke tests)
    if (global.testRunId) {
      metadata.runId = global.testRunId;
    }
    
    const commission = await Commission.create({
      ...key,
      amount,
      currency: 'USDT',
      status: 'pending',
      level: 1,
      metadata
    });
    
    logger.info(`[EMERGENCY PATCH] Direct commission created: ${amount} USDT for sponsor ${sponsorId} from purchase ${purchaseId}`);
    
    return res.json({
      ok: true,
      created: true,
      amount,
      commission: {
        id: commission._id,
        amount: commission.amount,
        sponsorId,
        fromUserId: purchase.userId,
        purchaseId,
        metadata: commission.metadata
      }
    });
    
  } catch (error) {
    logger.error('Error in emergency direct commission patch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/commissions/test/direct/:purchaseId
 * @desc    Endpoint temporal para verificar comisiones directas por purchaseId (solo staging/test)
 * @access  Private (Admin) - Solo disponible con STAGING=true o ENABLE_TEST_ROUTES=true
 */
if (process.env.STAGING === 'true' || process.env.ENABLE_TEST_ROUTES === 'true') {
  router.get('/test/direct/:purchaseId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const Commission = require('../models/Commission.model');
    const pid = req.params.purchaseId;
    const docs = await Commission.find({
      commissionType: 'direct_referral',
      purchaseId: pid    // ← raíz
    }).lean();
    
    res.json({ 
      count: docs.length, 
      docs,
      purchaseId: pid
    });
  } catch (error) {
    logger.error('Error in test direct commission endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
  });
}

module.exports = router;