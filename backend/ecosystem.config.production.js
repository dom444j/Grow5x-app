// =============================================================================
// GROW5X BACKEND - CONFIGURACIÓN PM2 PARA PRODUCCIÓN
// =============================================================================
// Archivo: ecosystem.config.production.js
// Propósito: Configuración PM2 para despliegue en VPS Ubuntu 22.04.5
// Fecha: 2025-01-11
// Uso: pm2 start ecosystem.config.production.js
// =============================================================================

module.exports = {
  apps: [{
    // =============================================================================
    // CONFIGURACIÓN BÁSICA DE LA APLICACIÓN
    // =============================================================================
    name: 'growx5-backend',
    script: './src/server.js',
    cwd: '/var/www/growx5-app/backend',
    
    // =============================================================================
    // CONFIGURACIÓN DE INSTANCIAS Y CLUSTERING
    // =============================================================================
    instances: 2, // Usar 2 instancias para alta disponibilidad
    exec_mode: 'cluster', // Modo cluster para mejor rendimiento
    
    // =============================================================================
    // CONFIGURACIÓN DE LOGS
    // =============================================================================
    log_file: '~/logs/growx5-backend-combined.log',
    out_file: '~/logs/growx5-backend-out.log',
    error_file: '~/logs/growx5-backend-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // =============================================================================
    // CONFIGURACIÓN DE REINICIO Y MONITOREO
    // =============================================================================
    autorestart: true,
    watch: false, // Deshabilitado en producción
    max_memory_restart: '1G',
    restart_delay: 4000,
    
    // =============================================================================
    // CONFIGURACIÓN DE VARIABLES DE ENTORNO
    // =============================================================================
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      
      // MongoDB Atlas
      MONGODB_URI: 'mongodb+srv://growx5admin:GrowX5Atlas2024!@cluster0.mongodb.net/growx5_production?retryWrites=true&w=majority&appName=Cluster0',
      
      // URLs de la aplicación
      FRONTEND_URL: 'https://grow5x.app',
      API_URL: 'https://grow5x.app/api',
      APP_URL: 'https://grow5x.app',
      
      // Seguridad
      JWT_SECRET: 'prod_jwt_secret_2025_grow5x_ultra_secure_key_256bits',
      JWT_REFRESH_SECRET: 'prod_refresh_secret_2025_grow5x_ultra_secure_refresh_key_256bits',
      SESSION_SECRET: 'prod_session_secret_2025_grow5x_ultra_secure_session_key_256bits',
      ENCRYPTION_KEY: 'prod_encryption_key_2025_grow5x_ultra_secure_encryption_key_256bits',
      
      // SMTP Principal
      SMTP_HOST: 'mail.grow5x.app',
      SMTP_PORT: 587,
      SMTP_SECURE: false,
      SMTP_USER: 'noreply@grow5x.app',
      SMTP_PASS: 'GrowX5Email2024!',
      
      // SMTP Bienvenida
      WELCOME_EMAIL_HOST: 'mail.grow5x.app',
      WELCOME_EMAIL_PORT: 587,
      WELCOME_EMAIL_SECURE: false,
      WELCOME_EMAIL_USER: 'welcome@grow5x.app',
      WELCOME_EMAIL_PASS: 'GrowX5Welcome2024!',
      
      // SMTP Recuperación
      RECOVERY_EMAIL_HOST: 'mail.grow5x.app',
      RECOVERY_EMAIL_PORT: 587,
      RECOVERY_EMAIL_SECURE: false,
      RECOVERY_EMAIL_USER: 'recovery@grow5x.app',
      RECOVERY_EMAIL_PASS: 'GrowX5Recovery2024!',
      
      // Configuración de verificación
      REQUIRE_EMAIL_VERIFICATION: true,
      EMAIL_VERIFICATION_TIMEOUT: 86400000,
      
      // Logs y monitoreo
      LOG_LEVEL: 'info',
      LOG_FILE: true,
      LOG_CONSOLE: true,
      
      // Rate limiting
      RATE_LIMIT_WINDOW_MS: 900000,
      RATE_LIMIT_MAX_REQUESTS: 100,
      
      // CORS
      CORS_ORIGIN: 'https://grow5x.app',
      
      // Uploads
      UPLOAD_MAX_SIZE: 10485760,
      UPLOAD_ALLOWED_TYPES: 'image/jpeg,image/png,image/gif,application/pdf',
      
      // Backup y mantenimiento
      BACKUP_ENABLED: true,
      BACKUP_SCHEDULE: '0 2 * * *',
      MAINTENANCE_MODE: false,
      
      // Notificaciones
      NOTIFICATIONS_ENABLED: true,
      EMAIL_NOTIFICATIONS: true,
      SMS_NOTIFICATIONS: false,
      
      // Analytics
      ANALYTICS_ENABLED: true,
      TRACKING_ENABLED: true,
      
      // Desarrollo (deshabilitado)
      DEBUG: false,
      VERBOSE_LOGGING: false,
      TEST_MODE: false,
      DEV_TOOLS: false
    },
    
    // =============================================================================
    // CONFIGURACIÓN DE DESARROLLO (OPCIONAL)
    // =============================================================================
    env_development: {
      NODE_ENV: 'development',
      PORT: 3001,
      REQUIRE_EMAIL_VERIFICATION: false,
      DEBUG: true,
      VERBOSE_LOGGING: true
    },
    
    // =============================================================================
    // CONFIGURACIÓN DE STAGING (OPCIONAL)
    // =============================================================================
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3001,
      FRONTEND_URL: 'https://staging.grow5x.app',
      API_URL: 'https://staging.grow5x.app/api',
      APP_URL: 'https://staging.grow5x.app',
      REQUIRE_EMAIL_VERIFICATION: true,
      DEBUG: false
    },
    
    // =============================================================================
    // CONFIGURACIÓN DE RENDIMIENTO
    // =============================================================================
    node_args: '--max-old-space-size=2048',
    
    // =============================================================================
    // CONFIGURACIÓN DE HEALTH CHECK
    // =============================================================================
    health_check_url: 'http://localhost:3001/api/health',
    health_check_grace_period: 3000,
    
    // =============================================================================
    // CONFIGURACIÓN DE DEPLOYMENT
    // =============================================================================
    post_update: ['npm install', 'npm run build'],
    
    // =============================================================================
    // CONFIGURACIÓN DE ERRORES Y EXCEPCIONES
    // =============================================================================
    min_uptime: '10s',
    max_restarts: 10,
    
    // =============================================================================
    // CONFIGURACIÓN DE TIEMPO DE ESPERA
    // =============================================================================
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // =============================================================================
    // CONFIGURACIÓN DE CRON JOBS (OPCIONAL)
    // =============================================================================
    cron_restart: '0 2 * * *', // Reinicio diario a las 2 AM
    
    // =============================================================================
    // CONFIGURACIÓN DE MONITOREO AVANZADO
    // =============================================================================
    pmx: true,
    
    // =============================================================================
    // CONFIGURACIÓN DE SOURCE MAP (OPCIONAL)
    // =============================================================================
    source_map_support: true,
    
    // =============================================================================
    // CONFIGURACIÓN DE IGNORE WATCH (PARA DESARROLLO)
    // =============================================================================
    ignore_watch: [
      'node_modules',
      'logs',
      '*.log',
      '.git',
      '.env*',
      'uploads',
      'temp'
    ]
  }],
  
  // =============================================================================
  // CONFIGURACIÓN DE DEPLOYMENT
  // =============================================================================
  deploy: {
    production: {
      user: 'root',
      host: 'YOUR_VPS_IP',
      ref: 'origin/main',
      repo: 'https://github.com/YOUR_USERNAME/growx5-app.git',
      path: '/var/www/growx5-app',
      'post-deploy': 'cd backend && npm install && pm2 reload ecosystem.config.production.js --env production'
    }
  }
};

// =============================================================================
// COMANDOS ÚTILES PARA PRODUCCIÓN:
// =============================================================================
// 
// Iniciar aplicación:
// pm2 start ecosystem.config.production.js --env production
// 
// Recargar sin downtime:
// pm2 reload growx5-backend
// 
// Ver logs:
// pm2 logs growx5-backend
// 
// Ver estado:
// pm2 status
// 
// Monitoreo:
// pm2 monit
// 
// Guardar configuración:
// pm2 save
// 
// Configurar startup:
// pm2 startup
// 
// =============================================================================