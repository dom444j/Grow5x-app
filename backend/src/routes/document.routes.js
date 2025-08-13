const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document.model');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = process.env.NODE_ENV === 'production'
  ? '/var/www/growx5/backend/uploads/documents'
  : path.join(__dirname, '../../uploads/documents');
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Filtro de archivos permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten PDF, DOC, DOCX, TXT, XLS, XLSX'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

// Obtener todos los documentos públicos
router.get('/public', async (req, res) => {
  try {
    const { category } = req.query;
    
    const filter = {
      status: 'active',
      isPublic: true
    };
    
    if (category) {
      filter.category = category;
    }
    
    const documents = await Document.find(filter)
      .populate('uploadedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .select('-filePath') // No exponer la ruta del archivo
      .lean();
    
    // Asegurar que todos los documentos tengan los campos necesarios
    const processedDocuments = documents.map(doc => ({
      ...doc,
      downloadCount: doc.downloadCount || 0,
      status: doc.status || 'active',
      uploadedBy: doc.uploadedBy || { fullName: 'Usuario Desconocido', email: 'unknown@example.com' }
    }));
    
    res.json({
      success: true,
      data: processedDocuments,
      total: processedDocuments.length
    });
  } catch (error) {
    console.error('Error al obtener documentos públicos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener todos los documentos (admin)
router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { category, status } = req.query;
    
    const filter = {};
    
    if (category) filter.category = category;
    if (status) filter.status = status;
    
    const documents = await Document.find(filter)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'fullName email')
      .populate('lastUpdatedBy', 'fullName email')
      .lean(); // Usar lean() para mejor performance
    
    // Asegurar que todos los documentos tengan los campos necesarios
    const processedDocuments = documents.map(doc => ({
      ...doc,
      downloadCount: doc.downloadCount || 0,
      status: doc.status || 'active',
      uploadedBy: doc.uploadedBy || { fullName: 'Usuario Desconocido', email: 'unknown@example.com' }
    }));
    
    res.json({
      success: true,
      data: processedDocuments,
      total: processedDocuments.length
    });
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Subir nuevo documento (admin)
router.post('/upload', requireAuth, requireAdmin, upload.single('document'), async (req, res) => {
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
      version = '1.0',
      tags,
      language = 'es',
      targetAudience = 'all',
      priority = 'medium'
    } = req.body;
    
    const document = new Document({
      title,
      description,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      category,
      isPublic: isPublic === 'true',
      version,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      uploadedBy: mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : new mongoose.Types.ObjectId(),
      metadata: {
        language,
        targetAudience,
        priority
      }
    });
    
    await document.save();
    
    // Popular el usuario y convertir a objeto plano
    await document.populate('uploadedBy', 'fullName email');
    const documentData = document.toObject();
    
    // Asegurar que tenga todos los campos necesarios
    const responseData = {
      ...documentData,
      downloadCount: documentData.downloadCount || 0,
      status: documentData.status || 'active',
      uploadedBy: documentData.uploadedBy || { fullName: 'Usuario Desconocido', email: 'unknown@example.com' }
    };
    
    res.status(201).json({
      success: true,
      message: 'Documento subido exitosamente',
      data: responseData
    });
  } catch (error) {
    console.error('Error al subir documento:', error);
    
    // Eliminar archivo si hubo error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Descargar documento
router.get('/download/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }
    
    if (!document.isPublic || document.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado al documento'
      });
    }
    
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado en el servidor'
      });
    }
    
    // Incrementar contador de descargas
    await document.incrementDownloadCount();
    
    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimeType);
    
    // Enviar archivo
    res.sendFile(path.resolve(document.filePath));
  } catch (error) {
    console.error('Error al descargar documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Actualizar documento (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      status,
      isPublic,
      version,
      tags,
      language,
      targetAudience,
      priority
    } = req.body;
    
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }
    
    // Actualizar campos
    if (title) document.title = title;
    if (description) document.description = description;
    if (category) document.category = category;
    if (status) document.status = status;
    if (isPublic !== undefined) document.isPublic = isPublic;
    if (version) document.version = version;
    if (tags) document.tags = tags.split(',').map(tag => tag.trim());
    
    if (language) document.metadata.language = language;
    if (targetAudience) document.metadata.targetAudience = targetAudience;
    if (priority) document.metadata.priority = priority;
    
    document.lastUpdatedBy = req.user.id;
    
    await document.save();
    
    await document.populate(['uploadedBy', 'lastUpdatedBy'], 'fullName');
    
    res.json({
      success: true,
      message: 'Documento actualizado exitosamente',
      data: document
    });
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Eliminar documento (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }
    
    // Eliminar archivo físico
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }
    
    // Eliminar documento de la base de datos
    await Document.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Documento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener estadísticas de documentos (admin)
router.get('/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await Document.aggregate([
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          activeDocuments: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          publicDocuments: {
            $sum: { $cond: ['$isPublic', 1, 0] }
          },
          totalDownloads: { $sum: '$downloadCount' },
          totalSize: { $sum: '$fileSize' }
        }
      }
    ]);
    
    const categoryStats = await Document.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          downloads: { $sum: '$downloadCount' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        general: stats[0] || {
          totalDocuments: 0,
          activeDocuments: 0,
          publicDocuments: 0,
          totalDownloads: 0,
          totalSize: 0
        },
        byCategory: categoryStats
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;