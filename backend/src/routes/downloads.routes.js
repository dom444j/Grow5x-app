const express = require('express');
const router = express.Router();
const downloadsController = require('../controllers/downloads.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { body } = require('express-validator');

// Ruta pública para descarga segura (con token)
router.get('/secure/:token', downloadsController.processSecureDownload);

// Todas las demás rutas requieren autenticación
router.use(requireAuth);

// Rutas para usuarios
router.get('/user/:userId', downloadsController.getUserDownloads);
router.post('/create-link', [
  body('purchaseId').notEmpty().withMessage('ID de compra es requerido')
], downloadsController.createDownloadLink);

// Revocar enlace de descarga
router.patch('/:id/revoke', downloadsController.revokeDownloadLink);

// Rutas de administrador
router.use(requireAdmin);

// CRUD de descargas (Admin)
router.get('/', downloadsController.getAllDownloads);

// Estadísticas de descargas (Admin)
router.get('/stats/overview', downloadsController.getDownloadStats);

module.exports = router;