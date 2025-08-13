const express = require('express');
const router = express.Router();
const purchasesController = require('../controllers/purchases.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { body } = require('express-validator');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas específicas primero (para evitar conflictos con rutas dinámicas)
router.get('/stats/overview', purchasesController.getPurchaseStats);
router.get('/user/:userId', purchasesController.getUserPurchases);

// Crear nueva compra
router.post('/', [
  body('productId').notEmpty().withMessage('ID del producto es requerido'),
  body('paymentMethod').optional().isIn(['wallet', 'card', 'bank', 'usdt-bep20', 'usdt-trc20', 'bitcoin', 'bnb']).withMessage('Método de pago inválido'),
  body('metadata').optional().isObject().withMessage('Metadata debe ser un objeto')
], purchasesController.createPurchase);

// Rutas de administrador
router.use(requireAdmin);

// CRUD de compras (Admin)
router.get('/', purchasesController.getAllPurchases);

// Ruta dinámica al final para evitar conflictos
router.get('/:id', purchasesController.getPurchaseById);
router.patch('/:id/status', [
  body('status').isIn(['pending', 'completed', 'failed']).withMessage('Estado inválido'),
  body('notes').optional().isString()
], purchasesController.updatePurchaseStatus);

module.exports = router;