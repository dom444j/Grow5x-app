const express = require('express');
const router = express.Router();
const withdrawalPinController = require('../controllers/withdrawalPin.controller');
const { requireAuth } = require('../middleware/auth');

/**
 * Rutas para la gestión del PIN de retiro
 * Todas las rutas requieren autenticación
 */

// Configurar un nuevo PIN de retiro
router.post('/setup', requireAuth, withdrawalPinController.setupPin);

// Cambiar un PIN de retiro existente
router.post('/change', requireAuth, withdrawalPinController.changePin);

// Activar o desactivar el PIN de retiro
router.post('/toggle', requireAuth, withdrawalPinController.togglePin);

// Validar un PIN de retiro para una operación
router.post('/validate', requireAuth, withdrawalPinController.validatePin);

// Obtener el estado del PIN de retiro
router.get('/status', requireAuth, withdrawalPinController.getPinStatus);

module.exports = router;