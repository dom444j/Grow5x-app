const Package = require('../src/models/Package.model');
const User = require('../src/models/User');
const Portfolio = require('../src/models/Portfolio.model');
const logger = require('../src/utils/logger');

/**
 * @desc    Get all available packages (licenses)
 * @route   GET /api/packages
 * @access  Public
 */
exports.getAvailablePackages = async (req, res) => {
  try {
    // Obtener todos los paquetes activos
    const packages = await Package.find({ status: 'active' })
      .select('name description price status features images duration benefits limits isPopular')
      .sort({ price: 1 });

    // Transformar los paquetes al formato esperado por el frontend
    const formattedPackages = packages.map(pkg => {
      // Crear un slug basado en el nombre del paquete
      const slug = pkg.name.toLowerCase()
        .replace('licencia ', '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      return {
        id: slug, // Usar slug como ID para compatibilidad con frontend
        _id: pkg._id, // Mantener el ID original para referencia
        name: pkg.name,
        description: pkg.description,
        slug: slug,
        price: pkg.price,
        duration: pkg.duration,
        weeks: Math.round(pkg.duration / 7 * 10) / 10, // Convertir días a semanas con un decimal
        paymentType: 'Diario',
        features: (pkg.features || []).map(feature => {
          // Asegurar que siempre devolvemos un string simple
          if (typeof feature === 'string') {
            return feature;
          }
          
          // Si es un objeto, intentar extraer el texto
          if (typeof feature === 'object' && feature !== null) {
            // Si tiene una propiedad 'name', 'text' o 'description', usarla
            if (feature.name) return String(feature.name);
            if (feature.text) return String(feature.text);
            if (feature.description) return String(feature.description);
            
            // Manejar objetos con índices numéricos (incluyendo objetos de Mongoose)
            const featureObj = feature.toObject ? feature.toObject() : feature;
            const keys = Object.keys(featureObj).filter(key => !isNaN(key) && key !== 'included' && key !== '_id').sort((a, b) => parseInt(a) - parseInt(b));
            if (keys.length > 0) {
              const reconstructedText = keys.map(key => featureObj[key]).join('');
              if (reconstructedText.trim()) {
                return reconstructedText.trim();
              }
            }
          }
          
          // Fallback: convertir a string solo si no es un objeto malformado
          if (typeof feature === 'object') {
            return 'Característica no especificada';
          }
          return String(feature).trim() || 'Característica no especificada';
        }).filter(feature => feature && feature.trim()), // Filtrar características vacías
        benefits: {
          firstWeekReturn: pkg.benefits?.firstWeekReturn || '12.5%',
          dailyReturn: pkg.benefits?.dailyReturn || '12.5%',
          totalReturn: pkg.benefits?.totalReturn || '500% max.',
          referralCommission: pkg.benefits?.referralCommission || '10%',
          withdrawalTime: pkg.benefits?.withdrawalTime || '24 horas',
          priority: pkg.benefits?.priority || (pkg.price <= 50 ? 'Baja' : pkg.price <= 100 ? 'Baja' : pkg.price <= 250 ? 'Media' : pkg.price <= 500 ? 'Media' : pkg.price <= 1000 ? 'Alta' : pkg.price <= 2500 ? 'Alta' : 'Máxima'),
          membershipDays: `${pkg.duration} días`
        },
        popular: pkg.isPopular || false,
        images: pkg.images || []
      };
    });

    res.json({
      success: true,
      data: formattedPackages
    });
  } catch (error) {
    logger.error('Error getting available packages:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener paquetes disponibles'
    });
  }
};

/**
 * @desc    Get user packages
 * @route   GET /api/packages/user
 * @access  Private
 */
exports.getUserPackages = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;

    // Obtener el portfolio del usuario con sus paquetes
    const portfolio = await Portfolio.findOne({ user: userId })
      .populate({
        path: 'packages.package',
        select: 'name description price duration benefits category level'
      });

    if (!portfolio) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Transformar los paquetes al formato esperado por el frontend
    const userPackages = portfolio.packages
      .filter(item => item.status === 'active')
      .map(item => ({
        id: item._id,
        packageId: item.package._id,
        name: item.package.name,
        packageName: item.packageName,
        price: item.package.price,
        totalInvested: item.totalInvested,
        currentValue: item.currentValue,
        totalReturns: item.totalReturns,
        percentage: item.percentage,
        activeInvestments: item.activeInvestments,
        completedInvestments: item.completedInvestments,
        status: item.status,
        benefits: item.package.benefits,
        category: item.package.category,
        level: item.package.level,
        purchasedAt: item.purchasedAt
      }));

    res.json({
      success: true,
      data: userPackages
    });
  } catch (error) {
    logger.error('Error getting user packages:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener paquetes del usuario'
    });
  }
};