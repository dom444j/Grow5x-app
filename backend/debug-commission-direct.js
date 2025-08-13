// Debug script para diagnosticar comisión directa 10%
const { MongoClient, ObjectId } = require('mongodb');

// Configuración
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority';
const PURCHASE_ID = '6898776f6478dae49eb0b467'; // Del último smoke test

async function debugDirectCommission() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('growx5');
    
    console.log('🔍 DIAGNÓSTICO COMISIÓN DIRECTA 10%');
    console.log('=====================================');
    
    const P = new ObjectId(PURCHASE_ID);
    
    // 1. Chequeo de COMPRA
    console.log('\n1. 📦 COMPRA:');
    const purchase = await db.collection('purchases').findOne(
      { _id: P }, 
      { userId: 1, status: 1, firstCycleCompleted: 1, amount: 1, netAmount: 1, price: 1 }
    );
    console.log('Purchase:', JSON.stringify(purchase, null, 2));
    
    if (!purchase) {
      console.log('❌ COMPRA NO ENCONTRADA');
      return;
    }
    
    const hasFirstCycle = purchase.firstCycleCompleted === true;
    const isCompleted = purchase.status === 'completed' || purchase.status === 'pending';
    console.log(`✅ firstCycleCompleted: ${hasFirstCycle}`);
    console.log(`✅ status válido: ${isCompleted} (${purchase.status})`);
    
    // 2. Chequeo de SPONSOR
    console.log('\n2. 👤 SPONSOR:');
    const U = purchase.userId;
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(U) }, 
      { referredBy: 1 }
    );
    console.log('User:', JSON.stringify(user, null, 2));
    
    const sponsorId = user?.referredBy;
    const hasSponsor = sponsorId && sponsorId !== null;
    console.log(`✅ tiene sponsor: ${hasSponsor} (${sponsorId})`);
    
    if (!hasSponsor) {
      console.log('❌ NO TIENE SPONSOR - No se puede crear comisión directa');
      return;
    }
    
    // 3. Chequeo de BENEFITS (≥8)
    console.log('\n3. 💰 BENEFITS:');
    const benefitsCount = await db.collection('transactions').countDocuments({
      user_id: new ObjectId(U),
      type: 'benefit',
      status: 'completed',
      'metadata.purchaseId': P
    });
    console.log(`Benefits completados: ${benefitsCount}`);
    console.log(`✅ suficientes benefits: ${benefitsCount >= 8}`);
    
    // 4. Chequeo de COMISIÓN EXISTENTE
    console.log('\n4. 🔍 COMISIÓN EXISTENTE:');
    const existingCommission = await db.collection('commissions').findOne({
      commissionType: 'direct_referral',
      userId: new ObjectId(sponsorId),
      fromUserId: new ObjectId(U),
      purchaseId: P
    });
    console.log('Comisión existente:', JSON.stringify(existingCommission, null, 2));
    
    const commissionExists = !!existingCommission;
    console.log(`✅ comisión ya existe: ${commissionExists}`);
    
    // 5. Chequeo de ÍNDICES
    console.log('\n5. 📋 ÍNDICES:');
    const indexes = await db.collection('commissions').indexes();
    console.log('Índices en commissions:');
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // RESUMEN
    console.log('\n📊 RESUMEN:');
    console.log('===========');
    console.log(`Purchase ID: ${PURCHASE_ID}`);
    console.log(`User ID: ${U}`);
    console.log(`Sponsor ID: ${sponsorId}`);
    console.log(`✅ Compra válida: ${hasFirstCycle && isCompleted}`);
    console.log(`✅ Tiene sponsor: ${hasSponsor}`);
    console.log(`✅ Benefits suficientes: ${benefitsCount >= 8}`);
    console.log(`✅ Comisión NO existe: ${!commissionExists}`);
    
    const shouldCreateCommission = hasFirstCycle && isCompleted && hasSponsor && benefitsCount >= 8 && !commissionExists;
    console.log(`\n🎯 DEBERÍA CREAR COMISIÓN: ${shouldCreateCommission}`);
    
    if (shouldCreateCommission) {
      console.log('\n💡 TODOS LOS REQUISITOS SE CUMPLEN - La comisión debería crearse');
    } else {
      console.log('\n⚠️  ALGÚN REQUISITO FALLA - Revisar condiciones');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

debugDirectCommission().catch(console.error);