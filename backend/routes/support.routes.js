const express = require('express');
const { body, query, validationResult } = require('express-validator');
const auth = require('../src/middleware/auth');
const adminAuth = require('../src/middleware/adminAuth');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const router = express.Router();

// Middleware para validar errores
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errors.array()
    });
  }
  next();
};

// Crear ticket
router.post('/tickets',
  auth,
  [
    body('subject')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('El asunto debe tener entre 5 y 200 caracteres'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('La descripción debe tener entre 10 y 2000 caracteres'),
    body('category')
      .isIn(['general', 'technical', 'financial', 'account'])
      .withMessage('Categoría inválida'),
    body('priority')
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Prioridad inválida')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { subject, description, category, priority } = req.body;
      
      // Generar número de ticket único
      const ticketCount = await Ticket.countDocuments();
      const ticketNumber = `TK${String(ticketCount + 1).padStart(6, '0')}`;
      
      const ticket = new Ticket({
        ticketNumber,
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        user: req.user.id,
        status: 'open'
      });
      
      await ticket.save();
      await ticket.populate('user', 'name email');
      
      res.status(201).json({
        success: true,
        message: 'Ticket creado exitosamente',
        data: ticket
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// Obtener tickets del usuario
router.get('/tickets',
  auth,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La página debe ser un número entero positivo'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('El límite debe ser entre 1 y 50'),
    query('status')
      .optional()
      .isIn(['open', 'in_progress', 'resolved', 'closed'])
      .withMessage('Estado inválido')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const filter = { user: req.user.id };
      if (req.query.status) {
        filter.status = req.query.status;
      }
      
      const tickets = await Ticket.find(filter)
        .populate('user', 'name email')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await Ticket.countDocuments(filter);
      
      res.json({
        success: true,
        data: {
          tickets,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// Obtener ticket específico
router.get('/tickets/:id',
  auth,
  async (req, res) => {
    try {
      const ticket = await Ticket.findOne({
        _id: req.params.id,
        user: req.user.id
      })
      .populate('user', 'name email')
      .populate('assignedTo', 'name email');
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket no encontrado'
        });
      }
      
      res.json({
        success: true,
        data: ticket
      });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// RUTAS DE ADMINISTRADOR

// Obtener todos los tickets (admin)
router.get('/admin/tickets',
  auth,
  adminAuth,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La página debe ser un número entero positivo'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('El límite debe ser entre 1 y 50'),
    query('status')
      .optional()
      .isIn(['open', 'in_progress', 'resolved', 'closed'])
      .withMessage('Estado inválido'),
    query('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Prioridad inválida')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.priority) filter.priority = req.query.priority;
      if (req.query.category) filter.category = req.query.category;
      
      const tickets = await Ticket.find(filter)
        .populate('user', 'name email')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await Ticket.countDocuments(filter);
      
      res.json({
        success: true,
        data: {
          tickets,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching admin tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// Actualizar estado del ticket (admin)
router.patch('/admin/tickets/:id/status',
  auth,
  adminAuth,
  [
    body('status')
      .isIn(['open', 'in_progress', 'resolved', 'closed'])
      .withMessage('Estado inválido'),
    body('resolution')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('La resolución no puede exceder 1000 caracteres')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, resolution } = req.body;
      
      const updateData = { 
        status,
        updatedAt: new Date()
      };
      
      if (status === 'resolved' && resolution) {
        updateData.resolution = resolution.trim();
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = req.user.id;
      }
      
      const ticket = await Ticket.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      )
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email');
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket no encontrado'
        });
      }
      
      res.json({
        success: true,
        message: 'Estado del ticket actualizado',
        data: ticket
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// Asignar ticket (admin)
router.patch('/admin/tickets/:id/assign',
  auth,
  adminAuth,
  [
    body('adminId')
      .isMongoId()
      .withMessage('ID de administrador inválido')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { adminId } = req.body;
      
      // Verificar que el admin existe
      const admin = await User.findOne({ _id: adminId, role: 'admin' });
      if (!admin) {
        return res.status(400).json({
          success: false,
          message: 'Administrador no encontrado'
        });
      }
      
      const ticket = await Ticket.findByIdAndUpdate(
        req.params.id,
        { 
          assignedTo: adminId,
          status: 'in_progress',
          updatedAt: new Date()
        },
        { new: true }
      )
      .populate('user', 'name email')
      .populate('assignedTo', 'name email');
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket no encontrado'
        });
      }
      
      res.json({
        success: true,
        message: 'Ticket asignado exitosamente',
        data: ticket
      });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// Estadísticas de soporte (admin)
router.get('/admin/stats',
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const stats = await Promise.all([
        Ticket.countDocuments({ status: 'open' }),
        Ticket.countDocuments({ status: 'in_progress' }),
        Ticket.countDocuments({ status: 'resolved' }),
        Ticket.countDocuments({ status: 'closed' }),
        Ticket.countDocuments({}),
        Ticket.countDocuments({ priority: 'urgent' }),
        Ticket.countDocuments({ priority: 'high' })
      ]);
      
      res.json({
        success: true,
        data: {
          open: stats[0],
          inProgress: stats[1],
          resolved: stats[2],
          closed: stats[3],
          total: stats[4],
          urgent: stats[5],
          high: stats[6]
        }
      });
    } catch (error) {
      console.error('Error fetching support stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

module.exports = router;