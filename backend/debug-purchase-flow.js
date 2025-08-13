require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Purchase = require('./src/models/Purchase.model');
const Transaction = require('./src/models/Transaction.model');
const Commission = require('./src/models/Commission.model');

process.env.TEST_E2E = 'true';

async function debugPurchaseFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar User A y User B más recientes
    const userA = await User.findOne({
      email: /usera.*@test\.com/
    }).sort({ createdAt: -1 });

    const userB = await User.findOne({
      email: /userb.*@test\.com/
    }).sort({ createdAt: -1 });

    if (!userA || !userB) {
      console.log('❌ No se encontraron usuarios de prueba');
      console.log('User A:', !!userA);
      console.log('User B:', !!userB);
      return;
    }

    console.log(`\n👤 User A: ${userA.email} (${userA._id})`);
    console.log(`👤 User B: ${userB.email} (${userB._id})`);

    // Verificar relación de referido
    console.log(`\n🔗 Relación de referido:`);
    console.log(`User A referralCode: ${userA.referralCode}`);
    console.log(`User B referredBy: ${userB.referredBy}`);
    console.log(`¿User B es referido de User A?: ${userB.referredBy?.toString() === userA._id.toString()}`);

    // Buscar compras de ambos usuarios
    const purchasesA = await Purchase.find({ userId: userA._id }).sort({ createdAt: -1 });
    const purchasesB = await Purchase.find({ userId: userB._id }).sort({ createdAt: -1 });

    console.log(`\n📦 Compras User A: ${purchasesA.length}`);
    for (const purchase of purchasesA) {
      console.log(`  - ID: ${purchase._id}`);
      console.log(`    Status: ${purchase.status}`);
      console.log(`    Amount: ${purchase.amount}`);
      console.log(`    FirstCycleCompleted: ${purchase.firstCycleCompleted}`);
      console.log(`    CompletedAt: ${purchase.completedAt}`);
      console.log(`    Metadata: ${JSON.stringify(purchase.metadata)}`);
    }

    console.log(`\n📦 Compras User B: ${purchasesB.length}`);
    for (const purchase of purchasesB) {
      console.log(`  - ID: ${purchase._id}`);
      console.log(`    Status: ${purchase.status}`);
      console.log(`    Amount: ${purchase.amount}`);
      console.log(`    FirstCycleCompleted: ${purchase.firstCycleCompleted}`);
      console.log(`    CompletedAt: ${purchase.completedAt}`);
      console.log(`    Metadata: ${JSON.stringify(purchase.metadata)}`);
    }

    // Buscar transacciones relacionadas
    const transactionsA = await Transaction.find({ user: userA._id }).sort({ createdAt: -1 });
    const transactionsB = await Transaction.find({ user: userB._id }).sort({ createdAt: -1 });

    console.log(`\n💰 Transacciones User A: ${transactionsA.length}`);
    console.log(`💰 Transacciones User B: ${transactionsB.length}`);

    // Buscar comisiones existentes
    const commissions = await Commission.find({
      $or: [
        { userId: userA._id },
        { fromUserId: userB._id }
      ]
    }).sort({ createdAt: -1 });

    console.log(`\n🎯 Comisiones encontradas: ${commissions.length}`);
    for (const commission of commissions) {
      console.log(`  - ID: ${commission._id}`);
      console.log(`    Type: ${commission.commissionType}`);
      console.log(`    UserId: ${commission.userId}`);
      console.log(`    FromUserId: ${commission.fromUserId}`);
      console.log(`    PurchaseId: ${commission.purchaseId}`);
      console.log(`    Amount: ${commission.amount}`);
      console.log(`    Status: ${commission.status}`);
      console.log(`    Metadata: ${JSON.stringify(commission.metadata)}`);
    }

    // Verificar condiciones para comisión directa
    console.log(`\n🔍 Verificando condiciones para comisión directa:`);
    
    if (purchasesB.length > 0) {
      const purchaseB = purchasesB[0]; // La más reciente
      console.log(`✓ User B tiene compra: ${purchaseB._id}`);
      console.log(`✓ Status: ${purchaseB.status}`);
      console.log(`✓ FirstCycleCompleted: ${purchaseB.firstCycleCompleted}`);
      console.log(`✓ Amount: ${purchaseB.amount}`);
      
      // Verificar si cumple condiciones del nuevo enfoque
      const isEligible = purchaseB.status === 'completed' && purchaseB.firstCycleCompleted === true;
      console.log(`\n🎯 ¿Elegible para comisión directa?: ${isEligible}`);
      
      if (!isEligible) {
        console.log(`❌ Razones por las que no es elegible:`);
        if (purchaseB.status !== 'completed') {
          console.log(`   - Status no es 'completed' (actual: ${purchaseB.status})`);
        }
        if (purchaseB.firstCycleCompleted !== true) {
          console.log(`   - FirstCycleCompleted no es true (actual: ${purchaseB.firstCycleCompleted})`);
        }
      }
    } else {
      console.log(`❌ User B no tiene compras`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

debugPurchaseFlow();