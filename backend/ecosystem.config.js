module.exports = {
  apps: [{
    name: "growx5-backend",
    script: "server.js",
    env: {
      NODE_ENV: "development",
      PORT: 5000
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 5000,
      REQUIRE_EMAIL_VERIFICATION: true
    },
    env_staging: {
      NODE_ENV: "staging",
      PORT: 5000,
      REQUIRE_EMAIL_VERIFICATION: false
    },
    instances: 1,    // Un solo proceso para evitar conflictos
    exec_mode: "fork",
    watch: false,
    max_memory_restart: "1G",
    error_file: "./logs/pm2-error.log",
    out_file: "./logs/pm2-out.log",
    log_file: "./logs/pm2-combined.log",
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: "10s",
    restart_delay: 4000
  }]
};