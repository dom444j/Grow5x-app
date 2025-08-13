const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolio.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

/**
 * @route GET /api/user/portfolio/performance
 * @desc Obtener rendimiento histórico del usuario
 * @access Private
 * @query {string} period - Período de tiempo (1w, 1m, 3m, 6m, 1y, all)
 */
router.get('/performance', portfolioController.getPortfolioPerformance);

/**
 * @route GET /api/user/portfolio/distribution
 * @desc Obtener distribución del portafolio
 * @access Private
 */
router.get('/distribution', portfolioController.getPortfolioDistribution);

/**
 * @route GET /api/user/portfolio/stats
 * @desc Obtener estadísticas de rendimiento
 * @access Private
 */
router.get('/stats', portfolioController.getPortfolioStats);

module.exports = router;