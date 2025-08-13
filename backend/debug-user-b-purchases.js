const mongoose = require('mongoose');
const Purchase = require('./src/models/Purchase.model');
const Transaction = require('./src/models/Transaction.model');
const Commission = require('./src/models/Commission.model');
const User = require('./src/models/User');

require('dotenv').config();

async function debugUserBPurchases() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Conectado a MongoDB');
    
    // Buscar usuarios de prueba
    const testUsers = await User.find({
      $or: [
        { email: /test/i },
        { email: /userb/i },
        { email: /user.*b/i },
        { username: /test/i },
        { username: /userb/i }
      ]
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`\n👥 Usuarios de prueba encontrados (${testUsers.length}):`);
    for (const user of testUsers) {
      console.log(`- ${user.email} (${user.username}) - ID: ${user._id}`);
    }
    
    // Buscar el User B más reciente (probablemente el del smoke test)
    let userB = testUsers.find(u => u.email.includes('userb') || u.username?.includes('userb'));
    
    if (!userB && testUsers.length > 0) {
      // Si no hay userb específico, tomar el más reciente
      userB = testUsers[0];
      console.log(`\n⚠️ Usando usuario más reciente como User B: ${userB.email}`);
    }
    
    if (!userB) {
      console.log('❌ No se encontró ningún usuario de prueba');
      return;
    }
    
    console.log(`\n👤 Analizando User B: ${userB.email} (${userB._id})`);
    
    // Revisar compras de User B
    const purchases = await Purchase.find({ userId: userB._id }).sort({ createdAt: -1 });
    console.log(`\n📦 Compras de User B (${purchases.length}):`);
    
    for (const purchase of purchases) {
      console.log(`- ID: ${purchase._id}`);
      console.log(`  Status: ${purchase.status}`);
      console.log(`  Amount: ${purchase.amount}`);
      console.log(`  FirstCycleCompleted: ${purchase.firstCycleCompleted}`);
      console.log(`  CompletedAt: ${purchase.completedAt}`);
      console.log(`  CreatedAt: ${purchase.createdAt}`);
      
      // Contar transacciones de beneficios para esta compra
      const benefitCount = await Transaction.countDocuments({
        user: userB._id,
        type: 'earnings',
        subtype: 'auto_earnings',
        status: 'completed',
        "metadata.purchaseId": purchase._id.toString()
      });
      
      console.log(`  Benefits completados: ${benefitCount}/8`);
      
      // Verificar comisiones existentes
      const commissions = await Commission.find({
        fromUserId: userB._id,
        commissionType: 'direct_referral',
        purchaseId: purchase._id.toString()
      });
      
      console.log(`  Comisiones directas: ${commissions.length}`);
      if (commissions.length > 0) {
        commissions.forEach((comm, idx) => {
          console.log(`    ${idx + 1}. Amount: ${comm.amount}, Status: ${comm.status}`);
        });
      }
      
      console.log('---');
    }
    
    // Verificar referidor de User B
    const userBWithRef = await User.findById(userB._id).populate('referredBy');
    if (userBWithRef.referredBy) {
      console.log(`\n👥 Referidor de User B: ${userBWithRef.referredBy.email} (${userBWithRef.referredBy._id})`);
    } else {
      console.log('\n❌ User B no tiene referidor');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugUserBPurchases();