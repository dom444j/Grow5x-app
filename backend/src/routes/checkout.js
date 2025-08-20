const express = require('express');
const { z } = require('zod');
const { Purchase, Package, Wallet, User } = require('../models');
const logger = require('../config/logger');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const { validatePaymentRequest } = require('../middleware/usdtBep20Hardening');
const walletPool = require('../services/walletPool');
const { isValidObjectId } = require('mongoose');
const { toApiNumber } = require('../utils/decimal');

const router = express.Router();

// Validation schemas
const startCheckoutSchema = z.object({
  packageId: z.string().min(1, 'Package ID es requerido'),
  amountUSDT: z.number().min(1, 'Monto debe ser mayor a 0')
});

const confirmTxSchema = z.object({
  txHash: z.string().min(1, 'Hash de transacción es requerido')
});

/**
 * POST /api/checkout/start
 * Endpoint para crear orden y asignar wallet
 */
router.post('/start', authenticateToken, paymentLimiter, validatePaymentRequest, async (req, res, next) => {
  try {
    const ref = String(req.body.packageId || '').trim();
    if (!ref) return res.status(400).json({ error: 'BAD_REQUEST', field: 'packageId' });

    const user = await User.findOne({ userId: req.userId });
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    // Busca por slug o code; si parece ObjectId, también por _id
    const or = [{ slug: ref }, { code: ref }];
    if (isValidObjectId(ref)) or.push({ _id: ref });

    const pkg = await Package.findOne({ isActive: true, $or: or }).lean();
    if (!pkg) return res.status(400).json({ error: 'INVALID_PACKAGE', received: ref });

    const amountUSDT = pkg.price;

    let selectedWallet;
    try {
      selectedWallet = await walletPool.pick({ userId: user.userId, amountUSDT });
      // esperado: { address, network, currency }
    } catch (e) {
      return res.status(503).json({ 
        error: 'POOL_UNAVAILABLE', 
        detail: String(e?.message || e) 
      });
    }
    if (!selectedWallet?.address) {
      return res.status(503).json({ error: 'NO_WALLETS_AVAILABLE' });
    }

    // Pool V2: Sin locks, deadline fijo de 30 minutos
    const paymentDeadline = new Date(Date.now() + 30 * 60 * 1000);

    const p = await Purchase.create({
      userId: user._id, 
      packageId: pkg._id, 
      unitPrice: pkg.price,
      totalAmount: pkg.price,
      currency: 'USDT',
      paymentAddress: selectedWallet.address,
      status: 'PENDING_PAYMENT',
      paymentDeadline,
      benefitPlan: {
        dailyRate: pkg.dailyBenefitRate,
        daysPerCycle: pkg.benefitDays,
        totalCycles: pkg.totalCycles,
        totalBenefitAmount: pkg.price * pkg.dailyBenefitRate * pkg.benefitDays * pkg.totalCycles
      }
    });

    return res.status(201).json({
      success: true,
      checkout: {
        orderId: p.id, 
        status: p.status, 
        expiresAt: p.paymentDeadline,
        next: { 
          action: 'AWAIT_PAYMENT', 
          pollUrl: `/api/checkout/${p.id}/status` 
        }
      },
      payment: {
        network: 'BEP20', 
        walletAddress: p.paymentAddress,
        amountUSDT: toApiNumber(p.totalAmount),
        qr: `usdt:bep20:${p.paymentAddress}?amount=${toApiNumber(p.totalAmount)}`
      }
    });
  } catch (err) { 
    next(err); 
  }
});

/**
 * POST /api/checkout/:orderId/confirm
 * Endpoint para confirmar transacción con hash
 */
router.post('/:orderId/confirm', authenticateToken, async (req, res, next) => {
  try {
    const { txHash } = req.body;
    const p = await Purchase.findOne({ _id: req.params.orderId, userId: req.userId });
    if (!p) {
      return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
    }

    // Check if txHash already exists
    const existingPurchase = await Purchase.findOne({
      txHash,
      _id: { $ne: p._id }
    });

    if (existingPurchase) {
      return res.status(400).json({
        error: 'TX_HASH_ALREADY_EXISTS',
        message: 'Este hash de transacción ya está siendo usado en otra compra'
      });
    }

    p.txHash = txHash; 
    p.status = 'CONFIRMING'; 
    await p.save();
    res.json({ success: true });
  } catch (e) { 
    next(e); 
  }
});

/**
 * GET /api/checkout/:orderId/status
 * Obtener el estado de una orden
 */
router.get('/:orderId/status', authenticateToken, async (req, res) => {
  const errorRef = crypto.randomBytes(4).toString('hex');
  try {
    console.log('[CHECKOUT/STATUS] orderId:', req.params.orderId, 'userId:', req.user?.userId, 'ref:', errorRef);

    const purchase = await Purchase.findOne({
      _id: req.params.orderId,
      userId: req.user.userId
    }).lean();

    if (!purchase) {
      return res.status(404).json({
        error: 'ORDER_NOT_FOUND',
        message: 'Orden no encontrada o no pertenece al usuario',
        ref: errorRef
      });
    }

    // Verificar expiración
    const now = new Date();
    if (purchase.expiresAt && now > purchase.expiresAt && purchase.status === 'PENDING_PAYMENT') {
      // Marcar como expirada
      await Purchase.updateOne(
        { _id: req.params.orderId },
        { status: 'EXPIRED' }
      );
      purchase.status = 'EXPIRED';
    }

    const response = {
      orderId: purchase._id,
      status: purchase.status,
      packageId: purchase.packageId,
      amountUSDT: toApiNumber(purchase.amountUSDT || purchase.totalAmount),
      network: purchase.network,
      payTo: purchase.payTo || purchase.paymentAddress,
      txHash: purchase.txHash,
      expiresAt: purchase.expiresAt,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt
    };

    // Agregar información específica según el estado
    if (purchase.status === 'PENDING_PAYMENT') {
      response.next = {
        action: 'AWAIT_PAYMENT',
        pollUrl: `/api/checkout/${purchase._id}/status`
      };
      response.payment = {
        network: purchase.network || 'BEP20',
        walletAddress: purchase.payTo || purchase.paymentAddress,
        amountUSDT: toApiNumber(purchase.amountUSDT || purchase.totalAmount),
        qr: `usdt:bep20:${purchase.payTo || purchase.paymentAddress}?amount=${toApiNumber(purchase.amountUSDT || purchase.totalAmount)}`
      };
    }

    console.log('[CHECKOUT/STATUS] response:', response, 'ref:', errorRef);
    res.json(response);

  } catch (error) {
    console.error('[CHECKOUT/STATUS] Error:', error, 'ref:', errorRef);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      ref: errorRef
    });
  }
});

module.exports = router;