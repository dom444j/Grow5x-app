/**
 * MIDDLEWARE DE IDEMPOTENCIA
 * Previene duplicación de transacciones y compras
 */

const Payment = require('../models/Payment.model');
const Purchase = require('../models/Purchase.model');
const mongoose = require('mongoose');

/**
 * Middleware para verificar idempotencia en transacciones BSC
 * Previene duplicación basada en txHash + network
 */
const checkTransactionIdempotency = async (req, res, next) => {
  try {
    const { txHash, network } = req.body;
    
    if (!txHash || !network) {
      return next(); // Si no hay txHash, continuar normal
    }
    
    // Buscar payment existente con mismo txHash + network
    const existingPayment = await Payment.findOne({
      txHash: txHash,
      network: network,
      status: { $in: ['completed', 'verified'] }
    });
    
    if (existingPayment) {
      // Buscar purchase asociada
      const existingPurchase = await Purchase.findOne({
        $or: [
          { paymentId: existingPayment._id },
          { txHash: txHash }
        ],
        status: { $ne: 'cancelled_duplicate' }
      });
      
      if (existingPurchase) {
        console.log(`⚠️ Transacción ya procesada: ${txHash}`);
        return res.status(200).json({
          success: true,
          message: 'Transacción ya procesada anteriormente',
          data: {
            paymentId: existingPayment._id,
            purchaseId: existingPurchase._id,
            status: 'already_processed',
            processedAt: existingPayment.completedAt || existingPayment.verifiedAt
          }
        });
      }
    }
    
    // Agregar flag de idempotencia al request
    req.idempotencyChecked = true;
    req.existingPayment = existingPayment;
    
    next();
    
  } catch (error) {
    console.error('Error en middleware de idempotencia:', error);
    next(); // Continuar en caso de error para no bloquear
  }
};

/**
 * Función para crear/actualizar payment de forma idempotente
 */
const upsertPayment = async (paymentData, session = null) => {
  const { txHash, network, user, amount, currency } = paymentData;
  
  // Buscar payment existente
  let payment = await Payment.findOne({
    txHash: txHash,
    network: network
  }).session(session);
  
  if (payment) {
    // Actualizar payment existente
    const updateData = {
      verified: true,
      verifiedAt: new Date(),
      status: 'completed',
      completedAt: new Date(),
      user: user,
      amount: amount,
      currency: currency,
      'metadata.updatedBy': 'idempotency_system',
      'metadata.lastUpdated': new Date()
    };
    
    await Payment.updateOne(
      { _id: payment._id },
      { $set: updateData },
      { session }
    );
    
    // Recargar payment actualizado
    payment = await Payment.findById(payment._id).session(session);
    
  } else {
    // Crear nuevo payment
    payment = new Payment({
      ...paymentData,
      verified: true,
      verifiedAt: new Date(),
      status: 'completed',
      completedAt: new Date(),
      metadata: {
        createdBy: 'idempotency_system',
        createdAt: new Date()
      }
    });
    
    await payment.save({ session });
  }
  
  return payment;
};

/**
 * Función para crear/actualizar purchase de forma idempotente
 */
const upsertPurchase = async (purchaseData, session = null) => {
  const { userId, packageId, txHash, paymentId } = purchaseData;
  
  // Buscar purchase existente por txHash o por usuario+paquete+estado
  let purchase = await Purchase.findOne({
    $or: [
      { txHash: txHash },
      {
        userId: userId,
        packageId: packageId,
        status: 'pending',
        createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } // Últimas 24h
      }
    ],
    status: { $ne: 'cancelled_duplicate' }
  }).session(session);
  
  if (purchase) {
    // Actualizar purchase existente
    const updateData = {
      status: 'paid',
      paidAt: new Date(),
      verifiedAt: new Date(),
      txHash: txHash,
      paymentId: paymentId,
      'metadata.updatedBy': 'idempotency_system',
      'metadata.lastUpdated': new Date()
    };
    
    await Purchase.updateOne(
      { _id: purchase._id },
      { $set: updateData },
      { session }
    );
    
    // Recargar purchase actualizado
    purchase = await Purchase.findById(purchase._id).session(session);
    
  } else {
    // Crear nuevo purchase
    purchase = new Purchase({
      ...purchaseData,
      status: 'paid',
      paidAt: new Date(),
      verifiedAt: new Date(),
      metadata: {
        createdBy: 'idempotency_system',
        createdAt: new Date()
      }
    });
    
    await purchase.save({ session });
  }
  
  return purchase;
};

