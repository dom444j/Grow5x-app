const Package = require('../models/Package.model');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction.model');
const Referral = require('../src/models/Referral.model');
const logger = require('../src/utils/logger');

/**
 * @desc    Get all licenses
 * @route   GET /api/licenses
 * @access  Public
 */
exports.getLicenses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = '-createdAt',
      status = 'active',
      search = ''
    } = req.query;

    const query = {};
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort,
      populate: [
        { path: 'createdBy', select: 'name email' },
        { path: 'lastModifiedBy', select: 'name email' }
      ]
    };

    const packages = await Package.paginate(query, options);

    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    logger.error('Get packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener paquetes'
    });
  }
};

/**
 * @desc    Get license by ID
 * @route   GET /api/licenses/:id
 * @access  Public
 */
exports.getLicenseById = async (req, res) => {
  try {
    const package = await Package.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    res.json({
      success: true,
      data: package
    });
  } catch (error) {
    logger.error('Get package by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener paquete'
    });
  }
};

/**
 * @desc    Create new license
 * @route   POST /api/licenses
 * @access  Private/Admin
 */
exports.createLicense = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      status,
      features,
      images,
      duration,
      benefits,
      limits,
      isPopular
    } = req.body;

    // Validate required fields
    if (!name || !description || !price) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporcione todos los campos requeridos'
      });
    }

    // Create new package
    const package = new Package({
      name,
      description,
      price,
      status: status || 'draft',
      features,
      images,
      duration: duration || 45,
      benefits: {
        firstWeekReturn: benefits?.firstWeekReturn || '12.5%',
        dailyReturn: benefits?.dailyReturn || '12.5%',
        totalReturn: benefits?.totalReturn || '400% max.',
        referralCommission: benefits?.referralCommission || '10%',
        activationCommission: benefits?.activationCommission || '5%',
        withdrawalTime: benefits?.withdrawalTime || '24 horas',
        priority: benefits?.priority || 'Baja'
      },
      limits: {
        minInvestment: limits?.minInvestment || price,
        maxInvestment: limits?.maxInvestment || price
      },
      isPopular: isPopular || false,
      createdBy: req.user._id
    });

    await package.save();

    res.status(201).json({
      success: true,
      message: 'Paquete creado exitosamente',
      data: package
    });
  } catch (error) {
    logger.error('Create package error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear paquete'
    });
  }
};

/**
 * @desc    Update license
 * @route   PUT /api/licenses/:id
 * @access  Private/Admin
 */
exports.updateLicense = async (req, res) => {
  try {
    const packageId = req.params.id;
    
    // Validate package ID
    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: 'ID de paquete no proporcionado'
      });
    }

    // Find package
    let package = await Package.findById(packageId);
    
    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    // Update package fields
    const updatedFields = {
      ...req.body,
      lastModifiedBy: req.user._id
    };

    // Update package
    package = await Package.findByIdAndUpdate(
      packageId,
      { $set: updatedFields },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    res.json({
      success: true,
      message: 'Paquete actualizado exitosamente',
      data: package
    });
  } catch (error) {
    logger.error('Update package error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar paquete'
    });
  }
};

/**
 * @desc    Delete license
 * @route   DELETE /api/licenses/:id
 * @access  Private/Admin
 */
exports.deleteLicense = async (req, res) => {
  try {
    const package = await Package.findById(req.params.id);

    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    await package.remove();

    res.json({
      success: true,
      message: 'Paquete eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Delete package error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar paquete'
    });
  }
};

/**
 * @desc    Purchase license
 * @route   POST /api/licenses/:id/purchase
 * @access  Private
 */
exports.purchaseLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionHash } = req.body;
    const userId = req.user._id;

    // Find package
    const package = await Package.findById(id);
    
    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    // Validate package is active
    if (package.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Este paquete no está disponible para compra'
      });
    }

    // Create transaction
    const transaction = new Transaction({
      user: userId,
      type: 'deposit',
      subtype: 'license_purchase',
      amount: package.price,
      currency: 'USDT',
      status: 'pending',
      description: `Compra de paquete ${package.name}`,
      payment: {
        method: paymentMethod || 'crypto',
        txHash: transactionHash,
        network: 'BEP20'
      },
      metadata: {
        packageId: package._id,
        packageName: package.name,
        packagePrice: package.price,
        purchaseDate: new Date()
      }
    });

    await transaction.save();

    // Process referral commission if user was referred
    const user = await User.findById(userId);
    
    if (user.referredBy) {
      await processReferralCommission(user.referredBy, transaction);
    }

    // Increment package sales count
    await Package.findByIdAndUpdate(id, { $inc: { salesCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Solicitud de compra de paquete procesada',
      data: {
        transactionId: transaction._id,
        status: transaction.status
      }
    });
  } catch (error) {
    logger.error('Purchase package error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la compra de paquete'
    });
  }
};

// Process referral commission
async function processReferralCommission(referrerId, transaction) {
  try {
    const referral = await Referral.findOne({
      referrer: referrerId,
      referred: transaction.user,
      status: { $in: ['pending', 'active'] }
    });

    if (!referral) return;

    // Comisión única por activación de paquete (5% del monto del paquete)
    const activationCommissionRate = 0.05;
    const activationCommission = transaction.amount * activationCommissionRate;

    // Create activation commission transaction
    const commissionTransaction = new Transaction({
      user: referrerId,
      type: 'commission',
      subtype: 'license_activation',
      amount: activationCommission,
      currency: transaction.currency,
      status: 'completed',
      description: `Comisión por activación de paquete - ${activationCommissionRate * 100}%`,
      externalReference: `ACTIVATION_COMMISSION_${transaction._id}`,
      metadata: {
        originalTransaction: transaction._id,
        referredUser: transaction.user,
        commissionRate: activationCommissionRate,
        commissionType: 'package_activation'
      }
    });

    await commissionTransaction.save();

    // Update referral
    await referral.addCommission(
      activationCommission,
      commissionTransaction._id,
      'package_activation'
    );

    // Update referrer's capital
    await User.findByIdAndUpdate(referrerId, {
      $inc: { 'capital.available': activationCommission }
    });

    logger.info(`Comisión de activación de paquete procesada`, {
      referrerId,
      referredUserId: transaction.user,
      activationCommission,
      originalTransactionId: transaction._id
    });

    // Nota: Las comisiones diarias del 10% sobre cashback se procesan automáticamente
    // en BenefitsProcessor durante los primeros 8 días de cada semana

  } catch (error) {
    logger.error('Process referral commission error:', error);
  }
}