module.exports = {
  apps: [
    {
      name: 'growx5-backend',
      script: './backend/server.js',
      cwd: './',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        
        // MongoDB
        MONGODB_URI: process.env.MONGODB_URI,
        
        // App URLs
        FRONTEND_URL: process.env.FRONTEND_URL || 'https://growx5.com',
        API_URL: process.env.API_URL || 'https://api.growx5.com',
        APP_URL: process.env.APP_URL || 'https://growx5.com',
        
        // Security & Authentication
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        SESSION_SECRET: process.env.SESSION_SECRET,
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
        
        // SMTP Configuration - General (Namecheap Private Email)
        SMTP_HOST: process.env.SMTP_HOST || 'smtp.privateemail.com',
        SMTP_PORT: process.env.SMTP_PORT || 587,
        SMTP_SECURE: process.env.SMTP_SECURE || 'false',
        SMTP_USER: process.env.SMTP_USER || 'noreply@grow5x.app',
        SMTP_PASS: process.env.SMTP_PASS || '300400Jd14',
        SMTP_FROM: process.env.SMTP_FROM || 'noreply@grow5x.app',
        EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@grow5x.app',
        
        // SMTP Configuration - Welcome Emails (Namecheap Private Email)
        WELCOME_EMAIL_HOST: process.env.WELCOME_EMAIL_HOST || 'smtp.privateemail.com',
        WELCOME_EMAIL_PORT: process.env.WELCOME_EMAIL_PORT || 587,
        WELCOME_EMAIL_SECURE: process.env.WELCOME_EMAIL_SECURE || 'false',
        WELCOME_EMAIL_USER: process.env.WELCOME_EMAIL_USER || 'welcome@grow5x.app',
        WELCOME_EMAIL_PASS: process.env.WELCOME_EMAIL_PASS || '300400Jd14',
        WELCOME_EMAIL_FROM: process.env.WELCOME_EMAIL_FROM || 'welcome@grow5x.app',
        
        // SMTP Configuration - Recovery Emails (Namecheap Private Email)
        RECOVERY_EMAIL_HOST: process.env.RECOVERY_EMAIL_HOST || 'smtp.privateemail.com',
        RECOVERY_EMAIL_PORT: process.env.RECOVERY_EMAIL_PORT || 587,
        RECOVERY_EMAIL_SECURE: process.env.RECOVERY_EMAIL_SECURE || 'false',
        RECOVERY_EMAIL_USER: process.env.RECOVERY_EMAIL_USER || 'recovery@grow5x.app',
        RECOVERY_EMAIL_PASS: process.env.RECOVERY_EMAIL_PASS || '300400Jd14',
        RECOVERY_EMAIL_FROM: process.env.RECOVERY_EMAIL_FROM || 'recovery@grow5x.app',
        
        // SMTP Configuration - Backup Emails (Namecheap Private Email)
        BACKUP_EMAIL_HOST: process.env.BACKUP_EMAIL_HOST || 'smtp.privateemail.com',
        BACKUP_EMAIL_PORT: process.env.BACKUP_EMAIL_PORT || 587,
        BACKUP_EMAIL_SECURE: process.env.BACKUP_EMAIL_SECURE || 'false',
        BACKUP_EMAIL_USER: process.env.BACKUP_EMAIL_USER || 'support@grow5x.app',
        BACKUP_EMAIL_PASS: process.env.BACKUP_EMAIL_PASS || '300400Jd14',
        BACKUP_EMAIL_FROM: process.env.BACKUP_EMAIL_FROM || 'support@grow5x.app',
        
        // Email Verification
        EMAIL_VERIFICATION_ENABLED: process.env.EMAIL_VERIFICATION_ENABLED || 'true',
        EMAIL_VERIFICATION_EXPIRY: process.env.EMAIL_VERIFICATION_EXPIRY || '24h',
        
        // Logging & Monitoring
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        LOG_FILE_ENABLED: process.env.LOG_FILE_ENABLED || 'true',
        LOG_EMAIL_EVENTS: process.env.LOG_EMAIL_EVENTS || 'true',
        
        // Rate Limiting
        RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || '900000',
        RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || '100',
        RATE_LIMIT_REGISTRATION_MAX: process.env.RATE_LIMIT_REGISTRATION_MAX || '5',
        RATE_LIMIT_EMAIL_VERIFICATION_MAX: process.env.RATE_LIMIT_EMAIL_VERIFICATION_MAX || '3',
        
        // CORS
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://growx5.com',
        
        // File Uploads
        MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '10485760',
        ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf',
        
        // Optional: Redis (if using)
        REDIS_URL: process.env.REDIS_URL,
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        
        // Optional: Webhooks
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
        WEBHOOK_URL: process.env.WEBHOOK_URL,
        
        // Optional: Backup & Maintenance
        BACKUP_ENABLED: process.env.BACKUP_ENABLED || 'false',
        BACKUP_SCHEDULE: process.env.BACKUP_SCHEDULE || '0 2 * * *',
        MAINTENANCE_MODE: process.env.MAINTENANCE_MODE || 'false',
        
        // Optional: Notifications
        PUSH_NOTIFICATIONS_ENABLED: process.env.PUSH_NOTIFICATIONS_ENABLED || 'false',
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
        FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
        FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
        
        // Optional: Analytics & Tracking
        ANALYTICS_ENABLED: process.env.ANALYTICS_ENABLED || 'false',
        GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID,
        MIXPANEL_TOKEN: process.env.MIXPANEL_TOKEN,
        
        // Development specific (disabled in production)
        DEBUG_MODE: 'false',
        MOCK_PAYMENTS: 'false',
        SKIP_EMAIL_VERIFICATION: 'false'
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        // Add staging-specific environment variables here
      },
      
      // Logging configuration
      log_file: './backend/logs/pm2-app.log',
      error_file: './backend/logs/pm2-error.log',
      out_file: './backend/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Performance tuning
      node_args: '--max-old-space-size=1024',
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Auto restart on file changes (disabled for production)
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Deployment hooks
      post_update: ['npm install', 'npm run build'],
      
      // Error handling
      autorestart: true,
      restart_delay: 4000,
      
      // Cron jobs (if needed)
      cron_restart: '0 2 * * *', // Restart daily at 2 AM
      
      // Advanced monitoring
      pmx: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Source map support
      source_map_support: true
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/growx5-app.git',
      path: '/var/www/growx5-app',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    },
    staging: {
      user: 'ubuntu',
      host: ['your-staging-server-ip'],
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/growx5-app.git',
      path: '/var/www/growx5-app-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging'
    }
  }
};

