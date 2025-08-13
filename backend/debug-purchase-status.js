require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Purchase = require('./src/models/Purchase.model');
const Transaction = require('./src/models/Transaction.model');

process.env.TEST_E2E = 'true';

async function debugPurchaseStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar User B de prueba
    const userB = await User.findOne({
      $or: [
        { email: /userb.*@test\.com/ },
        { email: /test.*userb/ },
        { username: /userb/i }
      ]
    }).sort({ createdAt: -1 });

    if (!userB) {
      console.log('❌ User B no encontrado');
      return;
    }

    console.log(`\n👤 User B encontrado: ${userB.email} (${userB._id})`);

    // Buscar todas las compras de User B
    const allPurchases = await Purchase.find({ userId: userB._id }).sort({ createdAt: -1 });
    console.log(`\n📦 Total compras de User B: ${allPurchases.length}`);

    for (const purchase of allPurchases) {
      console.log(`\n🔍 Compra ${purchase._id}:`);
      console.log(`  - Status: ${purchase.status}`);
      console.log(`  - Amount: ${purchase.amount}`);
      console.log(`  - FirstCycleCompleted: ${purchase.firstCycleCompleted}`);
      console.log(`  - CreatedAt: ${purchase.createdAt}`);
      console.log(`  - CompletedAt: ${purchase.completedAt}`);

      // Contar beneficios para esta compra
      const benefitCount = await Transaction.countDocuments({
        user_id: userB._id,
        type: 'benefit',
        status: 'completed',
        'metadata.purchaseId': purchase._id.toString()
      });
      console.log(`  - Beneficios procesados: ${benefitCount}`);

      // Verificar si cumple criterios para comisión directa
      const allowPending = !!process.env.TEST_E2E;
      const statusMatch = allowPending ? 
        ['pending', 'completed'].includes(purchase.status) : 
        purchase.status === 'completed';
      
      console.log(`  - TEST_E2E: ${process.env.TEST_E2E}`);
      console.log(`  - AllowPending: ${allowPending}`);
      console.log(`  - StatusMatch: ${statusMatch}`);
      console.log(`  - Elegible para comisión: ${statusMatch && purchase.firstCycleCompleted}`);
    }

    // Buscar compras con los criterios exactos de BenefitsProcessor
    const allowPending = !!process.env.TEST_E2E;
    const eligiblePurchases = await Purchase.find({ 
      userId: userB._id, 
      status: allowPending ? { $in: ['pending', 'completed'] } : 'completed',
      firstCycleCompleted: true
    }).lean();

    console.log(`\n🎯 Compras elegibles según BenefitsProcessor: ${eligiblePurchases.length}`);
    for (const purchase of eligiblePurchases) {
      console.log(`  - ${purchase._id}: status=${purchase.status}, firstCycleCompleted=${purchase.firstCycleCompleted}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

debugPurchaseStatus();