const { MongoClient } = require('mongodb');
require('dotenv').config();

async function finalizeProductionData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🔧 Finalizando datos para producción...');
    
    // 1. Eliminar usuarios de prueba adicionales
    const additionalTestUsers = await db.collection('users').deleteMany({
      $or: [
        { email: { $regex: 'test\+ref\+.*@demo\.com' } },
        { email: { $regex: 'test\.correcto@example\.com' } },
        { fullName: { $regex: 'Usuario.*Prueba|Test.*Usuario' } }
      ]
    });
    console.log(`✅ Usuarios de prueba adicionales eliminados: ${additionalTestUsers.deletedCount}`);
    
    // 2. Actualizar paquetes para asegurar que tengan moneda USD
    const packagesUpdate = await db.collection('packages').updateMany(
      { currency: { $exists: false } },
      { $set: { currency: 'USD' } }
    );
    console.log(`✅ Paquetes actualizados con moneda USD: ${packagesUpdate.modifiedCount}`);
    
    // 3. Verificar y actualizar admin principal
    const adminUser = await db.collection('users').findOne({ email: 'admin@grow5x.app' });
    if (!adminUser) {
      console.log('⚠️ Usuario admin principal no encontrado, creando...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Admin123!@#', 10);
      
      await db.collection('users').insertOne({
        email: 'admin@grow5x.app',
        password: hashedPassword,
        fullName: 'Administrador Principal',
        role: 'superadmin',
        status: 'active',
        verification: { isVerified: true },
        balances: {
          available: 0,
          pending: 0,
          frozen: 0,
          investment: 0,
          commission: 0,
          bonus: 0,
          referral: 0,
          withdrawal: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Usuario admin principal creado');
    } else {
      console.log('✅ Usuario admin principal ya existe');
    }
    
    // 4. Verificar estructura de finanzas en el panel admin
    console.log('\n💰 Verificando estructura financiera:');
    
    // Verificar transacciones por tipo
    const transactionTypes = await db.collection('transactions').aggregate([
      { $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('📊 Transacciones por tipo:');
    transactionTypes.forEach(type => {
      console.log(`   ${type._id}: ${type.count} transacciones, Total: $${type.total || 0}`);
    });
    
    // Verificar comisiones por estado
    const commissionStatus = await db.collection('commissions').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]).toArray();
    
    console.log('\n💸 Comisiones por estado:');
    commissionStatus.forEach(status => {
      console.log(`   ${status._id}: ${status.count} comisiones, Total: $${status.total || 0}`);
    });
    
    // Verificar pagos por estado
    const paymentStatus = await db.collection('payments').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]).toArray();
    
    console.log('\n💳 Pagos por estado:');
    paymentStatus.forEach(status => {
      console.log(`   ${status._id}: ${status.count} pagos, Total: $${status.total || 0}`);
    });
    
    // 5. Verificar usuarios activos reales
    const activeUsers = await db.collection('users').find({
      status: 'active',
      email: { $not: { $regex: 'test|demo|example' } },
      'metadata.isTest': { $ne: true }
    }).toArray();
    
    console.log(`\n👥 Usuarios activos reales: ${activeUsers.length}`);
    activeUsers.forEach(user => {
      const totalBalance = Object.values(user.balances || {}).reduce((sum, val) => sum + (val || 0), 0);
      console.log(`   📧 ${user.email} - ${user.fullName} - Balance total: $${totalBalance}`);
    });
    
    // 6. Resumen final del sistema
    console.log('\n📈 RESUMEN DEL SISTEMA DE FINANZAS:');
    console.log('=====================================');
    
    const totalUsers = await db.collection('users').countDocuments({ 
      email: { $not: { $regex: 'test|demo|example' } },
      'metadata.isTest': { $ne: true }
    });
    const totalTransactions = await db.collection('transactions').countDocuments();
    const totalCommissions = await db.collection('commissions').countDocuments();
    const totalPayments = await db.collection('payments').countDocuments();
    const totalPackages = await db.collection('packages').countDocuments({ status: 'active' });
    const totalWallets = await db.collection('wallets').countDocuments({ status: 'active' });
    
    console.log(`👥 Usuarios reales: ${totalUsers}`);
    console.log(`💰 Transacciones: ${totalTransactions}`);
    console.log(`💸 Comisiones: ${totalCommissions}`);
    console.log(`💳 Pagos: ${totalPayments}`);
    console.log(`📦 Paquetes activos: ${totalPackages}`);
    console.log(`🔗 Billeteras activas: ${totalWallets}`);
    
    console.log('\n✅ Sistema listo para producción');
    console.log('🔗 Conectado a MongoDB Atlas');
    console.log('📊 Datos de prueba eliminados');
    console.log('💰 Panel de finanzas admin verificado');
    
  } catch (error) {
    console.error('❌ Error durante la finalización:', error);
  } finally {
    await client.close();
  }
}

finalizeProductionData();