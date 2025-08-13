const { requireAdmin } = require('./auth');

/**
 * Admin Authentication Middleware
 * 
 * Re-exporta el middleware requireAdmin para mantener
 * consistencia en las importaciones de rutas.
 */
module.exports = requireAdmin;