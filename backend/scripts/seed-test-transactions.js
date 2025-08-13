const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction.model.js');
const User = require('../src/models/User.js');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function seedTestTransactions() {
  try {
    console.log('🌱 Iniciando seed de transacciones de prueba...');
    
    // Buscar un usuario existente para asignar las transacciones
    const users = await User.find({ role: 'user' }).limit(3);
    
    if (users.length === 0) {
      console.log('❌ No se encontraron usuarios. Creando usuario de prueba...');
      
      const testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: '$2b$10$dummy.hash.for.testing.purposes.only',
        role: 'user',
        status: 'active',
        profile: {
          firstName: 'Usuario',
          lastName: 'Prueba'
        }
      });
      
      await testUser.save();
      users.push(testUser);
      console.log('✅ Usuario de prueba creado');
    }
    
    // Eliminar transacciones de prueba existentes
    await Transaction.deleteMany({ description: { $regex: /Transacción de prueba/ } });
    console.log('🗑️ Transacciones de prueba anteriores eliminadas');
    
    const testTransactions = [];
    
    // Crear transacciones de diferentes tipos y estados
    const transactionTypes = ['deposit', 'pioneer_payment', 'package_purchase', 'withdrawal'];
    const statuses = ['completed', 'pending', 'failed'];
    const currencies = ['USDT'];
    
    for (let i = 0; i < 15; i++) {
      const user = users[i % users.length];
      const type = transactionTypes[i % transactionTypes.length];
      const status = statuses[i % statuses.length];
      const currency = currencies[i % currencies.length];
      
      const transaction = {
        user: user._id,
        transactionId: `TEST-${Date.now()}-${i.toString().padStart(3, '0')}`,
        amount: Math.floor(Math.random() * 5000) + 100, // Entre 100 y 5100
        currency,
        type,
        status,
        description: `Transacción de prueba ${i + 1} - ${type}`,
        payment: {
          method: 'crypto',
          network: 'BEP20',
          address: `0x${Math.random().toString(16).substr(2, 40)}`,
          txHash: status === 'completed' ? `0x${Math.random().toString(16).substr(2, 64)}` : null,
          confirmations: status === 'completed' ? Math.floor(Math.random() * 50) + 1 : 0
        },
        metadata: {
          packageName: type === 'package_purchase' ? `Paquete ${['Básico', 'Premium', 'VIP'][i % 3]}` : null,
          source: 'test_seed',
          testData: true
        },
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
        updatedAt: new Date()
      };
      
      testTransactions.push(transaction);
    }
    
    // Insertar transacciones
    const insertedTransactions = await Transaction.insertMany(testTransactions);
    console.log(`✅ ${insertedTransactions.length} transacciones de prueba creadas`);
    
    // Mostrar resumen
    const summary = await Transaction.aggregate([
      { $match: { description: { $regex: /Transacción de prueba/ } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    console.log('\n📊 Resumen de transacciones creadas:');
    summary.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} transacciones, $${stat.totalAmount.toLocaleString()}`);
    });
    
    console.log('\n🎉 Seed completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Ejecutar el seed
seedTestTransactions();