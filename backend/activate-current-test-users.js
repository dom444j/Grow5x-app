const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority';

async function activateCurrentTestUsers() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db();
    
    // Buscar los usuarios más recientes de test (últimos 10 minutos)
    const recentTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutos atrás
    
    const recentTestUsers = await db.collection('users').find({
      $and: [
        {
          $or: [
            { email: { $regex: /^usera\+.*@test\.com$/ } },
            { email: { $regex: /^userb\+.*@test\.com$/ } },
            { 'metadata.isTest': true }
          ]
        },
        {
          createdAt: { $gte: recentTime }
        }
      ]
    }).toArray();
    
    console.log(`\n📊 Usuarios de test recientes encontrados: ${recentTestUsers.length}`);
    
    if (recentTestUsers.length === 0) {
      console.log('\n⚠️ No se encontraron usuarios de test recientes. Buscando todos los usuarios de test...');
      
      const allTestUsers = await db.collection('users').find({
        $or: [
          { email: { $regex: /^usera\+.*@test\.com$/ } },
          { email: { $regex: /^userb\+.*@test\.com$/ } },
          { 'metadata.isTest': true }
        ]
      }).sort({ createdAt: -1 }).limit(10).toArray();
      
      console.log(`\n📊 Últimos 10 usuarios de test: ${allTestUsers.length}`);
      
      for (const user of allTestUsers) {
        console.log(`\n👤 Usuario: ${user.email}`);
        console.log(`   Creado: ${user.createdAt}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   isActive: ${user.isActive}`);
        console.log(`   emailVerified: ${user.emailVerified}`);
        
        // Forzar activación completa
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
              updatedAt: new Date(),
              // Agregar campos adicionales que podrían estar faltando
              isLocked: false,
              loginAttempts: 0,
              'metadata.isTest': true,
              'metadata.forceActive': true
            },
            $unset: {
              lockUntil: 1
            }
          }
        );
        
        console.log(`   ✅ Actualizado: ${updateResult.modifiedCount} documento(s)`);
      }
    } else {
      for (const user of recentTestUsers) {
        console.log(`\n👤 Usuario reciente: ${user.email}`);
        console.log(`   Creado: ${user.createdAt}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   isActive: ${user.isActive}`);
        console.log(`   emailVerified: ${user.emailVerified}`);
        
        // Forzar activación completa
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
              updatedAt: new Date(),
              // Agregar campos adicionales que podrían estar faltando
              isLocked: false,
              loginAttempts: 0,
              'metadata.isTest': true,
              'metadata.forceActive': true
            },
            $unset: {
              lockUntil: 1
            }
          }
        );
        
        console.log(`   ✅ Actualizado: ${updateResult.modifiedCount} documento(s)`);
      }
    }
    
    // Verificar el estado final
    console.log('\n🔍 Verificando estado final de usuarios de test...');
    const finalCheck = await db.collection('users').find({
      $or: [
        { email: { $regex: /^usera\+.*@test\.com$/ } },
        { email: { $regex: /^userb\+.*@test\.com$/ } },
        { 'metadata.isTest': true }
      ]
    }).sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log(`\n📊 Estado final de usuarios de test:`);
    finalCheck.forEach(user => {
      const isFullyActive = user.status === 'active' && user.isActive && user.emailVerified && !user.isLocked;
      console.log(`   ${isFullyActive ? '✅' : '❌'} ${user.email}: status=${user.status}, isActive=${user.isActive}, emailVerified=${user.emailVerified}, isLocked=${user.isLocked}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

activateCurrentTestUsers();