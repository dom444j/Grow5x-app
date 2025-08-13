const express = require('express');
const router = express.Router();
const newsController = require('../controllers/news.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Rutas públicas
router.get('/public', newsController.getPublicNews);
router.get('/:id', newsController.getNewsById);

// Rutas protegidas (requieren autenticación)
router.use(requireAuth);

// Rutas de administrador
router.get('/', requireAdmin, newsController.getAllNews);
router.post('/', requireAdmin, newsController.createNews);
router.put('/:id', requireAdmin, newsController.updateNews);
router.delete('/:id', requireAdmin, newsController.deleteNews);
router.patch('/bulk-status', requireAdmin, newsController.bulkUpdateNewsStatus);

// Rutas de estadísticas (admin)
router.get('/stats/overview', requireAdmin, newsController.getNewsStats);

module.exports = router;