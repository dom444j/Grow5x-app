const mongoose = require('mongoose');
const Package = require('./src/models/Package.model');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const testPackages = [
  {
    name: 'Licencia Starter',
    slug: 'starter',
    description: 'Paquete básico para comenzar',
    price: 50,
    currency: 'USDT',
    category: 'starter',
    level: 1,
    duration: 45,
    status: 'active',
    benefitConfig: {
      dailyRate: 0.125, // 12.5%
      cyclesTotal: 5,
      daysPerCycle: 8,
      pauseDays: 1,
      totalPotential: 5.0 // 500%
    },
    commissionConfig: {
      directRate: 0.10, // 10%
      leaderRate: 0.05, // 5%
      parentRate: 0.05 // 5%
    },
    features: [
      { name: 'Herramienta autónoma de arbitraje con agentes IA', included: true },
      { name: 'Cashback 100% primera semana (8 días)', included: true },
      { name: '12.5% diario después de 24 horas cumplidas', included: true }
    ],
    benefits: [
      'Herramienta autónoma de arbitraje con agentes IA',
      'Cashback 100% primera semana (8 días)',
      '12.5% diario después de 24 horas cumplidas',
      'Comisión referido directo: 10% del cashback primera semana'
    ]
  },
  {
    name: 'Licencia Basic',
    slug: 'basic',
    description: 'Paquete intermedio con mejores beneficios',
    price: 100,
    currency: 'USDT',
    category: 'basic',
    level: 2,
    duration: 45,
    status: 'active',
    benefitConfig: {
      dailyRate: 0.125, // 12.5%
      cyclesTotal: 5,
      daysPerCycle: 8,
      pauseDays: 1,
      totalPotential: 5.0 // 500%
    },
    commissionConfig: {
      directRate: 0.10, // 10%
      leaderRate: 0.05, // 5%
      parentRate: 0.05 // 5%
    },
    features: [
      { name: 'Herramienta autónoma de arbitraje con agentes IA', included: true },
      { name: 'Cashback 100% primera semana (8 días)', included: true },
      { name: '12.5% diario después de 24 horas cumplidas', included: true }
    ],
    benefits: [
      'Herramienta autónoma de arbitraje con agentes IA',
      'Cashback 100% primera semana (8 días)',
      '12.5% diario después de 24 horas cumplidas',
      'Comisión referido directo: 10% del cashback primera semana'
    ]
  },
  {
    name: 'Licencia Standard',
    slug: 'standard',
    description: 'Paquete estándar con excelentes beneficios',
    price: 250,
    currency: 'USDT',
    category: 'standard',
    level: 3,
    duration: 45,
    status: 'active',
    isPopular: true,
    benefitConfig: {
      dailyRate: 0.125, // 12.5%
      cyclesTotal: 5,
      daysPerCycle: 8,
      pauseDays: 1,
      totalPotential: 5.0 // 500%
    },
    commissionConfig: {
      directRate: 0.10, // 10%
      leaderRate: 0.05, // 5%
      parentRate: 0.05 // 5%
    },
    features: [
      { name: 'Herramienta autónoma de arbitraje con agentes IA', included: true },
      { name: 'Cashback 100% primera semana (8 días)', included: true },
      { name: '12.5% diario después de 24 horas cumplidas', included: true }
    ],
    benefits: [
      'Herramienta autónoma de arbitraje con agentes IA',
      'Cashback 100% primera semana (8 días)',
      '12.5% diario después de 24 horas cumplidas',
      'Comisión referido directo: 10% del cashback primera semana'
    ]
  }
];

async function createTestPackages() {
  try {
    console.log('🚀 Creando paquetes de prueba...');
    
    // Eliminar paquetes existentes para evitar duplicados
    await Package.deleteMany({ slug: { $in: ['starter', 'basic', 'standard'] } });
    console.log('✅ Paquetes existentes eliminados');
    
    // Crear nuevos paquetes
    const createdPackages = await Package.insertMany(testPackages);
    console.log(`✅ ${createdPackages.length} paquetes creados exitosamente:`);
    
    createdPackages.forEach(pkg => {
      console.log(`   - ${pkg.name} (${pkg.category}) - $${pkg.price}`);
      console.log(`     Daily Rate: ${pkg.benefitConfig.dailyRate * 100}%`);
      console.log(`     Commission Rate: ${pkg.commissionConfig.directRate * 100}%`);
    });
    
    // Verificar que los paquetes tienen la configuración correcta
    const verification = await Package.find({ 
      category: { $in: ['starter', 'basic', 'standard'] },
      status: 'active'
    });
    
    console.log('\n🔍 Verificación de configuración:');
    verification.forEach(pkg => {
      const hasConfig = pkg.benefitConfig && pkg.benefitConfig.dailyRate;
      console.log(`   - ${pkg.category}: ${hasConfig ? '✅' : '❌'} benefitConfig`);
    });
    
    console.log('\n🎯 Paquetes de prueba listos para smoke test');
    
  } catch (error) {
    console.error('❌ Error creando paquetes:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestPackages();