const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority';

class RealtimeUserActivator {
  constructor() {
    this.client = null;
    this.db = null;
    this.isRunning = false;
    this.intervalId = null;
  }

  async connect() {
    this.client = new MongoClient(MONGO_URI);
    await this.client.connect();
    this.db = this.client.db();
    console.log('✅ Conectado a MongoDB para monitoreo en tiempo real');
  }

  async activateTestUsers() {
    try {
      // Buscar usuarios de test que no estén activos
      const inactiveTestUsers = await this.db.collection('users').find({
        $and: [
          {
            $or: [
              { email: { $regex: /^usera\+.*@test\.com$/ } },
              { email: { $regex: /^userb\+.*@test\.com$/ } },
              { 'metadata.isTest': true }
            ]
          },
          {
            $or: [
              { status: { $ne: 'active' } },
              { isActive: { $ne: true } },
              { emailVerified: { $ne: true } },
              { isLocked: true }
            ]
          }
        ]
      }).toArray();

      if (inactiveTestUsers.length > 0) {
        console.log(`\n🔧 Encontrados ${inactiveTestUsers.length} usuarios de test inactivos, activando...`);
        
        for (const user of inactiveTestUsers) {
          console.log(`   📝 Activando: ${user.email} (status: ${user.status}, isActive: ${user.isActive})`);
          
          const updateResult = await this.db.collection('users').updateOne(
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
                isLocked: false,
                loginAttempts: 0,
                'metadata.isTest': true,
                'metadata.forceActive': true,
                'metadata.activatedBy': 'realtime-activator'
              },
              $unset: {
                lockUntil: 1
              }
            }
          );
          
          if (updateResult.modifiedCount > 0) {
            console.log(`   ✅ Usuario ${user.email} activado exitosamente`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error activando usuarios:', error.message);
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ El activador ya está ejecutándose');
      return;
    }

    await this.connect();
    this.isRunning = true;
    
    console.log('🚀 Iniciando monitoreo en tiempo real de usuarios de test...');
    console.log('   Verificando cada 3 segundos...');
    console.log('   Presiona Ctrl+C para detener\n');

    // Activación inicial
    await this.activateTestUsers();

    // Monitoreo continuo cada 3 segundos
    this.intervalId = setInterval(async () => {
      await this.activateTestUsers();
    }, 3000);

    // Manejar cierre graceful
    process.on('SIGINT', async () => {
      console.log('\n🛑 Deteniendo monitoreo...');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Deteniendo monitoreo...');
      await this.stop();
      process.exit(0);
    });
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    
    if (this.client) {
      await this.client.close();
      console.log('🔌 Desconectado de MongoDB');
    }
  }
}

// Ejecutar el activador
const activator = new RealtimeUserActivator();
activator.start().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});