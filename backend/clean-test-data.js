const { MongoClient } = require('mongodb');
require('dotenv').config();

async function cleanTestData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🧹 Iniciando limpieza de datos de prueba...');
    
    // 1. Eliminar usuarios de prueba
    const testUsersResult = await db.collection('users').deleteMany({
      $or: [
        { email: { $regex: '.*test\.com' } },
        { fullName: { $regex: 'Test User' } },
        { 'metadata.isTest': true }
      ]
    });
    console.log(`✅ Usuarios de prueba eliminados: ${testUsersResult.deletedCount}`);
    
    // 2. Eliminar transacciones de prueba
    const testTransactionsResult = await db.collection('transactions').deleteMany({
      $or: [
        { 'metadata.isTest': true },
        { description: { $regex: 'test|Test|TEST' } },
        { notes: { $regex: 'test|Test|TEST' } }
      ]
    });
    console.log(`✅ Transacciones de prueba eliminadas: ${testTransactionsResult.deletedCount}`);
    
    // 3. Eliminar comisiones de prueba
    const testCommissionsResult = await db.collection('commissions').deleteMany({
      $or: [
        { 'metadata.isTest': true },
        { 'metadata.testType': { $exists: true } }
      ]
    });
    console.log(`✅ Comisiones de prueba eliminadas: ${testCommissionsResult.deletedCount}`);
    
    // 4. Eliminar pagos de prueba
    const testPaymentsResult = await db.collection('payments').deleteMany({
      $or: [
        { 'metadata.isTest': true },
        { description: { $regex: 'test|Test|TEST' } },
        { notes: { $regex: 'test|Test|TEST' } }
      ]
    });
    console.log(`✅ Pagos de prueba eliminados: ${testPaymentsResult.deletedCount}`);
    
    // 5. Verificar estado de las colecciones principales
    console.log('\n📊 Estado actual de las colecciones:');
    
    const collections = ['users', 'transactions', 'commissions', 'payments', 'packages', 'wallets'];
    
    for (const collectionName of collections) {
      const count = await db.collection(collectionName).countDocuments();
      console.log(`   ${collectionName}: ${count} documentos`);
    }
    
    // 6. Verificar usuarios reales
    console.log('\n👥 Usuarios reales en el sistema:');
    const realUsers = await db.collection('users').find({
      email: { $not: { $regex: '.*test\.com' } },
      'metadata.isTest': { $ne: true }
    }).toArray();
    
    realUsers.forEach(user => {
      console.log(`   📧 ${user.email} - ${user.fullName || 'Sin nombre'} - ${user.role || 'user'}`);
    });
    
    // 7. Verificar paquetes activos
    console.log('\n📦 Paquetes disponibles:');
    const packages = await db.collection('packages').find({ status: 'active' }).toArray();
    packages.forEach(pkg => {
      console.log(`   💰 ${pkg.name} - $${pkg.price} ${pkg.currency} - ${pkg.category}`);
    });
    
    // 8. Verificar billeteras activas
    console.log('\n💳 Billeteras activas:');
    const wallets = await db.collection('wallets').find({ status: 'active' }).toArray();
    wallets.forEach(wallet => {
      console.log(`   🔗 ${wallet.address} - ${wallet.currency} - ${wallet.network}`);
    });
    
    console.log('\n✅ Limpieza de datos de prueba completada');
    console.log('🔗 Sistema conectado a MongoDB Atlas');
    console.log('📊 Todas las tablas verificadas');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    await client.close();
  }
}

cleanTestData();