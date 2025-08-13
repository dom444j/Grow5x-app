const Product = require('../models/Product.model');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

class ProductController {
  // Obtener todos los productos con filtros y paginación
  async getProducts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        status = 'active',
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        minPrice,
        maxPrice
      } = req.query;

      // Construir filtros
      const filters = {};
      
      if (category) filters.category = category;
      if (status) filters.status = status;
      if (minPrice || maxPrice) {
        filters.price = {};
        if (minPrice) filters.price.$gte = parseFloat(minPrice);
        if (maxPrice) filters.price.$lte = parseFloat(maxPrice);
      }
      
      // Búsqueda de texto
      if (search) {
        filters.$text = { $search: search };
      }

      // Configurar paginación
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Ejecutar consulta
      const [products, total] = await Promise.all([
        Product.find(filters)
          .populate('createdBy', 'name email')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Product.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos',
        error: error.message
      });
    }
  }

  // Obtener producto específico
  async getProduct(req, res) {
    try {
      const { id } = req.params;
      
      let product;
      
      // Verificar si es un ID de MongoDB válido
      if (mongoose.Types.ObjectId.isValid(id)) {
        product = await Product.findById(id)
          .populate('createdBy', 'name email')
          .populate('lastModifiedBy', 'name email');
      } else {
        // Si no es un ObjectId, buscar por slug o nombre
        // Esto permite usar slugs como 'basic-plan', 'starter-kit', etc. como identificadores
        product = await Product.findOne({
          $or: [
            { slug: id.toLowerCase() },
            { name: new RegExp(id, 'i') }
          ]
        })
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');
      }

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener producto',
        error: error.message
      });
    }
  }

  // Crear nuevo producto (solo admin)
  async createProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const productData = {
        ...req.body,
        createdBy: req.user.id
      };

      const product = new Product(productData);
      await product.save();

      await product.populate('createdBy', 'name email');

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: product
      });
    } catch (error) {
      console.error('Error creating product:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors: Object.values(error.errors).map(e => e.message)
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al crear producto',
        error: error.message
      });
    }
  }

  // Actualizar producto (solo admin)
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto inválido'
        });
      }

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
        lastModifiedBy: req.user.id
      };

      const product = await Product.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('createdBy lastModifiedBy', 'name email');

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: product
      });
    } catch (error) {
      console.error('Error updating product:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors: Object.values(error.errors).map(e => e.message)
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al actualizar producto',
        error: error.message
      });
    }
  }

  // Eliminar producto (solo admin)
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto inválido'
        });
      }

      const product = await Product.findByIdAndDelete(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar producto',
        error: error.message
      });
    }
  }

  // Obtener estadísticas de productos (solo admin)
  async getProductStats(req, res) {
    try {
      const stats = await Product.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            inactive: {
              $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
            },
            draft: {
              $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
            },
            totalSales: { $sum: '$salesCount' },
            averagePrice: { $avg: '$price' }
          }
        }
      ]);

      const categoryStats = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalSales: { $sum: '$salesCount' },
            averagePrice: { $avg: '$price' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      res.json({
        success: true,
        data: {
          general: stats[0] || {
            total: 0,
            active: 0,
            inactive: 0,
            draft: 0,
            totalSales: 0,
            averagePrice: 0
          },
          byCategory: categoryStats
        }
      });
    } catch (error) {
      console.error('Error fetching product stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
}

module.exports = new ProductController();
