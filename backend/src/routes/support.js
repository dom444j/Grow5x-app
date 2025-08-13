const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.NODE_ENV === 'production' 
  ? '/var/www/growx5/backend/uploads/support'
  : path.join(__dirname, '../../uploads/support');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
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

// Simulación de base de datos en memoria
let tickets = [
  {
    id: 1,
    subject: 'Problema con el login',
    description: 'No puedo acceder a mi cuenta',
    category: 'technical',
    priority: 'normal',
    status: 'open',
    userId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 1,
        content: 'No puedo acceder a mi cuenta',
        sender: 'user',
        timestamp: new Date().toISOString()
      }
    ]
  }
];

let supportFiles = [];
let ticketCounter = 2;
let fileCounter = 1;

// Rutas para tickets
router.get('/tickets', (req, res) => {
  try {
    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener tickets',
      error: error.message
    });
  }
});

router.post('/tickets', (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;
    
    const newTicket = {
      id: ticketCounter++,
      subject,
      description,
      category,
      priority,
      status: 'open',
      userId: req.user?.id || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 1,
          content: description,
          sender: 'user',
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    tickets.push(newTicket);
    
    res.status(201).json({
      success: true,
      data: newTicket,
      message: 'Ticket creado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear ticket',
      error: error.message
    });
  }
});

router.put('/tickets/:id', (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { status, priority, assignedTo } = req.body;
    
    const ticketIndex = tickets.findIndex(t => t.id === ticketId);
    
    if (ticketIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }
    
    tickets[ticketIndex] = {
      ...tickets[ticketIndex],
      status: status || tickets[ticketIndex].status,
      priority: priority || tickets[ticketIndex].priority,
      assignedTo: assignedTo || tickets[ticketIndex].assignedTo,
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: tickets[ticketIndex],
      message: 'Ticket actualizado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar ticket',
      error: error.message
    });
  }
});

// Rutas para mensajes de chat
router.post('/tickets/:id/messages', (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { content, sender } = req.body;
    
    const ticket = tickets.find(t => t.id === ticketId);
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }
    
    const newMessage = {
      id: ticket.messages.length + 1,
      content,
      sender: sender || 'user',
      timestamp: new Date().toISOString()
    };
    
    ticket.messages.push(newMessage);
    ticket.updatedAt = new Date().toISOString();
    
    res.status(201).json({
      success: true,
      data: newMessage,
      message: 'Mensaje enviado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje',
      error: error.message
    });
  }
});

// Rutas para archivos
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }
    
    const fileData = {
      id: fileCounter++,
      name: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      downloads: 0
    };
    
    supportFiles.push(fileData);
    
    res.status(201).json({
      success: true,
      data: {
        id: fileData.id,
        name: fileData.name,
        size: fileData.size,
        uploadedAt: fileData.uploadedAt
      },
      message: 'Archivo subido exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al subir archivo',
      error: error.message
    });
  }
});

router.get('/files', (req, res) => {
  try {
    const filesData = supportFiles.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      uploadedAt: file.uploadedAt,
      downloads: file.downloads
    }));
    
    res.json({
      success: true,
      data: filesData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener archivos',
      error: error.message
    });
  }
});

router.get('/download/:fileId', (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    const file = supportFiles.find(f => f.id === fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }
    
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no existe en el sistema'
      });
    }
    
    // Incrementar contador de descargas
    file.downloads++;
    
    res.download(file.path, file.name);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al descargar archivo',
      error: error.message
    });
  }
});

router.delete('/files/:fileId', (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    const fileIndex = supportFiles.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }
    
    const file = supportFiles[fileIndex];
    
    // Eliminar archivo del sistema de archivos
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    // Eliminar de la lista
    supportFiles.splice(fileIndex, 1);
    
    res.json({
      success: true,
      message: 'Archivo eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar archivo',
      error: error.message
    });
  }
});

module.exports = router;