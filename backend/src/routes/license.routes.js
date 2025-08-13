const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/license.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { body } = require('express-validator');

// Validaciones
const licenseValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Nombre requerido (1-100 caracteres)'),
  body('description').trim().isLength({ min: 1, max: 1000 }).withMessage('Descripción requerida (1-1000 caracteres)'),
  body('price').isFloat({ min: 0 }).withMessage('Precio debe ser un número positivo'),
  body('duration').isInt({ min: 1 }).withMessage('Duración debe ser un número positivo')
];

// Rutas públicas
router.get('/', async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Licenses endpoint available' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    res.json({ success: true, data: null, message: 'License detail endpoint available' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Rutas de administrador
router.post('/', requireAuth, requireAdmin, licenseValidation, async (req, res) => {
  try {
    res.json({ success: true, message: 'License creation endpoint available' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

router.put('/:id', requireAuth, requireAdmin, licenseValidation, async (req, res) => {
  try {
    res.json({ success: true, message: 'License update endpoint available' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json({ success: true, message: 'License deletion endpoint available' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

router.get('/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json({ success: true, data: { total: 0, active: 0 }, message: 'License stats endpoint available' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

module.exports = router;