const Document = require('../models/Document');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.NODE_ENV === 'production'
  ? '/var/www/growx5/backend/uploads/documents'
  : path.join(__dirname, '../../uploads/documents');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Tipos de archivo permitidos
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/zip',
    'application/x-rar-compressed'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB máximo
  }
});

// Obtener todos los documentos públicos (para usuarios)
const getPublicDocuments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const filters = {
      isPublic: true,
      category,
      search
    };
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };
    
    const result = await Document.searchDocuments(filters, options);
    
    res.status(200).json({
      success: true,
      message: 'Documentos públicos obtenidos exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error obteniendo documentos públicos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener todos los documentos (para administradores)
const getAllDocuments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      isPublic,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const filters = {
      category,
      search,
      isPublic: isPublic !== undefined ? isPublic === 'true' : undefined
    };
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };
    
    const result = await Document.searchDocuments(filters, options);
    
    res.status(200).json({
      success: true,
      message: 'Documentos obtenidos exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error obteniendo documentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener un documento por ID
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await Document.findById(id)
      .populate('uploadedBy', 'name email')
      .populate('lastModifiedBy', 'name email');
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }
    
    // Verificar permisos si el documento no es público
    if (!document.isPublic && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este documento'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Documento obtenido exitosamente',
      data: document
    });
  } catch (error) {
    console.error('Error obteniendo documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Subir un nuevo documento
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo'
      });
    }
    
    const {
      title,
      description,
      category,
      isPublic = true,
      tags,
      targetAudience = 'all',
      language = 'es'
    } = req.body;
    
    // Validar campos requeridos
    if (!title || !category) {
      // Eliminar archivo subido si hay error de validación
      await fs.unlink(req.file.path).catch(console.error);
      
      return res.status(400).json({
        success: false,
        message: 'Título y categoría son requeridos'
      });
    }
    
    // Procesar tags
    let processedTags = [];
    if (tags) {
      processedTags = typeof tags === 'string' 
        ? tags.split(',').map(tag => tag.trim().toLowerCase())
        : tags;
    }
    
    // Crear documento en la base de datos
    const document = new Document({
      title,
      description,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      category,
      isPublic: isPublic === 'true' || isPublic === true,
      tags: processedTags,
      targetAudience,
      language,
      uploadedBy: req.user.id
    });
    
    await document.save();
    
    // Poblar datos del usuario
    await document.populate('uploadedBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Documento subido exitosamente',
      data: document
    });
  } catch (error) {
    // Eliminar archivo si hay error
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    
    console.error('Error subiendo documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar un documento
const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      isPublic,
      tags,
      targetAudience,
      language,
      isActive
    } = req.body;
    
    const document = await Document.findById(id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }
    
    // Procesar tags si se proporcionan
    let processedTags;
    if (tags !== undefined) {
      processedTags = typeof tags === 'string' 
        ? tags.split(',').map(tag => tag.trim().toLowerCase())
        : tags;
    }
    
    // Actualizar campos
    const updateData = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(isPublic !== undefined && { isPublic }),
      ...(processedTags !== undefined && { tags: processedTags }),
      ...(targetAudience !== undefined && { targetAudience }),
      ...(language !== undefined && { language }),
      ...(isActive !== undefined && { isActive }),
      lastModifiedBy: req.user.id
    };
    
    const updatedDocument = await Document.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('uploadedBy', 'name email')
     .populate('lastModifiedBy', 'name email');
    
    res.status(200).json({
      success: true,
      message: 'Documento actualizado exitosamente',
      data: updatedDocument
    });
  } catch (error) {
    console.error('Error actualizando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar un documento
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await Document.findById(id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }
    
    // Eliminar archivo físico
    if (document.filePath) {
      try {
        await fs.unlink(document.filePath);
      } catch (error) {
        console.warn('No se pudo eliminar el archivo físico:', error.message);
      }
    }
    
    // Eliminar documento de la base de datos
    await Document.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Documento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Descargar un documento
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await Document.findById(id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }
    
    // Verificar permisos
    if (!document.isPublic && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para descargar este documento'
      });
    }
    
    // Verificar que el archivo existe
    try {
      await fs.access(document.filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado en el servidor'
      });
    }
    
    // Incrementar contador de descargas
    await document.incrementDownloadCount(
      req.user?.id,
      req.ip,
      req.get('User-Agent')
    );
    
    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimeType);
    
    // Enviar archivo
    res.sendFile(path.resolve(document.filePath));
  } catch (error) {
    console.error('Error descargando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de documentos
const getDocumentStatistics = async (req, res) => {
  try {
    const stats = await Document.getStatistics();
    
    res.status(200).json({
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener categorías disponibles
const getCategories = async (req, res) => {
  try {
    const categories = [
      { value: 'manual', label: 'Manual de Usuario', description: 'Manuales y guías de uso' },
      { value: 'tutorial', label: 'Tutorial', description: 'Tutoriales paso a paso' },
      { value: 'guia', label: 'Guía', description: 'Guías informativas' },
      { value: 'politicas', label: 'Políticas', description: 'Políticas de la empresa' },
      { value: 'terminos', label: 'Términos', description: 'Términos y condiciones' },
      { value: 'faq', label: 'FAQ', description: 'Preguntas frecuentes' },
      { value: 'otros', label: 'Otros', description: 'Otros documentos' }
    ];
    
    res.status(200).json({
      success: true,
      message: 'Categorías obtenidas exitosamente',
      data: categories
    });
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  getPublicDocuments,
  getAllDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  getDocumentStatistics,
  getCategories
};