/**
 * Función para marcar purchases duplicadas
 */
const markDuplicatePurchases = async (canonicalPurchaseId, userId, packageId, txHash, session = null) => {
  const duplicates = await Purchase.find({
    _id: { $ne: canonicalPurchaseId },
    $or: [
      { txHash: txHash },
      {
        userId: userId,
        packageId: packageId,
        createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
      }
    ],
    status: { $nin: ['cancelled_duplicate', 'cancelled'] }
  }).session(session);
  
  for (const duplicate of duplicates) {
    await Purchase.updateOne(
      { _id: duplicate._id },
      {
        $set: {
          status: 'cancelled_duplicate',
          cancelledAt: new Date(),
          canonicalId: canonicalPurchaseId,
          'metadata.cancelReason': 'duplicate_detected_by_idempotency',
          'metadata.cancelledBy': 'idempotency_system'
        }
      },
      { session }
    );
  }
  
  return duplicates.length;
};

/**
 * Función para validar tolerancia de monto
 * Acepta transacciones donde amount >= packagePrice
 */
const validateAmountTolerance = (transactionAmount, packagePrice, maxOverpayPercent = 10) => {
  const overpay = transactionAmount - packagePrice;
  const overpayPercent = (overpay / packagePrice) * 100;
  
  if (transactionAmount < packagePrice) {
    return {
      valid: false,
      reason: 'insufficient_amount',
      expected: packagePrice,
      received: transactionAmount,
      shortfall: packagePrice - transactionAmount
    };
  }
  
  if (overpayPercent > maxOverpayPercent) {
    return {
      valid: false,
      reason: 'excessive_overpay',
      expected: packagePrice,
      received: transactionAmount,
      overpay: overpay,
      overpayPercent: overpayPercent,
      maxAllowed: maxOverpayPercent
    };
  }
  
  return {
    valid: true,
    packagePrice: packagePrice,
    amountPaid: transactionAmount,
    overpay: overpay,
    overpayPercent: overpayPercent
  };
};

/**
 * Función principal de procesamiento idempotente
 */
const processTransactionIdempotent = async (transactionData) => {
  const session = await mongoose.startSession();
  
  try {
    return await session.withTransaction(async () => {
      const {
        txHash,
        network,
        user,
        package: packageData,
        amount,
        currency,
        walletAddress
      } = transactionData;
      
      // Validar tolerancia de monto
      const amountValidation = validateAmountTolerance(amount, packageData.price);
      if (!amountValidation.valid) {
        throw new Error(`Monto inválido: ${amountValidation.reason}`);
      }
      
      // 1. Crear/actualizar payment
      const payment = await upsertPayment({
        user: user._id,
        amount: amount,
        currency: currency,
        type: 'deposit',
        paymentMethod: 'crypto',
        cryptoDetails: {
          network: network,
          walletAddress: walletAddress,
          transactionHash: txHash,
          confirmations: 12
        },
        txHash: txHash,
        network: network
      }, session);
      
      // 2. Crear/actualizar purchase
      const purchase = await upsertPurchase({
        userId: user._id,
        packageId: packageData._id,
        amount: packageData.price,
        amountPaid: amount,
        overpay: amountValidation.overpay,
        currency: currency,
        paymentMethod: 'crypto',
        txHash: txHash,
        network: network,
        paymentId: payment._id
      }, session);
      
      // 3. Marcar duplicados
      const duplicatesMarked = await markDuplicatePurchases(
        purchase._id,
        user._id,
        packageData._id,
        txHash,
        session
      );
      
      return {
        payment,
        purchase,
        duplicatesMarked,
        amountValidation
      };
    });
    
  } finally {
    await session.endSession();
  }
};

module.exports = {
  checkTransactionIdempotency,
  upsertPayment,
  upsertPurchase,
  markDuplicatePurchases,
  validateAmountTolerance,
  processTransactionIdempotent
};