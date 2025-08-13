const Ticket = require('../models/Ticket');
const TicketResponse = require('../models/TicketResponse');
const User = require('../models/User');
const AIService = require('../services/AIService');
const emailService = require('../utils/email');
const telegramService = require('../utils/telegram');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configuración de multer para archivos adjuntos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = process.env.NODE_ENV === 'production'
  ? '/var/www/growx5/backend/uploads/support'
  : path.join(__dirname, '../../uploads/support');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

/**
 * @desc    Crear nuevo ticket
 * @route   POST /api/support/tickets
 * @access  Private (User)
 */
exports.createTicket = async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;
    const userId = req.user.id;
    
    // Validar datos requeridos
    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Asunto y descripción son requeridos'
      });
    }
    
    // Obtener información del usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Crear ticket
    const ticketData = {
      subject: subject.trim(),
      description: description.trim(),
      category: category || AIService.categorizeTicket({ subject, description }),
      priority: priority || AIService.determinePriority({ subject, description }),
      user: userId,
      userName: user.name,
      userEmail: user.email
    };
    
    const ticket = new Ticket(ticketData);
    await ticket.save();
    
    // Procesar con IA automáticamente
    try {
      const aiAnalysis = await AIService.analyzeTicket(ticket);
      
      if (aiAnalysis.response && aiAnalysis.confidence > 0.6) {
        // Crear respuesta automática de IA
        const aiResponse = new TicketResponse({
          ticket: ticket._id,
          author: userId, // Temporal, debería ser un usuario IA del sistema
          authorName: 'Asistente IA',
          authorType: 'ai',
          message: aiAnalysis.response,
          isAIGenerated: true,
          aiModel: 'knowledge_base',
          aiConfidence: aiAnalysis.confidence
        });
        
        await aiResponse.save();
        
        // Marcar ticket como procesado por IA
        await ticket.markAIProcessed(aiAnalysis.response, aiAnalysis.confidence);
      }
    } catch (aiError) {
      logger.error('Error processing ticket with AI:', aiError);
      // Continuar sin IA si hay error
    }
    
    // Enviar notificaciones
    try {
      // Email al usuario
      await emailService.sendTicketCreatedEmail(user.email, ticket);
      
      // Notificación a administradores si es urgente
      if (ticket.priority === 'urgent') {
        await this.notifyAdmins(ticket);
      }
    } catch (notificationError) {
      logger.error('Error sending notifications:', notificationError);
    }
    
    // Obtener ticket completo con respuestas
    const completeTicket = await Ticket.findById(ticket._id)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email');
      
    const responses = await TicketResponse.getTicketResponses(ticket._id);
    
    res.status(201).json({
      success: true,
      message: 'Ticket creado exitosamente',
      data: {
        ticket: completeTicket,
        responses
      }
    });
    
  } catch (error) {
    logger.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener tickets del usuario
 * @route   GET /api/support/tickets
 * @access  Private (User)
 */
exports.getUserTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category, page = 1, limit = 10 } = req.query;
    
    // Construir filtros
    const filters = { user: userId };
    if (status) filters.status = status;
    if (category) filters.category = category;
    
    // Paginación
    const skip = (page - 1) * limit;
    
    // Obtener tickets
    const tickets = await Ticket.find(filters)
      .populate('assignedTo', 'name email')
      .sort({ lastActivityAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    const total = await Ticket.countDocuments(filters);
    
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
    logger.error('Get user tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @desc    Obtener detalles de un ticket
 * @route   GET /api/support/tickets/:id
 * @access  Private (User/Admin)
 */
exports.getTicketDetails = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    // Construir filtros
    const filters = { _id: ticketId };
    if (!isAdmin) {
      filters.user = userId; // Los usuarios solo pueden ver sus propios tickets
    }
    
    // Obtener ticket
    const ticket = await Ticket.findOne(filters)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email');
      
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }
    
    // Obtener respuestas
    const responses = await TicketResponse.getTicketResponses(ticketId, isAdmin);
    
    // Marcar respuestas como leídas
    for (const response of responses) {
      if (response.author.toString() !== userId) {
        await response.markAsRead(userId);
      }
    }
    
    res.json({
      success: true,
      data: {
        ticket,
        responses
      }
    });
    
  } catch (error) {
    logger.error('Get ticket details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @desc    Responder a un ticket
 * @route   POST /api/support/tickets/:id/responses
 * @access  Private (User/Admin)
 */
exports.respondToTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id;
    const { message, isInternal = false } = req.body;
    const isAdmin = req.user.role === 'admin';
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje es requerido'
      });
    }
    
    // Verificar que el ticket existe y el usuario tiene acceso
    const filters = { _id: ticketId };
    if (!isAdmin) {
      filters.user = userId;
    }
    
    const ticket = await Ticket.findOne(filters);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }
    
    // Verificar que el ticket no está cerrado
    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'No se puede responder a un ticket cerrado'
      });
    }
    
    // Obtener información del usuario
    const user = await User.findById(userId);
    
    // Crear respuesta
    const response = new TicketResponse({
      ticket: ticketId,
      author: userId,
      authorName: user.name,
      authorType: isAdmin ? 'admin' : 'user',
      message: message.trim(),
      isInternal: isAdmin ? isInternal : false
    });
    
    await response.save();
    
    // Enviar notificaciones
    try {
      if (isAdmin && !isInternal) {
        // Notificar al usuario
        const ticketUser = await User.findById(ticket.user);
        await emailService.sendTicketResponseEmail(ticketUser.email, ticket, response);
      } else if (!isAdmin) {
        // Notificar a administradores
        await this.notifyAdmins(ticket, response);
      }
    } catch (notificationError) {
      logger.error('Error sending response notifications:', notificationError);
    }
    
    // Obtener respuesta completa
    const completeResponse = await TicketResponse.findById(response._id)
      .populate('author', 'name email role');
    
    res.status(201).json({
      success: true,
      message: 'Respuesta enviada exitosamente',
      data: completeResponse
    });
    
  } catch (error) {
    logger.error('Respond to ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @desc    Obtener todos los tickets (Admin)
 * @route   GET /api/support/admin/tickets
 * @access  Private (Admin)
 */
exports.getAllTickets = async (req, res) => {
  try {
    const {
      status,
      category,
      priority,
      assignedTo,
      search,
      page = 1,
      limit = 20,
      sortBy = 'lastActivityAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Construir filtros
    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (priority) filters.priority = priority;
    if (assignedTo) filters.assignedTo = assignedTo;
    
    // Búsqueda por texto
    if (search) {
      filters.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { ticketNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Paginación y ordenamiento
    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Obtener tickets
    const tickets = await Ticket.find(filters)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
      
    const total = await Ticket.countDocuments(filters);
    
    // Obtener estadísticas
    const stats = await Ticket.getStats();
    
    res.json({
      success: true,
      data: {
        tickets,
        stats,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
    
  } catch (error) {
    logger.error('Get all tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @desc    Asignar ticket a administrador
 * @route   PUT /api/support/admin/tickets/:id/assign
 * @access  Private (Admin)
 */
exports.assignTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { adminId } = req.body;
    
    // Verificar que el admin existe
    if (adminId) {
      const admin = await User.findOne({ _id: adminId, role: 'admin' });
      if (!admin) {
        return res.status(400).json({
          success: false,
          message: 'Administrador no encontrado'
        });
      }
    }
    
    // Asignar ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }
    
    await ticket.assignTo(adminId);
    
    // Obtener ticket actualizado
    const updatedTicket = await Ticket.findById(ticketId)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email');
    
    res.json({
      success: true,
      message: 'Ticket asignado exitosamente',
      data: updatedTicket
    });
    
  } catch (error) {
    logger.error('Assign ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @desc    Resolver ticket
 * @route   PUT /api/support/admin/tickets/:id/resolve
 * @access  Private (Admin)
 */
exports.resolveTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { resolution } = req.body;
    const adminId = req.user.id;
    
    if (!resolution) {
      return res.status(400).json({
        success: false,
        message: 'La resolución es requerida'
      });
    }
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }
    
    await ticket.resolve(resolution, adminId);
    
    // Notificar al usuario
    try {
      const user = await User.findById(ticket.user);
      await emailService.sendTicketResolvedEmail(user.email, ticket);
    } catch (notificationError) {
      logger.error('Error sending resolution notification:', notificationError);
    }
    
    // Obtener ticket actualizado
    const updatedTicket = await Ticket.findById(ticketId)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email');
    
    res.json({
      success: true,
      message: 'Ticket resuelto exitosamente',
      data: updatedTicket
    });
    
  } catch (error) {
    logger.error('Resolve ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @desc    Obtener respuestas sugeridas por IA
 * @route   GET /api/support/admin/tickets/:id/ai-suggestions
 * @access  Private (Admin)
 */
exports.getAISuggestions = async (req, res) => {
  try {
    const ticketId = req.params.id;
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }
    
    // Obtener respuestas anteriores
    const responses = await TicketResponse.getTicketResponses(ticketId, true);
    
    // Generar sugerencias
    const suggestions = await AIService.generateSuggestedResponses(ticket, responses);
    
    res.json({
      success: true,
      data: suggestions
    });
    
  } catch (error) {
    logger.error('Get AI suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * @desc    Notificar a administradores
 */
exports.notifyAdmins = async (ticket, response = null) => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true });
    
    for (const admin of admins) {
      if (admin.email) {
        if (response) {
          await emailService.sendNewResponseNotification(admin.email, ticket, response);
        } else {
          await emailService.sendNewTicketNotification(admin.email, ticket);
        }
      }
    }
  } catch (error) {
    logger.error('Error notifying admins:', error);
  }
};

// Exportar middleware de upload
exports.uploadAttachments = upload.array('attachments', 5);