const Package = require('../models/Package.model');
const User = require('../src/models/User');
const logger = require('../src/utils/logger');
const { validationResult } = require('express-validator');

/**
 * @desc    Get all packages for admin
 * @route   GET /api/admin/packages
 * @access  Private/Admin
 */
exports.getAllPackages = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    // Build query
    let query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const packages = await Package.find(query)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Package.countDocuments(query);

    // Transform packages for admin view
    const formattedPackages = packages.map(pkg => ({
      id: pkg._id,
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      status: pkg.status,
      duration: pkg.duration,
      features: pkg.features,
      benefits: pkg.benefits,
      limits: pkg.limits,
      isPopular: pkg.isPopular,
      salesCount: pkg.salesCount,
      images: pkg.images,
      createdBy: pkg.createdBy,
      lastModifiedBy: pkg.lastModifiedBy,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt
    }));

    res.json({
      success: true,
      data: formattedPackages,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    logger.error('Error getting packages for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener paquetes'
    });
  }
};

/**
 * @desc    Get package by ID for admin
 * @route   GET /api/admin/packages/:id
 * @access  Private/Admin
 */
exports.getPackageById = async (req, res) => {
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
    logger.error('Error getting package by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener paquete'
    });
  }
};

/**
 * @desc    Create new package
 * @route   POST /api/admin/packages
 * @access  Private/Admin
 */
exports.createPackage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const packageData = {
      ...req.body,
      createdBy: req.user._id
    };

    const newPackage = new Package(packageData);
    await newPackage.save();

    await newPackage.populate('createdBy', 'name email');

    logger.info('Package created by admin:', {
      packageId: newPackage._id,
      adminId: req.user._id,
      packageName: newPackage.name
    });

    res.status(201).json({
      success: true,
      message: 'Paquete creado exitosamente',
      data: newPackage
    });
  } catch (error) {
    logger.error('Error creating package:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear paquete'
    });
  }
};

/**
 * @desc    Update package
 * @route   PUT /api/admin/packages/:id
 * @access  Private/Admin
 */
exports.updatePackage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const updateData = {
      ...req.body,
      lastModifiedBy: req.user._id
    };

    const package = await Package.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('lastModifiedBy', 'name email');

    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    logger.info('Package updated by admin:', {
      packageId: package._id,
      adminId: req.user._id,
      packageName: package.name
    });

    res.json({
      success: true,
      message: 'Paquete actualizado exitosamente',
      data: package
    });
  } catch (error) {
    logger.error('Error updating package:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar paquete'
    });
  }
};

/**
 * @desc    Delete package
 * @route   DELETE /api/admin/packages/:id
 * @access  Private/Admin
 */
exports.deletePackage = async (req, res) => {
  try {
    const package = await Package.findById(req.params.id);

    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    // Check if package is being used by any users
    const usersWithPackage = await User.countDocuments({
      'packages.package': req.params.id,
      'packages.status': 'active'
    });

    if (usersWithPackage > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el paquete. ${usersWithPackage} usuario(s) tienen este paquete activo.`
      });
    }

    await Package.findByIdAndDelete(req.params.id);

    logger.info('Package deleted by admin:', {
      packageId: req.params.id,
      adminId: req.user._id,
      packageName: package.name
    });

    res.json({
      success: true,
      message: 'Paquete eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error deleting package:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar paquete'
    });
  }
};

/**
 * @desc    Get package statistics
 * @route   GET /api/admin/packages/stats
 * @access  Private/Admin
 */
exports.getPackageStats = async (req, res) => {
  try {
    const Transaction = require('../src/models/Transaction.model');
    
    const totalPackages = await Package.countDocuments();
    const activePackages = await Package.countDocuments({ status: 'active' });
    const draftPackages = await Package.countDocuments({ status: 'draft' });
    const inactivePackages = await Package.countDocuments({ status: 'inactive' });

    // Get real sales statistics from completed transactions
    const realSalesStats = await Transaction.aggregate([
      {
        $match: {
          type: 'deposit',
          subtype: 'license_purchase',
          status: 'completed',
          'metadata.packageId': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$metadata.packageId',
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          avgSaleAmount: { $avg: '$amount' }
        }
      },
      {
        $lookup: {
          from: 'packages',
          localField: '_id',
          foreignField: '_id',
          as: 'package'
        }
      },
      {
        $unwind: '$package'
      },
      {
        $project: {
          packageId: '$_id',
          packageName: '$package.name',
          packagePrice: '$package.price',
          packageStatus: '$package.status',
          totalSales: 1,
          totalRevenue: 1,
          avgSaleAmount: 1
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Update package salesCount with real data
    for (const stat of realSalesStats) {
      await Package.findByIdAndUpdate(stat.packageId, {
        salesCount: stat.totalSales
      });
    }

    // Get most popular packages based on real sales
    const popularPackages = realSalesStats
      .filter(pkg => pkg.packageStatus === 'active')
      .slice(0, 5)
      .map(pkg => ({
        _id: pkg.packageId,
        name: pkg.packageName,
        salesCount: pkg.totalSales,
        price: pkg.packagePrice,
        revenue: pkg.totalRevenue
      }));

    // Calculate total sales and revenue
    const totalSales = realSalesStats.reduce((sum, pkg) => sum + pkg.totalSales, 0);
    const totalRevenue = realSalesStats.reduce((sum, pkg) => sum + pkg.totalRevenue, 0);

    res.json({
      success: true,
      data: {
        overview: {
          total: totalPackages,
          active: activePackages,
          draft: draftPackages,
          inactive: inactivePackages,
          totalSales,
          totalRevenue
        },
        popularPackages,
        salesByPackage: realSalesStats
      }
    });
  } catch (error) {
    logger.error('Error getting package stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de paquetes'
    });
  }
};

/**
 * @desc    Bulk update package status
 * @route   POST /api/admin/packages/bulk-update
 * @access  Private/Admin
 */
exports.bulkUpdatePackages = async (req, res) => {
  try {
    const { packageIds, status } = req.body;

    if (!packageIds || !Array.isArray(packageIds) || packageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs de paquetes requeridos'
      });
    }

    if (!['active', 'inactive', 'draft'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido'
      });
    }

    const result = await Package.updateMany(
      { _id: { $in: packageIds } },
      { 
        status,
        lastModifiedBy: req.user._id
      }
    );

    logger.info('Bulk package update by admin:', {
      adminId: req.user._id,
      packageIds,
      status,
      modifiedCount: result.modifiedCount
    });

    res.json({
      success: true,
      message: `${result.modifiedCount} paquete(s) actualizado(s) exitosamente`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    logger.error('Error in bulk package update:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar paquetes'
    });
  }
};