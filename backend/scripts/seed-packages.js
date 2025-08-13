const mongoose = require('mongoose');
const Package = require('../models/Package.model.js');
const path = require('path');

// Cargar variables de entorno desde el directorio backend
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Paquetes predefinidos del sistema
const defaultPackages = [
  {
    name: 'Licencia Starter',
    slug: 'starter',
    description: 'Paquete inicial perfecto para comenzar tu journey en GrowX5',
    price: 50,
    currency: 'USDT',
    category: 'starter',
    level: 1,
    commissionRate: 10,
    maxEarnings: 75,
    duration: 365,
    features: [
      { name: 'Acceso básico a la plataforma', included: true },
      { name: 'Comisiones del 10%', included: true },
      { name: 'Soporte por email', included: true }
    ],
    benefits: [
      'Entrada al ecosistema GrowX5',
      'Comisiones por referidos',
      'Acceso a recursos básicos'
    ],
    isPopular: false,
    sortOrder: 1
  },
  {
    name: 'Licencia Basic',
    slug: 'basic',
    description: 'Ideal para usuarios que buscan mejores beneficios y comisiones',
    price: 100,
    currency: 'USDT',
    category: 'basic',
    level: 2,
    commissionRate: 15,
    maxEarnings: 175,
    duration: 365,
    features: [
      { name: 'Acceso completo a la plataforma', included: true },
      { name: 'Comisiones del 15%', included: true },
      { name: 'Soporte prioritario', included: true },
      { name: 'Recursos educativos', included: true }
    ],
    benefits: [
      'Mejores comisiones por referidos',
      'Acceso a contenido premium',
      'Soporte prioritario'
    ],
    isPopular: false,
    sortOrder: 2
  },
  {
    name: 'Licencia Standard',
    slug: 'standard',
    description: 'Paquete equilibrado con excelentes beneficios y retornos',
    price: 250,
    currency: 'USDT',
    category: 'standard',
    level: 3,
    commissionRate: 20,
    maxEarnings: 400,
    duration: 365,
    features: [
      { name: 'Acceso VIP a la plataforma', included: true },
      { name: 'Comisiones del 20%', included: true },
      { name: 'Soporte 24/7', included: true },
      { name: 'Webinars exclusivos', included: true },
      { name: 'Herramientas avanzadas', included: true }
    ],
    benefits: [
      'Comisiones superiores',
      'Acceso a webinars exclusivos',
      'Herramientas de análisis'
    ],
    isPopular: true,
    sortOrder: 3
  },
  {
    name: 'Licencia Premium',
    slug: 'premium',
    description: 'Para usuarios serios que buscan maximizar sus ganancias',
    price: 500,
    currency: 'USDT',
    category: 'premium',
    level: 4,
    commissionRate: 25,
    maxEarnings: 1000,
    duration: 365,
    features: [
      { name: 'Acceso Premium completo', included: true },
      { name: 'Comisiones del 25%', included: true },
      { name: 'Soporte dedicado', included: true },
      { name: 'Mentorías personalizadas', included: true },
      { name: 'Acceso a eventos VIP', included: true }
    ],
    benefits: [
      'Máximas comisiones',
      'Mentorías personalizadas',
      'Eventos exclusivos VIP'
    ],
    isPopular: false,
    sortOrder: 4
  },
  {
    name: 'Licencia Gold',
    slug: 'gold',
    description: 'Paquete de élite para inversores serios y líderes de equipo',
    price: 1000,
    currency: 'USDT',
    category: 'gold',
    level: 5,
    commissionRate: 30,
    maxEarnings: 2500,
    duration: 365,
    features: [
      { name: 'Acceso Gold exclusivo', included: true },
      { name: 'Comisiones del 30%', included: true },
      { name: 'Manager personal', included: true },
      { name: 'Estrategias avanzadas', included: true },
      { name: 'Red de contactos elite', included: true }
    ],
    benefits: [
      'Comisiones de élite',
      'Manager personal dedicado',
      'Red de contactos exclusiva'
    ],
    isPopular: false,
    sortOrder: 5
  },
  {
    name: 'Licencia Platinum',
    slug: 'platinum',
    description: 'El paquete más exclusivo para verdaderos líderes del mercado',
    price: 2500,
    currency: 'USDT',
    category: 'platinum',
    level: 6,
    commissionRate: 35,
    maxEarnings: 6000,
    duration: 365,
    features: [
      { name: 'Acceso Platinum ilimitado', included: true },
      { name: 'Comisiones del 35%', included: true },
      { name: 'Equipo de soporte dedicado', included: true },
      { name: 'Inversiones institucionales', included: true },
      { name: 'Participación en decisiones', included: true }
    ],
    benefits: [
      'Máximas comisiones disponibles',
      'Equipo dedicado completo',
      'Participación en governance'
    ],
    isPopular: false,
    sortOrder: 6
  },
  {
    name: 'Licencia Diamond',
    slug: 'diamond',
    description: 'El nivel más alto de membresía, reservado para verdaderos visionarios',
    price: 5000,
    currency: 'USDT',
    category: 'diamond',
    level: 7,
    commissionRate: 40,
    maxEarnings: 15000,
    duration: 365,
    features: [
      { name: 'Acceso Diamond completo', included: true },
      { name: 'Comisiones del 40%', included: true },
      { name: 'Socio estratégico', included: true },
      { name: 'Participación en ganancias', included: true },
      { name: 'Acceso a roadmap', included: true }
    ],
    benefits: [
      'Comisiones máximas del sistema',
      'Estatus de socio estratégico',
      'Participación en roadmap'
    ],
    isPopular: false,
    sortOrder: 7
  }
];

async function seedPackages() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existen paquetes
    const existingPackages = await Package.countDocuments();
    
    if (existingPackages > 0) {
      console.log(`⚠️  Ya existen ${existingPackages} paquetes en la base de datos`);
      console.log('Actualizando paquetes existentes...');
    }

    console.log('🌱 Iniciando seed de paquetes...');

    for (const packageData of defaultPackages) {
      try {
        // Buscar si ya existe el paquete por slug
        const existingPackage = await Package.findOne({ slug: packageData.slug });
        
        if (existingPackage) {
          // Actualizar paquete existente
          await Package.findOneAndUpdate(
            { slug: packageData.slug },
            packageData,
            { new: true, runValidators: false }
          );
          console.log(`✅ Actualizado: ${packageData.name}`);
        } else {
          // Crear nuevo paquete
          const newPackage = new Package(packageData);
          await newPackage.save({ validateBeforeSave: false });
          console.log(`✅ Creado: ${packageData.name}`);
        }
      } catch (error) {
        console.error(`❌ Error con ${packageData.name}:`, error.message);
        console.error('Stack:', error.stack);
      }
    }

    // Mostrar resumen
    const totalPackages = await Package.countDocuments();
    const activePackages = await Package.countDocuments({ status: 'active' });
    
    console.log('\n📊 Resumen:');
    console.log(`- Total de paquetes: ${totalPackages}`);
    console.log(`- Paquetes activos: ${activePackages}`);
    console.log(`- Paquetes inactivos: ${totalPackages - activePackages}`);

    console.log('\n🎉 Seed de paquetes completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedPackages();
}

module.exports = { seedPackages, defaultPackages };