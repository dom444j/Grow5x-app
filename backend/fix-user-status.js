const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority';

async function fixUserStatus() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db();
    
    // Buscar usuarios de test que no estén activos
    const testUsers = await db.collection('users').find({
      $or: [
        { email: { $regex: /.*@test\.com$/ } },
        { 'metadata.isTest': true },
        { fullName: { $regex: /Test/ } }
      ]
    }).toArray();
    
    console.log(`\n📊 Usuarios de test encontrados: ${testUsers.length}`);
    
    for (const user of testUsers) {
      console.log(`\n👤 Usuario: ${user.email}`);
      console.log(`   Status actual: ${user.status}`);
      console.log(`   isActive: ${user.isActive}`);
      console.log(`   emailVerified: ${user.emailVerified}`);
      
      if (user.status !== 'active' || !user.isActive || !user.emailVerified) {
        console.log('   🔄 Actualizando usuario...');
        
        const updateResult = await db.collection('users').updateOne(
          { _id: user._id },
          {
            $set: {
              status: 'active',
              isActive: true,
              emailVerified: true,
              isEmailVerified: true,
              'verification.isVerified': true,
              'verification.verifiedAt': new Date(),
              verifiedAt: new Date(),
              updatedAt: new Date()
            }
          }
        );
        
        console.log(`   ✅ Actualizado: ${updateResult.modifiedCount} documento(s)`);
      } else {
        console.log('   ✅ Usuario ya está activo');
      }
    }
    
    // Verificar usuarios después de la actualización
    console.log('\n🔍 Verificando usuarios después de la actualización...');
    const updatedUsers = await db.collection('users').find({
      $or: [
        { email: { $regex: /.*@test\.com$/ } },
        { 'metadata.isTest': true },
        { fullName: { $regex: /Test/ } }
      ]
    }).toArray();
    
    const activeUsers = updatedUsers.filter(u => u.status === 'active' && u.isActive && u.emailVerified);
    const inactiveUsers = updatedUsers.filter(u => u.status !== 'active' || !u.isActive || !u.emailVerified);
    
    console.log(`\n📊 Resumen final:`);
    console.log(`   ✅ Usuarios activos: ${activeUsers.length}`);
    console.log(`   ❌ Usuarios inactivos: ${inactiveUsers.length}`);
    
    if (inactiveUsers.length > 0) {
      console.log('\n❌ Usuarios que siguen inactivos:');
      inactiveUsers.forEach(user => {
        console.log(`   - ${user.email}: status=${user.status}, isActive=${user.isActive}, emailVerified=${user.emailVerified}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

fixUserStatus();