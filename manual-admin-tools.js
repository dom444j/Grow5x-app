/**
 * Herramientas de Gestión Manual para Administradores
 * Script para realizar acciones administrativas directas en MongoDB
 * Uso: node manual-admin-tools.js <accion> <parametros>
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

class AdminTools {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db();
      console.log('✅ Conectado a MongoDB');
    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error.message);
      process.exit(1);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Desconectado de MongoDB');
    }
  }

  /**
   * 1. Activar usuario manualmente
   * Efecto: emailVerified=true, status='active'
   */
  async activateUser(userId) {
    try {
      const result = await this.db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            emailVerified: true,
            status: 'active',
            'verification.isVerified': true,
            'verification.verifiedAt': new Date(),
            'verification.verifiedBy': 'manual-admin-tool',
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        console.log('❌ Usuario no encontrado');
        return false;
      }

      console.log(`✅ Usuario ${userId} activado exitosamente`);
      return true;
    } catch (error) {
      console.error('❌ Error activando usuario:', error.message);
      return false;
    }
  }

  /**
   * 2. Asignar paquete/licencia manual
   * Crea Purchase + activa License/Package asociado
   */
  async assignPackage(userId, packageSlug = 'starter', amount = 100) {
    try {
      // Buscar el paquete
      const packageDoc = await this.db.collection('packages').findOne({ slug: packageSlug });
      if (!packageDoc) {
        console.log(`❌ Paquete '${packageSlug}' no encontrado`);
        return false;
      }

      // Crear la compra
      const purchase = {
        userId: new ObjectId(userId),
        productId: packageDoc._id,
        packageSlug: packageSlug,
        amount: Number(amount),
        paymentMethod: 'manual-admin',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          assignedBy: 'manual-admin-tool',
          reason: 'Manual assignment by admin'
        }
      };

      const purchaseResult = await this.db.collection('purchases').insertOne(purchase);
      
      // Crear/actualizar la licencia
      const license = {
        userId: new ObjectId(userId),
        packageId: packageDoc._id,
        packageSlug: packageSlug,
        status: 'active',
        purchaseId: purchaseResult.insertedId,
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.db.collection('licenses').insertOne(license);

      console.log(`✅ Paquete '${packageSlug}' asignado al usuario ${userId}`);
      console.log(`💰 Monto: $${amount}`);
      console.log(`📄 Purchase ID: ${purchaseResult.insertedId}`);
      return true;
    } catch (error) {
      console.error('❌ Error asignando paquete:', error.message);
      return false;
    }
  }

  /**
   * 3. Liquidar comisión directa manual
   * Crea Commission type 'direct_referral'
   */
  async createDirectCommission(sponsorId, fromUserId, purchaseId, amount = 10, percentage = 10) {
    try {
      const commission = {
        userId: new ObjectId(sponsorId),
        fromUserId: new ObjectId(fromUserId),
        commissionType: 'direct_referral',
        amount: Number(amount),
        currency: 'USDT',
        status: 'pending',
        purchaseId: new ObjectId(purchaseId),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          percentage: Number(percentage),
          baseAmount: Number(amount) * 100 / Number(percentage),
          createdBy: 'manual-admin-tool',
          reason: 'Manual commission creation by admin'
        }
      };

      const result = await this.db.collection('commissions').insertOne(commission);
      
      console.log(`✅ Comisión directa creada`);
      console.log(`👤 Sponsor: ${sponsorId}`);
      console.log(`👤 From User: ${fromUserId}`);
      console.log(`💰 Monto: $${amount} USDT`);
      console.log(`📄 Commission ID: ${result.insertedId}`);
      return true;
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️  Comisión ya existe (índice único)');
      } else {
        console.error('❌ Error creando comisión:', error.message);
      }
      return false;
    }
  }

  /**
   * Listar usuarios que necesitan atención
   */
  async listUsersNeedingAttention() {
    try {
      const users = await this.db.collection('users').find({
        $or: [
          { status: 'pending' },
          { status: 'inactive' },
          { 'verification.isVerified': { $ne: true } },
          { emailVerified: { $ne: true } }
        ]
      }).limit(20).toArray();

      console.log(`\n📋 Usuarios que necesitan atención (${users.length}):`);
      users.forEach(user => {
        console.log(`- ${user._id} | ${user.email} | Status: ${user.status} | Verified: ${user.verification?.isVerified || false}`);
      });
      
      return users;
    } catch (error) {
      console.error('❌ Error listando usuarios:', error.message);
      return [];
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const action = args[0];
  
  if (!action) {
    console.log(`
🛠️  Herramientas de Gestión Manual - Grow5X Admin
`);
    console.log('Uso: node manual-admin-tools.js <accion> <parametros>\n');
    console.log('Acciones disponibles:');
    console.log('  activate-user <userId>                    - Activar usuario');
    console.log('  assign-package <userId> [slug] [amount]   - Asignar paquete');
    console.log('  create-commission <sponsorId> <fromUserId> <purchaseId> [amount] [percentage]');
    console.log('  list-attention                            - Listar usuarios que necesitan atención\n');
    console.log('Ejemplos:');
    console.log('  node manual-admin-tools.js activate-user 66b8f123456789abcdef0001');
    console.log('  node manual-admin-tools.js assign-package 66b8f123456789abcdef0001 starter 100');
    console.log('  node manual-admin-tools.js list-attention');
    process.exit(0);
  }

  const tools = new AdminTools();
  await tools.connect();

  try {
    switch (action) {
      case 'activate-user':
        if (!args[1]) {
          console.log('❌ Falta el userId');
          break;
        }
        await tools.activateUser(args[1]);
        break;

      case 'assign-package':
        if (!args[1]) {
          console.log('❌ Falta el userId');
          break;
        }
        await tools.assignPackage(args[1], args[2] || 'starter', args[3] || 100);
        break;

      case 'create-commission':
        if (!args[1] || !args[2] || !args[3]) {
          console.log('❌ Faltan parámetros: sponsorId, fromUserId, purchaseId');
          break;
        }
        await tools.createDirectCommission(args[1], args[2], args[3], args[4] || 10, args[5] || 10);
        break;

      case 'list-attention':
        await tools.listUsersNeedingAttention();
        break;

      default:
        console.log(`❌ Acción '${action}' no reconocida`);
    }
  } catch (error) {
    console.error('❌ Error ejecutando acción:', error.message);
  } finally {
    await tools.disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AdminTools;