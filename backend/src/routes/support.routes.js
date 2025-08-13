const express = require('express');
const { SupportController, upload } = require('../controllers/supportController');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting para prevenir spam
const createTicketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tickets por 15 minutos
  message: {
    success: false,
    message: 'Demasiados tickets creados. Intenta de nuevo en 15 minutos.'
  },
  trustProxy: false
});

const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // máximo 10 mensajes por minuto
  message: {
    success: false,
    message: 'Demasiados mensajes enviados. Intenta de nuevo en un minuto.'
  },
  trustProxy: false
});

// ==========================================
// RUTAS PÚBLICAS (sin autenticación)
// ==========================================

// Obtener documentos públicos
router.get('/documents/public', SupportController.getDocuments);

// ==========================================
// RUTAS DE USUARIO (requieren autenticación)
// ==========================================

// Crear nuevo ticket de soporte
router.post('/tickets', 
  authenticateToken, 
  createTicketLimiter,
  upload.array('attachments', 5),
  SupportController.createTicket
);

// Obtener tickets del usuario
router.get('/tickets', 
  authenticateToken, 
  SupportController.getUserTickets
);

// Obtener ticket específico
router.get('/tickets/:ticketId', 
  authenticateToken, 
  SupportController.getTicket
);

// Agregar mensaje a ticket
router.post('/tickets/:ticketId/messages', 
  authenticateToken,
  messageLimiter,
  upload.array('attachments', 3),
  SupportController.addMessage
);

// Obtener documentos de soporte (autenticado)
router.get('/documents', 
  authenticateToken, 
  SupportController.getDocuments
);

// Descargar documento
router.get('/documents/:documentId/download', 
  authenticateToken, 
  SupportController.downloadDocument
);

// Calificar ticket (satisfacción)
router.post('/tickets/:ticketId/rating', 
  authenticateToken,
  async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { rating, feedback } = req.body;
      const userId = req.user.id;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'La calificación debe estar entre 1 y 5'
        });
      }
      
      const { SupportTicket } = require('../models/Support.model');
      
      const ticket = await SupportTicket.findOne({ ticketId, userId });
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket no encontrado'
        });
      }
      
      if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
        return res.status(400).json({
          success: false,
          message: 'Solo puedes calificar tickets resueltos o cerrados'
        });
      }
      
      ticket.satisfaction = {
        rating,
        feedback: feedback || '',
        ratedAt: new Date()
      };
      
      await ticket.save();
      
      res.json({
        success: true,
        message: 'Calificación guardada exitosamente'
      });
      
    } catch (error) {
      console.error('Error al calificar ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// ==========================================
// RUTAS DE ADMINISTRADOR
// ==========================================

// Obtener todos los tickets (Admin)
router.get('/admin/tickets', 
  authenticateToken, 
  requireAdmin,
  async (req, res) => {
    try {
      const { status, category, assignedTo, page = 1, limit = 20, search } = req.query;
      
      const filter = {};
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (assignedTo) filter.assignedTo = assignedTo;
      
      if (search) {
        filter.$or = [
          { ticketId: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } }
        ];
      }
      
      const { SupportTicket } = require('../models/Support.model');
      
      const tickets = await SupportTicket.find(filter)
        .populate('userId', 'fullName email')
        .populate('assignedTo', 'fullName email')
        .sort({ updatedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await SupportTicket.countDocuments(filter);
      
      res.json({
        success: true,
        data: {
          tickets,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
      
    } catch (error) {
      console.error('Error al obtener tickets admin:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// Asignar ticket a admin
router.put('/admin/tickets/:ticketId/assign', 
  authenticateToken, 
  requireAdmin,
  async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { assignedTo } = req.body;
      
      const { SupportTicket } = require('../models/Support.model');
      
      const ticket = await SupportTicket.findOne({ ticketId });
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket no encontrado'
        });
      }
      
      ticket.assignedTo = assignedTo;
      ticket.status = 'in_progress';
      
      await ticket.save();
      
      res.json({
        success: true,
        message: 'Ticket asignado exitosamente',
        data: {
          ticket: await ticket.populate(['userId', 'assignedTo'], 'fullName email')
        }
      });
      
    } catch (error) {
      console.error('Error al asignar ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// Cambiar estado de ticket
router.put('/admin/tickets/:ticketId/status', 
  authenticateToken, 
  requireAdmin,
  async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { status } = req.body;
      
      const validStatuses = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Estado no válido'
        });
      }
      
      const { SupportTicket } = require('../models/Support.model');
      
      const ticket = await SupportTicket.findOne({ ticketId });
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket no encontrado'
        });
      }
      
      ticket.status = status;
      
      await ticket.save();
      
      res.json({
        success: true,
        message: 'Estado actualizado exitosamente',
        data: { ticket }
      });
      
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// Crear documento de soporte (Admin)
router.post('/admin/documents', 
  authenticateToken, 
  requireAdmin,
  upload.single('file'),
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        type,
        content,
        tags,
        language,
        isPublic,
        requiredRole,
        priority
      } = req.body;
      
      const { SupportDocument } = require('../models/Support.model');
      
      const documentData = {
        title,
        description,
        category,
        type,
        content,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        language: language || 'es',
        isPublic: isPublic !== 'false',
        requiredRole: requiredRole || 'user',
        priority: parseInt(priority) || 0,
        createdBy: req.user.id
      };
      
      if (req.file) {
        documentData.fileInfo = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: `/uploads/support/${req.file.filename}`,
          downloadCount: 0
        };
      }
      
      const document = new SupportDocument(documentData);
      await document.save();
      
      res.status(201).json({
        success: true,
        message: 'Documento creado exitosamente',
        data: {
          document: await document.populate('createdBy', 'fullName email')
        }
      });
      
    } catch (error) {
      console.error('Error al crear documento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Obtener estadísticas de soporte (Admin)
router.get('/admin/stats', 
  authenticateToken, 
  requireAdmin, 
  SupportController.getSupportStats
);

// Gestionar configuración de IA (Admin)
router.post('/admin/ai-config', 
  authenticateToken, 
  requireAdmin,
  async (req, res) => {
    try {
      const {
        name,
        description,
        apiProvider,
        apiKey,
        model,
        systemPrompt,
        maxTokens,
        temperature,
        categories,
        rateLimits
      } = req.body;
      
      const { AiChatConfig } = require('../models/Support.model');
      
      const config = new AiChatConfig({
        name,
        description,
        apiProvider,
        apiKey,
        model,
        systemPrompt,
        maxTokens: maxTokens || 1000,
        temperature: temperature || 0.7,
        categories: categories || ['general'],
        rateLimits: rateLimits || {
          requestsPerMinute: 10,
          requestsPerHour: 100,
          requestsPerDay: 500
        }
      });
      
      await config.save();
      
      res.status(201).json({
        success: true,
        message: 'Configuración de IA creada exitosamente',
        data: { config }
      });
      
    } catch (error) {
      console.error('Error al crear configuración IA:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Obtener configuraciones de IA (Admin)
router.get('/admin/ai-configs', 
  authenticateToken, 
  requireAdmin,
  async (req, res) => {
    try {
      const { AiChatConfig } = require('../models/Support.model');
      
      const configs = await AiChatConfig.find()
        .select('-apiKey') // No exponer la API key
        .sort({ updatedAt: -1 });
      
      res.json({
        success: true,
        data: { configs }
      });
      
    } catch (error) {
      console.error('Error al obtener configuraciones IA:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

module.exports = router;