/*
=== PM2 USEFUL COMMANDS ===

# Start application
pm2 start ecosystem.config.js --env production

# Stop application
pm2 stop growx5-backend

# Restart application
pm2 restart growx5-backend

# Reload application (zero-downtime)
pm2 reload growx5-backend

# View logs
pm2 logs growx5-backend

# Monitor application
pm2 monit

# View application status
pm2 status

# Delete application from PM2
pm2 delete growx5-backend

# Save PM2 configuration
pm2 save

# Resurrect saved processes
pm2 resurrect

# Setup PM2 startup script
pm2 startup

# Deploy to production
pm2 deploy production

# Deploy to staging
pm2 deploy staging

# View detailed info
pm2 describe growx5-backend

# Flush logs
pm2 flush

# Reset restart counter
pm2 reset growx5-backend

=== MONITORING & DEBUGGING ===

# Real-time monitoring
pm2 monit

# View specific log lines
pm2 logs growx5-backend --lines 100

# Follow logs in real-time
pm2 logs growx5-backend --follow

# View only error logs
pm2 logs growx5-backend --err

# View memory usage
pm2 show growx5-backend

=== CLUSTER MANAGEMENT ===

# Scale to 4 instances
pm2 scale growx5-backend 4

# Reload all instances
pm2 reload all

# Restart specific instance
pm2 restart growx5-backend:0

=== ENVIRONMENT MANAGEMENT ===

# Start with specific environment
pm2 start ecosystem.config.js --env staging

# Update environment variables
pm2 restart growx5-backend --update-env

*/