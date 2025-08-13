const { SupportTicket, SupportDocument, AiChatConfig } = require('../models/Support.model');
const User = require('../models/User.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

// Configuración de multer para subida de archivos
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
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

// Controladores para Tickets de Soporte
class SupportController {
  
  // Crear nuevo ticket
  static async createTicket(req, res) {
    try {
      const { subject, category, priority, content } = req.body;
      const userId = req.user.id;
      
      const ticket = new SupportTicket({
        userId,
        subject,
        category,
        priority: priority || 'medium',
        metadata: {
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          platform: req.get('X-Platform') || 'web'
        }
      });
      
      ticket.ticketId = ticket.generateTicketId();
      
      // Agregar mensaje inicial
      await ticket.addMessage('user', content);
      
      // Intentar respuesta automática con IA
      if (ticket.aiAssistance.enabled) {
        try {
          const aiResponse = await SupportController.generateAIResponse(category, content);
          if (aiResponse) {
            await ticket.addMessage('ai', aiResponse.content);
            ticket.aiAssistance.confidence = aiResponse.confidence;
            ticket.aiAssistance.suggestedActions = aiResponse.suggestedActions;
          }
        } catch (aiError) {
          console.error('Error en respuesta IA:', aiError);
        }
      }
      
      await ticket.save();
      
      res.status(201).json({
        success: true,
        message: 'Ticket creado exitosamente',
        data: {
          ticket: await ticket.populate('userId', 'fullName email')
        }
      });
      
    } catch (error) {
      console.error('Error al crear ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
  
  // Obtener tickets del usuario
  static async getUserTickets(req, res) {
    try {
      const userId = req.user.id;
      const { status, category, page = 1, limit = 10 } = req.query;
      
      const filter = { userId };
      if (status) filter.status = status;
      if (category) filter.category = category;
      
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
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
      
    } catch (error) {
      console.error('Error al obtener tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener ticket específico
  static async getTicket(req, res) {
    try {
      const { ticketId } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      const filter = isAdmin ? { ticketId } : { ticketId, userId };
      
      const ticket = await SupportTicket.findOne(filter)
        .populate('userId', 'fullName email')
        .populate('assignedTo', 'fullName email');
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket no encontrado'
        });
      }
      
      // Marcar mensajes como leídos
      ticket.messages.forEach(message => {
        if (message.sender !== (isAdmin ? 'admin' : 'user')) {
          message.isRead = true;
        }
      });
      
      await ticket.save();
      
      res.json({
        success: true,
        data: { ticket }
      });
      
    } catch (error) {
      console.error('Error al obtener ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Agregar mensaje a ticket
  static async addMessage(req, res) {
    try {
      const { ticketId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      const filter = isAdmin ? { ticketId } : { ticketId, userId };
      
      const ticket = await SupportTicket.findOne(filter);
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket no encontrado'
        });
      }
      
      const sender = isAdmin ? 'admin' : 'user';
      const attachments = req.files ? req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/support/${file.filename}`
      })) : [];
      
      await ticket.addMessage(sender, content, attachments);
      
      // Actualizar estado si es necesario
      if (ticket.status === 'waiting_user' && sender === 'user') {
        ticket.status = 'in_progress';
      } else if (ticket.status === 'open' && sender === 'admin') {
        ticket.status = 'in_progress';
      }
      
      await ticket.save();
      
      // Generar respuesta IA si es mensaje de usuario
      if (sender === 'user' && ticket.aiAssistance.enabled) {
        try {
          const aiResponse = await SupportController.generateAIResponse(ticket.category, content, ticket.messages);
          if (aiResponse && aiResponse.confidence > 0.7) {
            await ticket.addMessage('ai', aiResponse.content);
            ticket.aiAssistance.confidence = aiResponse.confidence;
            await ticket.save();
          }
        } catch (aiError) {
          console.error('Error en respuesta IA:', aiError);
        }
      }
      
      res.json({
        success: true,
        message: 'Mensaje agregado exitosamente',
        data: {
          ticket: await ticket.populate('userId', 'fullName email')
        }
      });
      
    } catch (error) {
      console.error('Error al agregar mensaje:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Generar respuesta con IA
  static async generateAIResponse(category, content, previousMessages = []) {
    try {
      const aiConfig = await AiChatConfig.getActiveConfig(category);
      
      if (!aiConfig) {
        throw new Error('Configuración de IA no encontrada');
      }
      
      // Construir contexto de la conversación
      const context = previousMessages.slice(-5).map(msg => 
        `${msg.sender}: ${msg.content}`
      ).join('\n');
      
      const prompt = `${aiConfig.systemPrompt}\n\nContexto de la conversación:\n${context}\n\nNuevo mensaje del usuario: ${content}\n\nPor favor, proporciona una respuesta útil y profesional.`;
      
      let response;
      
      switch (aiConfig.apiProvider) {
        case 'openai':
          response = await SupportController.callOpenAI(aiConfig, prompt);
          break;
        case 'anthropic':
          response = await SupportController.callAnthropic(aiConfig, prompt);
          break;
        default:
          throw new Error('Proveedor de IA no soportado');
      }
      
      return {
        content: response.content,
        confidence: response.confidence || 0.8,
        suggestedActions: response.suggestedActions || []
      };
      
    } catch (error) {
      console.error('Error al generar respuesta IA:', error);
      return null;
    }
  }
  
  // Llamada a OpenAI
  static async callOpenAI(config, prompt) {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: config.model,
      messages: [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature
    }, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      content: response.data.choices[0].message.content,
      confidence: 0.8
    };
  }
  
  // Llamada a Anthropic
  static async callAnthropic(config, prompt) {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: config.model,
      max_tokens: config.maxTokens,
      messages: [
        { role: 'user', content: prompt }
      ]
    }, {
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    });
    
    return {
      content: response.data.content[0].text,
      confidence: 0.8
    };
  }
  
  // Obtener documentos de soporte
  static async getDocuments(req, res) {
    try {
      const { category, language = 'es', search, page = 1, limit = 20 } = req.query;
      const userRole = req.user?.role || 'user';
      
      const filter = {
        isActive: true,
        isPublic: true,
        language,
        $or: [
          { requiredRole: 'user' },
          { requiredRole: userRole }
        ]
      };
      
      if (category) filter.category = category;
      
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }
      
      const documents = await SupportDocument.find(filter)
        .populate('createdBy', 'fullName')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await SupportDocument.countDocuments(filter);
      
      res.json({
        success: true,
        data: {
          documents,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
      
    } catch (error) {
      console.error('Error al obtener documentos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Descargar documento
  static async downloadDocument(req, res) {
    try {
      const { documentId } = req.params;
      
      const document = await SupportDocument.findById(documentId);
      
      if (!document || !document.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Documento no encontrado'
        });
      }
      
      // Verificar permisos
      const userRole = req.user?.role || 'user';
      if (document.requiredRole === 'admin' && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para descargar este documento'
        });
      }
      
      // Incrementar contador de descargas
      await document.incrementDownload();
      
      if (document.type === 'link') {
        return res.json({
          success: true,
          data: {
            type: 'redirect',
            url: document.fileInfo.url
          }
        });
      }
      
      const filePath = path.join(__dirname, '../../uploads/support', document.fileInfo.filename);
      
      try {
        await fs.access(filePath);
        res.download(filePath, document.fileInfo.originalName);
      } catch (fileError) {
        res.status(404).json({
          success: false,
          message: 'Archivo no encontrado en el servidor'
        });
      }
      
    } catch (error) {
      console.error('Error al descargar documento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener estadísticas de soporte (Admin)
  static async getSupportStats(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      const now = new Date();
      let startDate;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      const [ticketStats, documentStats, recentTickets] = await Promise.all([
        SupportTicket.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        SupportDocument.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              totalDownloads: { $sum: '$fileInfo.downloadCount' }
            }
          }
        ]),
        SupportTicket.find({ createdAt: { $gte: startDate } })
          .populate('userId', 'fullName email')
          .sort({ createdAt: -1 })
          .limit(10)
      ]);
      
      res.json({
        success: true,
        data: {
          tickets: {
            byStatus: ticketStats.reduce((acc, stat) => {
              acc[stat._id] = stat.count;
              return acc;
            }, {}),
            recent: recentTickets
          },
          documents: {
            byCategory: documentStats,
            total: await SupportDocument.countDocuments({ isActive: true })
          },
          period
        }
      });
      
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = {
  SupportController,
  upload
};