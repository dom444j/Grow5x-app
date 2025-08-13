const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction.model');
const User = require('./src/models/User');
const Purchase = require('./src/models/Purchase.model');

async function testTransactionMetadata() {
  try {
    // Conectar a la base de datos
    await mongoose.connect('mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority'
    });
    console.log('✅ Conectado a la base de datos');

    // Buscar un usuario existente
    const user = await User.findOne({}).lean();
    if (!user) {
      console.log('❌ No se encontró ningún usuario');
      return;
    }
    console.log(`📋 Usuario encontrado: ${user._id}`);

    // Buscar una compra existente o crear una de prueba
    let purchase = await Purchase.findOne({ userId: user._id }).lean();
    if (!purchase) {
      console.log('📋 No se encontró compra existente, creando una de prueba...');
      const newPurchase = new Purchase({
         userId: user._id,
         productId: new mongoose.Types.ObjectId(),
         packageType: 'BASIC',
         amount: 100,
         currency: 'USD',
         status: 'pending',
         paymentMethod: 'crypto'
       });
      purchase = await newPurchase.save();
      console.log(`📋 Compra de prueba creada: ${purchase._id}`);
    } else {
      console.log(`📋 Compra encontrada: ${purchase._id}`);
    }

    // Crear una transacción de prueba con metadata
    const testMetadata = {
      purchaseId: purchase._id,
      packageType: 'BASIC',
      cycleNumber: 1,
      dayInCycle: 1,
      benefitRate: 0.125,
      baseAmount: 100
    };

    console.log('📋 Metadata a guardar:', JSON.stringify(testMetadata, null, 2));

    const transaction = new Transaction({
      user: user._id,
      type: 'earnings',
      subtype: 'auto_earnings',
      amount: 12.5,
      currency: 'USDT',
      status: 'completed',
      metadata: testMetadata
    });

    // Guardar la transacción
    const savedTransaction = await transaction.save();
    console.log('✅ Transacción guardada con ID:', savedTransaction._id);

    // Recuperar la transacción y verificar metadata
    const retrievedTransaction = await Transaction.findById(savedTransaction._id).lean();
    console.log('📋 Metadata recuperada:', JSON.stringify(retrievedTransaction.metadata, null, 2));

    if (retrievedTransaction.metadata && retrievedTransaction.metadata.purchaseId) {
      console.log('✅ PurchaseId encontrado en metadata:', retrievedTransaction.metadata.purchaseId);
    } else {
      console.log('❌ PurchaseId NO encontrado en metadata');
    }

    // Limpiar - eliminar la transacción de prueba
    await Transaction.findByIdAndDelete(savedTransaction._id);
    console.log('🧹 Transacción de prueba eliminada');
    
    // Si creamos una compra de prueba, también la eliminamos
    if (purchase && !retrievedTransaction.metadata?.purchaseId) {
      await Purchase.findByIdAndDelete(purchase._id);
      console.log('🧹 Compra de prueba eliminada');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de la base de datos');
  }
}

testTransactionMetadata();