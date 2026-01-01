module.exports = {
  apps: [{
    name: 'whatsapp-api',
    script: 'index.js',
    instances: 1,
    exec_mode: 'fork',
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      LOG_LEVEL: 'warn',
      API_KEY: 'your-secure-api-key-change-this',
      AUTO_CONNECT: 'true'
    },
    
    // Logging
    error_file: './logs/pm2-err.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    
    // Restart policy
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    
    // Monitoring
    max_memory_restart: '1G',
    
    // Advanced settings
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Watch files (only for development)
    watch: false,
    ignore_watch: [
      "node_modules",
      "logs",
      "sessions"
    ],
    
    // Environment specific settings
    env_file: '.env',
    
    // Additional PM2 settings
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Windows specific
    windowsHide: true
  }]
};